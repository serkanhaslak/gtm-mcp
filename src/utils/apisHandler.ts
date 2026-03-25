import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Hono } from "hono";
import {
  fetchUpstreamAuthToken,
  getUpstreamAuthorizeUrl,
} from "./authorizeUtils.js";
import { renderMainPage } from "./renderMainPage.js";
import { renderPrivacyPage } from "./renderPrivacyPage.js";
import { renderTermsPage } from "./renderTermsPage.js";

const app = new Hono();

// In-memory auth codes (short-lived, for OAuth flow)
const authCodes = new Map<
  string,
  { clientId: string; redirectUri: string; expiresAt: number }
>();

function getEnv(): AppEnv {
  return {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
    HOST_URL: process.env.HOST_URL || "",
    MCP_API_KEY: process.env.MCP_API_KEY || "",
    OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID || "",
    OAUTH_CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET || "",
    CREDENTIALS_PATH: process.env.CREDENTIALS_PATH || "/data",
    HOSTED_DOMAIN: process.env.HOSTED_DOMAIN,
  };
}

function getCredentialsFilePath(): string {
  const env = getEnv();
  return path.join(env.CREDENTIALS_PATH || "/data", "google-credentials.json");
}

// ============================================================
// OAuth 2.0 Shim — gated by pre-configured client credentials
// Only clients with the correct OAUTH_CLIENT_ID/SECRET can connect
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

// --- Dynamic Client Registration (returns pre-configured credentials) ---
// Claude.ai requires a /register endpoint. We return the fixed credentials
// so only connectors configured with the correct secret can complete the flow.

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

// --- Authorization Endpoint (validates client_id, auto-approves) ---

app.get("/authorize", (c) => {
  const env = getEnv();
  const clientId = c.req.query("client_id");
  const redirectUri = c.req.query("redirect_uri");
  const state = c.req.query("state");

  if (!clientId || !redirectUri) {
    return c.text("Missing client_id or redirect_uri", 400);
  }

  // Gate: only the pre-configured client can authorize
  if (clientId !== env.OAUTH_CLIENT_ID) {
    return c.text("Unauthorized client", 403);
  }

  // Auto-approve: generate auth code and redirect back
  const code = crypto.randomUUID();
  authCodes.set(code, {
    clientId,
    redirectUri,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);

  return Response.redirect(url.toString());
});

// --- Token Endpoint (validates client_secret) ---

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

    return c.json({
      access_token: env.MCP_API_KEY,
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: env.MCP_API_KEY,
    });
  }

  if (grantType === "refresh_token") {
    return c.json({
      access_token: env.MCP_API_KEY,
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: env.MCP_API_KEY,
    });
  }

  return c.json({ error: "unsupported_grant_type" }, 400);
});

// ============================================================
// One-Time Google Setup (saves credentials to volume)
// ============================================================

app.get("/setup", (c) => {
  const env = getEnv();

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

  const authorizeUrl = getUpstreamAuthorizeUrl({
    upstreamUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scope: scopes.join(" "),
    clientId: env.GOOGLE_CLIENT_ID,
    redirectUri: `${env.HOST_URL}/setup/callback`,
    hostedDomain: env.HOSTED_DOMAIN,
    hasRefreshToken: false,
  });

  return Response.redirect(authorizeUrl);
});

app.get("/setup/callback", async (c) => {
  const env = getEnv();
  const code = c.req.query("code");

  if (!code) {
    return c.text("Missing code from Google", 400);
  }

  const [tokenResult, errResponse] = await fetchUpstreamAuthToken({
    upstreamUrl: "https://oauth2.googleapis.com/token",
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    code,
    redirectUri: `${env.HOST_URL}/setup/callback`,
    grantType: "authorization_code",
  });

  if (errResponse) {
    return errResponse;
  }

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

  const credentials = {
    accessToken: tokenResult.access_token,
    refreshToken: tokenResult.refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + (tokenResult.expires_in ?? 3600),
    name,
    email,
    savedAt: new Date().toISOString(),
  };

  const credPath = getCredentialsFilePath();
  const dir = path.dirname(credPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(credPath, JSON.stringify(credentials, null, 2));

  return c.html(`
    <!DOCTYPE html>
    <html><head><title>Setup Complete</title>
    <style>body{font-family:system-ui;max-width:600px;margin:2rem auto;padding:1rem;background:#1a1a2e;color:#e0e0e0}
    .success{background:#1b4332;padding:1.5rem;border-radius:8px;margin:1rem 0}
    code{background:#2d2d44;padding:2px 6px;border-radius:4px}</style></head>
    <body>
      <h1>Setup Complete</h1>
      <div class="success">
        <p>Google credentials saved for <strong>${name}</strong> (${email})</p>
        <p>Your MCP server is now ready to use.</p>
      </div>
      <h3>Connect with Claude.ai:</h3>
      <p>URL: <code>${env.HOST_URL}/mcp</code></p>
      <p>Advanced settings → OAuth Client ID: <code>${env.OAUTH_CLIENT_ID}</code></p>
      <p>Advanced settings → OAuth Client Secret: <code>${env.OAUTH_CLIENT_SECRET}</code></p>
    </body></html>
  `);
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

app.get("/terms", async () => {
  return new Response(renderTermsPage(), {
    headers: { "content-type": "text/html;charset=UTF-8" },
  });
});

export { app as apisHandler, getCredentialsFilePath };
