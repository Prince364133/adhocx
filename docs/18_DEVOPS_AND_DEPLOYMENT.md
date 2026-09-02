# 18_DEVOPS_AND_DEPLOYMENT.md

# AdhocX DevOps & Deployment Specification

**Document Status:** Source of Truth
**Version:** V1
**Audience:** Backend Engineers, Flutter Engineers, Admin Engineers, DevOps Engineers, QA Engineers, Security Engineers, AI Coding Agents

---

# 1. Purpose

This document defines the deployment and operational infrastructure standards for AdhocX.

It covers:

* Environments
* Infrastructure
* CI/CD
* Backend deployment
* Admin deployment
* Mobile releases
* Database migrations
* Redis
* Background workers
* Secrets
* Configuration
* Backups
* Disaster recovery
* Rollbacks
* Monitoring integration
* Release management
* Production safety
* AI agent deployment rules

The goal is:

> **Deploy AdhocX repeatedly and safely without relying on manual guesswork.**

---

# 2. Deployment Philosophy

Production deployment must be:

```text
Repeatable
Automated
Observable
Reversible where practical
Auditable
Secure
```

Avoid deployment procedures that depend on:

```text
SSH + manually editing files
manual database changes
copy-pasting secrets
running undocumented commands
"it worked on my machine"
```

---

# 3. System Deployment Units

AdhocX consists of several independently deployable components:

```text
AdhocX Mobile
AdhocX Admin
AdhocX API
AdhocX Workers
PostgreSQL
Redis
Object Storage
```

External providers include:

```text
Maps
Push Notifications
Payments
Payouts
```

---

# 4. Repository

The canonical repository follows:

```text
08_FOLDER_STRUCTURE.md
```

The deployment system must understand the monorepo structure.

Conceptually:

```text
adhocx/
├── apps/
│   ├── mobile/
│   ├── admin/
│   └── api/
├── packages/
├── infrastructure/
├── scripts/
└── docs/
```

---

# 5. Environment Model

At minimum:

```text
Development
CI
Staging
Production
```

Each environment must have independent configuration.

---

# 6. Development Environment

Development is for:

```text
local implementation
debugging
unit tests
integration development
feature development
```

Developers may use local:

```text
PostgreSQL
Redis
object storage emulator/local bucket
provider sandbox
```

where appropriate.

---

# 7. CI Environment

CI exists to verify changes automatically.

It should run:

```text
formatting
lint
type checking
unit tests
integration tests
builds
security checks
```

according to the pipeline.

---

# 8. Staging Environment

Staging should resemble production sufficiently to validate:

```text
API
Workers
Database
Redis
Admin
Realtime
Notifications
External integrations
```

before release.

---

# 9. Production Environment

Production contains real:

```text
users
trips
financial records
KYC data
payments
locations
operational data
```

Therefore production changes require stronger controls.

---

# 10. Environment Isolation

Never casually share:

```text
production database
production secrets
production payment credentials
production storage
```

with development or staging.

---

# 11. Configuration

Application configuration must come from environment/configuration management.

Examples:

```text
DATABASE_URL
REDIS_URL
JWT_SECRET
STORAGE_BUCKET
PAYMENT_PROVIDER_KEY
PAYMENT_WEBHOOK_SECRET
MAPS_API_KEY
FCM credentials
APNs credentials
```

Exact variable names may evolve.

---

# 12. Configuration Validation

Applications should validate required configuration at startup.

If a mandatory production configuration is missing:

```text
application startup
→ fail fast
```

Do not start in a silently broken state.

---

# 13. Secrets Management

Secrets must never be stored in:

```text
source code
Git history
frontend bundles
public environment files
logs
screenshots
test fixtures
```

Production secrets should use a dedicated secret-management mechanism.

---

# 14. Mobile Secrets

Mobile applications are public clients.

Therefore:

> **A secret embedded in the mobile application must be considered extractable.**

Do not embed server credentials in Flutter.

---

# 15. Admin Secrets

The Admin browser application is also an untrusted client.

Never put privileged backend secrets into browser-accessible configuration.

---

# 16. API Secrets

Sensitive provider credentials must remain server-side.

Examples:

```text
payment secret
database credentials
storage credentials
webhook secrets
internal service credentials
```

---

# 17. Infrastructure

Production infrastructure should support:

```text
API instances
worker instances
PostgreSQL
Redis
object storage
load balancing
TLS
logging
monitoring
```

The exact cloud provider is a deployment decision.

---

# 18. Cloud Abstraction

Application architecture should not unnecessarily depend on one cloud provider.

Infrastructure-specific code belongs under:

```text
infrastructure/
```

where practical.

---

# 19. API Deployment

The API should be deployed as a stateless application.

Conceptually:

```text
Load Balancer
      ↓
┌───────────────┐
│ API Instance  │
│ API Instance  │
│ API Instance  │
└───────────────┘
      ↓
PostgreSQL
Redis
```

Instances must not depend on local process memory for authoritative state.

---

# 20. API Horizontal Scaling

The API should be capable of running multiple instances.

Avoid storing critical session/business state only in:

```text
process memory
```

---

# 21. Worker Deployment

Background workers are separate execution processes.

Examples:

```text
Dispatch Worker
Notification Worker
Financial Worker
Reconciliation Worker
```

Exact worker grouping may evolve.

---

# 22. Worker Scaling

Workers should scale independently from HTTP API instances.

Example:

```text
API traffic ↑
→ API scales

Dispatch backlog ↑
→ Dispatch workers scale
```

---

# 23. Worker Idempotency

Every worker processing important business operations must assume:

```text
job may execute more than once
worker may crash
job may be retried
```

Therefore worker jobs must follow:

```text
11_DISPATCH_ENGINE.md
14_REALTIME_AND_NOTIFICATIONS.md
15_PAYMENTS_AND_LEDGER.md
```

---

# 24. Queue Infrastructure

Redis/BullMQ or the selected queue mechanism should support:

```text
retry
backoff
delayed jobs
dead-letter handling
job visibility
operational monitoring
```

---

# 25. Queue Separation

Different workloads should not unnecessarily block each other.

Conceptually:

```text
dispatch queue
notification queue
financial queue
reconciliation queue
```

This prevents a notification backlog from stopping financial processing.

---

# 26. Queue Priority

High-value operational workflows may receive higher priority.

Examples:

```text
dispatch
financial processing
```

should not be indefinitely blocked by:

```text
low-priority reports
```

Exact priority rules are implementation-specific.

---

# 27. Database Deployment

PostgreSQL is a critical production dependency.

It must support:

```text
persistent storage
automated backups
monitoring
connection management
migration control
recovery
```

---

# 28. Database Source of Truth

The production database remains authoritative for:

```text
users
vendors
drivers
vehicles
requirements
offers
assignments
trips
payments
ledger
settlements
```

---

# 29. Database Migrations

Every schema change must be represented as a versioned migration.

Example:

```text
001_initial_schema
002_add_driver_verification
003_add_withdrawal_tables
```

Exact migration tooling is implementation-specific.

---

# 30. Migration Rules

Never manually modify production schema without a corresponding migration.

Forbidden:

```text
"Just run this SQL manually."
```

without recording the change in the migration system.

---

# 31. Migration Testing

Before production:

```text
migration
→ clean database
→ apply all migrations
→ verify schema
```

and where appropriate:

```text
existing realistic database
→ apply migration
→ verify compatibility
```

---

# 32. Migration Backward Compatibility

Deployments may temporarily contain:

```text
old application version
new application version
```

depending on rollout strategy.

Migrations should therefore avoid breaking currently running instances whenever practical.

---

# 33. Expand-and-Contract

For risky schema changes, prefer:

```text
Expand
 ↓
Deploy compatible code
 ↓
Migrate/backfill
 ↓
Switch reads/writes
 ↓
Contract
```

instead of immediately deleting/replacing production fields.

---

# 34. Destructive Migrations

Dropping columns/tables is high risk.

Before destructive migration:

```text
verify no application dependency
verify no worker dependency
verify no reporting dependency
verify backups
```

---

# 35. Database Index Changes

Large production indexes must consider:

```text
locking
database load
table size
migration duration
```

Use safe/index-specific strategies where supported.

---

# 36. Database Backup

Production database backups must be automated.

Backups should support recovery from:

```text
application corruption
operator error
database failure
infrastructure failure
```

---

# 37. Backup Types

At minimum, establish a strategy for:

```text
full backups
point-in-time recovery where supported
```

Exact retention is a deployment decision.

---

# 38. Backup Testing

A backup that has never been restored is not proven reliable.

Regularly test:

```text
backup
→ restore
→ application connectivity
→ data integrity verification
```

---

# 39. Recovery Point Objective

Define:

```text
RPO = maximum acceptable data loss
```

The exact RPO for AdhocX is **TBD** and must be agreed before production launch.

Financial and trip data require particularly careful consideration.

---

# 40. Recovery Time Objective

Define:

```text
RTO = maximum acceptable service restoration time
```

Exact RTO is **TBD**.

---

# 41. Disaster Recovery

Document recovery procedures for:

```text
database failure
region/infrastructure failure
Redis failure
API failure
worker failure
storage failure
provider outage
```

---

# 42. Redis Persistence

Redis is not the authoritative database.

If Redis data is lost:

```text
critical business truth
```

must remain recoverable from PostgreSQL.

---

# 43. Redis Recovery

After Redis failure:

```text
Redis restored
→ caches rebuilt
→ workers restarted safely
→ subscriptions re-established
```

Do not assume Redis contains irreplaceable business truth.

---

# 44. Object Storage

KYC documents and other protected files should use durable object storage.

The deployment architecture should support:

```text
private buckets
access control
encryption
backup/retention strategy
```

---

# 45. Object Storage Recovery

Critical documents must have an appropriate durability and recovery strategy.

Exact retention and backup policy is **TBD**.

---

# 46. TLS

Production traffic must use HTTPS/TLS.

This includes:

```text
mobile → API
admin → API
webhooks → API
API → external services
```

where applicable.

---

# 47. HTTP Security

Production should enforce secure transport and appropriate security headers.

The exact header set is defined through the security architecture.

---

# 48. Deployment Pipeline

Recommended pipeline:

```text
Developer
   ↓
Pull Request
   ↓
CI
   ↓
Tests
   ↓
Build
   ↓
Review
   ↓
Merge
   ↓
Staging
   ↓
Validation
   ↓
Production
```

---

# 49. Pull Request CI

Every pull request should automatically perform relevant:

```text
format checks
lint
type checks
unit tests
integration tests
build verification
```

---

# 50. Build Artifacts

Build artifacts should be reproducible.

The same source revision should produce identifiable artifacts.

Record:

```text
commit SHA
build version
environment
build timestamp
```

where appropriate.

---

# 51. Containerization

API and worker deployments may use containers.

Benefits:

```text
reproducible environment
dependency isolation
consistent deployment
```

The exact container platform is a deployment decision.

---

# 52. Container Rules

Containers should:

```text
run as non-root where practical
contain only required dependencies
use pinned base images
avoid embedded secrets
have health checks
```

---

# 53. Image Security

Production images should be scanned for:

```text
known vulnerabilities
unnecessary packages
secrets
outdated dependencies
```

---

# 54. Health Checks

Services should expose appropriate health checks.

Distinguish:

```text
liveness
readiness
```

where the deployment platform supports them.

---

# 55. Liveness

Liveness answers:

> Is this process alive?

A liveness failure may trigger process restart.

---

# 56. Readiness

Readiness answers:

> Can this instance safely receive traffic?

An instance may be alive but not ready because:

```text
database unavailable
required initialization incomplete
critical configuration invalid
```

---

# 57. Graceful Shutdown

When receiving termination:

```text
stop accepting new work
finish safe in-flight work
close connections
shutdown workers safely
```

Avoid abrupt termination where possible.

---

# 58. API Deployment Strategy

Preferred production rollout:

```text
Deploy new version
      ↓
Health check
      ↓
Small traffic exposure
      ↓
Observe
      ↓
Increase traffic
```

A rolling/canary strategy may be used depending on infrastructure.

---

# 59. Worker Deployment Strategy

Workers require special care because old and new versions may process the same queues.

Before deployment:

```text
verify job compatibility
verify idempotency
verify schema compatibility
```

---

# 60. Zero-Downtime Goal

The system should aim for minimal or zero user-visible downtime for:

```text
API
Admin
workers
```

where practical.

---

# 61. Mobile Deployment

Mobile releases are different from backend releases.

There are separate:

```text
Android builds
iOS builds
```

with store submission/review cycles.

---

# 62. Mobile Versioning

Mobile builds should have:

```text
version name
version code/build number
```

managed consistently.

---

# 63. Mobile Backward Compatibility

The backend must assume older mobile versions may remain active.

Therefore API changes must consider:

```text
existing production app versions
```

---

# 64. Mobile Feature Rollout

For risky functionality:

```text
backend support
→ staging validation
→ controlled mobile rollout
→ monitoring
```

Do not deploy mobile functionality that depends on an API unavailable to released clients.

---

# 65. Force Update

A force-update mechanism may be implemented for critical incompatibilities.

However, it should not be used as a substitute for proper API backward compatibility.

---

# 66. Admin Deployment

Admin web releases can generally be deployed independently from mobile.

However, API compatibility must still be respected.

---

# 67. Admin Rollback

Admin releases should be reversible independently where infrastructure allows.

If a new Admin build fails:

```text
rollback Admin
```

without unnecessarily rolling back the API.

---

# 68. API Rollback

API rollback must consider:

```text
database migrations
worker versions
mobile clients
Admin version
```

A simple application binary rollback may be unsafe after a destructive schema change.

---

# 69. Migration Rollback

Do not assume every migration can be safely reversed.

For risky changes:

```text
forward-compatible migration
+
forward-compatible application
```

is often safer than destructive rollback.

---

# 70. Release Rollback Decision

Rollback should consider:

```text
severity
data corruption
financial impact
security impact
migration compatibility
active user impact
```

---

# 71. Financial Deployment Safety

Before deploying changes affecting:

```text
payments
ledger
earnings
settlements
withdrawals
refunds
```

the release must pass dedicated financial tests.

---

# 72. Dispatch Deployment Safety

Before deploying changes affecting:

```text
dispatch
matching
offers
assignment
radius
```

run dispatch regression and concurrency tests.

---

# 73. State Machine Deployment Safety

Before modifying state transitions:

```text
12_STATE_MACHINES.md
```

must be reviewed and affected transition tests updated.

---

# 74. Deployment Database Safety

Never deploy application code that expects a database field before the field exists in production.

Use:

```text
migration first
→ compatible code
```

or another explicitly safe deployment sequence.

---

# 75. Deployment Ordering

For a schema-dependent release:

```text
1. Deploy compatible migration.
2. Verify database.
3. Deploy API.
4. Deploy workers.
5. Deploy Admin/mobile support as appropriate.
6. Monitor.
```

Exact ordering may vary based on compatibility requirements.

---

# 76. Secrets Rotation

Secrets should be rotatable without unnecessary application redesign.

Examples:

```text
JWT secrets
payment credentials
webhook secrets
cloud credentials
```

Rotation procedures must be documented.

---

# 77. Credential Exposure Response

If a production credential is exposed:

```text
revoke/rotate
→ investigate usage
→ assess impact
→ deploy replacement
→ audit
```

Do not simply delete the credential from the repository and assume the incident is resolved.

---

# 78. Production Access

Production infrastructure access must use least privilege.

Avoid shared:

```text
root
admin
database superuser
```

credentials.

---

# 79. Database Access

Application users should have only the database permissions they require.

Operational/admin access should be separated where practical.

---

# 80. Production SSH

If SSH is required:

```text
key-based authentication
limited access
auditability
no shared passwords
```

should be used.

The preferred architecture should minimize manual SSH operations.

---

# 81. CI/CD Credentials

CI systems must use dedicated credentials.

Never use personal developer credentials for production deployment automation.

---

# 82. Deployment Audit

Every production deployment should be attributable to:

```text
who
what version
when
environment
result
```

---

# 83. Release Version

Each production deployment should expose an identifiable version.

Example:

```text
API: 1.8.0
Admin: 1.5.2
Mobile: 1.3.0
```

Exact versioning strategy may vary.

---

# 84. Build Metadata

A production application should be able to report:

```text
version
commit/build identifier
environment
```

for debugging.

---

# 85. Deployment Verification

After deployment verify:

```text
API health
database connectivity
Redis connectivity
workers
queue processing
realtime connections
Admin
authentication
critical APIs
```

---

# 86. Smoke Tests

Production smoke tests should verify a minimal set of safe workflows.

Examples:

```text
authentication
health endpoint
read-only dashboard
safe requirement retrieval
```

Avoid destructive smoke tests against real production data.

---

# 87. Post-Deployment Monitoring

Immediately after release monitor:

```text
error rate
latency
database errors
queue backlog
worker failures
WebSocket connections
payment failures
dispatch failures
mobile/API compatibility issues
```

---

# 88. Deployment Freeze

A deployment freeze may be required during:

```text
major incidents
financial reconciliation issues
database instability
security incidents
```

---

# 89. Incident Response

Deployment systems must integrate with:

```text
19_OBSERVABILITY.md
```

so engineers can quickly determine whether a deployment caused an incident.

---

# 90. Deployment Correlation

When an incident begins immediately after release:

```text
incident timestamp
+
deployment timestamp
+
commit SHA
```

must be easy to correlate.

---

# 91. Database Incident Safety

If a deployment is causing database corruption or dangerous behavior:

```text
stop rollout
→ isolate affected functionality
→ preserve evidence
→ determine data impact
→ recover safely
```

Do not blindly rerun migrations.

---

# 92. Queue Incident Safety

If workers are producing incorrect jobs:

```text
pause affected workers/queues
→ inspect jobs
→ identify affected resources
→ correct/replay safely
```

Do not delete queues blindly.

---

# 93. Financial Incident Safety

If financial correctness is suspected:

```text
stop affected financial operation if necessary
→ preserve transaction records
→ reconcile provider state
→ investigate ledger
→ correct through explicit transactions
```

Never repair financial data through arbitrary database edits.

---

# 94. Deployment Documentation

Every operationally significant procedure should be documented.

Examples:

```text
production deployment
rollback
database recovery
secret rotation
payment provider recovery
queue recovery
```

---

# 95. Runbooks

Create runbooks for high-risk operational events.

At minimum:

```text
API outage
database outage
Redis outage
payment provider outage
payout provider outage
dispatch backlog
worker failure
financial reconciliation mismatch
storage outage
```

---

# 96. Staging Data

Staging should use synthetic or appropriately sanitized data.

Never copy production PII/KYC/payment information into staging casually.

---

# 97. Production Data Access

Production data should only be accessed by authorized personnel for legitimate operational purposes.

---

# 98. Data Migration Scripts

One-off data migrations must be:

```text
versioned
reviewed
idempotent where possible
tested
logged
```

---

# 99. Large Data Migration

Large migrations should consider:

```text
batching
locking
database load
runtime
rollback/recovery
application compatibility
```

---

# 100. Scheduled Jobs

Scheduled jobs must have:

```text
clear ownership
execution logging
failure handling
retry policy
duplicate-run protection
```

Examples:

```text
reconciliation
cleanup
report generation
expired-offer processing
```

---

# 101. Cron Safety

A scheduled job must not assume it runs exactly once.

Example:

```text
job triggered twice
```

must not create duplicate financial or operational effects.

---

# 102. Deployment Testing Matrix

Before production:

| Component       | Unit | Integration | E2E | Build | Smoke |
| --------------- | ---: | ----------: | --: | ----: | ----: |
| API             |    ✓ |           ✓ |   ✓ |     ✓ |     ✓ |
| Workers         |    ✓ |           ✓ |   ✓ |     ✓ |     ✓ |
| Admin           |    ✓ |           ✓ |   ✓ |     ✓ |     ✓ |
| Flutter Android |    ✓ |           ✓ |   ✓ |     ✓ |     ✓ |
| Flutter iOS     |    ✓ |           ✓ |   ✓ |     ✓ |     ✓ |
| Database        |    — |           ✓ |   ✓ |     — |     ✓ |
| Redis/Queues    |    — |           ✓ |   ✓ |     — |     ✓ |

---

# 103. Production Release Checklist

```text
[ ] PR approved
[ ] CI green
[ ] Unit tests pass
[ ] Integration tests pass
[ ] Critical E2E tests pass
[ ] Security checks pass
[ ] Financial tests pass if affected
[ ] Dispatch tests pass if affected
[ ] Database migration reviewed
[ ] Backup verified
[ ] Configuration verified
[ ] Secrets verified
[ ] Build artifact identified
[ ] Rollback strategy understood
[ ] Monitoring ready
[ ] Release notes prepared
```

---

# 104. Post-Release Checklist

```text
[ ] Deployment successful
[ ] Health checks passing
[ ] API error rate normal
[ ] Database healthy
[ ] Redis healthy
[ ] Workers processing
[ ] Queue backlog normal
[ ] Realtime functioning
[ ] Authentication functioning
[ ] Critical workflow functioning
[ ] No unexpected financial anomalies
[ ] No unexpected dispatch anomalies
```

---

# 105. AI Agent Deployment Rules

AI coding agents must:

1. Never deploy directly to production unless explicitly authorized by the established deployment workflow.
2. Never commit secrets.
3. Never modify production databases directly.
4. Never bypass migrations.
5. Never disable CI checks to force a deployment.
6. Never delete failing tests to make CI green.
7. Never bypass staging for risky changes without explicit approval.
8. Never assume a rollback is safe after schema changes.
9. Never change infrastructure casually.
10. Never modify deployment configuration without understanding its environment impact.
11. Never expose production credentials.
12. Never copy production data into development/staging.
13. Never manually edit production state as a workaround.
14. Verify builds before declaring deployment readiness.
15. Check migration compatibility.
16. Check worker compatibility.
17. Check mobile backward compatibility.
18. Check Admin/API compatibility.
19. Treat financial deployments as high risk.
20. Treat dispatch deployments as high risk.
21. Document operationally significant changes.
22. Update runbooks when deployment behavior changes.

---

# 106. AI Agent Deployment Preflight

Before proposing a deployment-related change, the agent should inspect:

```text
infrastructure/
CI configuration
Docker/container configuration
environment configuration
migration history
deployment scripts
health checks
monitoring configuration
relevant source-of-truth documents
```

---

# 107. AI Agent Infrastructure Rule

The agent must not create duplicate infrastructure definitions.

Before adding:

```text
Dockerfile
workflow
deployment manifest
environment variable
worker configuration
```

search for existing definitions first.

---

# 108. AI Agent Migration Rule

Before creating a migration:

```text
inspect current schema
inspect previous migrations
inspect application references
determine compatibility
```

Then create the smallest correct migration.

---

# 109. AI Agent Rollback Rule

The agent must explicitly determine:

```text
Can this deployment be rolled back?
Does it change the database?
Are old clients compatible?
Are workers compatible?
Are financial records affected?
```

If rollback is unsafe, state that clearly.

---

# 110. Production Definition of Done

Deployment infrastructure is production-ready when:

```text
[ ] Development environment documented
[ ] CI environment functioning
[ ] Staging environment functioning
[ ] Production environment functioning
[ ] Secrets managed securely
[ ] Configuration validated
[ ] API deployment automated
[ ] Worker deployment automated
[ ] Admin deployment automated
[ ] Mobile build pipeline established
[ ] Database migrations automated
[ ] Database backups enabled
[ ] Restore procedure tested
[ ] Health checks implemented
[ ] Graceful shutdown implemented
[ ] Queue recovery documented
[ ] Rollback procedure documented
[ ] Incident runbooks documented
[ ] Deployment monitoring implemented
[ ] Production access controlled
[ ] Release versioning implemented
[ ] Build provenance available
[ ] Security scanning implemented
[ ] Critical smoke tests implemented
```

---

# 111. Final DevOps Principle

AdhocX must not depend on heroic engineers.

A production system should not require someone to remember:

```text
"first run this command,
then manually change this value,
then restart this process,
then update this database field."
```

Instead:

```text
Code
 ↓
CI
 ↓
Validated Artifact
 ↓
Staging
 ↓
Production
 ↓
Health Checks
 ↓
Observability
```

The deployment system should make the safe path the easiest path.

**Deployments must be repeatable.
Migrations must be controlled.
Secrets must be protected.
Backups must be restorable.
Rollbacks must be understood.
Production must be observable.**

The ultimate DevOps goal is:

> **AdhocX should be able to evolve rapidly without making production fragile.**