---
paths:
  - "src/tools/**/*.ts"
---

# GTM Tool Development Rules

## Naming Convention

- Tool name: `gtm_<resource>` (e.g., `gtm_tag`, `gtm_container`, `gtm_workspace`)
- File name: `<resource>Actions.ts` (e.g., `tagActions.ts`)
- Export name: `<resource>Actions` (e.g., `tagActions`)

## Registration Pattern

```typescript
export const resourceActions = (
  server: McpServer,
  { props }: McpAgentToolParamsModel,
): void => {
  server.tool(
    "gtm_resource",
    "description",
    {
      /* zod schema */
    },
    async (params) => {
      // implementation
    },
  );
};
```

## Required Imports

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { McpAgentToolParamsModel } from "../models/McpAgentModel";
import {
  createErrorResponse,
  getTagManagerClient,
  log,
  paginateArray,
} from "../utils";
```

## Conventions

- Use `action: z.enum([...])` for CRUD operations (create, get, list, update, remove, revert)
- Always wrap handler in try-catch using `createErrorResponse()` for errors
- Return format: `{ content: [{ type: "text", text: JSON.stringify(result) }] }`
- Use `paginateArray()` for list operations with `page` and `itemsPerPage` params
- Define `ITEMS_PER_PAGE = 20` constant per tool
- Use `PayloadSchema` pattern: omit ID fields from the resource schema for create/update
- Get authenticated client via `getTagManagerClient(props)`
- Register new tools in `src/tools/index.ts` barrel export
