import crypto from "node:crypto";
import { Hono } from "hono";
import type { AuthRequest } from "../oauth/types.js";
import {
  registerClient,
  lookupClient,
  deleteClient,
  storeAuthCode,
  consumeAuthCode,
  storeAccessToken,
  storeRefreshToken,
  lookupRefreshToken,
  revokeUserGrants,
} from "../oauth/store.js";
import {
  fetchUpstreamAuthToken,
  getUpstreamAuthorizeUrl,
  refreshUpstreamAuthToken,
  type Props,
} from "./authorizeUtils.js";
import { renderMainPage } from "./renderMainPage.js";
import { renderPrivacyPage } from "./renderPrivacyPage.js";
import { renderTermsPage } from "./renderTermsPage.js";
import {
  clientIdAlreadyApproved,
  parseRedirectApproval,
  renderApprovalDialog,
} from "./workersOAuthUtils.js";

const app = new Hono();

// --- OAuth Protected Resource Metadata (RFC 9728) ---

app.get("/.well-known/oauth-protected-resource", (c) => {
  const hostUrl = getEnv().HOST_URL;
  return c.json({
    resource: `${hostUrl}/mcp`,
    authorization_servers: [hostUrl],
    bearer_methods_supported: ["header"],
  });
});

// --- OAuth Authorization Server Metadata ---

app.get("/.well-known/oauth-authorization-server", (c) => {
  const hostUrl = getEnv().HOST_URL;
  return c.json({
    issuer: hostUrl,
    authorization_endpoint: `${hostUrl}/authorize`,
    token_endpoint: `${hostUrl}/token`,
    registration_endpoint: `${hostUrl}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: [
      "client_secret_post",
      "client_secret_basic",
    ],
    code_challenge_methods_supported: ["S256"],
  });
});

// --- Dynamic Client Registration (RFC 7591) ---

app.post("/register", async (c) => {
  const body = await c.req.json();

  if (!body.redirect_uris || !Array.isArray(body.redirect_uris)) {
    return c.json({ error: "redirect_uris is required" }, 400);
  }

  const client = registerClient({
    client_name: body.client_name,
    redirect_uris: body.redirect_uris,
    client_uri: body.client_uri,
    policy_uri: body.policy_uri,
    tos_uri: body.tos_uri,
    contacts: body.contacts,
  });

  return c.json(
    {
      client_id: client.clientId,
      client_secret: client.clientSecret,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      client_uri: client.clientUri,
      policy_uri: client.policyUri,
      tos_uri: client.tosUri,
      contacts: client.contacts,
    },
    201,
  );
});

// --- Authorization Endpoint ---

app.get("/authorize", async (c) => {
  const clientId = c.req.query("client_id");
  const redirectUri = c.req.query("redirect_uri");
  const state = c.req.query("state");
  const scope = c.req.query("scope") || "";
  const codeChallenge = c.req.query("code_challenge");
  const codeChallengeMethod = c.req.query("code_challenge_method");

  if (!clientId) {
    return c.text("Missing client_id", 400);
  }

  const client = lookupClient(clientId);
  if (!client) {
    return c.text("Unknown client_id", 400);
  }

  const resolvedRedirectUri = redirectUri || client.redirectUris[0] || "";
  if (redirectUri && !client.redirectUris.includes(redirectUri)) {
    return c.text("Invalid redirect_uri", 400);
  }

  const oauthReqInfo: AuthRequest = {
    clientId,
    scope,
    redirectUri: resolvedRedirectUri,
    state,
    codeChallenge,
    codeChallengeMethod,
  };

  const env = getEnv();

  if (
    await clientIdAlreadyApproved(
      c.req.raw,
      clientId,
      env.COOKIE_ENCRYPTION_KEY,
    )
  ) {
    return redirectToGoogle(c, oauthReqInfo, env);
  }

  return renderApprovalDialog(c.req.raw, {
    client: {
      clientId: client.clientId,
      clientName: client.clientName,
      clientUri: client.clientUri,
      redirectUris: client.redirectUris,
      policyUri: client.policyUri,
      tosUri: client.tosUri,
      contacts: client.contacts,
    },
    server: {
      name: "Pragmatic Growth",
      description: "",
    },
    state: { oauthReqInfo },
  });
});

app.post("/authorize", async (c) => {
  const env = getEnv();

  const { state, headers } = await parseRedirectApproval(
    c.req.raw,
    env.COOKIE_ENCRYPTION_KEY,
  );

  if (!state.oauthReqInfo) {
    return c.text("Invalid request", 400);
  }

  return redirectToGoogle(c, state.oauthReqInfo, env, headers);
});

// --- Google OAuth Redirect ---

function redirectToGoogle(
  c: { req: { raw: Request } },
  oauthReqInfo: AuthRequest,
  env: AppEnv,
  headers: Record<string, string> = {},
): Response {
  const scopes = [
    "email",
    "profile",
    "https://www.googleapis.com/auth/tagmanager.manage.accounts",
    "https://www.googleapis.com/auth/tagmanager.edit.containers",
    "https://www.googleapis.com/auth/tagmanager.delete.containers",
    "https://www.googleapis.com/auth/tagmanager.edit.containerversions",
    "https://www.googleapis.com/auth/tagmanager.manage.users",
    "https://www.googleapis.com/auth/tagmanager.publish",
    "https://www.googleapis.com/auth/tagmanager.readonly",
  ];

  return new Response(null, {
    status: 302,
    headers: {
      ...headers,
      location: getUpstreamAuthorizeUrl({
        upstreamUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        scope: scopes.join(" "),
        clientId: env.GOOGLE_CLIENT_ID,
        redirectUri: `${env.HOST_URL}/callback`,
        state: btoa(JSON.stringify(oauthReqInfo)),
        hostedDomain: env.HOSTED_DOMAIN,
        hasRefreshToken: false,
      }),
    },
  });
}

// --- Google OAuth Callback ---

app.get("/callback", async (c) => {
  const env = getEnv();

  // Decode the original OAuth request info from state
  const stateParam = c.req.query("state");
  if (!stateParam) {
    return c.text("Missing state", 400);
  }

  let oauthReqInfo: AuthRequest;
  try {
    oauthReqInfo = JSON.parse(atob(stateParam)) as AuthRequest;
  } catch {
    return c.text("Invalid state", 400);
  }

  if (!oauthReqInfo.clientId) {
    return c.text("Invalid state: missing clientId", 400);
  }

  const code = c.req.query("code");
  if (!code) {
    return c.text("Missing code", 400);
  }

  // Exchange Google auth code for tokens
  const [tokenResult, googleErrResponse] = await fetchUpstreamAuthToken({
    upstreamUrl: "https://oauth2.googleapis.com/token",
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    code,
    redirectUri: `${env.HOST_URL}/callback`,
    grantType: "authorization_code",
  });

  if (googleErrResponse) {
    return googleErrResponse;
  }

  // Fetch user info from Google
  const userResponse = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${tokenResult?.access_token}` },
    },
  );

  if (!userResponse.ok) {
    return c.text(
      `Failed to fetch user info: ${await userResponse.text()}`,
      500,
    );
  }

  const { id, name, email } = (await userResponse.json()) as {
    id: string;
    name: string;
    email: string;
  };

  // Create MCP authorization code
  const mcpAuthCode = crypto.randomUUID();
  const userProps: Props = {
    userId: id,
    name,
    email,
    accessToken: tokenResult.access_token,
    refreshToken: tokenResult.refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + (tokenResult.expires_in ?? 3600),
    clientId: oauthReqInfo.clientId,
  };

  storeAuthCode({
    code: mcpAuthCode,
    clientId: oauthReqInfo.clientId,
    userId: id,
    scope: oauthReqInfo.scope,
    redirectUri: oauthReqInfo.redirectUri,
    props: userProps,
    codeChallenge: oauthReqInfo.codeChallenge,
    codeChallengeMethod: oauthReqInfo.codeChallengeMethod,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  });

  // Redirect back to the MCP client with the auth code
  const redirectUrl = new URL(oauthReqInfo.redirectUri);
  redirectUrl.searchParams.set("code", mcpAuthCode);
  if (oauthReqInfo.state) {
    redirectUrl.searchParams.set("state", oauthReqInfo.state);
  }

  return Response.redirect(redirectUrl.toString());
});

// --- Token Endpoint ---

app.post("/token", async (c) => {
  const env = getEnv();

  const contentType = c.req.header("content-type") || "";
  let body: Record<string, string>;

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await c.req.parseBody();
    body = Object.fromEntries(
      Object.entries(formData).map(([k, v]) => [k, String(v)]),
    );
  } else {
    body = await c.req.json();
  }

  const grantType = body.grant_type;

  if (grantType === "authorization_code") {
    return handleAuthorizationCodeGrant(body, env, c);
  }

  if (grantType === "refresh_token") {
    return handleRefreshTokenGrant(body, env, c);
  }

  return c.json({ error: "unsupported_grant_type" }, 400);
});

function handleAuthorizationCodeGrant(
  body: Record<string, string>,
  env: AppEnv,
  c: { json: (data: unknown, status?: number) => Response },
): Response {
  const { code, code_verifier, client_id, client_secret } = body;

  if (!code) {
    return c.json(
      { error: "invalid_request", error_description: "Missing code" },
      400,
    );
  }

  const authCode = consumeAuthCode(code);
  if (!authCode) {
    return c.json(
      { error: "invalid_grant", error_description: "Invalid or expired code" },
      400,
    );
  }

  // Validate client
  if (client_id && client_id !== authCode.clientId) {
    return c.json(
      { error: "invalid_grant", error_description: "Client mismatch" },
      400,
    );
  }

  // Validate client_secret if provided
  if (client_secret) {
    const client = lookupClient(authCode.clientId);
    if (!client || client.clientSecret !== client_secret) {
      return c.json(
        {
          error: "invalid_client",
          error_description: "Invalid client credentials",
        },
        401,
      );
    }
  }

  // Validate PKCE
  if (authCode.codeChallenge) {
    if (!code_verifier) {
      return c.json(
        {
          error: "invalid_request",
          error_description: "Missing code_verifier",
        },
        400,
      );
    }

    const hash = crypto.createHash("sha256").update(code_verifier).digest();
    const computedChallenge = hash
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    if (computedChallenge !== authCode.codeChallenge) {
      return c.json(
        {
          error: "invalid_grant",
          error_description: "PKCE verification failed",
        },
        400,
      );
    }
  }

  // Generate tokens
  const accessToken = crypto.randomUUID();
  const refreshToken = crypto.randomUUID();
  const expiresIn = 1800; // 30 minutes

  storeAccessToken({
    token: accessToken,
    clientId: authCode.clientId,
    userId: authCode.userId,
    props: authCode.props,
    scope: authCode.scope,
    expiresAt: Date.now() + expiresIn * 1000,
  });

  storeRefreshToken({
    token: refreshToken,
    clientId: authCode.clientId,
    userId: authCode.userId,
    props: authCode.props,
    scope: authCode.scope,
    expiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000, // 90 days
  });

  return c.json({
    access_token: accessToken,
    token_type: "bearer",
    expires_in: expiresIn,
    refresh_token: refreshToken,
  });
}

async function handleRefreshTokenGrant(
  body: Record<string, string>,
  env: AppEnv,
  c: { json: (data: unknown, status?: number) => Response },
): Promise<Response> {
  const { refresh_token } = body;

  if (!refresh_token) {
    return c.json(
      { error: "invalid_request", error_description: "Missing refresh_token" },
      400,
    );
  }

  const tokenData = lookupRefreshToken(refresh_token);
  if (!tokenData) {
    return c.json(
      { error: "invalid_grant", error_description: "Invalid refresh token" },
      400,
    );
  }

  // Check if the Google upstream token needs refreshing
  let props = tokenData.props;
  const now = Math.floor(Date.now() / 1000);
  const REFRESH_THRESHOLD = 900; // 15 minutes

  if (
    props.refreshToken &&
    props.expiresAt &&
    props.expiresAt < now + REFRESH_THRESHOLD
  ) {
    const [newToken, err] = await refreshUpstreamAuthToken({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      refreshToken: props.refreshToken,
      upstreamUrl: "https://oauth2.googleapis.com/token",
    });

    if (newToken) {
      props = {
        ...props,
        accessToken: newToken.access_token,
        expiresAt: now + newToken.expires_in,
        refreshToken: newToken.refresh_token || props.refreshToken,
      };
    }
  }

  // Generate new access token
  const newAccessToken = crypto.randomUUID();
  const expiresIn = 1800;

  storeAccessToken({
    token: newAccessToken,
    clientId: tokenData.clientId,
    userId: tokenData.userId,
    props,
    scope: tokenData.scope,
    expiresAt: Date.now() + expiresIn * 1000,
  });

  // Update refresh token props if Google token was refreshed
  if (props !== tokenData.props) {
    storeRefreshToken({
      ...tokenData,
      props,
    });
  }

  return c.json({
    access_token: newAccessToken,
    token_type: "bearer",
    expires_in: expiresIn,
    refresh_token: refresh_token,
  });
}

// --- Revoke / Remove Endpoint ---

app.get("/remove", async (c) => {
  const userId = c.req.query("userId");
  const clientId = c.req.query("clientId");
  const accessToken = c.req.query("accessToken");

  if (!userId || !clientId || !accessToken) {
    return new Response("Invalid request", { status: 400 });
  }

  // Revoke all grants for this user
  revokeUserGrants(userId);
  deleteClient(clientId);

  // Revoke Google token
  await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
    method: "POST",
    headers: { "Content-type": "application/x-www-form-urlencoded" },
  });

  return new Response("OK", { status: 200 });
});

// --- Static Pages ---

app.get("/", async () => {
  return new Response(renderMainPage(), {
    headers: { "content-type": "text/html;charset=UTF-8" },
  });
});

app.get("/privacy", async () => {
  return new Response(renderPrivacyPage(), {
    headers: { "content-type": "text/html;charset=UTF-8" },
  });
});

app.get("/terms", async () => {
  return new Response(renderTermsPage(), {
    headers: { "content-type": "text/html;charset=UTF-8" },
  });
});

function getEnv(): AppEnv {
  return {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
    COOKIE_ENCRYPTION_KEY: process.env.COOKIE_ENCRYPTION_KEY || "",
    HOST_URL: process.env.HOST_URL || "",
    HOSTED_DOMAIN: process.env.HOSTED_DOMAIN,
  };
}

export { app as apisHandler };
