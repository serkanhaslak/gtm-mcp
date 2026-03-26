---
paths:
  - "global.d.ts"
  - "src/server.ts"
---

# Deployment Rules

## Infrastructure

- **Runtime**: Node.js on Railway
- **Volume**: `/data` — stores per-user credentials at `/data/users/<apiKey>.json`
- **Domain**: `gtm-mcp.pragmaticgrowth.com` (DNS through Cloudflare)

## Environment Interface

The `AppEnv` type in `global.d.ts` defines all required config:

- `GOOGLE_CLIENT_ID: string` — Google OAuth
- `GOOGLE_CLIENT_SECRET: string` — Google OAuth
- `HOST_URL: string` — Server hostname
- `OAUTH_CLIENT_ID: string` — MCP OAuth shim
- `OAUTH_CLIENT_SECRET: string` — MCP OAuth shim
- `CREDENTIALS_PATH?: string` — Base path for user data (default: `/data`)
- `HOSTED_DOMAIN?: string` — Restrict Google auth to domain

## Deployment

- Push to `main` triggers Railway auto-deploy
- Cloudflare WAF blocks certain paths — avoid bare `/token` and `/terms`
- Use `/oauth/token` and `/service-terms` instead
