import { renderPageLayout } from "./renderPageLayout.js";

export const renderMainPage = (): string => {
  return renderPageLayout({
    title: "GTM MCP Server by Pragmatic Growth",
    content: `
    <h1>GTM MCP Server by Pragmatic Growth</h1>

    <p>
      A remote MCP server with Google OAuth built-in, providing a complete interface to the
      Google Tag Manager API.
    </p>

    <h2>Prerequisites</h2>

    <ul>
      <li>Node.js (v18 or higher)</li>
    </ul>

    <h2>Access the remote MCP server from Claude Desktop</h2>

    <p>
      Open Claude Desktop and navigate to Settings &rarr; Developer &rarr; Edit Config. This opens the configuration file that
      controls which MCP servers Claude can access.
    </p>

    <p>
      Replace the content with the following configuration. Once you restart Claude Desktop, a browser window will open
      showing your OAuth login page. Complete the authentication flow to grant Claude access to your MCP server. After you
      grant access, the tools will become available for you to use.
    </p>

    <pre><code>{
  "mcpServers": {
    "google-tag-manager-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://gtm-mcp.pragmaticgrowth.com/mcp"
      ]
    }
  }
}</code></pre>

    <h3>Troubleshooting</h3>

    <p>
      <a href="https://github.com/geelen/mcp-remote#readme">mcp-remote</a> stores all the credential information inside
      <code>~/.mcp-auth</code> (or wherever your <code>MCP_REMOTE_CONFIG_DIR</code> points to). If you're having persistent issues, try clearing
      any locally stored state and tokens:
    </p>

    <pre><code>rm -rf ~/.mcp-auth</code></pre>

    <p>Then restart your MCP client.</p>
    `,
  });
};
