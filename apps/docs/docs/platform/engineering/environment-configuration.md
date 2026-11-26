---
title: Environment Configuration
description: Safe environment-variable categories and redacted configuration rules.
---

# Environment Configuration

**Evidence status:** Verified against root and app configuration code.
This page intentionally does not include live values.

## Environment Layers

| Layer | Use |
|---|---|
| Root `.env` | Shared local/deployment configuration |
| App-specific environment | Overrides for frontend or API build |
| Shell variables | CI, Docker and local process overrides |
| GitHub Actions secrets | CI/CD credentials |
| Server `.env.production` | Deployed API and container configuration |

Environment files matching `.env*` are ignored except approved templates.

## Core Categories

### API

- `NODE_ENV`
- `PORT`
- `API_PREFIX`
- `LOG_LEVEL`
- JWT access/refresh settings
- OTP settings

### Database

- `DATABASE_URL`
- PostgreSQL container user/password/database
- Migration mode

### Redis

- `REDIS_URL`
- host/port/TLS
- optional dedicated Pub/Sub URL

### Frontends

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`
- Google Maps browser key
- Docusaurus URL/API docs URL

### Integrations

- Maps
- Firebase
- MSG91
- SMTP
- Razorpay
- DigiO
- R2/S3
- Corporate payout provider

## Safe Configuration Rules

- Never commit private keys or provider secrets.
- Never place server secrets in `NEXT_PUBLIC_*` variables.
- Never document live webhook signatures or tokens.
- Use development/test secret values only for throwaway environments.
- Production startup must reject weak/default JWT secrets.
- Separate test database and Redis instances from production.
- Rotate secrets if a repository or workflow exposes them.
