import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TAG_MANAGER_REMOVE_MCP_SERVER_DATA } from "../constants/tools.js";
import { McpAgentToolParamsModel } from "../models/McpAgentModel.js";
import { createErrorResponse } from "../utils/index.js";

export const removeMCPServerData = (
  server: McpServer,
  { props }: McpAgentToolParamsModel,
): void => {
  server.tool(
    TAG_MANAGER_REMOVE_MCP_SERVER_DATA,
    "Revoke the current Google auth access token",
    async () => {
      try {
        const response = await fetch(
          `https://oauth2.googleapis.com/revoke?token=${props.accessToken}`,
          {
            method: "POST",
            headers: { "Content-type": "application/x-www-form-urlencoded" },
          },
        );

        if (response.ok) {
          return {
            content: [
              {
                type: "text",
                text: "Google access token revoked. Reconnect your MCP client to re-authenticate via Google OAuth.",
              },
            ],
          };
        }

        return createErrorResponse(
          "Failed to revoke Google token",
          await response.text(),
        );
      } catch (error) {
        return createErrorResponse("Error revoking Google token", error);
      }
    },
  );
};
