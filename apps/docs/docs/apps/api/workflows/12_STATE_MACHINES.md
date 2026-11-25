# 12_STATE_MACHINES.md

# AdhocX State Machines

**Document Status:** Source of Truth
**Version:** V1
**Audience:** Product, Backend, Mobile, Admin, QA, DevOps, AI Coding Agents

---

# 1. Purpose

This document defines the authoritative lifecycle states and legal state transitions for AdhocX V1.

It exists to prevent:

* invalid state transitions
* inconsistent UI states
* duplicate assignments
* incorrect trip lifecycle
* stale dispatch behavior
* financial inconsistencies
* race-condition bugs
* client-side state manipulation
* ambiguous operational behavior

Every state-changing operation must conform to the state machines defined here.

---

# 2. Core Principle

A resource's state is authoritative on the backend.

The client may request:

```text
Accept
Decline
Cancel
Start
Complete
Verify
Suspend
```

The client may not directly decide:

```text
status = COMPLETED
status = VERIFIED
status = ASSIGNED
```

The backend validates and performs the transition.

---

# 3. State Machine Structure

Every state machine consists of:

```text
Current State
    ↓
Action / Event
    ↓
Guards / Business Rules
    ↓
Side Effects
    ↓
Next State
```

Example:

```text
OFFER_SENT
    ↓
Driver accepts
    ↓
Offer still valid?
Driver still eligible?
Requirement has capacity?
    ↓
YES
    ↓
OFFER_ACCEPTED
    ↓
Assignment created
```

---

# 4. State Transition Rules

A transition is valid only if:

1. Current state permits the action.
2. Actor has permission.
3. Resource ownership is valid.
4. Business rules pass.
5. Required dependencies are valid.
6. Concurrency rules pass.
7. Transaction succeeds.

If any condition fails:

```text
State remains unchanged.
```

---

# 5. General Transition Invariants

The system must prevent:

```text
invalid state jumps
duplicate transitions
state regression
unauthorized transitions
client-controlled transitions
partial state updates
```

State transitions must be atomic where the transition affects critical business invariants.

---

# 6. User Account State

User accounts have a general lifecycle.

Conceptual states:

```text
ACTIVE
SUSPENDED
DEACTIVATED
```

Depending on the role, onboarding/verification states may exist separately.

---

# 7. User Account Transitions

```text
ACTIVE
 ├── suspend → SUSPENDED
 └── deactivate → DEACTIVATED

SUSPENDED
 └── reactivate → ACTIVE
```

A deactivated account should not be silently reactivated by a normal client operation.

Administrative intervention may be required.

---

# 8. User Onboarding State

User onboarding states:

```text
PENDING
UNDER_REVIEW
APPROVED
REJECTED
SUSPENDED
```

---

# 9. User State Transitions

```text
PENDING
    ↓ submit
UNDER_REVIEW

UNDER_REVIEW
    ├── approve → APPROVED
    └── reject → REJECTED

APPROVED
    └── suspend → SUSPENDED

SUSPENDED
    └── reactivate → APPROVED
```

A user cannot create operational requirements unless its state permits that action.

---

# 10. Driver Verification State

Driver verification states:

```text
PENDING
UNDER_REVIEW
VERIFIED
REJECTED
SUSPENDED
```

---

# 11. Driver Verification Transitions

```text
PENDING
    ↓ submit
UNDER_REVIEW

UNDER_REVIEW
    ├── approve → VERIFIED
    └── reject → REJECTED

VERIFIED
    └── suspend → SUSPENDED

SUSPENDED
    └── reactivate → VERIFIED
```

A rejected driver may need to resubmit information according to the onboarding rules.

---

# 12. Vehicle Verification State

Vehicle verification may follow:

```text
PENDING
UNDER_REVIEW
VERIFIED
REJECTED
SUSPENDED
```

Transitions follow the same general verification pattern.

A driver must not be considered fully eligible for dispatch if required vehicle verification has not been completed.

---

# 13. Driver Availability State

Availability is distinct from account verification.

Conceptual states:

```text
OFFLINE
AVAILABLE
BUSY
UNAVAILABLE
```

---

# 14. Availability Transitions

```text
OFFLINE
    └── go online → AVAILABLE

AVAILABLE
    ├── go offline → OFFLINE
    └── assignment/trip → BUSY

BUSY
    └── trip/assignment released → AVAILABLE
```

`UNAVAILABLE` may be used for temporary operational conditions.

Exact availability transitions must respect active assignments and trips.

---

# 15. Availability Invariant

A driver cannot become:

```text
AVAILABLE
```

if the driver's account or verification state makes dispatch eligibility impossible.

Similarly, a driver cannot go offline in a way that silently cancels an active trip.

Availability and active-trip state are separate concepts.

---

# 16. Requirement State

The requirement is one of the central AdhocX state machines.

Conceptual V1 states:

```text
DRAFT
POSTED
DISPATCHING
PARTIALLY_FULFILLED
FULFILLED
IN_PROGRESS
COMPLETED
CANCELLED
NO_DRIVER_AVAILABLE
```

The exact final naming must remain consistent across:

* API
* database
* mobile
* admin
* realtime events

---

# 17. Requirement Lifecycle

Primary flow:

```text
DRAFT
  ↓
POSTED
  ↓
DISPATCHING
  ↓
PARTIALLY_FULFILLED
  ↓
FULFILLED
  ↓
IN_PROGRESS
  ↓
COMPLETED
```

Cancellation can occur from permitted states.

---

# 18. Requirement Creation

```text
DRAFT
    ↓
user submits requirement
    ↓
POSTED
```

If the product does not persist a draft server-side, `DRAFT` may exist only as a client/UI concept.

The backend must not create unnecessary persistent states merely because a screen needs them.

---

# 19. Requirement Dispatch

```text
POSTED
    ↓
dispatch starts
    ↓
DISPATCHING
```

Dispatch may also begin immediately after creation depending on implementation.

---

# 20. Requirement Partial Fulfillment

Example:

```text
Requested = 20
Assigned = 10
Remaining = 10
```

The requirement becomes:

```text
PARTIALLY_FULFILLED
```

when the business conditions for partial fulfillment are satisfied.

---

# 21. Requirement Full Fulfillment

When:

```text
assignedQuantity == requestedQuantity
```

the requirement transitions to:

```text
FULFILLED
```

The backend must guarantee:

```text
assignedQuantity <= requestedQuantity
```

at all times.

---

# 22. Requirement In Progress

Once the associated trips begin operational execution:

```text
FULFILLED
    ↓
trip execution starts
    ↓
IN_PROGRESS
```

The exact transition may depend on whether a requirement contains multiple trips.

The requirement-level state must not incorrectly imply that every associated trip has started merely because one trip has started.

---

# 23. Requirement Completion

A requirement becomes:

```text
COMPLETED
```

only when all required associated operational work has completed according to the business rules.

A single completed trip must not automatically mark a multi-vehicle requirement completed.

---

# 24. Requirement Cancellation

Possible:

```text
POSTED → CANCELLED
DISPATCHING → CANCELLED
PARTIALLY_FULFILLED → CANCELLED
```

Whether cancellation is permitted after fulfillment or trip start is a business rule and may be restricted.

---

# 25. Requirement No-Driver State

If dispatch exhausts configured options:

```text
DISPATCHING
    ↓
no eligible supply
    ↓
NO_DRIVER_AVAILABLE
```

This is an operational outcome.

It does not necessarily mean the requirement is permanently cancelled.

Redispatch may be possible.

---

# 26. Redispatch

Depending on business rules:

```text
NO_DRIVER_AVAILABLE
    ↓
redispatch
    ↓
DISPATCHING
```

The engine must recalculate candidates rather than reuse stale candidates.

---

# 27. Requirement Cancellation During Dispatch

If a user cancels while dispatch is running:

```text
DISPATCHING
    ↓
CANCEL
    ↓
CANCELLED
```

The dispatch worker must observe the changed state and stop further offer creation.

---

# 28. Requirement State Guard

Every requirement mutation must verify the current database state inside the authoritative operation.

Example:

```text
Worker starts dispatch
        ↓
Requirement was cancelled meanwhile
        ↓
Worker checks current state
        ↓
Dispatch stops
```

The worker must never operate indefinitely on stale state.

---

# 29. Offer State

Offer lifecycle:

```text
CREATED
SENT
ACCEPTED
DECLINED
EXPIRED
CANCELLED
```

---

# 30. Offer Lifecycle

Normal flow:

```text
CREATED
   ↓
SENT
   ↓
ACCEPTED
```

Alternative:

```text
SENT
 ├── decline → DECLINED
 ├── timeout → EXPIRED
 └── cancellation → CANCELLED
```

---

# 31. Offer Creation

An offer is created only for a driver who is eligible at the time the dispatch engine creates the offer.

The offer must contain an expiration time.

---

# 32. Offer Acceptance

```text
SENT
    ↓
driver accepts
    ↓
backend validates
    ↓
ACCEPTED
```

Acceptance must be transactional.

---

# 33. Offer Acceptance Guards

Before acceptance:

```text
offer exists
offer belongs to driver
offer is still active
offer not expired
requirement still needs capacity
driver still eligible
driver has no conflicting assignment
```

If any condition fails:

```text
Offer does not become ACCEPTED.
```

---

# 34. Offer Expiration

```text
SENT
    ↓
expiresAt reached
    ↓
EXPIRED
```

Expiration is based on backend time.

A mobile countdown is informational only.

---

# 35. Offer Expiration Race

Potential race:

```text
Driver taps Accept
        +
Offer expires simultaneously
```

The backend decides the result transactionally.

The client cannot determine which operation wins.

---

# 36. Offer Cancellation

An offer may be cancelled because:

* requirement cancelled
* requirement fully fulfilled
* dispatch invalidated the offer
* driver became operationally ineligible
* admin cancelled the offer

The exact allowed transitions must be enforced centrally.

---

# 37. Assignment State

Assignment represents confirmed driver allocation.

Conceptual states:

```text
PENDING
CONFIRMED
CANCELLED
COMPLETED
```

---

# 38. Assignment Creation

The canonical flow is:

```text
Offer
    ↓
Driver accepts
    ↓
Atomic capacity validation
    ↓
Assignment created
```

Assignment creation is not a client-side operation.

---

# 39. Assignment Confirmation

In the simplified V1 workflow:

```text
OFFER_ACCEPTED
    ↓
assignment created
    ↓
CONFIRMED
```

If user confirmation is required by the final business process, an intermediate state may be introduced.

That commercial rule is **TBD**.

The implementation must not invent such a state.

---

# 40. Assignment Cancellation

Possible:

```text
CONFIRMED
    ↓
driver/user/admin cancellation
    ↓
CANCELLED
```

Cancellation may trigger:

```text
capacity reopening
redispatch
financial adjustment
notifications
audit event
```

Exact financial penalties are **TBD**.

---

# 41. Assignment Completion

An assignment may become:

```text
COMPLETED
```

when its associated trip has successfully completed.

Assignment completion must not be confused with requirement completion.

---

# 42. Assignment Invariants

For active assignments:

```text
driver must be valid
vehicle must be valid
requirement must exist
requirement capacity must support assignment
```

A driver must not have conflicting active assignments according to operational rules.

---

# 43. Trip State

The trip lifecycle is critical.

Conceptual V1 states:

```text
ASSIGNED
ARRIVED
IN_PROGRESS
COMPLETED
CANCELLED
NO_SHOW
```

---

# 44. Trip Lifecycle

Normal flow:

```text
ASSIGNED
    ↓
ARRIVED
    ↓
IN_PROGRESS
    ↓
COMPLETED
```

---

# 45. Trip Assignment

Trip starts in:

```text
ASSIGNED
```

after a valid assignment exists.

A trip must not be created as `IN_PROGRESS` without satisfying trip-start rules.

---

# 46. Driver Arrival

```text
ASSIGNED
    ↓
driver arrives
    ↓
ARRIVED
```

Arrival does not mean passenger pickup has occurred.

---

# 47. Trip Start

```text
ARRIVED
    ↓
OTP validation
    ↓
IN_PROGRESS
```

The backend validates the OTP.

The mobile application must never determine OTP validity locally.

---

# 48. Trip Start Guards

Trip start requires:

```text
trip exists
driver is assigned
driver is authorized
trip state permits start
OTP is valid
OTP is not expired
required operational conditions satisfied
```

If any guard fails:

```text
Trip remains ARRIVED.
```

---

# 49. Trip Completion

```text
IN_PROGRESS
    ↓
driver completes trip
    ↓
COMPLETED
```

The backend validates all required completion conditions.

Completion may trigger:

```text
earnings
ledger entry
payment workflow
settlement workflow
notifications
```

---

# 50. Trip Cancellation

Depending on business rules:

```text
ASSIGNED → CANCELLED
ARRIVED → CANCELLED
IN_PROGRESS → CANCELLED
```

Cancellation after trip start may require specialized operational handling.

Exact cancellation policy is **TBD**.

---

# 51. Passenger No-Show

Possible:

```text
ARRIVED
    ↓
passenger does not appear
    ↓
NO_SHOW
```

A no-show should not simply be represented as a generic cancellation if financial or operational consequences differ.

---

# 52. No-Show Rules

No-show handling may trigger:

* user notification
* driver notification
* evidence/timestamp capture
* financial adjustment
* support workflow

Exact commercial rules are **TBD**.

---

# 53. Trip Completion Integrity

A trip cannot transition:

```text
ASSIGNED → COMPLETED
```

directly unless an explicit business rule allows it.

Normal V1 path is:

```text
ASSIGNED
→ ARRIVED
→ IN_PROGRESS
→ COMPLETED
```

Admin overrides must be explicit and audited.

---

# 54. Payment State

Payment lifecycle should be separate from trip lifecycle.

Conceptual states:

```text
PENDING
PROCESSING
PAID
FAILED
CANCELLED
REFUNDED
```

---

# 55. Payment Transitions

```text
PENDING
    ↓
PROCESSING
    ├── success → PAID
    └── failure → FAILED

PAID
    └── refund → REFUNDED
```

Cancellation/refund transitions depend on the payment provider and business rules.

---

# 56. Payment State Principle

A trip being:

```text
COMPLETED
```

does not automatically mean:

```text
PAYMENT = PAID
```

These are separate state machines.

Example:

```text
Trip → COMPLETED
Payment → PROCESSING
```

is valid.

---

# 57. Settlement State

Settlement is distinct from payment.

Conceptual states:

```text
PENDING
PROCESSING
SETTLED
FAILED
REVERSED
```

---

# 58. Settlement Lifecycle

```text
PENDING
    ↓
PROCESSING
    ├── success → SETTLED
    └── failure → FAILED

FAILED
    └── retry → PROCESSING
```

Financial operations must remain traceable through the ledger.

---

# 59. Withdrawal State

Driver withdrawal lifecycle:

```text
REQUESTED
PROCESSING
COMPLETED
FAILED
CANCELLED
```

---

# 60. Withdrawal Transitions

```text
REQUESTED
    ↓
PROCESSING
    ├── success → COMPLETED
    └── failure → FAILED
```

A failed withdrawal must not silently remove the driver's funds.

---

# 61. Notification State

Notification delivery state is separate from business state.

Conceptual states:

```text
CREATED
QUEUED
SENT
DELIVERED
FAILED
READ
```

A failed push notification does not mean the underlying business action failed.

---

# 62. Notification Example

```text
Offer
    ↓
Offer CREATED
    ↓
Notification CREATED
    ↓
Push delivery FAILED
```

The offer remains valid until its own state changes.

---

# 63. KYC Document State

Document lifecycle:

```text
UPLOADED
UNDER_REVIEW
APPROVED
REJECTED
EXPIRED
```

Documents should be evaluated independently from the overall driver state.

---

# 64. Dispatch Run State

A dispatch run may use:

```text
QUEUED
RUNNING
COMPLETED
FAILED
CANCELLED
```

---

# 65. Dispatch Run Transitions

```text
QUEUED
    ↓
RUNNING
    ├── successful → COMPLETED
    ├── unrecoverable failure → FAILED
    └── requirement cancelled → CANCELLED
```

A failed dispatch run does not necessarily mean the requirement itself has failed.

---

# 66. Dispatch vs Requirement State

These must remain separate.

Example:

```text
Requirement = DISPATCHING
Dispatch Run = FAILED
```

This may be valid if a retry is scheduled.

Another example:

```text
Requirement = NO_DRIVER_AVAILABLE
Dispatch Run = COMPLETED
```

The dispatch run successfully concluded that no eligible supply was available.

---

# 67. State Transition Architecture

Do not implement state transitions as scattered conditionals.

Bad:

```text
if (trip.status === "ARRIVED") {
   trip.status = "IN_PROGRESS";
}
```

inside arbitrary controllers.

Preferred:

```text
Controller
    ↓
Application Use Case
    ↓
Domain Transition
    ↓
Guard Validation
    ↓
Persistence
```

---

# 68. Transition Functions

Conceptually:

```text
requirement.cancel()
requirement.beginDispatch()
requirement.markFulfilled()

offer.accept()
offer.decline()
offer.expire()
offer.cancel()

assignment.confirm()
assignment.cancel()
assignment.complete()

trip.arrive()
trip.start()
trip.complete()
trip.cancel()
trip.markNoShow()
```

The exact implementation may use domain methods, transition services, or another disciplined mechanism.

---

# 69. Illegal Transition Handling

If an illegal transition is requested:

```text
HTTP 409
```

or an appropriate domain/business error.

Example:

```json
{
  "success": false,
  "error": {
    "code": "TRIP_INVALID_STATE",
    "message": "The trip cannot be started from its current state."
  }
}
```

The state remains unchanged.

---

# 70. State Transition Idempotency

Repeated valid requests should be handled safely.

Example:

```text
POST /trip/123/complete
```

is received twice.

The backend should not create:

```text
two completion events
two earnings records
two ledger entries
```

The operation must be idempotent where required.

---

# 71. State Transition Transactions

If a transition modifies multiple related records, use an appropriate transaction.

Example:

```text
Offer ACCEPTED
+
Assignment CREATED
+
Requirement assigned quantity incremented
```

must not partially succeed.

---

# 72. State Transition Events

Important transitions may publish events.

Examples:

```text
RequirementCreated
RequirementFulfilled

OfferCreated
OfferAccepted
OfferExpired

AssignmentCreated
AssignmentCancelled

TripStarted
TripCompleted

PaymentPaid
SettlementCompleted
```

Events must represent committed state.

---

# 73. Event Ordering

If event A causes state B:

```text
Persist state
    ↓
Commit transaction
    ↓
Publish event
```

Do not publish a success event before the underlying state is durably committed.

---

# 74. Realtime State Synchronization

Realtime events are notifications of state changes.

They are not authoritative state storage.

Example:

```text
TRIP_STATUS_CHANGED
```

causes the mobile client to update the screen.

If the event is missed:

```text
Client reconnects
    ↓
Fetch authoritative trip
    ↓
UI reconciles
```

---

# 75. State Reconciliation

Clients must be able to recover from:

* missed WebSocket events
* app termination
* network loss
* background suspension
* stale local cache

The client should refresh authoritative state after reconnection.

---

# 76. State Persistence

Every persistent state must be stored in the appropriate backend/domain model.

Do not maintain separate conflicting state in:

```text
PostgreSQL
Redis
Flutter
Next.js
```

Redis may hold temporary coordination information but must not become an independent business state machine.

---

# 77. State and UI

UI states must derive from backend/domain states.

Example:

```text
Trip = ARRIVED
```

→ show:

```text
Enter passenger OTP
```

Example:

```text
Trip = IN_PROGRESS
```

→ show:

```text
Active Trip
```

Example:

```text
Trip = COMPLETED
```

→ show:

```text
Trip completed
```

The UI must not invent hidden states.

---

# 78. State and Permissions

A user's permission does not automatically mean a transition is valid.

Example:

```text
Admin
+
Trip COMPLETED
```

does not imply:

```text
Admin can restart trip
```

Authorization and state validation are separate guards.

---

# 79. State and Concurrency

Every critical transition must account for concurrent operations.

Example:

```text
Driver A accepts offer
Driver B accepts offer
User cancels requirement
Admin redispatches
```

The backend must resolve these operations into one valid state.

No operation may rely exclusively on a previously fetched state.

---

# 80. State and Database Constraints

Where possible, critical invariants should be protected at the database level.

Examples:

```text
unique active assignment
assignment capacity
unique offer relationship
financial ledger integrity
```

Application-level validation alone is insufficient for concurrency-sensitive invariants.

---

# 81. State History

Important state changes should be historically observable.

Example:

```text
Requirement:
POSTED
→ DISPATCHING
→ PARTIALLY_FULFILLED
→ FULFILLED
→ IN_PROGRESS
→ COMPLETED
```

Historical records should not be overwritten.

---

# 82. Timeline Events

A state timeline may include:

```text
timestamp
actor
event
previous state
new state
metadata
requestId
```

This allows operations teams to reconstruct what happened.

---

# 83. Admin Overrides

Admin overrides are explicit exceptions.

Examples:

```text
force cancellation
manual reassignment
verification override
operational completion
```

They must:

* require permission
* validate current state
* use controlled application services
* create audit records
* record actor
* record reason where appropriate

---

# 84. No Direct Database Overrides

Admin tools must never implement:

```text
UPDATE trips
SET status = 'COMPLETED'
```

directly from application code.

All state changes must go through the domain/application layer.

---

# 85. State Naming Rules

State names must:

* be uppercase enums at the domain/API level where appropriate
* have one canonical meaning
* not overlap ambiguously
* be documented
* remain consistent across backend and clients

Avoid synonyms such as:

```text
ACTIVE
RUNNING
ONGOING
IN_PROGRESS
```

for the same conceptual state.

Choose one canonical state.

---

# 86. Requirement Quantity and State

State must reflect quantity.

Examples:

```text
Requested = 20
Assigned = 0
→ DISPATCHING

Requested = 20
Assigned = 10
→ PARTIALLY_FULFILLED

Requested = 20
Assigned = 20
→ FULFILLED
```

The exact transition timing depends on dispatch/business rules, but the quantities must remain authoritative.

---

# 87. Multi-Trip Requirements

A single requirement may produce multiple assignments/trips.

Therefore:

```text
Requirement State
```

must not be treated as a direct copy of:

```text
Trip State
```

The requirement aggregates operational state.

---

# 88. Aggregate State

For multi-vehicle requirements:

```text
Requirement
 ├── Assignment A → Trip Completed
 ├── Assignment B → Trip In Progress
 ├── Assignment C → Trip Assigned
 └── Assignment D → Trip Assigned
```

The requirement remains operationally active.

It cannot be marked `COMPLETED` until its aggregate completion rules are satisfied.

---

# 89. Financial State Independence

Financial state must not be inferred purely from operational state.

Example:

```text
Trip COMPLETED
Payment FAILED
Settlement PENDING
```

This is a valid intermediate operational/financial combination.

---

# 90. State Transition Matrix — Requirement

| From                | Action                | To                  |
| ------------------- | --------------------- | ------------------- |
| DRAFT               | Submit                | POSTED              |
| POSTED              | Start dispatch        | DISPATCHING         |
| DISPATCHING         | Partial assignment    | PARTIALLY_FULFILLED |
| DISPATCHING         | Full assignment       | FULFILLED           |
| PARTIALLY_FULFILLED | Additional assignment | PARTIALLY_FULFILLED |
| PARTIALLY_FULFILLED | Fully assigned        | FULFILLED           |
| DISPATCHING         | No supply             | NO_DRIVER_AVAILABLE |
| NO_DRIVER_AVAILABLE | Redispatch            | DISPATCHING         |
| FULFILLED           | Operational start     | IN_PROGRESS         |
| IN_PROGRESS         | All trips complete    | COMPLETED           |
| POSTED              | Cancel                | CANCELLED           |
| DISPATCHING         | Cancel                | CANCELLED           |
| PARTIALLY_FULFILLED | Cancel                | CANCELLED           |

Exact cancellation rules remain configurable/TBD.

---

# 91. State Transition Matrix — Offer

| From    | Action  | To        |
| ------- | ------- | --------- |
| CREATED | Send    | SENT      |
| SENT    | Accept  | ACCEPTED  |
| SENT    | Decline | DECLINED  |
| SENT    | Expire  | EXPIRED   |
| SENT    | Cancel  | CANCELLED |

Terminal states:

```text
ACCEPTED
DECLINED
EXPIRED
CANCELLED
```

---

# 92. State Transition Matrix — Assignment

| From      | Action   | To        |
| --------- | -------- | --------- |
| PENDING   | Confirm  | CONFIRMED |
| CONFIRMED | Cancel   | CANCELLED |
| CONFIRMED | Complete | COMPLETED |

If V1 creates assignments directly as confirmed:

```text
Offer Accepted
    ↓
Assignment CONFIRMED
```

The `PENDING` state may not be externally visible.

---

# 93. State Transition Matrix — Trip

| From        | Action          | To          |
| ----------- | --------------- | ----------- |
| ASSIGNED    | Arrive          | ARRIVED     |
| ARRIVED     | Valid OTP/start | IN_PROGRESS |
| IN_PROGRESS | Complete        | COMPLETED   |
| ASSIGNED    | Cancel          | CANCELLED   |
| ARRIVED     | Cancel          | CANCELLED   |
| ARRIVED     | No-show         | NO_SHOW     |
| IN_PROGRESS | Cancel          | CANCELLED   |

The exact cancellation policy is TBD.

---

# 94. State Transition Matrix — Driver Verification

| From         | Action     | To           |
| ------------ | ---------- | ------------ |
| PENDING      | Submit     | UNDER_REVIEW |
| UNDER_REVIEW | Approve    | VERIFIED     |
| UNDER_REVIEW | Reject     | REJECTED     |
| VERIFIED     | Suspend    | SUSPENDED    |
| SUSPENDED    | Reactivate | VERIFIED     |

---

# 95. State Transition Matrix — User

| From         | Action     | To           |
| ------------ | ---------- | ------------ |
| PENDING      | Submit     | UNDER_REVIEW |
| UNDER_REVIEW | Approve    | APPROVED     |
| UNDER_REVIEW | Reject     | REJECTED     |
| APPROVED     | Suspend    | SUSPENDED    |
| SUSPENDED    | Reactivate | APPROVED     |

---

# 96. State Transition Matrix — Payment

| From       | Action   | To         |
| ---------- | -------- | ---------- |
| PENDING    | Initiate | PROCESSING |
| PROCESSING | Success  | PAID       |
| PROCESSING | Failure  | FAILED     |
| PAID       | Refund   | REFUNDED   |

---

# 97. State Transition Matrix — Settlement

| From       | Action  | To         |
| ---------- | ------- | ---------- |
| PENDING    | Process | PROCESSING |
| PROCESSING | Success | SETTLED    |
| PROCESSING | Failure | FAILED     |
| FAILED     | Retry   | PROCESSING |

---

# 98. State Transition Matrix — Withdrawal

| From       | Action  | To         |
| ---------- | ------- | ---------- |
| REQUESTED  | Process | PROCESSING |
| PROCESSING | Success | COMPLETED  |
| PROCESSING | Failure | FAILED     |

---

# 99. State Transition Matrix — Dispatch Run

| From           | Action                | To        |
| -------------- | --------------------- | --------- |
| QUEUED         | Start                 | RUNNING   |
| RUNNING        | Success               | COMPLETED |
| RUNNING        | Failure               | FAILED    |
| QUEUED/RUNNING | Requirement cancelled | CANCELLED |

---

# 100. State Transition Testing

Every transition requires tests for:

```text
valid transition
invalid transition
unauthorized actor
wrong resource owner
stale state
concurrent operation
duplicate request
missing dependency
external failure
```

---

# 101. State Machine Definition of Done

This document is correctly implemented only when:

```text
[ ] All domain states defined
[ ] All legal transitions defined
[ ] Illegal transitions rejected
[ ] Backend owns state changes
[ ] State transitions are transactional where required
[ ] Critical concurrency handled
[ ] State history available
[ ] Realtime events synchronized
[ ] Client reconciliation supported
[ ] Admin overrides audited
[ ] API errors mapped to invalid transitions
[ ] Database invariants aligned
[ ] Unit tests implemented
[ ] Integration tests implemented
[ ] Concurrency tests implemented
```

---

# 102. AI Agent Rules

Any AI coding agent working on AdhocX must:

1. Read this document before implementing state-changing functionality.
2. Never invent a new state without documenting it.
3. Never directly mutate state from controllers.
4. Never allow clients to set authoritative state.
5. Never bypass transition guards.
6. Never assume a successful API request means the client-defined state is correct.
7. Never duplicate state machines in Flutter and Next.js.
8. Keep backend state authoritative.
9. Use transactions for multi-record transitions.
10. Preserve state history where required.
11. Use canonical state names.
12. Update API contracts when states change.
13. Add tests for every transition.
14. Add concurrency tests for critical transitions.
15. Treat TBD rules as unresolved rather than guessing.

---

# 103. Final State Machine Principle

AdhocX should be understood as a collection of controlled state machines:

```text
User
   ↓
Requirement
   ↓
Dispatch
   ↓
Offer
   ↓
Assignment
   ↓
Trip
   ↓
Payment
   ↓
Settlement
```

Each state machine has:

```text
Explicit states
+
Explicit transitions
+
Explicit guards
+
Explicit side effects
+
Explicit history
```

The most important rule is:

> **If a transition is not explicitly allowed by the state machine, the system must reject it.**

No UI action, API request, worker, admin tool, or AI-generated code is allowed to bypass this rule.