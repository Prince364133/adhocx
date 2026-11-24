---
title: Health Checks and Recovery
description: Actual API/container health semantics, safe diagnosis order and recovery limits for AdhocX.
---

# Health Checks and Recovery

**Evidence status:** Health response behavior is checked against the NestJS
health controller/service, Compose health checks and Nginx configuration.
Recovery steps are operational guidance; no live monitoring, incident or
restore environment was accessed.

## API probes

The API is mounted with the `api/v1` prefix. Health routes are:

| Endpoint | Implemented behavior | Interpretation |
|---|---|---|
| `/api/v1/health` | Checks Postgres with a query and Redis with a short set/get; reports database, Redis, memory, uptime, timestamp and overall `OK`, `DEGRADED` or `DOWN` | Use for dependency diagnosis; a failure may indicate either shared service |
| `/api/v1/health/live` | Returns `UP` and a timestamp without checking dependencies | Confirms the process responds, not that it can serve dependency-backed traffic |
| `/api/v1/health/ready` | Runs the health report and returns `503` only when the overall status is `DOWN` | `DEGRADED` is still reported as ready by the current implementation; do not treat this as a strict all-dependencies-ready gate |

These are source-defined semantics. Check response bodies/status and container
logs for diagnosis; do not infer service health from a single boolean.

## Container and gateway probes

| Component | Configured probe | Caveat |
|---|---|---|
| Postgres | `pg_isready` | Does not verify application schema or backup integrity |
| Redis | `redis-cli ping` | Does not verify data freshness or cross-instance consistency |
| API container | `/api/v1/health` in Compose | Reports dependencies; Dockerfile also defines a health check |
| Admin | HTTP `/` | Confirms response, not an authenticated user workflow |
| Mobile Web | Nginx `/healthz` | Confirms static server response, not API connectivity |
| Gateway | Nginx `/healthz` | Returns a static success response and does not probe all upstreams |

`production-deploy.yml` requires the local gateway `/healthz` request but
allows its separate `/api/v1/health` request to fail. Therefore a successful
workflow message is not sufficient proof that the API or user workflows are
healthy.

## First-response procedure

1. Confirm which environment, host and user workflow is affected. Record the
   time, symptom and last known successful request without copying
   credentials or personal data into the incident record.
2. Check the API `live`, comprehensive `health` and `ready` endpoints
   separately. Inspect container status and logs for the affected service.
3. Check Postgres and Redis health independently. Compare the result with
   `/api/v1/health` component status and current application symptoms.
4. Check the relevant deployment workflow, image reference, gateway routing,
   DNS/TLS and environment configuration. A running container is not proof of
   a valid deployment.
5. Escalate data loss, suspected credential exposure, payment inconsistency,
   unsafe dispatch or an active SOS incident to the responsible owner. Do
   not perform a production restore, schema push, manual payment replay or
   alert-state edit without authorization.
6. Preserve logs, timestamps, workflow run identifiers and affected
   resource identifiers. Redact secrets and personal information.
7. After an approved recovery, verify health and one safe representative
   business workflow; record what was checked and any remaining degradation.

## Component-specific notes

### API unavailable

- Compare `/api/v1/health/live` with `/api/v1/health` to distinguish a
  responding process from dependency failure.
- Inspect the API container logs and deployment image/configuration.
- Confirm Postgres and Redis before restarting the API.
- Restart only through the approved environment procedure; no self-healing
  or rollback guarantee is established by these docs.

### PostgreSQL unavailable or inconsistent

- Check the database container/service and `pg_isready`, then confirm storage
  and the authoritative production database with the database owner.
- The Compose file defines a persistent volume, not a backup policy.
- Do not remove Compose volumes, run `db push --accept-data-loss`, or restore
  over a source database as a diagnostic step.
- Use the [migration/backup runbook](./database-migrations-and-backups.md)
  and stop if a verified backup or restore target is unavailable.

### Redis unavailable

- Check the Redis process, connection settings and `redis-cli ping`.
- Some Corporate telemetry ingestion has an instance-local fallback; it is
  not a durable, cross-instance queue. Treat multi-instance state during an
  outage as potentially divergent until the feature owner reconciles it.
- After recovery, verify the affected live/dispatch workflow with the
  feature owner; repository configuration does not define a universal
  Redis replay or reconciliation command.

### Gateway, TLS or host routing

- A green `/healthz` can be a static Nginx response. Probe the actual
  upstream and API health endpoint independently.
- Check the hostname's Nginx virtual host, upstream resolution, certificate
  files and external DNS/Cloudflare state.
- See the [TLS and DNS guide](./tls-dns-and-certificates.md); automated
  certificate renewal and DNS updates were not found in the repository.

### User-facing SOS, dispatch or payment issue

- Use the existing [Ops live operations runbook](../../apps/ops/live-operations-runbook.md)
  and [SOS/reassignment guide](../../apps/ops/sos-and-reassignment-guide.md)
  for supported UI actions.
- For payment/webhook incidents, preserve provider event identifiers and
  consult the [API idempotency reference](../../apps/api/reference/webhooks-and-idempotency.md)
  before any retry. Do not replay a payment or webhook to “test” recovery.
- See [incident response and escalation](./incident-response-and-escalation.md)
  for incident ownership and handoff guidance.

## Limits and escalation

No repository-defined on-call rota, paging integration, SLO/RTO, scheduled
backup monitor or tested production restore procedure was found. The
[incident response guide](./incident-response-and-escalation.md) separates
recommended actions from established automation. Escalate environment
uncertainty to the authorized platform/data owner rather than improvising a
production command.

## Sources

- `apps/api/src/modules/health/health.controller.ts`
- `apps/api/src/modules/health/health.service.ts`
- `docker-compose.prod.yml` and `infrastructure/nginx/production.conf`
- `.github/workflows/production-deploy.yml`
- `apps/api/src/domains/corporate/tracking/corporate-gps-ingest.service.ts` and `corporate-telemetry-writer.service.ts`
