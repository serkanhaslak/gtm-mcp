---
name: add-gtm-tool
description: Step-by-step workflow for adding a new Google Tag Manager API tool to the MCP server. Use when creating a new GTM resource tool (e.g., a new CRUD endpoint).
---

# Add New GTM Tool Workflow

Follow these steps in order to add a new GTM resource tool to the server.

## Step 1: Research the GTM API Resource

- Use **Context7** (`mcp__claude_ai_Context7__resolve-library-id` → `query-docs`) to look up the `googleapis` Tag Manager v2 resource
- Use **Research Powerpack** (`mcp__claude_ai_Research_Powerpack__web_search`) to check for the latest API docs
- Identify all CRUD operations available and their parameters

## Step 2: Create the Zod Schema

- Create `src/schemas/<Resource>Schema.ts`
- Mirror the GTM API v2 resource structure
- Add `.describe()` to every field
- Use `.optional()` for nullable fields
- Reference: `src/schemas/TagSchema.ts`

## Step 3: Create the Tool Handler

- Create `src/tools/<resource>Actions.ts`
- Follow the registration pattern from `src/tools/tagActions.ts`
- Tool name: `gtm_<resource>`
- Include all CRUD actions via `z.enum(["create", "get", "list", "update", "remove"])`
- Use `createErrorResponse()` for all error handling
- Use `paginateArray()` for list operations
- Define `PayloadSchema` by omitting ID fields from the resource schema

## Step 4: Register the Tool

- Import in `src/tools/index.ts`
- Add to the `tools` array

## Step 5: Validate

```bash
npm run lint
npm run build
```

## Step 6: Test

- Run `npm run dev` to start local server
- Test each CRUD operation via MCP client
