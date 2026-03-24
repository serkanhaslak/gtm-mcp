import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpAgentPropsModel } from "./models/McpAgentModel.js";
import { tools } from "./tools/index.js";
import { getPackageVersion } from "./utils/index.js";

export function createMcpServer(
  props: McpAgentPropsModel,
  env: AppEnv,
): McpServer {
  const server = new McpServer({
    name: "google-tag-manager-mcp-server",
    version: getPackageVersion(),
  });

  tools.forEach((register) => {
    register(server, { props, env });
  });

  return server;
}
