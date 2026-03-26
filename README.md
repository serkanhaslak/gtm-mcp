# GTM MCP Server by Pragmatic Growth

A multi-tenant remote MCP server providing full Google Tag Manager API access. Each user authenticates with their own Google account via OAuth and receives a personal API key.

## How It Works

1. Connect your MCP client to the server
2. On first connection, you'll be redirected to Google to sign in and grant GTM access
3. An API key is generated for your account automatically
4. All subsequent connections use your API key to access **your** GTM data

## Connect from Claude Desktop

Open Claude Desktop and navigate to Settings -> Developer -> Edit Config:

```json
{
  "mcpServers": {
    "google-tag-manager": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://gtm-mcp.pragmaticgrowth.com/mcp"]
    }
  }
}
```

Restart Claude Desktop. A browser window will open for Google OAuth. Complete the authentication to grant GTM access.

## Connect from Claude.ai

Add a custom MCP integration with the URL:

```
https://gtm-mcp.pragmaticgrowth.com/mcp
```

## Troubleshooting

**MCP Server Name Length Limit**

Some MCP clients (like Cursor AI) have a 60-character limit for the combined MCP server name + tool name length. Use shorter server names in your configuration (e.g., `google-tag-manager`).

**Clearing MCP Cache**

[mcp-remote](https://github.com/geelen/mcp-remote#readme) stores credentials in `~/.mcp-auth`. If you have issues, clear the cached state:

```
rm -rf ~/.mcp-auth
```

Then restart your MCP client.

## Development

```bash
npm run build        # TypeScript compile
npm run dev          # Local dev server
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
```

## Environment Variables

| Variable               | Required | Description                                                   |
| ---------------------- | -------- | ------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`     | Yes      | Google OAuth client ID                                        |
| `GOOGLE_CLIENT_SECRET` | Yes      | Google OAuth client secret                                    |
| `HOST_URL`             | Yes      | Server hostname (e.g., `https://gtm-mcp.pragmaticgrowth.com`) |
| `OAUTH_CLIENT_ID`      | Yes      | MCP OAuth shim client ID                                      |
| `OAUTH_CLIENT_SECRET`  | Yes      | MCP OAuth shim client secret                                  |
| `CREDENTIALS_PATH`     | No       | Base path for user data (default: `/data`)                    |
| `HOSTED_DOMAIN`        | No       | Restrict Google auth to a specific domain                     |

## Architecture

Multi-tenant Node.js server deployed on Railway:

- **Hono** web framework with MCP SDK
- **Per-user OAuth**: Each user authenticates with Google and gets their own API key
- **User credentials** stored on Railway volume at `<CREDENTIALS_PATH>/users/<apiKey>.json`
- **Google token refresh** handled transparently per-user
- **19 GTM API tools** covering accounts, containers, workspaces, tags, triggers, variables, and more
