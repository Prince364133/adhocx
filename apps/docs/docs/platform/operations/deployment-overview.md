---
title: Deployment Architecture and Boundaries
description: Source-mapped AdhocX deployment units, host routing, CI/CD paths, and operational caveats.
---

# Deployment Architecture and Boundaries

**Evidence status:** Checked against `docker-compose.prod.yml`, Dockerfiles,
Nginx configuration, AWS and Cloudflare workflows. This documents declared
repository configuration; it does not verify that any cloud account,
container, DNS record or production deployment is currently active.

## What is deployed by the checked-in production Compose file

The root `docker-compose.prod.yml` declares six services on a Docker network:

| Service | Responsibility | Health and persistence evidence |
|---|---|---|
| `postgres` | PostgreSQL with PostGIS for application data | `pg_isready`; named `postgres_data` volume |
| `redis` | Cache, realtime and shared ephemeral state | `redis-cli ping`; append-only mode and named `redis_data` volume |
| `api` | NestJS modular-monolith HTTP API | `/api/v1/health`; waits for Postgres and Redis health |
| `admin` | Next.js Admin application | HTTP root; waits for API container |
| `mobile` | Flutter Web build served by Nginx | `/healthz`; native Android/iOS builds are separate |
| `gateway` | Nginx reverse proxy and TLS termination | Nginx `/healthz`; depends on app containers |

The Compose file supplies environment-variable defaults, including for
sensitive settings. They are not production-safe secret management. Supply
approved external secret values and reject fallback defaults before using the
stack in a production environment.

The separate `infrastructure/docker/docker-compose.yml` is a smaller local
stack for Postgres, Redis, API and Admin. It does not declare Mobile, the
gateway, Ops, Corporate, Employee App or Docusaurus.

## Request and domain routing

`infrastructure/nginx/production.conf` declares these host mappings:

| Host/path | Destination |
|---|---|
| `app.adhocx.com`, `m.adhocx.com` | Flutter Web (`mobile` upstream); `/api/v1/` is proxied to API |
| `admin.adhocx.com` | Admin (`admin` upstream); `/api/v1/` is proxied to API |
| `api.adhocx.com` | API (`api` upstream) |
| Catch-all `/api/` and `/docs` | API, including its Swagger route |
| Catch-all `/admin/` | Admin |
| Catch-all `/mobile/` and `/app/` | Flutter Web |
| Catch-all `/` | Redirect to `https://www.adhocx.com` |
| `adhocx.com` and `www.adhocx.com` | Commented as hosted by the Marketing Cloudflare Worker, not EC2 |

The `/docs` route in Nginx is the API's documentation endpoint; it is not the
Docusaurus documentation application. No production deployment target for
Docusaurus is declared in the inspected Compose/workflow files.

## Deployment units and build boundaries

| Unit | Build source | Declared deployment path |
|---|---|---|
| API | `apps/api/Dockerfile` — Node 20 multi-stage build, Prisma generation, Nest compilation, non-root runtime | Production Compose/EC2 workflow; a separate ECS workflow also exists |
| Admin | `apps/admin/Dockerfile` — Next.js standalone build | Production Compose/EC2 workflow; a separate ECS workflow also exists |
| Mobile Web | `apps/mobile/Dockerfile` — Flutter Web release output served by Nginx | Production Compose/EC2 workflow |
| Mobile native | Flutter Android APK/AAB and unsigned iOS build | `mobile-release.yml` publishes artifacts to a GitHub Release |
| Marketing | `apps/marketing/Dockerfile` exists, but the checked-in production path is Astro build and Cloudflare Worker deployment | `deploy-marketing-cloudflare.yml`; not in production Compose or the GHCR image matrix |
| Ops, Corporate, Employee App and Docusaurus | No production Docker/Compose or deployment workflow was found for these workspaces in this audit | Deployment target and owner are not established by checked-in configuration |

## Declared deployment workflows

There are multiple, materially different AWS paths:

1. `production-deploy.yml` builds API/Admin/Mobile images and runs an EC2 SSH
   deployment using `docker-compose.prod.yml`.
2. `docker-publish.yml` builds API/Admin images and pushes GHCR tags. It has
   optional ECR authentication steps, but the configured image tags/push step
   target GHCR.
3. `deploy-aws.yml` is labelled for ECS Fargate/App Runner but its commands
   update ECS services. Its DB push step can continue after a connection
   failure, and it does not demonstrate that the newly built GHCR images are
   available to ECS.

Treat these as source-declared workflows, not a single verified rollout
design. Confirm the authoritative target, image registry, cluster/EC2 state,
approvals, data store and DNS with the service owner before dispatching any
deployment. See the [CI/CD and release guide](./ci-cd.md).

## Production-use blockers and unverified state

- The EC2 workflow writes production environment configuration with literal
  fallback values for sensitive settings when GitHub secrets are missing.
  Do not copy those values into documentation or use the workflow until the
  secret defaults are removed and owners confirm the authorized secret source.
- The production workflow applies Prisma `db push --accept-data-loss`; it does
  not run a reviewed `prisma migrate deploy` sequence and has no automatic
  database rollback. See [database migration and recovery](./database-migrations-and-backups.md).
- Nginx expects TLS files at `/etc/nginx/ssl/cert.pem` and
  `/etc/nginx/ssl/key.pem`. The EC2 workflow generates a self-signed
  certificate if files are absent; no renewal or DNS automation was found.
- The EC2 provisioning script creates security-group ingress rules for SSH
  and application ports with broad source ranges. Review and restrict network
  rules before running it.
- Compose volumes provide persistence, not backup. No scheduled Postgres or
  Redis backup job or verified restore run was found.
- The workflow's required gateway health check does not prove that the API is
  healthy: its separate API health request is allowed to fail.
- Current cloud account configuration, live DNS, certificate validity,
  active image tags, data-store location and successful deployment history
  remain unverified.

## Source references

- `docker-compose.prod.yml` and `infrastructure/docker/docker-compose.yml`
- `infrastructure/nginx/production.conf`
- `apps/api/Dockerfile`, `apps/admin/Dockerfile`, `apps/mobile/Dockerfile`, and `apps/marketing/Dockerfile`
- `.github/workflows/production-deploy.yml`, `docker-publish.yml`, `deploy-aws.yml`, `deploy-marketing-cloudflare.yml`, and `mobile-release.yml`
- `scripts/aws/provision-ec2.ps1` and `scripts/aws/user-data.sh`
