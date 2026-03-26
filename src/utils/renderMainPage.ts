import { renderPageLayout } from "./renderPageLayout.js";

export const renderMainPage = (): string => {
  return renderPageLayout({
    title: "GTM MCP Server by Pragmatic Growth",
    content: `
    <h1>GTM MCP Server by Pragmatic Growth</h1>

    <p>
      A multi-tenant remote MCP server with Google OAuth built-in, providing a complete interface to the
      Google Tag Manager API. Each user authenticates with their own Google account.
    </p>

    <h2>How It Works</h2>

    <ol>
      <li>Connect your MCP client to this server</li>
      <li>On first connection, you'll be redirected to Google to sign in and grant GTM access</li>
      <li>An API key is generated for your account automatically</li>
      <li>All subsequent connections use your API key to access <strong>your</strong> GTM data</li>
    </ol>

    <h2>Connect from Claude Desktop</h2>

    <p>
      Open Claude Desktop and navigate to Settings &rarr; Developer &rarr; Edit Config. Add the following:
    </p>

    <pre><code>{
  "mcpServers": {
    "google-tag-manager": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://gtm-mcp.pragmaticgrowth.com/mcp"
      ]
    }
  }
}</code></pre>

    <p>
      Restart Claude Desktop. A browser window will open for Google OAuth. Complete the
      authentication to grant GTM access. After that, the tools will be available.
    </p>

    <h2>Connect from Claude.ai</h2>

    <p>
      In Claude.ai, add a custom MCP integration with the URL:
    </p>

    <pre><code>https://gtm-mcp.pragmaticgrowth.com/mcp</code></pre>

    <h3>Troubleshooting</h3>

    <p>
      <a href="https://github.com/geelen/mcp-remote#readme">mcp-remote</a> stores credentials in
      <code>~/.mcp-auth</code>. If you have issues, clear the cached state:
    </p>

    <pre><code>rm -rf ~/.mcp-auth</code></pre>

    <p>Then restart your MCP client.</p>
    `,
  });
};
