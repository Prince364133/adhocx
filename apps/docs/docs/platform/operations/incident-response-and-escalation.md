---
title: Incident Response and Escalation
description: Safe first-response guidance for AdhocX API, data, Redis, safety, dispatch, payment and storage incidents.
---

# Incident Response and Escalation

**Status:** Source-grounded response guidance with explicitly proposed
ownership. No paging service, on-call rota, response-time policy, incident
management system or production incident was verified in this audit.

## Response workflow

1. **Declare and scope.** Record the incident start time, affected
   environment, application, user workflow and observed impact. Assign an
   incident lead through the organization's approved channel.
2. **Preserve evidence.** Save relevant workflow run IDs, health responses,
   timestamps, service logs and affected resource IDs. Redact personal data,
   tokens, payment data and provider credentials.
3. **Triage dependencies.** Compare API liveness, comprehensive health and
   readiness probes; check the relevant Postgres, Redis, gateway, provider or
   client state. See [health and recovery](./health-and-recovery.md).
4. **Protect users and data.** Avoid repeated writes, duplicate payment
   retries, unreviewed route/alert status changes, volume deletion and
   production schema pushes. Use only approved containment actions.
5. **Escalate.** Bring in the service owner and any data, cloud, safety,
   finance or privacy owner required by the incident. The repository does
   not define contact names or paging routes.
6. **Recover with approval.** Use the owner-approved deployment, migration,
   restore or provider procedure. Verify a safe representative workflow
   afterward; a static gateway health response is not enough.
7. **Close and learn.** Record impact, timeline, verified cause, recovery
   evidence, follow-up owner and due date. Do not mark an incident resolved
   solely because containers restarted.

## Incident triage matrix

| Incident area | First checks and safe evidence | Escalation and guardrails |
|---|---|---|
| API unavailable or elevated errors | Compare `/api/v1/health/live`, `/api/v1/health` and `/api/v1/health/ready`; inspect API and gateway logs and the last deployment/image | API/platform owner. Do not treat gateway `/healthz` as proof that the API is healthy |
| PostgreSQL outage, data loss or schema mismatch | Check database health and authoritative provider with the data owner; preserve deployment/migration identifiers; confirm a verified backup before proposing restore | Database owner and platform lead. Do not delete volumes, run `db push --accept-data-loss`, or restore over the source as diagnosis |
| Redis outage or live telemetry degradation | Check Redis availability and the affected app behavior; note impacted instance(s) and time range | API/feature owner. Corporate ingest may use instance-local fallback; do not assume events are durable or synchronized across API instances |
| Dispatch correctness or assignment issue | Preserve requirement/route IDs, state, timestamps, driver eligibility and relevant audit events; consult the dispatch lifecycle and test evidence | API dispatch owner and Ops lead. Avoid force-start/reassign/retry actions until impact and idempotency are understood |
| Active SOS or rider safety concern | Use the Ops safety UI and the documented alert lifecycle; record only the minimum identifiers needed for response | Ops/safety lead immediately through the approved human escalation channel. Do not resolve or downgrade an alert to clear a dashboard |
| Payment, payout or webhook mismatch | Preserve provider event/reference IDs and internal ledger state; check the API's idempotency and webhook behavior before any retry | Finance/payment and API owner. Never manually replay a financial event or issue a second payment without explicit approval |
| File upload or object-storage failure | Record upload/request ID, object key reference and provider error; check configuration and provider availability through approved access | API/storage owner. Do not delete, overwrite or publicly expose objects to test recovery |
| Marketing lead/form incident | Record page, time and redacted request outcome; use a sandbox/test API to reproduce | Marketing and API/product owners. Avoid resubmitting real leads; the form/DTO behavior is documented as an open integration concern |
| TLS, DNS or certificate failure | Verify hostname resolution, configured Nginx server, certificate validity and upstream separately | Cloud/DNS owner. The gateway's static `/healthz` does not validate TLS trust or DNS |

Use the application-specific [Ops live operations runbook](../../apps/ops/live-operations-runbook.md),
[SOS and reassignment guide](../../apps/ops/sos-and-reassignment-guide.md),
[API provider adapter reference](../../apps/api/provider-adapters.md), and
[webhook/idempotency guide](../../apps/api/reference/webhooks-and-idempotency.md)
for source-mapped behavior. These references do not replace incident-owner
approval.

## Proposed escalation roles

No named owners are assigned by repository configuration. The following
roles are recommendations to make an incident handoff complete:

| Role | Responsibility |
|---|---|
| Incident lead | Scope impact, coordinate updates, preserve decisions and track recovery |
| Service owner | Diagnose the affected API or application and approve service-level recovery |
| Database/platform owner | Confirm data-store authority, migration state, backup availability and restore plan |
| Ops/safety lead | Coordinate operational dispatch and active safety workflows |
| Finance/payment owner | Reconcile payment, payout and ledger effects before retries or adjustments |
| Cloud/release owner | Verify DNS/TLS, image, workflow, host/cluster and release state |
| Privacy/compliance owner | Assess whether personal or regulated data was exposed and direct required reporting |

The approved communication channel, call tree, severity definitions and
response-time objectives must be supplied by the organization; none are
specified in this repository. Do not create a service-level commitment from
this proposed role table.

## Sources and companion runbooks

- [Health checks and recovery](./health-and-recovery.md)
- [Deployment workflow boundaries](./deployment-overview.md) and [CI/CD](./ci-cd.md)
- [Database migrations and backups](./database-migrations-and-backups.md)
- [TLS, DNS and certificates](./tls-dns-and-certificates.md)
- [Ops live operations](../../apps/ops/live-operations-runbook.md)
- [Ops SOS and reassignment](../../apps/ops/sos-and-reassignment-guide.md)
- [API webhooks and idempotency](../../apps/api/reference/webhooks-and-idempotency.md)
