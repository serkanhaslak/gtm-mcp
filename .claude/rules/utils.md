---
paths:
  - "src/utils/**/*.ts"
---

# Utility Module Rules

## Barrel Export

- All utilities MUST be exported from `src/utils/index.ts`
- Add new exports to the barrel when creating new utilities

## Key Utilities

- `getTagManagerClient(props)` — creates authenticated GTM API client; handles token validation
- `createErrorResponse(message, error?)` — standardized error responses with Google API error parsing
- `paginateArray(array, page, itemsPerPage)` — array-based pagination for list operations
- `versionPaginationUtils` — API-token-based pagination for version listing
- `log(...)` — logging utility (writes to stderr)
- `authorizeUtils` — OAuth flow: URL generation, token exchange, refresh
- `loadEnv()` — environment variable loading from dotenv

## Auth Flow Utilities

- `apisHandler` — HTTP handlers for `/authorize`, `/token`, `/register` endpoints
- `workersOAuthUtils` — cookie encryption, approval dialog, client tracking
- `handleTokenExchangeCallback` — Google OAuth token exchange
