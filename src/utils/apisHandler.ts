import crypto from "node:crypto";
import { Hono } from "hono";
import {
  fetchUpstreamAuthToken,
  getUpstreamAuthorizeUrl,
} from "./authorizeUtils.js";
import { renderMainPage } from "./renderMainPage.js";
import { renderPrivacyPage } from "./renderPrivacyPage.js";
import { renderTermsPage } from "./renderTermsPage.js";
import { saveUser } from "./userStore.js";

const app = new Hono();

// In-memory auth codes (short-lived, for OAuth flow)
const authCodes = new Map<
  string,
  { apiKey: string; redirectUri: string; expiresAt: number }
>();

// Pending OAuth authorizations (maps our state → MCP client context)
const pendingAuths = new Map<
  string,
  {
    clientId: string;
    redirectUri: string;
    mcpState: string | undefined;
    expiresAt: number;
  }
>();

function getEnv(): AppEnv {
  return {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
    HOST_URL: process.env.HOST_URL || "",
    OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID || "",
    OAUTH_CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET || "",
    CREDENTIALS_PATH: process.env.CREDENTIALS_PATH || "/data",
    HOSTED_DOMAIN: process.env.HOSTED_DOMAIN,
  };
}

// ============================================================
// OAuth 2.0 Shim — multi-tenant, Google OAuth per user
// ============================================================

// --- Discovery ---

app.get("/.well-known/oauth-protected-resource", (c) => {
  const env = getEnv();
  return c.json({
    resource: `${env.HOST_URL}/mcp`,
    authorization_servers: [env.HOST_URL],
    bearer_methods_supported: ["header"],
  });
});

app.get("/.well-known/oauth-authorization-server", (c) => {
  const env = getEnv();
  return c.json({
    issuer: env.HOST_URL,
    authorization_endpoint: `${env.HOST_URL}/authorize`,
    token_endpoint: `${env.HOST_URL}/oauth/token`,
    registration_endpoint: `${env.HOST_URL}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
    code_challenge_methods_supported: ["S256"],
  });
});

// --- Dynamic Client Registration ---
// Returns pre-configured credentials. Required by Claude.ai / mcp-remote.

app.post("/register", async (c) => {
  const env = getEnv();
  const body = await c.req.json();

  return c.json(
    {
      client_id: env.OAUTH_CLIENT_ID,
      client_secret: env.OAUTH_CLIENT_SECRET,
      client_name: body.client_name || "GTM MCP Client",
      redirect_uris: body.redirect_uris || [],
    },
    201,
  );
});

// --- Authorization Endpoint ---
// Validates client_id, then redirects to Google OAuth.
// The MCP client's redirect_uri and state are preserved through the Google flow.

app.get("/authorize", (c) => {
  const env = getEnv();
  const clientId = c.req.query("client_id");
  const redirectUri = c.req.query("redirect_uri");
  const mcpState = c.req.query("state");

  if (!clientId || !redirectUri) {
    return c.text("Missing client_id or redirect_uri", 400);
  }

  // Gate: only the pre-configured client can authorize
  if (clientId !== env.OAUTH_CLIENT_ID) {
    return c.text("Unauthorized client", 403);
  }

  // Store pending auth context (to correlate Google callback with MCP client)
  const pendingId = crypto.randomUUID();
  pendingAuths.set(pendingId, {
    clientId,
    redirectUri,
    mcpState,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 min TTL
  });

  // Redirect to Google OAuth
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

  const googleAuthUrl = getUpstreamAuthorizeUrl({
    upstreamUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scope: scopes.join(" "),
    clientId: env.GOOGLE_CLIENT_ID,
    redirectUri: `${env.HOST_URL}/callback`,
    state: pendingId,
    hostedDomain: env.HOSTED_DOMAIN,
    hasRefreshToken: false,
  });

  return Response.redirect(googleAuthUrl);
});

// --- Google OAuth Callback ---
// Receives the Google auth code, exchanges for tokens, generates an API key,
// saves user credentials, and redirects back to the MCP client.

app.get("/callback", async (c) => {
  const env = getEnv();
  const googleCode = c.req.query("code");
  const pendingId = c.req.query("state");

  if (!googleCode || !pendingId) {
    return c.text("Missing code or state from Google", 400);
  }

  // Look up the pending auth
  const pending = pendingAuths.get(pendingId);
  if (!pending || Date.now() > pending.expiresAt) {
    pendingAuths.delete(pendingId || "");
    return c.text("Authorization request expired. Please try again.", 400);
  }
  pendingAuths.delete(pendingId);

  // Exchange Google code for tokens
  const [tokenResult, errResponse] = await fetchUpstreamAuthToken({
    upstreamUrl: "https://oauth2.googleapis.com/token",
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    code: googleCode,
    redirectUri: `${env.HOST_URL}/callback`,
    grantType: "authorization_code",
  });

  if (errResponse) {
    return errResponse;
  }

  // Fetch user info from Google
  const userResponse = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${tokenResult?.access_token}` } },
  );

  if (!userResponse.ok) {
    return c.text(
      `Failed to fetch user info: ${await userResponse.text()}`,
      500,
    );
  }

  const { name, email } = (await userResponse.json()) as {
    name: string;
    email: string;
  };

  // Generate API key and save user credentials
  const apiKey = crypto.randomUUID();
  const basePath = env.CREDENTIALS_PATH || "/data";

  saveUser(basePath, {
    apiKey,
    accessToken: tokenResult.access_token,
    refreshToken: tokenResult.refresh_token || "",
    expiresAt: Math.floor(Date.now() / 1000) + (tokenResult.expires_in ?? 3600),
    name,
    email,
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
  });

  // Create an auth code for the MCP client to exchange
  const mcpAuthCode = crypto.randomUUID();
  authCodes.set(mcpAuthCode, {
    apiKey,
    redirectUri: pending.redirectUri,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  // Redirect back to the MCP client
  const url = new URL(pending.redirectUri);
  url.searchParams.set("code", mcpAuthCode);
  if (pending.mcpState) url.searchParams.set("state", pending.mcpState);

  return Response.redirect(url.toString());
});

// --- Token Endpoint ---
// Exchanges auth code for the user's API key (as bearer token).

app.post("/oauth/token", async (c) => {
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

  // Gate: validate client credentials
  const clientId = body.client_id;
  const clientSecret = body.client_secret;

  if (
    clientId !== env.OAUTH_CLIENT_ID ||
    clientSecret !== env.OAUTH_CLIENT_SECRET
  ) {
    return c.json({ error: "invalid_client" }, 401);
  }

  const grantType = body.grant_type;

  if (grantType === "authorization_code") {
    const { code } = body;
    if (!code) return c.json({ error: "invalid_request" }, 400);

    const codeData = authCodes.get(code);
    if (!codeData || Date.now() > codeData.expiresAt) {
      authCodes.delete(code);
      return c.json({ error: "invalid_grant" }, 400);
    }
    authCodes.delete(code);

    // Return the user's API key as the access token
    return c.json({
      access_token: codeData.apiKey,
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: codeData.apiKey,
    });
  }

  if (grantType === "refresh_token") {
    // The refresh_token IS the API key — return it unchanged
    const refreshToken = body.refresh_token;
    if (!refreshToken) return c.json({ error: "invalid_request" }, 400);

    return c.json({
      access_token: refreshToken,
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: refreshToken,
    });
  }

  return c.json({ error: "unsupported_grant_type" }, 400);
});

// ============================================================
// Static Pages
// ============================================================

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

app.get("/terms-of-service", async () => {
  return new Response(renderTermsPage(), {
    headers: { "content-type": "text/html;charset=UTF-8" },
  });
});

export { app as apisHandler };
