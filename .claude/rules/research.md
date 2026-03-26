# Research & Documentation Lookup Rules

## When to Research

- Investigating GTM API changes, deprecations, or new features
- Debugging Google API errors or unexpected behavior
- Checking MCP SDK updates or breaking changes
- Looking up Cloudflare Workers, Hono, or Zod documentation

## Context7 — Library Documentation

Use for looking up **specific library docs** (MCP SDK, googleapis, Hono, Zod, Cloudflare Workers):

1. First resolve the library: `mcp__claude_ai_Context7__resolve-library-id`
2. Then query docs: `mcp__claude_ai_Context7__query-docs`

Example: To check MCP SDK tool registration API, resolve `@modelcontextprotocol/sdk`, then query for "server.tool registration".

## Research Powerpack — Web Research

Use for **broader research** (GTM API changes, best practices, debugging):

- `mcp__claude_ai_Research_Powerpack__web_search` — quick web search
- `mcp__claude_ai_Research_Powerpack__deep_research` — in-depth multi-source research
- `mcp__claude_ai_Research_Powerpack__scrape_links` — read specific web pages
- `mcp__claude_ai_Research_Powerpack__search_reddit` — community discussions
- `mcp__claude_ai_Research_Powerpack__get_reddit_post` — specific Reddit threads

## Best Practice

Always verify API behavior against the latest docs before making changes to tool handlers or schemas. Google's Tag Manager API can change without notice — don't assume cached knowledge is current.
