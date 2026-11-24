---
title: Developer Workflow
description: Coding conventions, package boundaries, debugging and contribution workflow.
---

# Developer Workflow

**Evidence status:** Verified against workspace scripts, package boundaries
and repository configuration.

## Workspace Boundaries

Code belongs in one of these areas:

| Area | Use |
|---|---|
| `apps/api` | Backend modules and corporate domain |
| `apps/admin` | Platform administration |
| `apps/ops` | Operational control |
| `apps/corporate` | Corporate portal |
| `apps/mobile` | Vendor/driver Flutter app |
| `apps/employee_app` | Employee Flutter app |
| `apps/marketing` | Astro marketing site |
| `apps/docs` | Docusaurus documentation |
| `packages/contracts` | Shared TypeScript contracts |
| `packages/domain-core` | Pure TypeScript domain models |
| `scripts` | Operational and verification tooling |

## Shared Package Workflow

Build shared packages before API consumption when dependencies change:

```bash
pnpm --filter @adhocx/contracts run build
pnpm --filter @adhocx/domain-core run build
pnpm --filter @adhocx/api exec prisma generate
```

The root predevelopment script performs this sequence.

## Coding Conventions

- Use existing NestJS module/controller/service structure.
- Put cross-application contract types in `@adhocx/contracts`.
- Keep pure domain rules in `@adhocx/domain-core`.
- Keep HTTP, provider and persistence concerns outside domain aggregates.
- Use server guards and resource ownership for protected actions.
- Use DTO validation and state validation for mutations.
- Keep secrets in environment variables.
- Prefer cross-links and one source of truth in documentation.

## Debugging

### API

```bash
pnpm run dev:api
```

NestJS watch mode rebuilds and restarts the API. Use the health endpoint:

```text
http://localhost:7001/api/v1/health
```

Swagger is available outside production or where explicitly enabled:

```text
http://localhost:7001/docs
```

### Next.js

The Admin, Ops and Corporate applications expose:

- `dev`
- `build`
- `start`
- `lint`
- `typecheck`

Use the app-specific `package.json` scripts and port.

### Flutter

The Flutter scripts:

- detect Flutter on PATH or common/Puro locations
- set API Dart defines for web
- start web-server or Android/emulator targets
- maintain file watchers/hot reload where configured

Flutter SDK cache errors can require rebuilding or reinstalling the Flutter
web SDK rather than changing application source.

## Git and Review Workflow

- Create focused branches for one implementation concern.
- Keep application source changes separate from documentation phases.
- Do not commit `.env`, key, credential or upload files.
- Review generated Prisma and build output changes before merging.
- Run targeted lint/typecheck/build commands before a pull request.
- Record migrations and provider configuration changes in documentation.
