import { serve } from "@hono/node-server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Hono } from "hono";
import { loadEnv } from "./utils/loadEnv.js";
import { apisHandler } from "./utils/apisHandler.js";
import { createMcpServer } from "./index.js";
import { refreshUpstreamAuthToken } from "./utils/authorizeUtils.js";
import type { McpAgentPropsModel } from "./models/McpAgentModel.js";
import { log } from "./utils/log.js";
import {
  loadUser,
  updateUser,
  countUsers,
  type UserCredentials,
} from "./utils/userStore.js";

// Load environment variables
loadEnv();

// Validate required environment variables
const REQUIRED_ENV = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "HOST_URL",
  "OAUTH_CLIENT_ID",
  "OAUTH_CLIENT_SECRET",
] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const env: AppEnv = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
  HOST_URL: process.env.HOST_URL!,
  OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID!,
  OAUTH_CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET!,
  CREDENTIALS_PATH: process.env.CREDENTIALS_PATH || "/data",
  HOSTED_DOMAIN: process.env.HOSTED_DOMAIN,
};

// --- Per-User Google Token Refresh ---

const REFRESH_THRESHOLD = 300; // 5 minutes

async function getValidUserCredentials(
  apiKey: string,
): Promise<UserCredentials | null> {
  const basePath = env.CREDENTIALS_PATH || "/data";
  const user = loadUser(basePath, apiKey);
  if (!user) return null;

  const now = Math.floor(Date.now() / 1000);

  // Token still valid
  if (user.expiresAt > now + REFRESH_THRESHOLD) {
    user.lastUsed = new Date().toISOString();
    updateUser(basePath, user);
    return user;
  }

  // Need to refresh
  if (!user.refreshToken) return null;

  log(`Refreshing Google token for ${user.email}...`);
  const [token, err] = await refreshUpstreamAuthToken({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    refreshToken: user.refreshToken,
    upstreamUrl: "https://oauth2.googleapis.com/token",
  });

  if (!token) {
    log(`Failed to refresh Google token for ${user.email}:`, err);
    return null;
  }

  const updated: UserCredentials = {
    ...user,
    accessToken: token.access_token,
    expiresAt: now + token.expires_in,
    refreshToken: token.refresh_token || user.refreshToken,
    lastUsed: new Date().toISOString(),
  };

  updateUser(basePath, updated);
  log(`Google token refreshed for ${user.email}`);
  return updated;
}

// --- Session Management ---

interface McpSession {
  transport: WebStandardStreamableHTTPServerTransport;
  server: McpServer;
  lastActivity: number;
}

const sessions = new Map<string, McpSession>();

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const sessionCleanup = setInterval(
  () => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
        session.transport.close?.();
        sessions.delete(id);
        log(`Session ${id} expired`);
      }
    }
  },
  5 * 60 * 1000,
);
sessionCleanup.unref();

// --- Hono App ---

const app = new Hono();

// MCP endpoint — handles POST, GET, DELETE
app.all("/mcp", async (c) => {
  // Handle DELETE — session teardown
  if (c.req.method === "DELETE") {
    const sessionId = c.req.header("mcp-session-id");
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      await session.transport.close?.();
      sessions.delete(sessionId);
    }
    return c.body(null, 200);
  }

  // Validate API key (per-user)
  const authHeader = c.req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing Authorization: Bearer <API_KEY>" }, 401);
  }

  const apiKey = authHeader.slice(7);

  // Look up user credentials by API key
  const creds = await getValidUserCredentials(apiKey);
  if (!creds) {
    return c.json(
      {
        error:
          "Invalid API key or expired credentials. Please re-authenticate.",
      },
      401,
    );
  }

  // Check for existing session
  const sessionId = c.req.header("mcp-session-id");

  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    session.lastActivity = Date.now();
    return session.transport.handleRequest(c.req.raw);
  }

  // For GET without valid session
  if (c.req.method === "GET") {
    return c.json({ error: "No valid session" }, 405);
  }

  // New session
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    enableJsonResponse: true,
    onsessioninitialized: (sid: string) => {
      sessions.set(sid, {
        transport,
        server: mcpServer,
        lastActivity: Date.now(),
      });
      log(`New MCP session: ${sid} (${creds.name} <${creds.email}>)`);
    },
  });

  const props: McpAgentPropsModel = {
    userId: creds.email,
    name: creds.name,
    email: creds.email,
    accessToken: creds.accessToken,
    refreshToken: creds.refreshToken,
    expiresAt: creds.expiresAt,
    clientId: env.GOOGLE_CLIENT_ID,
  };

  const mcpServer = createMcpServer(props, env);

  transport.onclose = () => {
    const sid = transport.sessionId;
    if (sid) {
      sessions.delete(sid);
      log(`Session closed: ${sid}`);
    }
  };

  await mcpServer.connect(transport);
  return transport.handleRequest(c.req.raw);
});

// Mount all other routes (OAuth shim, static pages)
app.route("/", apisHandler);

// Start server
const PORT = parseInt(process.env.PORT || "3000", 10);
serve({ fetch: app.fetch, port: PORT }, () => {
  const basePath = env.CREDENTIALS_PATH || "/data";
  const userCount = countUsers(basePath);
  console.log(`GTM MCP Server running on port ${PORT}`);
  console.log(`Host URL: ${env.HOST_URL}`);
  console.log(`Registered users: ${userCount}`);
});
