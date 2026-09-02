# 19_OBSERVABILITY.md

# AdhocX Observability Specification

**Document Status:** Source of Truth
**Version:** V1
**Audience:** Backend Engineers, Flutter Engineers, Admin Engineers, DevOps Engineers, QA Engineers, Operations, Support, AI Coding Agents

---

# 1. Purpose

This document defines the observability strategy for AdhocX.

It covers:

* Logging
* Metrics
* Distributed tracing
* Request correlation
* Business metrics
* Dispatch telemetry
* Trip telemetry
* Financial telemetry
* Realtime telemetry
* Notification telemetry
* Worker telemetry
* Database telemetry
* Infrastructure monitoring
* Alerts
* Dashboards
* Incident diagnosis
* Audit visibility
* Operational debugging

The objective is:

> **When something goes wrong, AdhocX must provide enough evidence to understand what happened without guessing.**

---

# 2. Observability Philosophy

Observability is not simply:

```text
console.log("something happened")
```

A production system should expose three primary signals:

```text
Logs
Metrics
Traces
```

Together they should answer:

```text
What happened?
How often?
How long did it take?
Where did it fail?
Which request caused it?
Which business resource was affected?
```

---

# 3. Four Observability Layers

AdhocX observability should be divided into:

```text
Technical Observability
Business Observability
Financial Observability
Operational Observability
```

---

# 4. Technical Observability

Technical monitoring covers:

```text
API
Database
Redis
Workers
Queues
WebSockets
Storage
Infrastructure
External providers
```

---

# 5. Business Observability

Business monitoring covers:

```text
requirements
dispatch
offers
assignments
trips
fulfillment
cancellations
driver availability
```

---

# 6. Financial Observability

Financial monitoring covers:

```text
payments
earnings
ledger
settlements
withdrawals
refunds
reconciliation
```

Financial anomalies require elevated attention.

---

# 7. Operational Observability

Operations should be able to understand:

```text
What needs attention right now?
Which requirements are stuck?
Which trips are delayed?
Which drivers are unavailable?
Which payments are failing?
Which workflows require manual intervention?
```

---

# 8. Observability Principles

AdhocX observability must be:

```text
Structured
Correlated
Actionable
Low-noise
Privacy-aware
Searchable
Reliable
```

Avoid collecting telemetry that nobody can use.

---

# 9. Request Correlation

Every API request should have a correlation/request ID.

Example:

```text
requestId = req_abc123
```

The same identifier should be propagated through relevant internal operations.

---

# 10. Correlation Flow

Example:

```text
Vendor Request
      ↓
API
      ↓
Application Service
      ↓
Database
      ↓
Dispatch Job
      ↓
Worker
      ↓
Notification
```

Where practical, the operation should remain traceable across these boundaries.

---

# 11. Business Resource IDs

Logs should include relevant resource identifiers.

Examples:

```text
vendorId
driverId
vehicleId
requirementId
offerId
assignmentId
tripId
paymentId
settlementId
withdrawalId
```

Do not log unrelated identifiers merely for the sake of volume.

---

# 12. Structured Logging

Logs must use structured fields.

Preferred:

```json
{
  "event": "offer.accepted",
  "offerId": "offer_123",
  "driverId": "driver_456",
  "requirementId": "req_789",
  "requestId": "request_abc"
}
```

Avoid:

```text
Offer accepted successfully!!!
```

---

# 13. Log Levels

Use consistent levels:

```text
DEBUG
INFO
WARN
ERROR
FATAL
```

---

# 14. DEBUG

Use DEBUG for development/diagnostic information.

Examples:

```text
candidate ranking details
internal decision paths
provider request timing
```

DEBUG logs should not contain secrets.

Production DEBUG logging should be controlled because of volume and privacy.

---

# 15. INFO

INFO should represent meaningful normal operations.

Examples:

```text
requirement.posted
offer.created
assignment.confirmed
trip.completed
payment.received
withdrawal.requested
```

---

# 16. WARN

WARN indicates abnormal but recoverable conditions.

Examples:

```text
provider timeout
retry scheduled
stale realtime connection
unexpected webhook order
reconciliation mismatch
```

---

# 17. ERROR

ERROR represents a failed operation requiring investigation or retry.

Examples:

```text
payment processing failed
dispatch worker failed
database operation failed
notification delivery failed
```

---

# 18. FATAL

FATAL should represent a severe failure that prevents a critical service from functioning.

Use sparingly.

---

# 19. Sensitive Data

Never log:

```text
OTP
password
access token
refresh token
payment credentials
bank credentials
KYC document contents
private document URLs
secret keys
```

---

# 20. Personal Data

PII should be minimized in logs.

Prefer:

```text
driverId
vendorId
userId
```

over repeatedly logging:

```text
full name
phone number
email
address
```

unless operationally required.

---

# 21. Location Privacy

Location telemetry requires special care.

Avoid logging raw high-frequency GPS coordinates unnecessarily.

Prefer:

```text
driverId
location update accepted
timestamp
accuracy metadata
```

where exact coordinates are not required for debugging.

---

# 22. Log Event Naming

Use stable event names.

Preferred:

```text
requirement.created
requirement.posted
dispatch.started
dispatch.wave.created
offer.sent
offer.accepted
assignment.confirmed
trip.started
trip.completed
payment.succeeded
withdrawal.completed
```

Avoid inconsistent naming such as:

```text
offerAccepted
offer_accept
acceptedOffer
```

---

# 23. Domain Event Logging

Important domain events should be observable.

Examples:

```text
RequirementPosted
OfferAccepted
AssignmentConfirmed
TripCompleted
PaymentSucceeded
SettlementCompleted
```

The exact event architecture is defined in:

```text
14_REALTIME_AND_NOTIFICATIONS.md
```

---

# 24. State Transition Logging

Important state transitions should be observable.

Example:

```json
{
  "event": "trip.state_changed",
  "tripId": "trip_123",
  "from": "ARRIVED",
  "to": "IN_PROGRESS"
}
```

This makes lifecycle debugging much easier.

---

# 25. Invalid State Transition Logging

Rejected transitions should also be observable.

Example:

```text
trip.state_transition_rejected
```

with:

```text
tripId
currentState
requestedState/action
actor
reason
requestId
```

---

# 26. Authorization Logging

Security-relevant authorization failures should be observable.

Example:

```text
authorization.denied
```

Include:

```text
userId
role
resourceType
resourceId
action
reason
requestId
```

Do not log sensitive request contents.

---

# 27. Authentication Logging

Observe:

```text
OTP requested
OTP verification success
OTP verification failure
session created
session revoked
account suspended
```

Do not log actual OTP values.

---

# 28. API Metrics

Track:

```text
request count
error count
latency
status codes
endpoint
method
```

Important metrics:

```text
request_rate
error_rate
p50_latency
p95_latency
p99_latency
```

---

# 29. API Error Rate

Monitor:

```text
5xx rate
4xx rate
```

but distinguish expected business conflicts from infrastructure failures.

For example:

```text
409 OfferAlreadyAccepted
```

should not necessarily be treated like:

```text
500 DatabaseUnavailable
```

---

# 30. Endpoint-Level Metrics

Important endpoints should have dedicated metrics.

Examples:

```text
POST /requirements
POST /offers/{id}/accept
POST /trips/{id}/start
POST /trips/{id}/complete
POST /withdrawals
POST /payments/{id}/initiate
```

---

# 31. API Latency Targets

Production latency targets should be defined based on actual workload.

Exact SLO values are **TBD**.

At minimum track:

```text
p50
p95
p99
```

for important endpoints.

---

# 32. Database Metrics

Monitor:

```text
connection count
connection pool saturation
query latency
slow queries
locks
deadlocks
CPU
memory
storage
replication health where applicable
```

---

# 33. Database Query Observability

Important queries should be identifiable.

Especially:

```text
dispatch candidate query
requirement listing
trip listing
payment history
financial reports
location queries
```

---

# 34. Slow Query Detection

Configure a threshold for identifying slow queries.

Exact threshold is **TBD** and should be based on workload.

---

# 35. Database Lock Monitoring

Monitor long-running locks and deadlocks.

This is especially important for:

```text
offer acceptance
assignment
withdrawal
ledger posting
settlement
```

---

# 36. Redis Metrics

Monitor:

```text
memory usage
hit/miss ratio
connection count
command latency
evictions
queue usage
failure rate
```

---

# 37. Queue Metrics

Every important queue should expose:

```text
jobs waiting
jobs active
jobs completed
jobs failed
jobs delayed
retry count
processing duration
oldest job age
```

---

# 38. Queue Backlog

A growing backlog is an operational warning.

Example:

```text
dispatch queue
waiting jobs ↑
oldest job age ↑
```

may indicate:

```text
worker shortage
database slowness
Redis issue
worker failures
```

---

# 39. Worker Metrics

Workers should expose:

```text
jobs processed
jobs failed
jobs retried
processing duration
active workers
```

---

# 40. Worker Failure Logging

A failed job should log:

```text
jobId
jobType
attempt
resourceId
error category
request/correlation ID where available
```

Never log sensitive payloads.

---

# 41. Dispatch Observability

Dispatch is a critical operational subsystem.

Track:

```text
dispatch runs
dispatch duration
candidate count
eligible driver count
offers created
offers accepted
offers declined
offers expired
assignment rate
radius expansion count
no-driver outcomes
```

---

# 42. Dispatch Funnel

The platform should be able to observe:

```text
Requirement
 ↓
Eligible Drivers
 ↓
Candidates
 ↓
Offers
 ↓
Acceptances
 ↓
Assignments
```

This identifies where fulfillment is failing.

---

# 43. Dispatch Assignment Time

Track:

```text
requirement posted
→ first valid assignment
```

and:

```text
requirement posted
→ fully fulfilled
```

These are key product metrics.

---

# 44. Fulfillment Metrics

Track:

```text
fulfillment rate
partial fulfillment rate
no-driver rate
average assignment time
full fulfillment time
```

Exact business targets are **TBD**.

---

# 45. Dispatch Acceptance Rate

Measure:

```text
accepted offers
/
offers sent
```

This helps identify:

```text
poor driver targeting
poor pricing
poor requirement quality
timing problems
```

---

# 46. Offer Expiration Rate

Monitor:

```text
expired offers
/
sent offers
```

A high expiration rate may indicate:

```text
drivers unavailable
poor notification delivery
poor offer targeting
low driver engagement
```

---

# 47. Radius Expansion Metrics

Track:

```text
initial radius
expansion count
final radius
drivers found per radius
assignments per radius
```

This helps evaluate geographic matching.

---

# 48. Driver Availability Metrics

Track:

```text
available drivers
busy drivers
offline drivers
availability changes
time available
```

Avoid interpreting "online" alone as business availability.

---

# 49. Location Metrics

Track:

```text
location updates
accepted updates
rejected updates
stale driver locations
location processing latency
```

---

# 50. Stale Location Detection

A driver whose last location update exceeds the configured freshness threshold may be considered stale.

The threshold is **TBD**.

Observability should make stale supply visible.

---

# 51. Trip Observability

Track trip lifecycle:

```text
assigned
arrived
started
completed
cancelled
no-show
```

Important metrics:

```text
trip duration
time-to-arrival
time-to-start
completion rate
cancellation rate
no-show rate
```

---

# 52. Trip Bottleneck Detection

Track time between:

```text
assignment → arrival
arrival → start
start → completion
```

This allows operations to identify where trips are delayed.

---

# 53. OTP Trip Start Metrics

Track:

```text
OTP attempts
successful starts
failed attempts
expired attempts
```

Do not log the actual OTP.

---

# 54. Cancellation Metrics

Track cancellation by:

```text
actor
stage
reason
time
```

Examples:

```text
driver cancellation
vendor cancellation
system cancellation
```

---

# 55. No-Show Metrics

Track:

```text
no-show count
no-show rate
trip stage
financial outcome
```

Do not infer blame without explicit business evidence.

---

# 56. Realtime Metrics

Monitor:

```text
WebSocket connections
connection failures
reconnects
event delivery latency
event failures
subscription count
```

---

# 57. Realtime Event Metrics

Track:

```text
events emitted
events delivered
events failed
events duplicated
events dropped
```

where the architecture can reliably measure them.

---

# 58. Realtime Connection Health

Important signals:

```text
active connections
connection duration
reconnect rate
authentication failures
subscription authorization failures
```

---

# 59. Notification Metrics

Track:

```text
notifications created
push sent
push delivered
push failed
in-app delivered
read
```

---

# 60. Notification Funnel

Example:

```text
Business Event
 ↓
Notification Created
 ↓
Push Sent
 ↓
Push Delivered
 ↓
User Opened
```

A drop at any stage should be identifiable.

---

# 61. Invalid Push Tokens

Track invalid/expired device tokens.

Repeated failures should result in token cleanup.

---

# 62. Payment Observability

Track:

```text
payments initiated
payments succeeded
payments failed
payments processing
payment latency
refunds
refund failures
provider errors
```

---

# 63. Payment Success Rate

Track:

```text
successful payments
/
payment attempts
```

Segment by:

```text
provider
payment method
environment
time period
```

where useful.

---

# 64. Payment Processing Duration

Track:

```text
payment initiated
→ provider confirmation
```

Long processing times may indicate provider or network issues.

---

# 65. Financial Observability

Financial systems require additional metrics:

```text
earnings created
ledger transactions
ledger posting failures
settlements
withdrawals
refunds
reconciliation mismatches
```

---

# 66. Ledger Integrity Monitoring

The system should continuously or periodically verify:

```text
debits = credits
```

for balanced financial transactions.

Any imbalance should create a high-priority alert.

---

# 67. Duplicate Financial Operation Monitoring

Monitor attempts to create:

```text
duplicate earning
duplicate settlement
duplicate withdrawal
duplicate refund
duplicate payment
```

A rejected duplicate may be normal retry behavior, but repeated patterns should be observable.

---

# 68. Withdrawal Metrics

Track:

```text
withdrawal requests
withdrawal success
withdrawal failure
withdrawal processing duration
insufficient-fund rejection
provider timeout
```

---

# 69. Settlement Metrics

Track:

```text
settlements created
settlements completed
settlements failed
settlements processing
settlement backlog
settlement age
```

---

# 70. Reconciliation Metrics

Track:

```text
mismatches found
mismatches resolved
mismatches unresolved
resolution time
provider synchronization failures
```

---

# 71. Reconciliation Alert

A persistent or high-value financial mismatch should trigger an operational alert.

Exact thresholds are **TBD**.

---

# 72. Business KPI Dashboard

The system should provide a business-level dashboard containing metrics such as:

```text
Trips Today
Requirements Today
Fulfillment Rate
Average Assignment Time
Cancellation Rate
No-Driver Rate
Active Drivers
Active Vendors
```

---

# 73. Marketplace Health Dashboard

Operational marketplace health should include:

```text
supply available
requirements waiting
dispatch runs
offers active
assignments pending
trips active
```

---

# 74. Dispatch Dashboard

Admin should be able to observe:

```text
active dispatches
requirements waiting
partial fulfillment
no-driver cases
offer acceptance
dispatch duration
```

---

# 75. Driver Supply Dashboard

Monitor:

```text
verified drivers
available drivers
busy drivers
stale drivers
vehicle categories
geographic supply
```

---

# 76. Trip Operations Dashboard

Monitor:

```text
assigned trips
arrived trips
active trips
completed trips
cancelled trips
no-show trips
```

---

# 77. Financial Dashboard

Monitor:

```text
payment volume
payment failures
driver earnings
settlement volume
withdrawal volume
refunds
reconciliation issues
```

Sensitive financial information must be visible only to authorized users.

---

# 78. Infrastructure Dashboard

Monitor:

```text
API health
CPU
memory
database
Redis
workers
queues
storage
network
```

---

# 79. External Provider Dashboard

Track health for:

```text
payment provider
maps provider
push provider
storage provider
```

Metrics should include:

```text
request count
error rate
latency
timeouts
```

---

# 80. Service-Level Objectives

The team should eventually define explicit SLOs for:

```text
API availability
API latency
dispatch latency
realtime delivery
notification delivery
payment processing
worker processing
```

Exact targets are **TBD**.

---

# 81. Alerts

Alerts should be:

```text
actionable
specific
severity-based
low-noise
```

Avoid alerting on every expected business error.

---

# 82. Alert Severity

Suggested levels:

```text
P0 Critical
P1 High
P2 Medium
P3 Informational
```

These align conceptually with incident severity but may be configured independently.

---

# 83. P0 Alerts

Examples:

```text
database unavailable
ledger imbalance
mass authorization failure
production-wide API outage
critical payment corruption
```

---

# 84. P1 Alerts

Examples:

```text
dispatch failure spike
payment failure spike
settlement backlog
worker outage
high API 5xx rate
```

---

# 85. P2 Alerts

Examples:

```text
elevated latency
notification failure increase
stale driver location increase
queue backlog growth
```

---

# 86. Alert Anti-Patterns

Avoid:

```text
alert on every 4xx
alert on every retry
alert on every expired offer
alert on every driver cancellation
```

unless thresholds indicate a systemic problem.

---

# 87. Alert Deduplication

If 10,000 requests fail because PostgreSQL is unavailable, do not create 10,000 independent incidents.

Alerts should group related failures.

---

# 88. Alert Context

An alert should communicate:

```text
what happened
severity
affected subsystem
time window
current value
expected threshold
possible impact
```

---

# 89. Incident Investigation Flow

When an incident occurs:

```text
Alert
 ↓
Identify affected subsystem
 ↓
Find correlation/request IDs
 ↓
Inspect metrics
 ↓
Inspect traces
 ↓
Inspect logs
 ↓
Inspect recent deployments
 ↓
Identify affected resources
 ↓
Determine mitigation
```

---

# 90. Deployment Correlation

Observability must make it easy to determine whether a recent deployment caused the problem.

Track:

```text
deployment version
commit SHA
deployment time
service version
```

---

# 91. Trace Architecture

Distributed tracing should be used where it provides value.

Example:

```text
API Request
 ↓
Create Requirement
 ↓
Database
 ↓
Dispatch Job
 ↓
Worker
 ↓
Driver Query
 ↓
Offer Creation
```

Tracing helps identify latency across boundaries.

---

# 92. Trace Sampling

Not every request must necessarily be retained at maximum detail.

Sampling may be used for high-volume traffic.

However:

```text
errors
critical financial operations
important dispatch failures
```

should receive sufficient tracing coverage.

---

# 93. Financial Traceability

Critical financial operations should be traceable using:

```text
requestId
transactionId
paymentId
settlementId
withdrawalId
providerReference
```

---

# 94. Dispatch Traceability

Critical dispatch operations should be traceable using:

```text
requirementId
dispatchRunId
waveId
offerId
assignmentId
```

---

# 95. Trip Traceability

Trip operations should be traceable using:

```text
tripId
assignmentId
driverId
vendorId
```

---

# 96. Support Diagnostics

Support/admin tooling should make it possible to inspect a resource timeline.

Example:

```text
Requirement Created
      ↓
Posted
      ↓
Dispatch Started
      ↓
Offer Sent
      ↓
Offer Accepted
      ↓
Assignment Confirmed
      ↓
Driver Arrived
      ↓
Trip Started
      ↓
Trip Completed
```

---

# 97. Resource Timeline

Important resources should expose a chronological event history.

Examples:

```text
Requirement
Trip
Payment
Withdrawal
Settlement
Driver verification
```

---

# 98. Audit vs Logs

Audit records and logs are different.

### Audit

Answers:

```text
Who changed what?
```

### Logs

Answer:

```text
What did the system do?
```

Do not replace audit requirements with ordinary application logs.

---

# 99. Audit Integrity

Audit records must be protected from unauthorized modification.

Important actions include:

```text
driver verification
vendor approval
pricing changes
financial adjustments
settlement actions
account suspension
```

---

# 100. Operational Search

Logs and telemetry should be searchable by:

```text
requestId
userId
driverId
vendorId
requirementId
tripId
paymentId
jobId
```

where applicable.

---

# 101. Observability Retention

Telemetry retention should balance:

```text
debugging value
cost
privacy
compliance
```

Exact retention periods are **TBD**.

Financial/audit records may require longer retention than technical logs.

---

# 102. Cost Control

Observability itself has infrastructure cost.

Avoid:

```text
high-cardinality uncontrolled labels
raw GPS logging
full request-body logging
duplicated telemetry
```

---

# 103. Metrics Cardinality

Do not create metric labels from uncontrolled values such as:

```text
userId
tripId
phoneNumber
```

at high scale.

Use stable dimensions such as:

```text
endpoint
status
provider
region
operation
```

where appropriate.

---

# 104. Privacy

Observability systems must follow the same security principles as application systems.

Do not assume:

```text
"it's only logs"
```

means sensitive data is safe.

---

# 105. Mobile Observability

Flutter should capture:

```text
crashes
fatal errors
network failures
API failures
navigation failures
critical user-flow errors
```

without exposing sensitive information.

---

# 106. Mobile Performance

Monitor where practical:

```text
app startup
screen load
API latency
rendering problems
crashes
ANRs
```

---

# 107. Admin Observability

Admin should capture:

```text
API failures
permission failures
critical action failures
frontend crashes
```

Sensitive data should remain protected.

---

# 108. Crash Reporting

Mobile and web applications should have crash/error reporting.

Crash reports should include:

```text
application version
platform
environment
non-sensitive contextual metadata
```

---

# 109. User Impact Correlation

Where possible, errors should be traceable back to:

```text
application version
feature
API endpoint
business operation
```

This helps determine whether a release is affecting a specific workflow.

---

# 110. Synthetic Monitoring

Production may use safe synthetic checks for:

```text
API health
authentication availability
Admin availability
critical read-only operations
```

Avoid destructive synthetic transactions against real financial/trip data.

---

# 111. Business Anomaly Detection

The system should eventually detect unusual patterns such as:

```text
sudden fulfillment drop
sudden cancellation increase
payment failure spike
withdrawal spike
driver supply collapse
dispatch latency spike
```

Automated thresholds may evolve over time.

---

# 112. Operational Anomaly Example

Normally:

```text
fulfillment rate ≈ expected baseline
```

Suddenly:

```text
fulfillment rate drops significantly
```

Observability should allow investigation through:

```text
driver availability
offer acceptance
notification delivery
dispatch latency
pricing changes
provider failures
```

---

# 113. Financial Anomaly Example

Normally:

```text
withdrawal failure rate ≈ low
```

Suddenly:

```text
withdrawal failures ↑
```

Investigation path:

```text
withdrawal metrics
 ↓
provider metrics
 ↓
worker logs
 ↓
provider responses
 ↓
reconciliation
```

---

# 114. Dispatch Anomaly Example

If assignment time increases:

```text
assignment latency ↑
```

inspect:

```text
candidate query latency
driver supply
offer acceptance
notification delivery
queue latency
database locks
```

---

# 115. Observability During Incidents

During an incident, engineers should avoid making broad observability changes that create additional instability.

Prefer:

```text
existing telemetry
+
targeted diagnostic logging
```

---

# 116. Logging Changes

Temporary diagnostic logging should:

```text
have clear purpose
avoid sensitive data
be removed or controlled afterward
```

---

# 117. Runbook Integration

Every major alert should link conceptually to a runbook.

Example:

```text
Payment Failure Spike
→ Payment Provider Failure Runbook
```

---

# 118. Production Debugging Principle

Do not debug production by randomly adding:

```text
console.log(...)
```

to critical code and redeploying blindly.

Use:

```text
metrics
logs
traces
audit
resource timelines
```

first.

---

# 119. AI Agent Observability Rules

AI coding agents must:

1. Add structured logs for meaningful backend operations where appropriate.
2. Never log secrets.
3. Never log OTPs.
4. Never log payment credentials.
5. Never log full KYC documents.
6. Avoid unnecessary PII.
7. Add metrics for high-value asynchronous workflows.
8. Preserve request correlation.
9. Preserve resource identifiers required for debugging.
10. Add error context without exposing internals.
11. Avoid uncontrolled high-cardinality metric labels.
12. Follow existing logging conventions.
13. Search existing telemetry before creating duplicate events.
14. Never remove useful observability merely to simplify code.
15. Update dashboards/alerts when introducing a critical new subsystem.
16. Ensure financial operations remain traceable.
17. Ensure dispatch operations remain traceable.
18. Ensure worker failures are observable.
19. Ensure retries are observable.
20. Ensure important state transitions are observable.

---

# 120. AI Agent No-Noise Rule

Do not add logs such as:

```text
"entered function"
"doing thing"
"hello"
"test"
```

throughout production code.

Telemetry must have operational value.

---

# 121. AI Agent Error Context Rule

When catching an error, do not log only:

```text
"failed"
```

Provide useful context:

```text
operation
resource
attempt
error category
request ID
```

while respecting privacy/security.

---

# 122. Definition of Done

Observability for a feature is complete when:

```text
[ ] Important business operation is identifiable
[ ] Relevant logs exist
[ ] Errors are observable
[ ] Request correlation works
[ ] Important metrics exist
[ ] Async jobs are observable
[ ] Critical state transitions are observable
[ ] Financial operations are traceable where applicable
[ ] Dispatch operations are traceable where applicable
[ ] Realtime failures are observable where applicable
[ ] External provider failures are observable
[ ] Sensitive information is excluded
[ ] Alerts exist for genuinely critical failures
[ ] Dashboards expose important operational signals
[ ] Relevant runbook exists for high-risk operations
```

---

# 123. AdhocX Golden Signals

At minimum, every major service should expose:

```text
Traffic
Errors
Latency
Saturation
```

For example:

```text
API
→ request rate
→ error rate
→ p95 latency
→ resource saturation

Worker
→ jobs/sec
→ failure rate
→ processing latency
→ queue backlog

Database
→ query rate
→ errors
→ latency
→ connection/storage saturation
```

---

# 124. AdhocX Business Golden Signals

At the product level, the most important signals are:

```text
Requirement Volume
Fulfillment Rate
Assignment Time
Offer Acceptance Rate
Cancellation Rate
No-Driver Rate
Active Driver Supply
Trip Completion Rate
Payment Success Rate
Settlement Backlog
Withdrawal Success Rate
```

---

# 125. Critical Production Dashboard

The first production dashboard should answer:

```text
Is the platform healthy?
Is dispatch working?
Are trips progressing?
Are payments working?
Are workers healthy?
Are users experiencing errors?
```

Suggested sections:

```text
System Health
Marketplace Health
Dispatch
Trips
Financial
Queues/Workers
External Providers
```

---

# 126. Final Observability Principle

AdhocX should never depend on:

```text
"Someone reported that it is broken."
```

without being able to investigate further.

The system should provide evidence.

For any important operation, the team should be able to follow:

```text
User Action
      ↓
API Request
      ↓
Application Operation
      ↓
Database State
      ↓
Domain Event
      ↓
Worker
      ↓
External Provider
      ↓
Final Business Outcome
```

and answer:

> **What happened?**

> **Why did it happen?**

> **Who or what was affected?**

> **Is the system still healthy?**

> **What should we do next?**

That is the standard.

**Logs explain events.
Metrics reveal patterns.
Traces explain paths.
Audit records explain responsibility.
Business telemetry explains product health.**

Together, observability turns production from a black box into an inspectable system.