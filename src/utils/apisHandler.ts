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

function getEnv(): AppEnv {
  return {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
    HOST_URL: process.env.HOST_URL || "",
    MCP_API_KEY: process.env.MCP_API_KEY || "",
    CREDENTIALS_PATH: process.env.CREDENTIALS_PATH || "/data",
    HOSTED_DOMAIN: process.env.HOSTED_DOMAIN,
  };
}

function getCredentialsFilePath(): string {
  const env = getEnv();
  return path.join(env.CREDENTIALS_PATH || "/data", "google-credentials.json");
}

// --- One-Time Setup: Step 1 — Redirect to Google OAuth ---

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

// --- One-Time Setup: Step 2 — Handle Google Callback ---

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

  // Fetch user info
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

  // Save credentials to volume
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
      <p>Add as custom connector with URL: <code>${env.HOST_URL}/mcp</code></p>
      <p>No OAuth needed — just use your API key.</p>
    </body></html>
  `);
});

// --- MCP OAuth Discovery (returns 401 with proper headers) ---

app.get("/.well-known/oauth-protected-resource", (c) => {
  const env = getEnv();
  return c.json({
    resource: `${env.HOST_URL}/mcp`,
    bearer_methods_supported: ["header"],
  });
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

export { app as apisHandler, getCredentialsFilePath };
