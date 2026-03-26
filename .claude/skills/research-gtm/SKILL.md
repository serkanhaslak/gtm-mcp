---
name: research-gtm
description: Research workflow for investigating GTM API changes, MCP SDK updates, or library documentation. Use when you need to gather information before making code changes.
---

# GTM Research Workflow

Use this workflow to research before making changes to the GTM MCP server.

## Step 1: Define the Research Question

Clarify exactly what needs to be investigated:

- GTM API change or new feature?
- MCP SDK update or breaking change?
- Cloudflare Workers / Hono / Zod documentation lookup?
- Debugging a specific Google API error?

## Step 2: Library Documentation (Context7)

For specific library API lookups:

1. Resolve the library ID:
   - `mcp__claude_ai_Context7__resolve-library-id` with the library name
   - Common libraries: `@modelcontextprotocol/sdk`, `googleapis`, `hono`, `zod`, `@cloudflare/workers-types`
2. Query the docs:
   - `mcp__claude_ai_Context7__query-docs` with your specific question

## Step 3: Web Research (Research Powerpack)

For broader information gathering:

- **Quick search**: `mcp__claude_ai_Research_Powerpack__web_search` — for specific questions
- **Deep dive**: `mcp__claude_ai_Research_Powerpack__deep_research` — for complex topics
- **Read a page**: `mcp__claude_ai_Research_Powerpack__scrape_links` — to read a specific URL
- **Community**: `mcp__claude_ai_Research_Powerpack__search_reddit` — for developer discussions

## Step 4: Cross-Reference with Codebase

- Check current implementation against findings
- Identify affected files and functions
- Note any breaking changes or deprecations

## Step 5: Summarize Findings

Provide:

1. **What was found** — key facts and changes
2. **Impact on codebase** — which files/tools are affected
3. **Recommended actions** — specific changes with file paths
4. **Risk assessment** — breaking changes, migration needs
