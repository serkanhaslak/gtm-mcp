---
paths:
  - "wrangler.jsonc"
  - "global.d.ts"
  - "worker-configuration.d.ts"
---

# Cloudflare Workers Rules

## Infrastructure

- **Durable Objects**: `MCP_OBJECT` binding → `GoogleTagManagerMCPServer` class (stateful MCP sessions)
- **KV Namespace**: `OAUTH_KV` → OAuth token/state storage
- **Node.js compatibility**: enabled (required for googleapis)
- **Observability**: enabled

## Environment Interface

The `Env` type in `global.d.ts` defines all bindings:

- `OAUTH_KV: KVNamespace`
- `GOOGLE_CLIENT_ID: string`
- `GOOGLE_CLIENT_SECRET: string`
- `COOKIE_ENCRYPTION_KEY: string`
- `WORKER_HOST: string`
- `MCP_OBJECT: DurableObjectNamespace`

## Deployment

- Domain: `gtm-mcp.stape.ai`
- Dev port: `8788`
- Compatibility date: `2025-03-10`
- After changing bindings in `wrangler.jsonc`, run `npm run cf-typegen` to regenerate types
