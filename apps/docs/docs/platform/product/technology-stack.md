---
title: Technology Stack
description: Verified frameworks, languages, databases, infrastructure and development tools in the AdhocX repository.
---

# Technology Stack

## Workspace

| Layer | Technology | Evidence |
|---|---|---|
| Repository | pnpm workspace monorepo | `pnpm-workspace.yaml` |
| Task orchestration | Turborepo | `turbo.json` |
| Package management | pnpm 10 | `package.json` |
| Shared contracts | TypeScript | `packages/contracts` |
| Shared domain logic | TypeScript and H3 | `packages/domain-core` |

## Application Technologies

| Application | Language | Framework | Package/runtime |
|---|---|---|---|
| API | TypeScript | NestJS 10 | Node.js, pnpm |
| Admin | TypeScript | Next.js 14 App Router | React 18 |
| Ops | TypeScript | Next.js 14 App Router | React 18 |
| Corporate | TypeScript | Next.js 14 App Router | React 18 |
| Mobile | Dart | Flutter | Flutter stable SDK |
| Employee App | Dart | Flutter | Flutter stable SDK |
| Marketing | Astro, TypeScript | Astro 4 with React 18 islands | Static output |
| Documentation | TypeScript, MD/MDX | Docusaurus 3.10 | React 18 |

## Backend and Data

| Component | Verified technology |
|---|---|
| API framework | NestJS and its Express-compatible platform |
| ORM | Prisma 6 |
| Database | PostgreSQL |
| Geospatial database | PostGIS |
| Cache and pub/sub | Redis |
| Validation | NestJS `ValidationPipe` and class-validator |
| API schema | Swagger/OpenAPI |
| Authentication | JWT access and refresh tokens |
| Password hashing | PBKDF2 utility |

## Integrations

| Area | Implemented library/provider reference |
|---|---|
| Maps and routing | Google Maps, Routes, geocoding and travel-matrix services |
| Geospatial matching | H3 |
| Payments | Razorpay |
| Notifications | Firebase, MSG91 |
| Email | Nodemailer/SMTP |
| KYC | DigiO and DigiLocker |
| Object storage | S3-compatible/Cloudflare R2 or local uploads |

## Infrastructure

| Area | Technology |
|---|---|
| Containers | Docker |
| Local services | Docker Compose |
| Reverse proxy | Nginx |
| Cloud infrastructure | AWS EC2 deployment workflow |
| Container registry | GitHub Container Registry |
| CI/CD | GitHub Actions |
| Marketing deployment | Astro static output, Vercel configuration and Cloudflare scripts |

## Testing

The repository contains extensive Jest unit, integration and simulation
coverage under `apps/api/test`, plus scripts for live dispatch, coupon,
database, mobile and full-stack simulations.

Frontend test frameworks are not uniformly present. Flutter test dependencies
exist in the Flutter manifests, and Flutter test execution should be
documented as a separate status in Phase 17.
