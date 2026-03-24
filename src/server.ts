import http from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { getRequestListener } from "@hono/node-server";
import { loadEnv } from "./utils/loadEnv.js";
import { apisHandler } from "./utils/apisHandler.js";
import { createMcpServer } from "./index.js";
import { lookupAccessToken } from "./oauth/store.js";
import type { McpAgentPropsModel } from "./models/McpAgentModel.js";
import { log } from "./utils/log.js";

// Load environment variables
loadEnv();

// Validate required environment variables
const REQUIRED_ENV = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "COOKIE_ENCRYPTION_KEY",
  "HOST_URL",
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
  COOKIE_ENCRYPTION_KEY: process.env.COOKIE_ENCRYPTION_KEY!,
  HOST_URL: process.env.HOST_URL!,
  HOSTED_DOMAIN: process.env.HOSTED_DOMAIN,
};

// Session management
interface McpSession {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  lastActivity: number;
}

const sessions = new Map<string, McpSession>();

// Session cleanup: remove sessions inactive for 30 minutes
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const sessionCleanup = setInterval(
  () => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
        session.transport.close?.();
        sessions.delete(id);
        log(`Session ${id} expired and cleaned up`);
      }
    }
  },
  5 * 60 * 1000,
);
sessionCleanup.unref(); // Allow process to exit

// Hono listener for non-MCP routes
const honoListener = getRequestListener(apisHandler.fetch);

// HTTP server
const httpServer = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (url.pathname === "/mcp") {
    try {
      await handleMcpRequest(req, res);
    } catch (error) {
      log("MCP handler error:", error);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    }
  } else {
    // Delegate to Hono for OAuth endpoints, static pages, etc.
    honoListener(req, res);
  }
});

async function handleMcpRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  // Handle DELETE — session teardown
  if (req.method === "DELETE") {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      await session.transport.close?.();
      sessions.delete(sessionId);
    }
    res.writeHead(200);
    res.end();
    return;
  }

  // Extract Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    const hostUrl = env.HOST_URL || `http://${req.headers.host}`;
    res.writeHead(401, {
      "Content-Type": "application/json",
      "WWW-Authenticate": `Bearer resource_metadata="${hostUrl}/.well-known/oauth-protected-resource"`,
    });
    res.end(
      JSON.stringify({
        error: "unauthorized",
        error_description: "Missing or invalid Authorization header",
      }),
    );
    return;
  }

  const bearerToken = authHeader.slice(7);
  const tokenData = lookupAccessToken(bearerToken);

  if (!tokenData) {
    res.writeHead(401, {
      "Content-Type": "application/json",
    });
    res.end(
      JSON.stringify({
        error: "invalid_token",
        error_description: "Invalid or expired access token",
      }),
    );
    return;
  }

  // Check for existing session (GET for SSE resumption, POST for messages)
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    session.lastActivity = Date.now();
    await session.transport.handleRequest(req, res);
    return;
  }

  // For GET requests without a valid session, return 405
  if (req.method === "GET") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "Method not allowed without valid session" }),
    );
    return;
  }

  // New session: create transport and MCP server
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    onsessioninitialized: (sid: string) => {
      sessions.set(sid, {
        transport,
        server: mcpServer,
        lastActivity: Date.now(),
      });
      log(`New MCP session created: ${sid}`);
    },
  });

  const props: McpAgentPropsModel = tokenData.props;
  const mcpServer = createMcpServer(props, env);

  transport.onclose = () => {
    const sid = transport.sessionId;
    if (sid) {
      sessions.delete(sid);
      log(`MCP session closed: ${sid}`);
    }
  };

  await mcpServer.connect(transport);
  await transport.handleRequest(req, res);
}

// Start server
const PORT = parseInt(process.env.PORT || "3000", 10);
httpServer.listen(PORT, () => {
  console.log(`GTM MCP Server running on port ${PORT}`);
  console.log(`Host URL: ${env.HOST_URL || `http://localhost:${PORT}`}`);
});
