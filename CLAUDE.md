# GTM MCP Server by Pragmatic Growth

## Project Overview

Multi-tenant remote MCP server providing full Google Tag Manager API access via per-user OAuth. Deployed on **Railway** at `gtm-mcp.pragmaticgrowth.com`. Version managed via `package.json`.

## Commands

```bash
npm run build        # TypeScript compile → dist/
npm run dev          # Local dev server
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
```

## Tech Stack

- **TypeScript** (ES2022, strict mode)
- **MCP SDK** (`@modelcontextprotocol/sdk`) — protocol implementation
- **googleapis** — Google Tag Manager API v2 client
- **Hono** — web framework
- **Zod** — schema validation for tool inputs
- **Railway** — runtime (volume storage for per-user credentials)

## Architecture

```
src/
├── server.ts         # Hono app, MCP endpoint, per-user session management
├── index.ts          # MCP server factory (createMcpServer)
├── tools/            # 19 tool modules (CRUD for each GTM resource)
│   └── index.ts      # Barrel export — tools array
├── schemas/          # Zod validation schemas (mirror GTM API v2 types)
├── utils/            # Auth, error handling, pagination, logging, user store
│   ├── apisHandler.ts      # OAuth shim routes, static pages
│   ├── authorizeUtils.ts   # Google OAuth helpers
│   ├── userStore.ts        # Per-user credential CRUD (file-based)
│   ├── renderPageLayout.ts # Shared HTML layout with PG branding
│   ├── render*Page.ts      # Landing, privacy, terms page templates
│   └── index.ts            # Barrel export
├── models/           # TypeScript interfaces (McpAgentModel)
└── constants/        # Tool name constants
```

## Multi-Tenant Auth Flow

1. MCP client calls `POST /register` → gets OAuth shim credentials
2. Client redirects to `GET /authorize` → server redirects to Google OAuth
3. User authenticates with Google, grants GTM permissions
4. Google redirects to `/callback` → server generates per-user API key, stores credentials in `/data/users/<apiKey>.json`
5. Server redirects back to MCP client with auth code
6. Client exchanges code at `POST /oauth/token` → gets API key as bearer token
7. Client uses `POST /mcp` with `Bearer <apiKey>` → server looks up user, creates MCP session with their Google credentials

Google token refresh happens transparently per-user on each MCP request.

## Tool Pattern

Each tool module exports a function `(server: McpServer, { props }: McpAgentToolParamsModel) => void` that calls `server.tool()` with:

- Name: `gtm_<resource>` (e.g., `gtm_tag`, `gtm_container`)
- Zod schema for inputs
- Async handler returning `{ content: [{ type: "text", text: JSON.stringify(result) }] }`
- Error handling via `createErrorResponse()` from `src/utils/`

## Code Conventions

- **ESLint strict**: no `any`, explicit return types, Prettier formatting
- **Zod schemas** mirror Google Tag Manager API v2 structure; use `.optional()` for nullable
- **Barrel exports**: utils and tools re-export from `index.ts`
- **Error handling**: always use `createErrorResponse()` — never raw throws
- **Pagination**: use `paginateArray()` for list tools, `versionPaginationUtils` for versions

## Environment Variables

Required in Railway service or `.dev.vars`:

| Variable               | Required | Description                                |
| ---------------------- | -------- | ------------------------------------------ |
| `GOOGLE_CLIENT_ID`     | Yes      | Google OAuth client ID                     |
| `GOOGLE_CLIENT_SECRET` | Yes      | Google OAuth client secret                 |
| `HOST_URL`             | Yes      | Server hostname                            |
| `OAUTH_CLIENT_ID`      | Yes      | MCP OAuth shim client ID                   |
| `OAUTH_CLIENT_SECRET`  | Yes      | MCP OAuth shim client secret               |
| `CREDENTIALS_PATH`     | No       | Base path for user data (default: `/data`) |
| `HOSTED_DOMAIN`        | No       | Restrict Google auth to a specific domain  |

## Deployment

- Push to `main` triggers Railway auto-deploy
- Railway project with volume mounted at `/data`
- Per-user credentials stored at `/data/users/<apiKey>.json`
- Domain: `gtm-mcp.pragmaticgrowth.com` (DNS through Cloudflare)
- Cloudflare WAF blocks some paths (e.g., `/token`, `/terms` and `/service-terms`) — use `/oauth/token` and `/service-terms`

## Research & Documentation Tools

When working on this project, use these MCP tools:

- **Context7** — Look up library docs (MCP SDK, googleapis, Hono, Zod):
  1. `mcp__claude_ai_Context7__resolve-library-id` to find the library
  2. `mcp__claude_ai_Context7__query-docs` to query specific documentation
- **Research Powerpack** — Research GTM API changes, best practices, debugging:
  - `mcp__claude_ai_Research_Powerpack__web_search` for general search
  - `mcp__claude_ai_Research_Powerpack__deep_research` for in-depth research
  - `mcp__claude_ai_Research_Powerpack__scrape_links` to read specific pages

## Available Skills & Slash Commands

### Project-Specific Skills

- `/add-gtm-tool` — step-by-step workflow for adding a new GTM API tool (schema → handler → register → validate)
- `/research-gtm` — research workflow using Context7 + Research Powerpack before making changes

### Development Workflow (Superpowers)

- `/commit` — intelligent multi-commit with auto-push
- `/simplify` — review changed code for reuse, quality, and efficiency
- `superpowers:brainstorming` — explore intent and requirements before building features
- `superpowers:writing-plans` — create detailed implementation plans for multi-step tasks
- `superpowers:executing-plans` — execute implementation plans with review checkpoints
- `superpowers:test-driven-development` — TDD workflow: write tests first, then implement
- `superpowers:systematic-debugging` — structured debugging: reproduce → hypothesize → verify
- `superpowers:subagent-driven-development` — delegate independent tasks to parallel subagents
- `superpowers:dispatching-parallel-agents` — run 2+ independent tasks concurrently
- `superpowers:using-git-worktrees` — isolated feature work in git worktrees
- `superpowers:verification-before-completion` — verify with real commands before claiming done
- `superpowers:finishing-a-development-branch` — merge, PR, or cleanup guidance when done

### Code Review

- `code-review:code-review` — full code review of a pull request
- `superpowers:requesting-code-review` — request review after completing work
- `superpowers:receiving-code-review` — handle review feedback with technical rigor

### MCP Server Development

- `mcp-server-dev:build-mcp-server` — guidance for building/extending this MCP server
- `mcp-server-dev:build-mcp-app` — add interactive UI widgets to MCP tools
- `mcp-server-dev:build-mcpb` — bundle MCP server for distribution

### Project Maintenance

- `claude-md-management:revise-claude-md` — update CLAUDE.md with session learnings
- `claude-md-management:claude-md-improver` — audit and improve CLAUDE.md quality
- `skill-creator:skill-creator` — create new skills or improve existing ones
- `superpowers:writing-skills` — create and verify new skills

### Infrastructure

- `railway:use-railway` — Railway deployment, services, and troubleshooting

### Custom Agents

- `@gtm-tool-builder` — specialized agent for creating new GTM tool handlers
- `@gtm-researcher` — research agent using Research Powerpack + Context7
- `@gtm-reviewer` — code review agent with GTM-specific checklist

## Rules

@.claude/rules/
