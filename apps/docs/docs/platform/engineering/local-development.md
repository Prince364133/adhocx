---
title: Local Development Setup
description: Prerequisites, installation and running the AdhocX workspace locally.
---

# Local Development Setup

**Evidence status:** Verified against root scripts, workspace manifests,
Docker Compose and app launcher scripts.

## Prerequisites

| Tool | Purpose |
|---|---|
| Node.js 20+ | Workspace, API and web applications |
| pnpm 10+ | Workspace package management |
| Docker and Docker Compose | PostgreSQL/PostGIS and Redis |
| Flutter stable | Mobile and employee web/native apps |
| Git | Source and documentation version control |
| PostgreSQL client (optional) | Migration/debugging and data checks |

## Install Workspace Dependencies

```bash
pnpm install --frozen-lockfile
```

The root predevelopment script prepares:

- Shared contracts
- Shared domain-core package
- Prisma generated client

```bash
pnpm run predev:all
```

The dependency preparation script checks whether `node_modules` is aligned
with `pnpm-lock.yaml` and performs a frozen install when needed.

## Start Infrastructure

```bash
docker compose up -d postgres redis
docker compose ps
```

Default development ports:

| Service | Port |
|---|---|
| PostgreSQL | 5432 |
| Redis | 6379 |
| API | 7001 |
| Admin | 7002 |
| Mobile | 7003 |
| Ops | 7004 |
| Employee | 7005 |
| Corporate | 7006 |
| Documentation | 7007 |
| Marketing | 4321 |

## Start the Workspace

```bash
pnpm run dev:all
```

Individual commands:

```bash
pnpm run dev:api
pnpm run dev:admin
pnpm run dev:ops
pnpm run dev:corporate
pnpm run dev:marketing
pnpm run dev:docs
pnpm run dev:mobile
pnpm run dev:employee
```

The root `dev` scripts run the predevelopment preparation step before
workspace startup.

## API Configuration

The API expects a PostgreSQL `DATABASE_URL` and Redis configuration.
Production secrets must not be copied into local files or documentation.

Minimum local categories:

- `DATABASE_URL`
- `REDIS_URL`
- JWT access/refresh secrets
- API port and prefix
- Test-only OTP policy values

Environment files are loaded by the NestJS config module with test
environment handling that does not load repository live `.env` files.

## Database Setup

```bash
cd apps/api
npx prisma generate
npx prisma db push
```

For migration-based environments, use:

```bash
npx prisma migrate deploy
```

Never use `db push` or destructive reset commands against production
databases.

## Flutter Setup

```bash
cd apps/mobile
flutter pub get
pnpm run dev:mobile
```

For the employee app:

```bash
cd apps/employee_app
flutter pub get
pnpm run dev:employee
```

Native Android apps use the emulator URL `10.0.2.2:7001/api/v1`.
Flutter web uses localhost and host-aware API resolution.
