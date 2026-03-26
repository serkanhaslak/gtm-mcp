---
paths:
  - "src/schemas/**/*.ts"
---

# Schema Development Rules

## Structure

- All schemas use **Zod** (`z.object({...})`)
- Mirror **Google Tag Manager API v2** resource structure exactly
- File name: `<Resource>Schema.ts` (PascalCase, e.g., `TagSchema.ts`)
- Export name: `<Resource>Schema` (e.g., `TagSchema`)

## Conventions

- Use `.optional()` for nullable/optional API fields
- Use `.describe()` on every field to document its purpose
- ID fields (`accountId`, `containerId`, etc.) are always `z.string()`
- Nested objects use separate schemas (e.g., `ParameterSchema`, `ConditionSchema`)
- Keep schemas in sync with Google's official API types from `googleapis`
- Import Google types: `import { tagmanager_v2 } from "googleapis"`
