# Google Tag Manager MCP Server

## Project Overview

Remote MCP server providing full Google Tag Manager API access via OAuth. Built by **stape-io**, deployed on **Cloudflare Workers** at `gtm-mcp.stape.ai`. Version managed via `package.json`.

## Commands

```bash
npm run build        # TypeScript compile → dist/ (also runs on postinstall)
npm run dev          # Local dev server (port 8788)
npm run deploy       # Deploy to Cloudflare Workers
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run cf-typegen   # Regenerate Cloudflare types
```

## Tech Stack

- **TypeScript** (ES2022, strict mode)
- **MCP SDK** (`@modelcontextprotocol/sdk`) — protocol implementation
- **googleapis** — Google Tag Manager API v2 client
- **Hono** — web framework for Workers
- **Zod** — schema validation for tool inputs
- **Cloudflare Workers** — runtime (Durable Objects for state, KV for OAuth)
- **OAuth Provider** (`@cloudflare/workers-oauth-provider`) — Google OAuth flow

## Architecture

```
src/
├── index.ts          # MCP server entry point (GoogleTagManagerMCPServer class)
├── tools/            # 19 tool modules (CRUD for each GTM resource)
│   └── index.ts      # Barrel export — tools array
├── schemas/          # Zod validation schemas (mirror GTM API v2 types)
├── utils/            # Auth, error handling, pagination, logging
├── models/           # TypeScript interfaces (McpAgentModel)
└── constants/        # Tool name constants
```

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

Required in `wrangler.jsonc` secrets or `.dev.vars`:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth
- `COOKIE_ENCRYPTION_KEY` — session cookie encryption
- `WORKER_HOST` — deployment hostname
- `HOSTED_DOMAIN` (optional) — restrict Google auth to domain

## OAuth Flow

1. Client connects to `/mcp` or `/sse`
2. Redirects to `/authorize` → Google OAuth consent
3. Token exchange at `/token`, stored in `OAUTH_KV`
4. Tools use `getTagManagerClient()` to get authenticated API client

## Git Workflow

- PRs merge to `main`
- Push to `main` triggers: NPM publish (`.github/workflows/main.yml`) + Cloudflare deploy (`.github/workflows/deploy.yml`)
- Node 18 for NPM publish, Node 20 for Cloudflare deploy

## Research & Documentation Tools

When working on this project, use these MCP tools:

- **Context7** — Look up library docs (MCP SDK, googleapis, Hono, Zod, Cloudflare Workers):
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
