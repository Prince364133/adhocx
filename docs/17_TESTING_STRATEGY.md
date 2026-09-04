# 17_TESTING_STRATEGY.md

# AdhocX Testing Strategy

**Document Status:** Source of Truth
**Version:** V1
**Audience:** Backend Engineers, Flutter Engineers, Admin Engineers, QA Engineers, DevOps Engineers, AI Coding Agents

---

# 1. Purpose

This document defines the testing strategy for AdhocX.

Testing must verify:

* Product behavior
* Business rules
* Authorization
* State transitions
* Database integrity
* Dispatch correctness
* Financial correctness
* Realtime behavior
* Notifications
* Mobile behavior
* Admin behavior
* Failure recovery
* Concurrency
* Performance
* Security-critical boundaries

The objective is not maximum test count.

The objective is:

> **Maximum confidence in the behavior that matters.**

---

# 2. Testing Philosophy

AdhocX is a transactional marketplace.

Therefore testing must prioritize:

```text
Correctness
>
Security
>
Data integrity
>
Concurrency
>
Reliability
>
User experience
>
Performance
```

A feature is not considered complete merely because the happy path works.

---

# 3. Testing Pyramid

The default testing distribution should follow:

```text
                 E2E
                /   \
          Integration
             /       \
          API / DB
           /         \
        Unit Tests
```

Most tests should be fast unit tests.

Critical workflows must additionally have integration and end-to-end coverage.

---

# 4. Test Layers

AdhocX testing consists of:

```text
Unit Tests
Integration Tests
API Tests
Database Tests
Contract Tests
Worker Tests
Concurrency Tests
Dispatch Tests
Financial Tests
Realtime Tests
Notification Tests
Mobile Tests
Admin Tests
End-to-End Tests
Security Tests
Performance Tests
Resilience Tests
```

---

# 5. Test Environment

Testing should distinguish:

```text
Development
CI
Staging
Production
```

Production must never be used as a normal test environment.

---

# 6. Test Isolation

Tests must be deterministic.

Tests must not depend on:

```text
test execution order
another test's database state
developer machine state
external provider availability
current real-world time
```

unless the test explicitly targets those conditions.

---

# 7. Test Data

Use controlled test factories/builders.

Examples:

```text
createTestVendor()
createTestDriver()
createTestVehicle()
createTestRequirement()
createTestOffer()
createTestTrip()
createTestPayment()
```

Avoid repeating huge object definitions across every test.

---

# 8. Test IDs

Test identifiers should be predictable where useful.

However, tests must not depend on specific UUID values unless the behavior explicitly requires it.

---

# 9. Unit Testing

Unit tests should verify isolated business behavior.

High-priority unit test targets:

```text
state transitions
authorization policies
pricing calculations
dispatch scoring
eligibility rules
validation
financial calculations
formatting utilities
```

---

# 10. Domain Unit Tests

Domain logic should be testable without:

```text
PostgreSQL
Redis
HTTP
Flutter
Next.js
external providers
```

Example:

```text
Offer.accept()
```

should be testable as pure business behavior.

---

# 11. State Machine Tests

Every important state machine must have tests for:

```text
valid transition
invalid transition
terminal state
authorization
side effects
```

---

# 12. Requirement State Tests

Test examples:

```text
DRAFT → POSTED
POSTED → DISPATCHING
DISPATCHING → PARTIALLY_FULFILLED
DISPATCHING → FULFILLED
POSTED → CANCELLED
```

And invalid examples:

```text
COMPLETED → POSTED
CANCELLED → DISPATCHING
FULFILLED → DRAFT
```

must be rejected.

---

# 13. Offer State Tests

Test:

```text
CREATED → SENT
SENT → ACCEPTED
SENT → DECLINED
SENT → EXPIRED
SENT → CANCELLED
```

and invalid transitions.

---

# 14. Assignment State Tests

Test:

```text
PENDING → CONFIRMED
CONFIRMED → COMPLETED
CONFIRMED → CANCELLED
```

including invalid transitions.

---

# 15. Trip State Tests

Test:

```text
ASSIGNED → ARRIVED
ARRIVED → IN_PROGRESS
IN_PROGRESS → COMPLETED
```

plus:

```text
ASSIGNED → CANCELLED
ARRIVED → NO_SHOW
```

according to the defined state machine.

---

# 16. Payment State Tests

Test:

```text
PENDING → PROCESSING
PROCESSING → PAID
PROCESSING → FAILED
PAID → REFUNDED
```

and invalid transitions.

---

# 17. Withdrawal State Tests

Test:

```text
REQUESTED → PROCESSING
PROCESSING → COMPLETED
PROCESSING → FAILED
```

including retry/recovery behavior.

---

# 18. Authorization Testing

Every protected operation must test:

```text
authorized user
unauthorized user
wrong role
wrong resource owner
wrong state
suspended user
```

---

# 19. IDOR Testing

For every resource endpoint:

```text
User A owns resource A
User B requests resource A
```

Expected:

```text
DENIED
```

unless explicitly permitted.

This is especially important for:

```text
requirements
trips
payments
earnings
withdrawals
KYC documents
driver details
user details
```

---

# 20. Backend Authorization Is Mandatory

Do not consider the following a security test:

```text
button hidden in frontend
```

The API itself must reject unauthorized operations.

---

# 21. Database Integration Tests

Database tests must verify:

```text
foreign keys
unique constraints
check constraints
indexes where behavior matters
transactions
locking/concurrency behavior
```

---

# 22. Database Transaction Tests

Critical multi-step operations must be tested for atomicity.

Example:

```text
Accept Offer
```

If assignment creation fails:

```text
offer acceptance
```

must not remain partially committed.

---

# 23. Rollback Tests

Explicitly test:

```text
operation begins
step A succeeds
step B fails
transaction rolls back
```

Verify that no invalid partial state remains.

---

# 24. API Tests

API tests verify the complete HTTP boundary:

```text
request
→ validation
→ authorization
→ application logic
→ persistence
→ response
```

---

# 25. API Contract Tests

Verify:

```text
request schema
response schema
error schema
status code
pagination
authentication
authorization
```

---

# 26. Invalid Input Tests

Every important endpoint should test:

```text
missing required field
wrong type
invalid format
invalid enum
invalid UUID
invalid date
invalid amount
negative amount
excessively large value
```

---

# 27. API Idempotency Tests

For idempotent operations:

```text
Request A
Request A retry
```

must produce one logical operation.

Test examples:

```text
payment initiation
withdrawal
refund
offer acceptance
webhook processing
```

---

# 28. Duplicate Request Tests

Simulate:

```text
same request
same idempotency key
multiple HTTP requests
```

and verify that duplicate side effects do not occur.

---

# 29. Dispatch Testing

Dispatch is one of the highest-risk AdhocX domains.

It requires dedicated tests.

---

# 30. Driver Eligibility Tests

Test that drivers are correctly filtered by:

```text
verification
account state
vehicle type
availability
location
existing assignment
```

---

# 31. Ineligible Driver Tests

Examples:

```text
unverified driver
suspended driver
wrong vehicle
offline driver
busy driver
outside radius
```

must not receive an offer.

---

# 32. Geographic Matching Tests

Test:

```text
driver inside radius
driver outside radius
driver exactly at boundary
multiple drivers at different distances
```

Distance calculations must use the canonical geographic implementation.

---

# 33. Radius Expansion Tests

When no eligible driver accepts:

```text
initial radius
→ expanded radius
→ next dispatch wave
```

must follow configured rules.

Do not hardcode test expectations around unspecified commercial values.

---

# 34. Candidate Ranking Tests

Given the same inputs:

```text
candidate A
candidate B
candidate C
```

the deterministic V1 ranking should produce the same ordering.

---

# 35. Dispatch Determinism

For deterministic scoring:

```text
same inputs
→ same score
→ same ordering
```

unless a deliberate fairness/randomization mechanism is configured.

---

# 36. Dispatch Wave Tests

Test:

```text
Wave 1
→ offers sent
→ some accept
→ remaining requirement calculated
→ next wave created
```

Ensure the system does not notify unlimited drivers unnecessarily.

---

# 37. Offer Expiry Tests

Test:

```text
offer active
→ expiry time reached
→ offer expired
```

and verify:

```text
expired driver cannot accept
```

---

# 38. Offer Acceptance Race Test

Critical concurrency scenario:

```text
Driver A accepts
Driver B accepts
```

at approximately the same time.

Expected:

```text
only valid capacity is assigned
```

No duplicate assignment must occur.

---

# 39. Exact Race Scenario

Requirement:

```text
required = 1
```

Two drivers:

```text
Driver A
Driver B
```

Both accept simultaneously.

Expected:

```text
one assignment
one accepted result
one rejected/conflict result
```

---

# 40. Capacity Race Test

Requirement:

```text
required = 2
```

Three drivers accept simultaneously.

Expected:

```text
maximum 2 valid assignments
```

Never:

```text
3 assignments
```

---

# 41. Cancellation Race Test

Test:

```text
User cancels requirement
```

while:

```text
Driver accepts offer
```

simultaneously.

The final persisted state must follow the authoritative state transition and concurrency rules.

---

# 42. Trip Start Race Test

Test multiple requests to start the same trip.

Expected:

```text
one valid transition
```

not multiple OTP validations creating multiple starts.

---

# 43. Trip Completion Race Test

Two completion requests:

```text
POST /complete
POST /complete
```

must not create:

```text
two completion events
two earnings
two settlements
```

---

# 44. Financial Testing

Financial correctness receives dedicated testing.

Test:

```text
ledger balance
debit/credit equality
earning creation
payment lifecycle
refund
settlement
withdrawal
adjustment
reconciliation
```

---

# 45. Ledger Balance Test

For every double-entry transaction:

```text
total debit = total credit
```

An unbalanced transaction must be rejected.

---

# 46. Ledger Immutability Test

Attempt to modify a posted ledger entry.

Expected:

```text
rejected
```

Corrections must happen through:

```text
reversal
adjustment
```

---

# 47. Duplicate Earning Test

Complete one trip multiple times through retries.

Expected:

```text
one canonical earning
```

---

# 48. Concurrent Withdrawal Test

Example:

```text
Available = ₹1,000

Withdrawal A = ₹800
Withdrawal B = ₹800
```

Run concurrently.

Expected:

```text
maximum ₹1,000 withdrawn
```

Never:

```text
₹1,600
```

---

# 49. Payment Webhook Tests

Test:

```text
valid webhook
invalid signature
duplicate webhook
out-of-order webhook
unknown event
malformed payload
provider retry
```

---

# 50. Webhook Idempotency Test

Send the same provider event multiple times.

Expected:

```text
one financial effect
```

---

# 51. Payment Timeout Test

Simulate:

```text
payment request
→ provider processes
→ network timeout
```

Expected:

```text
system does not incorrectly mark payment failed
```

and can reconcile the final provider state.

---

# 52. Withdrawal Timeout Test

Simulate:

```text
payout request
→ provider processes
→ response lost
```

Expected:

```text
system does not blindly create duplicate payout
```

---

# 53. Refund Tests

Test:

```text
full refund
partial refund if supported
duplicate refund request
refund failure
refund timeout
```

---

# 54. Settlement Tests

Test:

```text
settlement created
settlement succeeds
settlement fails
settlement retries
duplicate settlement request
provider timeout
```

---

# 55. Financial Reconciliation Tests

Test mismatches such as:

```text
AdhocX PROCESSING
Provider PAID
```

and:

```text
AdhocX PAID
Provider FAILED
```

The reconciliation system must produce the expected recovery or operational state.

---

# 56. Realtime Testing

Realtime testing must verify:

```text
authentication
authorization
event delivery
event shape
duplicate events
reconnect
reconciliation
ordering/version handling
```

---

# 57. WebSocket Authorization Test

Driver A must not receive private events intended for Driver B.

User A must not receive User B's private requirement events.

---

# 58. Realtime Event Contract Test

Each event must contain the expected envelope:

```text
eventId
eventType
occurredAt
resourceType
resourceId
payload/version
```

according to the realtime contract.

---

# 59. Duplicate Event Test

Deliver:

```text
Event A
Event A
```

The frontend/backend consumer must safely handle duplication.

---

# 60. Reconnection Test

Simulate:

```text
connected
→ connection lost
→ state changes
→ reconnect
```

The client must reconcile with authoritative backend state.

---

# 61. Stale Event Test

Deliver an older event after a newer event.

The consumer must not blindly revert current state.

Use event versioning/timestamps/sequencing according to the realtime architecture.

---

# 62. Notification Testing

Test:

```text
push creation
push delivery
in-app notification
notification preference
deduplication
retry
deep link
```

---

# 63. Push Token Tests

Test:

```text
new device
token refresh
logout
multiple devices
invalid token
expired token
```

---

# 64. Notification Failure Tests

If push delivery fails:

```text
business state must remain correct
```

A failed notification must never undo:

```text
assignment
payment
trip completion
```

---

# 65. Flutter Unit Testing

Flutter unit tests should cover:

```text
models
mappers
validation
state management
business-facing presentation logic
formatting
```

---

# 66. Flutter Widget Testing

Important widgets should test:

```text
rendering
interaction
loading
error
empty
disabled state
validation
accessibility labels where appropriate
```

---

# 67. Flutter Screen Tests

Critical screens should verify:

```text
correct state
correct CTA
correct navigation
correct error behavior
correct loading behavior
```

Examples:

```text
Requirement Creation
Offer Details
Active Trip
Trip Completion
Earnings
Withdrawal
```

---

# 68. Flutter Integration Tests

Critical end-to-end mobile flows should be tested against a controlled backend/test environment.

Examples:

```text
login
user posts requirement
driver receives opportunity
driver accepts
trip starts
trip completes
driver sees earning
```

---

# 69. Flutter Network Failure Tests

Simulate:

```text
offline
slow connection
timeout
server error
reconnect
```

Verify that the UI does not incorrectly claim success.

---

# 70. Mobile Mutation Tests

For critical mutations:

```text
tap once
network delay
tap again
```

must not create duplicate operations.

---

# 71. Admin Testing

Admin tests should cover:

```text
authentication
permissions
tables
filters
search
pagination
details
drawers
approval workflows
financial operations
audit logs
```

---

# 72. Admin Authorization Tests

Test combinations such as:

```text
Admin with permission
Admin without permission
Suspended admin
Expired session
Direct URL access
```

---

# 73. Admin Operational Tests

Critical flows:

```text
verify driver
approve user
view requirement
manually intervene
view trip
view settlement
review reconciliation issue
perform authorized adjustment
```

---

# 74. Browser Testing

Admin application should be tested on supported browsers.

At minimum, establish support for the team's selected versions of:

```text
Chrome
Safari
Edge
```

Exact browser matrix is a project configuration decision.

---

# 75. End-to-End Testing

E2E tests validate complete business workflows.

The most important E2E flow is:

```text
User
 ↓
Create Requirement
 ↓
Dispatch
 ↓
Driver Offer
 ↓
Driver Accept
 ↓
Assignment
 ↓
Trip
 ↓
OTP Start
 ↓
Completion
 ↓
Earning
 ↓
Settlement
```

---

# 76. User E2E Flow

Test:

```text
login
→ onboarding
→ create requirement
→ requirement posted
→ fulfillment updates
→ driver assignment
→ trip monitoring
→ completion
→ payment/history
```

---

# 77. Driver E2E Flow

Test:

```text
login
→ onboarding
→ KYC
→ vehicle
→ availability
→ opportunity
→ offer
→ accept
→ navigate
→ arrive
→ OTP
→ active trip
→ complete
→ earnings
→ withdrawal
```

---

# 78. Admin E2E Flow

Test:

```text
login
→ dashboard
→ driver verification
→ user approval
→ operational monitoring
→ payment/settlement review
→ audit history
```

---

# 79. Failure E2E Flows

Critical failure scenarios must have end-to-end coverage.

Examples:

```text
driver cancellation
user cancellation
no driver available
passenger no-show
payment failure
network loss
expired offer
concurrent acceptance
```

---

# 80. No-Driver E2E

Test:

```text
requirement posted
→ no eligible driver
→ dispatch wave(s)
→ radius expansion
→ no successful acceptance
→ NO_DRIVER_AVAILABLE
```

The final state and user notification must be correct.

---

# 81. Partial Fulfillment E2E

Example:

```text
Requirement = 10 vehicles
Only 6 assigned
```

Verify:

```text
requirement = PARTIALLY_FULFILLED
```

and remaining capacity continues through the appropriate dispatch process.

---

# 82. Cancellation E2E

Test cancellation at different lifecycle stages.

Examples:

```text
before dispatch
during dispatch
after assignment
before trip start
during trip
```

Only permitted transitions should succeed.

---

# 83. Passenger No-Show E2E

Test:

```text
driver arrives
→ passenger does not appear
→ no-show action
→ trip state
→ financial outcome
→ notifications
```

Commercial outcome remains governed by the defined business rules.

---

# 84. Security Testing

Security testing should include:

```text
authentication bypass
authorization bypass
IDOR
rate-limit abuse
input injection
file upload abuse
webhook spoofing
session misuse
sensitive data exposure
```

---

# 85. OTP Security Tests

Test:

```text
wrong OTP
expired OTP
reused OTP
too many attempts
OTP for another session
```

---

# 86. Session Tests

Test:

```text
expired session
revoked session
logout
multiple devices
suspended account
```

---

# 87. Rate Limiting Tests

Test repeated:

```text
OTP requests
OTP verification
login attempts
offer actions
withdrawals
payment initiation
```

and verify configured limits.

---

# 88. File Security Tests

Test:

```text
unsupported file type
oversized file
malicious filename
unauthorized download
cross-user document access
```

---

# 89. Performance Testing

Performance testing should focus on high-risk paths.

Important workloads:

```text
dispatch
driver location
trip status
realtime events
payments
admin tables
```

---

# 90. Dispatch Load Test

Simulate:

```text
large number of drivers
large number of requirements
simultaneous dispatch runs
```

Measure:

```text
candidate query latency
dispatch completion time
offer creation rate
queue latency
database load
```

---

# 91. Location Load Test

Simulate many active drivers sending location updates.

Measure:

```text
API throughput
database writes
spatial query latency
Redis load
WebSocket traffic
```

---

# 92. Realtime Load Test

Simulate:

```text
many connected clients
high event frequency
reconnect bursts
large dispatch waves
```

Verify:

```text
event latency
connection stability
server resource usage
```

---

# 93. Queue Load Test

Test:

```text
dispatch jobs
notification jobs
financial jobs
reconciliation jobs
```

under backlog.

Verify workers eventually catch up without corrupting state.

---

# 94. Database Load Testing

Measure:

```text
CPU
memory
connections
query latency
locks
slow queries
index usage
```

under realistic workloads.

---

# 95. Stress Testing

Stress tests intentionally exceed normal expected traffic.

The objective is to discover:

```text
failure boundaries
queue collapse
database saturation
memory leaks
connection exhaustion
```

---

# 96. Resilience Testing

Simulate failure of:

```text
Redis
PostgreSQL connection
payment provider
maps provider
push provider
storage provider
WebSocket connections
background workers
```

The application should fail safely.

---

# 97. Worker Restart Testing

Simulate:

```text
worker processing job
→ process killed
→ worker restarts
```

Verify idempotency prevents duplicate side effects.

---

# 98. Database Connection Failure

Simulate temporary DB connectivity loss.

Expected:

```text
requests fail safely
workers retry where appropriate
no corrupted partial state
```

---

# 99. Redis Failure

If Redis becomes unavailable:

```text
critical business truth must remain in PostgreSQL
```

The application may temporarily lose:

```text
cache
queues
ephemeral coordination
```

but must not fabricate or corrupt assignments/payments.

---

# 100. External Provider Failure

If maps/payment/push provider fails:

```text
core system state must remain consistent
```

External dependency failure must not produce impossible business states.

---

# 101. Contract Testing

External integrations should have contract tests where practical.

Examples:

```text
payment provider
maps provider
push provider
storage provider
```

---

# 102. Test Doubles

Use provider fakes/mocks for deterministic tests.

Example:

```text
FakePaymentProvider
FakeMapsProvider
FakeNotificationProvider
```

But maintain integration tests against the actual provider sandbox where available.

---

# 103. Time Testing

Time-sensitive behavior must use controllable clocks where practical.

Important examples:

```text
offer expiration
OTP expiration
session expiration
payment timeout
settlement timing
```

Do not make tests depend on arbitrary `sleep()` calls.

---

# 104. Avoid Flaky Tests

Avoid:

```text
random delays
real external dependencies in every test
fixed wall-clock assumptions
test ordering
shared mutable state
```

Prefer deterministic synchronization.

---

# 105. Test Coverage

Coverage percentage is a signal, not the definition of quality.

A codebase with:

```text
95% coverage
```

can still be unsafe if concurrency and failure paths are untested.

Prioritize risk over raw percentage.

---

# 106. Minimum High-Risk Coverage

The following must have strong test coverage:

```text
authorization
state transitions
dispatch capacity
offer acceptance
trip lifecycle
ledger posting
payments
refunds
settlements
withdrawals
webhooks
idempotency
concurrency
```

---

# 107. CI Testing

Every pull request should run at least:

```text
format check
lint
type check
unit tests
relevant integration tests
```

---

# 108. Main Branch Testing

Before merging to the production branch, run:

```text
full unit suite
integration suite
API tests
critical E2E suite
build verification
```

according to CI capacity.

---

# 109. Release Testing

A release candidate should pass:

```text
critical E2E
security smoke tests
database migration tests
financial tests
dispatch tests
mobile smoke tests
admin smoke tests
```

---

# 110. Regression Testing

Every production bug should result in a regression test when practical.

Example:

```text
Bug:
duplicate earning after retry

Required response:
fix
+
regression test
```

---

# 111. Bug Classification

Bugs should be classified by impact.

Suggested levels:

```text
P0 — financial/security/data corruption/system-wide outage
P1 — critical workflow broken
P2 — major functionality degraded
P3 — minor defect
P4 — cosmetic/non-critical
```

Exact operational definitions may be refined later.

---

# 112. P0 Examples

Examples:

```text
duplicate payouts
ledger imbalance
authorization bypass
cross-user financial data exposure
mass assignment corruption
```

These require immediate attention.

---

# 113. P1 Examples

Examples:

```text
drivers cannot accept offers
users cannot post requirements
trip completion fails for all users
dispatch is fundamentally broken
```

---

# 114. Bug-to-Test Rule

For every P0/P1 bug:

```text
root cause
→ code fix
→ regression test
→ verification
```

The same bug should not be allowed to silently return.

---

# 115. Test Ownership

Each engineering area owns its tests.

```text
Backend → domain/API/database
Flutter → mobile/unit/widget/integration
Admin → web/component/E2E
DevOps → infrastructure/resilience
```

Cross-functional flows require shared ownership.

---

# 116. Test Documentation

Complex tests should document:

```text
scenario
preconditions
action
expected result
failure reason if applicable
```

Avoid unexplained test fixtures.

---

# 117. AI Agent Testing Rules

AI coding agents must:

1. Read the relevant source-of-truth documents.
2. Inspect existing tests before writing new tests.
3. Reuse existing test utilities.
4. Add tests for new business behavior.
5. Add regression tests for bug fixes.
6. Test invalid states.
7. Test authorization.
8. Test failure paths.
9. Test idempotency where relevant.
10. Test concurrency where relevant.
11. Never delete failing tests simply to make CI pass.
12. Never weaken assertions without explaining why.
13. Never replace real business assertions with snapshots alone.
14. Never claim completion without running relevant verification.
15. Never ignore flaky tests without investigation.

---

# 118. AI Agent Test Duplication Rule

Before creating a test:

```text
search existing test
search existing fixture
search existing factory
search existing helper
```

Do not create duplicate test infrastructure unnecessarily.

---

# 119. AI Agent Failure Rule

If tests fail:

```text
1. Read the failure.
2. Identify whether the failure is code, test, fixture, environment, or expected behavior.
3. Fix the root cause.
4. Re-run the relevant test.
5. Run the broader suite.
```

Do not modify assertions merely to match incorrect implementation.

---

# 120. AI Agent No-Test-Suppression Rule

Forbidden:

```text
skip test
only test
comment out assertion
disable lint rule
disable type checking
```

to make a feature appear complete.

Any temporary exception requires explicit justification.

---

# 121. Definition of Done

A feature is not considered tested until:

```text
[ ] Happy path tested
[ ] Validation tested
[ ] Authorization tested
[ ] Invalid state tested
[ ] Error state tested
[ ] Retry behavior considered
[ ] Idempotency tested where required
[ ] Concurrency tested where required
[ ] Database behavior tested where required
[ ] Realtime behavior tested where required
[ ] Mobile behavior tested where required
[ ] Admin behavior tested where required
[ ] Critical E2E path tested
[ ] Regression coverage added for relevant bugs
[ ] CI checks pass
```

---

# 122. Critical AdhocX Test Matrix

| Domain            | Unit | Integration | API | Concurrency | E2E |
| ----------------- | ---: | ----------: | --: | ----------: | --: |
| Authentication    |    ✓ |           ✓ |   ✓ |           — |   ✓ |
| User onboarding |    ✓ |           ✓ |   ✓ |           — |   ✓ |
| Driver KYC        |    ✓ |           ✓ |   ✓ |           — |   ✓ |
| Requirements      |    ✓ |           ✓ |   ✓ |           ✓ |   ✓ |
| Dispatch          |    ✓ |           ✓ |   ✓ |           ✓ |   ✓ |
| Offers            |    ✓ |           ✓ |   ✓ |           ✓ |   ✓ |
| Assignments       |    ✓ |           ✓ |   ✓ |           ✓ |   ✓ |
| Trips             |    ✓ |           ✓ |   ✓ |           ✓ |   ✓ |
| Payments          |    ✓ |           ✓ |   ✓ |           ✓ |   ✓ |
| Ledger            |    ✓ |           ✓ |   ✓ |           ✓ |   ✓ |
| Settlements       |    ✓ |           ✓ |   ✓ |           ✓ |   ✓ |
| Withdrawals       |    ✓ |           ✓ |   ✓ |           ✓ |   ✓ |
| Notifications     |    ✓ |           ✓ |   ✓ |           — |   ✓ |
| Realtime          |    ✓ |           ✓ |   ✓ |           ✓ |   ✓ |
| Admin             |    ✓ |           ✓ |   ✓ |           — |   ✓ |

---

# 123. Critical Failure Matrix

| Scenario                       | Expected Protection               |
| ------------------------------ | --------------------------------- |
| Two drivers accept one slot    | Transaction/concurrency control   |
| Two withdrawals exceed balance | Atomic balance reservation        |
| Duplicate payment webhook      | Webhook idempotency               |
| Payment timeout                | Provider reconciliation           |
| Duplicate trip completion      | Idempotent transition             |
| Driver cancels                 | State transition + redispatch     |
| User cancels                 | Offer/assignment cancellation     |
| No drivers                     | Radius expansion + terminal state |
| Network loss                   | Reconciliation                    |
| Worker crash                   | Idempotent retry                  |
| Redis failure                  | PostgreSQL remains authoritative  |
| Unauthorized resource access   | Resource-level authorization      |
| Invalid state transition       | State machine rejection           |
| Ledger imbalance               | Atomic transaction validation     |

---

# 124. Quality Gate

Before production release, the team must be able to answer:

```text
Can two users accidentally consume the same slot?
Can the same money be withdrawn twice?
Can a webhook create duplicate financial effects?
Can a user access another user's resource?
Can a trip move to an impossible state?
Can a worker retry safely?
Can realtime events arrive out of order?
Can the system recover from provider timeout?
Can critical failures be diagnosed?
```

If any answer is:

```text
"We think so."
```

the feature is not sufficiently tested.

---

# 125. Final Testing Principle

Testing AdhocX is not about proving that the application works when everything goes right.

It is about proving that the application remains correct when:

```text
users retry
drivers race
networks fail
workers restart
providers timeout
events duplicate
payments fail
data becomes stale
systems become concurrent
```

The most important tests are therefore the ones that protect:

```text
money
state
capacity
authorization
trust
```

**A green happy-path test suite is not production readiness.**

**Production readiness means the system remains correct when reality behaves badly.**