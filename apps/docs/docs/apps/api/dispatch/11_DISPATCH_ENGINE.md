# 11_DISPATCH_ENGINE.md

# AdhocX Dispatch Engine Specification

**Document Status:** Source of Truth
**Version:** V1
**Audience:** Backend Engineers, Dispatch Engineers, QA Engineers, Admin Engineers, AI Coding Agents

---

# 1. Purpose

The Dispatch Engine is responsible for converting a vehicle requirement into verified driver offers and, ultimately, assignments.

The engine must answer:

> Given a requirement for a certain number of vehicles at a specific time and location, which eligible drivers should be offered the work, in what order, and how should capacity be safely allocated?

The Dispatch Engine must optimize for:

* fulfillment
* assignment speed
* driver eligibility
* geographic suitability
* reliability
* operational fairness
* controlled concurrency
* predictable behavior
* auditability

The engine must **not** be treated as an AI/ML system in V1.

V1 uses deterministic rules and scoring.

Future machine-learning optimization may be added without changing the fundamental marketplace state model.

---

# 2. Dispatch Philosophy

AdhocX is a B2B transportation fulfillment marketplace.

The Dispatch Engine is therefore not an Uber-style ride-hailing algorithm.

The core problem is:

```text
User Requirement
        ↓
Find eligible supply
        ↓
Rank supply
        ↓
Send controlled offers
        ↓
Capture acceptances
        ↓
Create assignments
        ↓
Fill remaining capacity
```

The goal is reliable fulfillment, not simply finding the mathematically nearest driver.

---

# 3. Core Dispatch Invariants

The engine must guarantee:

```text
1 requirement slot
=
at most 1 active assignment
```

and:

```text
assignedQuantity <= requestedQuantity
```

and:

```text
only eligible drivers receive valid offers
```

and:

```text
expired offers cannot be accepted
```

and:

```text
a driver cannot receive conflicting assignments
```

and:

```text
client-side state never determines assignment truth
```

---

# 4. Dispatch Inputs

The engine receives a requirement containing, at minimum:

* requirement ID
* user ID
* vehicle type
* requested quantity
* pickup location
* pickup time
* requirement state
* applicable pricing information
* operational constraints
* cancellation state

Additional inputs may include:

* current driver location
* driver availability
* driver verification status
* vehicle verification
* driver reliability
* previous assignment history
* driver operational status

---

# 5. Dispatch Trigger

Dispatch can be triggered by:

```text
Requirement created
Requirement reopened
Remaining quantity increased
Driver declines
Offer expires
Driver cancels
Assignment cancelled
Admin redispatch
Previous dispatch wave unsuccessful
```

The engine must not create duplicate dispatch processes for the same requirement.

Dispatch execution must be safely deduplicated.

---

# 6. Initial Requirement Validation

Before dispatch begins, the backend verifies:

```text
Requirement exists
Requirement belongs to a valid user
Requirement is dispatchable
Requested quantity > 0
Remaining quantity > 0
Pickup location is valid
Pickup time is valid
Vehicle type is valid
```

If any critical prerequisite fails, dispatch must stop.

---

# 7. Dispatch Eligibility

A driver is eligible only when all required conditions are satisfied.

Typical eligibility:

```text
Driver account active
        +
Driver verified
        +
Vehicle valid
        +
Vehicle type matches
        +
Driver available
        +
Driver has no conflicting assignment
        +
Driver location available/acceptable
        +
Driver satisfies geographic constraints
```

Additional eligibility rules may be added later.

---

# 8. Driver Account Eligibility

Drivers must not receive offers when:

```text
SUSPENDED
BLOCKED
REJECTED
INACTIVE
```

or another state explicitly prevents dispatch.

A driver who becomes ineligible after an offer was created must be prevented from accepting the offer if the new state violates dispatch eligibility.

---

# 9. Driver Verification

For V1, only drivers meeting the configured verification requirements should enter the eligible candidate pool.

The exact KYC requirements are defined separately and remain configurable.

Dispatch must never infer verification from frontend state.

---

# 10. Vehicle Eligibility

The vehicle associated with the driver must satisfy the requirement.

Example:

```text
Requirement:
SEDAN

Driver Vehicle:
SEDAN

→ Eligible
```

Example:

```text
Requirement:
SUV

Driver Vehicle:
HATCHBACK

→ Not eligible
```

Vehicle type matching must be backend-controlled.

---

# 11. Driver Availability

A driver must explicitly be available for dispatch.

Possible conceptual states:

```text
OFFLINE
AVAILABLE
BUSY
UNAVAILABLE
```

The exact state vocabulary must remain synchronized with:

`12_STATE_MACHINES.md`

Being logged into the application does not imply availability.

Being online does not automatically imply eligibility.

---

# 12. Conflicting Assignment Check

Before an offer is generated, the engine should check whether the driver has an incompatible existing commitment.

Examples:

```text
Active trip
Confirmed assignment overlapping pickup
Another accepted requirement
Operationally blocked time window
```

A driver must not receive offers that create an impossible operational schedule.

The exact overlap algorithm may evolve.

---

# 13. Geographic Eligibility

Geographic filtering is a primary dispatch mechanism.

The engine should use the driver's latest valid location and the requirement pickup location.

Conceptually:

```text
distance(driver, pickup)
```

must be calculated using a proper geographic/spatial mechanism.

PostGIS should be used for authoritative spatial filtering.

---

# 14. Dispatch Radius

The engine may use configurable geographic radius tiers.

Example:

```text
Wave 1 → 5 km
Wave 2 → 10 km
Wave 3 → 20 km
```

These numbers are **examples only**.

The actual production values are **TBD**.

They must be configuration-driven rather than hard-coded.

---

# 15. Radius Expansion

If insufficient eligible drivers are available:

```text
Initial radius
      ↓
Insufficient candidates
      ↓
Expand radius
      ↓
Recalculate candidates
      ↓
Dispatch next wave
```

The engine must not immediately notify the entire driver network.

Radius expansion should be controlled by configuration and operational rules.

---

# 16. Candidate Query

The candidate query should first apply cheap/high-selectivity filters.

Recommended conceptual order:

```text
Driver account status
        ↓
Verification
        ↓
Vehicle compatibility
        ↓
Availability
        ↓
Conflicting assignment
        ↓
Location availability
        ↓
Spatial radius
        ↓
Ranking
```

This avoids expensive ranking over obviously ineligible drivers.

---

# 17. Candidate Ranking

V1 should use deterministic scoring.

Possible ranking factors:

```text
Distance
Driver reliability
Availability freshness
Vehicle eligibility strength
Historical acceptance/reliability
Current workload
```

The exact scoring weights are **TBD**.

The scoring model must be configuration-driven.

---

# 18. Example Scoring Model

Illustrative only:

```text
score =
    distanceScore * W_DISTANCE
  + reliabilityScore * W_RELIABILITY
  + availabilityScore * W_AVAILABILITY
  + vehicleScore * W_VEHICLE
```

The production formula must be finalized before implementation.

AI agents must not invent weights.

---

# 19. Distance Ranking

Closer drivers should generally rank higher because proximity improves:

* pickup reliability
* response speed
* operational efficiency
* deadhead distance

However, distance must not be the only factor.

A highly unreliable nearby driver should not necessarily outrank a reliable driver who is slightly farther away.

---

# 20. Reliability Score

A reliability score may later incorporate:

* acceptance rate
* cancellation rate
* completion rate
* lateness
* successful trip history
* recent activity

V1 should use only metrics that have reliable historical data.

Do not invent a sophisticated reliability score before sufficient data exists.

---

# 21. Freshness of Driver Location

Location freshness is important.

Example:

```text
Driver location:
Updated 20 seconds ago
```

is more useful than:

```text
Driver location:
Updated 3 hours ago
```

The engine should use a configurable maximum location age.

Exact threshold is **TBD**.

A stale location should reduce eligibility or ranking confidence depending on the business rule.

---

# 22. Candidate Deduplication

A driver must appear only once in a dispatch candidate set.

The engine must prevent:

```text
same driver
+
same requirement
+
multiple duplicate offers
```

unless a deliberate new offer wave is created after the previous offer becomes invalid.

---

# 23. Dispatch Waves

The engine should use controlled waves rather than notifying every candidate simultaneously.

Conceptually:

```text
Requirement: 20 vehicles
Remaining: 20

Wave 1
↓
Send offers to selected candidates

Wait for response/timeout
↓
Recalculate remaining capacity
↓
Wave 2
↓
Continue until:
    capacity fulfilled
    OR
    no viable candidates
    OR
    dispatch timeout
```

This prevents unnecessary notification spam and uncontrolled race conditions.

---

# 24. Wave Size

Wave size should be configurable.

It should depend on:

* remaining quantity
* candidate availability
* expected acceptance rate
* dispatch urgency
* geographic supply
* historical response behavior

Exact production formula is **TBD**.

---

# 25. Oversubscription

The engine may need controlled oversubscription because not every driver who receives an offer will accept.

Example:

```text
Required = 10
Offer = 12 drivers
```

This can improve fulfillment speed.

However, oversubscription must never allow more than the required number of final assignments.

Acceptance must be transactionally capacity-controlled.

---

# 26. Offer Creation

An offer represents:

> A specific driver has been invited to fulfill a specific requirement under a specific set of conditions for a limited period.

Offer should contain:

```text
offerId
requirementId
driverId
createdAt
expiresAt
status
pricing snapshot/reference
relevant pickup information
```

---

# 27. Offer State

Offer states should include the states defined by the state-machine document.

Conceptually:

```text
CREATED
SENT
ACCEPTED
DECLINED
EXPIRED
CANCELLED
```

Exact canonical state names belong to:

`12_STATE_MACHINES.md`

---

# 28. Offer Expiration

Every offer must have an expiration timestamp.

Example:

```text
createdAt = 08:00
expiresAt = 08:01
```

The exact offer duration is **TBD**.

The backend is authoritative for expiration.

A client timer is never authoritative.

---

# 29. Offer Acceptance

When a driver accepts:

```text
Driver Request
      ↓
Authentication
      ↓
Authorization
      ↓
Offer lookup
      ↓
Offer validity
      ↓
Driver eligibility
      ↓
Requirement capacity
      ↓
Conflict check
      ↓
Atomic transaction
      ↓
Assignment
```

---

# 30. Atomic Acceptance

The critical operation must execute transactionally.

Conceptually:

```text
BEGIN

Lock relevant requirement capacity

Check remaining quantity

Lock/validate offer

Validate driver

Validate driver conflicts

Create assignment

Mark offer accepted

Increment assigned quantity

Update requirement state

COMMIT
```

If any critical condition fails:

```text
ROLLBACK
```

No partial assignment state may remain.

---

# 31. Concurrency Example

Requirement:

```text
Requested = 20
Assigned = 19
Remaining = 1
```

Two drivers accept simultaneously.

Without concurrency control:

```text
Driver A → accepts
Driver B → accepts

Assigned = 21
```

This is unacceptable.

With proper transaction/locking:

```text
Driver A → wins final slot
Driver B → receives conflict
```

The database must enforce the invariant.

---

# 32. Offer Acceptance Response

Successful:

```json id="1l2m3n"
{
  "success": true,
  "data": {
    "assignmentId": "uuid",
    "status": "ASSIGNED"
  }
}
```

Conflict:

```json id="9z2g6e"
{
  "success": false,
  "error": {
    "code": "OFFER_NO_LONGER_AVAILABLE",
    "message": "This trip is no longer available."
  }
}
```

---

# 33. Assignment Creation

An accepted offer does not merely change UI state.

It creates a durable assignment.

Relationship:

```text
Requirement
    ↓
Offer
    ↓
Acceptance
    ↓
Assignment
```

Assignment becomes the authoritative link between:

```text
Requirement
Driver
Vehicle
Trip
```

---

# 34. Assignment Capacity

For every requirement:

```text
assignedQuantity <= requestedQuantity
```

The database and application layer must both protect this invariant.

---

# 35. Requirement Fulfillment

The engine must track:

```text
requestedQuantity
assignedQuantity
remainingQuantity
```

Example:

```text
Requested: 20
Assigned: 7
Remaining: 13
```

When:

```text
remainingQuantity = 0
```

the requirement becomes fully fulfilled according to its state machine.

---

# 36. Partial Fulfillment

If only part of the requirement is filled:

```text
Required = 20
Assigned = 14
Remaining = 6
```

dispatch continues according to configured rules.

The system must not incorrectly mark the requirement fully fulfilled.

---

# 37. Dispatch Completion

Dispatch can stop when:

### Case A — Fully fulfilled

```text
remaining = 0
```

### Case B — No viable supply

No eligible candidates remain.

### Case C — Dispatch deadline reached

The configured operational deadline has been reached.

### Case D — Requirement cancelled

User or authorized admin cancels it.

### Case E — Operational intervention

Admin manually stops or modifies dispatch.

---

# 38. No Available Drivers

If no candidates exist:

```text
Requirement
    ↓
Candidate search
    ↓
0 candidates
    ↓
Expand radius if configured
    ↓
Search again
```

If still unavailable:

```text
NO_DRIVER_AVAILABLE
```

or the equivalent canonical state.

The user must be notified.

---

# 39. Dispatch Deadline

Requirements may have a point after which dispatch should stop or escalate.

The exact deadline logic is **TBD**.

It may depend on:

* pickup time
* requirement urgency
* user rules
* dispatch configuration

The engine must not invent a fixed global deadline.

---

# 40. Redispatch

Redispatch can be triggered when:

```text
Driver declines
Offer expires
Driver cancels assignment
Driver becomes unavailable
Admin requests redispatch
```

Redispatch must recalculate current state.

It must not blindly reuse an outdated candidate list.

---

# 41. Candidate Recalculation

Before each meaningful wave:

```text
Current requirement state
+
Current remaining quantity
+
Current driver state
+
Current location
+
Current assignments
```

should be evaluated.

The engine should not assume that a candidate who was eligible 60 seconds ago is still eligible.

---

# 42. Driver Cancellation

If a driver cancels after assignment:

```text
Assignment
    ↓
Cancelled
    ↓
Requirement remaining quantity increases
    ↓
Redispatch triggered
```

The exact cancellation penalty/financial rules are **TBD**.

---

# 43. User Cancellation During Dispatch

If the user cancels:

```text
Requirement
    ↓
Cancelled
    ↓
Pending offers invalidated
    ↓
No new offers
    ↓
Relevant assignments handled according to cancellation rules
```

No new dispatch operation should continue after cancellation.

---

# 44. Stale Dispatch Jobs

Multiple dispatch jobs may accidentally be queued.

The engine must protect against duplicate execution.

Possible controls:

```text
distributed lock
dispatch run identifier
database state validation
idempotent job processing
```

Redis can assist with coordination.

The database remains authoritative.

---

# 45. Dispatch Job Architecture

Recommended:

```text
API
 ↓
Requirement created
 ↓
Persist requirement
 ↓
Publish dispatch event
 ↓
Queue dispatch job
 ↓
Dispatch Worker
 ↓
Candidate query
 ↓
Ranking
 ↓
Offer creation
 ↓
Notification
```

Dispatch should not block the user's HTTP request while performing a large candidate search.

---

# 46. Queue Safety

Dispatch jobs must be:

* retryable
* idempotent
* observable
* deduplicated where required

A failed worker must not leave the requirement permanently stuck.

---

# 47. Notification Separation

Dispatch and notification are separate responsibilities.

Dispatch decides:

```text
Who should receive an offer?
```

Notification infrastructure decides:

```text
How should the driver be informed?
```

Possible notification channels:

```text
Push
Realtime
In-app notification
```

The dispatch engine must not contain Firebase/APNs-specific business logic.

---

# 48. Offer Notification

After an offer is durably created:

```text
Offer persisted
    ↓
Notification event
    ↓
Push/realtime delivery
```

Do not send a notification before the offer exists in authoritative storage.

Otherwise the driver may receive a notification referencing an invalid offer.

---

# 49. Failed Notifications

Notification delivery failure must not automatically mean:

```text
offer invalid
```

An offer is a business object.

Notification delivery is a separate infrastructure concern.

Operational monitoring should detect repeated notification failures.

---

# 50. Dispatch Event Ordering

Important state transitions should be persisted before external side effects.

Preferred:

```text
Transaction
    ↓
Persist state
    ↓
Commit
    ↓
Publish reliable event
    ↓
Notify
```

An outbox pattern should be used where reliable event publication is required.

---

# 51. Dispatch Auditability

Every dispatch run should be traceable.

Useful information:

```text
dispatchRunId
requirementId
startedAt
completedAt
trigger
wave
candidate count
eligible count
offers created
assignments created
failure reason
```

Sensitive information should not be unnecessarily duplicated in logs.

---

# 52. Dispatch Observability

Metrics should include:

```text
dispatch_runs_total
dispatch_failures_total
dispatch_duration
candidate_count
eligible_driver_count
offer_count
offer_acceptance_rate
offer_expiration_rate
assignment_rate
time_to_first_assignment
time_to_full_fulfillment
no_driver_available_count
redispatch_count
```

These metrics are essential for measuring whether the marketplace actually works.

---

# 53. Key Business Metrics

The dispatch engine directly influences:

### Assignment Time

```text
requirement creation
        →
first confirmed assignment
```

### Fulfillment Time

```text
requirement creation
        →
full fulfillment
```

### Fulfillment Rate

```text
assigned vehicles
-----------------
requested vehicles
```

### Driver Acceptance Rate

```text
accepted offers
--------------
valid offers
```

### Driver Cancellation Rate

```text
cancelled assignments
---------------------
confirmed assignments
```

---

# 54. Dispatch Quality

A good dispatch system is not simply:

```text
nearest driver wins
```

It should balance:

```text
Distance
+
Reliability
+
Availability
+
Vehicle fit
+
Operational feasibility
+
Response probability
```

The exact formula remains configurable.

---

# 55. Fairness

The engine should avoid creating a system where the same small group of drivers receives every opportunity purely because of simplistic ranking.

Future fairness factors may include:

* recent opportunity distribution
* utilization
* acceptance behavior
* reliability
* geographic supply balance

However, fairness must not override hard eligibility requirements.

---

# 56. Driver Privacy

Drivers should not receive unnecessary information about:

* other drivers
* user internal information
* competitor pricing
* assignment internals

The driver sees only the information required to evaluate and perform the offer.

---

# 57. User Privacy

Users should not receive unnecessary information about:

* other users
* competing requirements
* unrelated drivers
* internal dispatch scores

User sees the operational information necessary to fulfill its requirement.

---

# 58. Admin Override

Admin may need controlled intervention.

Examples:

```text
Redispatch
Cancel offer
Cancel assignment
Reassign driver
Suspend driver
```

These operations must:

1. validate admin permission
2. validate current state
3. execute through domain/application services
4. create audit events
5. trigger required notifications
6. preserve financial integrity

Admin must not directly mutate database rows.

---

# 59. Manual Assignment

If manual assignment is required:

```text
Admin selects driver
        ↓
Backend validates eligibility
        ↓
Backend validates capacity
        ↓
Backend validates conflicts
        ↓
Assignment transaction
        ↓
Audit event
```

Manual assignment must use the same core assignment invariants as automated dispatch.

---

# 60. Emergency Operational Handling

Operational reality may require human intervention.

The architecture therefore follows:

```text
Automation first
        +
Human override
        +
Full audit trail
```

The goal is not to remove operations teams.

The goal is to reduce repetitive manual work while preserving operational control.

---

# 61. Dispatch Configuration

Dispatch configuration should eventually support:

```text
initial radius
radius expansion
wave size
offer duration
dispatch deadline
ranking weights
maximum oversubscription
location freshness threshold
```

Exact values are **TBD**.

These values must be configurable rather than embedded throughout application code.

---

# 62. Configuration Rules

Configuration must be:

* centralized
* typed
* validated
* environment-aware
* auditable where business-critical
* changeable without code modification where appropriate

Do not scatter:

```text
5000
10000
60000
0.7
```

throughout the dispatch implementation.

---

# 63. Dispatch State Machine Boundary

Dispatch must respect the canonical state machine.

It may request transitions such as:

```text
Requirement → Dispatching
Offer → Sent
Offer → Expired
Offer → Accepted
Requirement → Fulfilled
```

It must never bypass state transition rules.

Canonical states belong to:

`12_STATE_MACHINES.md`

---

# 64. Failure Handling

Dispatch failures should be classified.

### Recoverable

Examples:

```text
temporary database error
temporary queue error
notification provider timeout
temporary external dependency failure
```

Retry according to safe retry policy.

### Non-recoverable

Examples:

```text
requirement cancelled
invalid requirement
no eligible drivers
invalid configuration
```

Do not blindly retry.

---

# 65. Retry Rules

Retries must be:

* bounded
* observable
* idempotent
* backoff-based where appropriate

Never create unlimited dispatch retries.

---

# 66. Race Conditions

The engine must explicitly account for:

```text
User cancels while dispatch is running
Driver accepts while next wave starts
Driver goes offline while offer exists
Driver becomes assigned elsewhere
Offer expires while acceptance request is in flight
Admin cancels assignment during driver acceptance
```

Every critical race must resolve to a valid state.

---

# 67. Offer Acceptance Race

The most important race is:

```text
Offer still displayed
        ↓
Driver taps Accept
        ↓
Another driver gets final slot
        ↓
Acceptance request reaches server
```

Correct result:

```text
409 OFFER_NO_LONGER_AVAILABLE
```

The mobile client must gracefully update its UI.

---

# 68. Dispatch Does Not Trust Client Timing

Client timestamps are informational.

The backend uses server/database time for:

* offer expiry
* requirement deadlines
* state transition validation
* assignment validity

---

# 69. Dispatch Does Not Trust Client Location

Location reported by the driver is treated as an input signal.

The backend should consider:

* timestamp
* accuracy
* freshness
* abnormal movement patterns
* location availability

Future fraud detection may build on this.

---

# 70. Fraud and Abuse Signals

Fraud detection is not a full V1 dispatch subsystem, but the engine should preserve useful data.

Potential signals:

```text
unusual location jumps
repeated impossible acceptance behavior
excessive cancellation
multiple accounts
suspicious availability patterns
```

These may later feed a fraud/risk system.

Do not block legitimate drivers using speculative heuristics in V1.

---

# 71. Dispatch Data Ownership

Dispatch owns:

```text
candidate selection
ranking
wave execution
offer creation orchestration
dispatch run lifecycle
```

Dispatch does not own:

```text
user authentication
KYC
payment ledger
notification delivery
trip navigation
```

It invokes those domains through explicit interfaces.

---

# 72. Module Boundary

Recommended backend structure:

```text
dispatch/
├── application/
│   ├── start-dispatch
│   ├── execute-wave
│   ├── redispatch
│   └── manual-dispatch
│
├── domain/
│   ├── dispatch-run
│   ├── candidate
│   ├── ranking
│   └── dispatch-policy
│
├── infrastructure/
│   ├── candidate-query
│   ├── queue
│   └── locks
│
└── presentation/
    └── admin-dispatch-controller
```

Exact implementation may vary while preserving ownership boundaries.

---

# 73. Dispatch Algorithm — V1

Canonical conceptual algorithm:

```text
START

Load requirement

IF requirement is not dispatchable:
    STOP

Calculate remaining quantity

IF remaining quantity <= 0:
    STOP

Determine current dispatch configuration

Query eligible drivers

IF candidate count == 0:
    IF radius can expand:
        expand radius
        query again
    ELSE:
        mark no-availability condition
        notify user
        STOP

Rank candidates

Calculate dispatch wave

Create offers transactionally

Publish offer events

Send notifications

WAIT FOR:
    acceptances
    declines
    expirations
    cancellation
    timeout

Recalculate requirement state

IF remaining quantity == 0:
    mark fulfilled
    STOP

IF dispatch can continue:
    start next wave

ELSE:
    mark unresolved/no-availability state
    notify user

END
```

This is a conceptual algorithm, not permission for an AI agent to implement arbitrary behavior.

---

# 74. Dispatch Must Be Deterministic

Given the same:

```text requirement state
driver state
configuration
current time
candidate data
```

the ranking logic should produce a predictable result.

Random selection must not be introduced without an explicit business reason.

---

# 75. Future ML Integration

Future versions may introduce:

```text
acceptance prediction
ETA prediction
cancellation prediction
driver reliability prediction
demand forecasting
dynamic pricing
```

These should integrate as additional signals.

They must not replace core invariants.

The architecture should permit:

```text
Deterministic Eligibility
        ↓
ML-assisted Ranking
        ↓
Deterministic Assignment
```

rather than:

```text
AI decides everything
```

---

# 76. Testing Requirements

Dispatch requires significantly stronger testing than normal CRUD.

Required tests include:

### Candidate eligibility

```text
verified driver → included
unverified driver → excluded
wrong vehicle → excluded
offline driver → excluded
busy driver → excluded
stale location → handled correctly
```

### Ranking

```text
closer driver ranks appropriately
higher reliability affects ranking
configuration changes affect ranking
```

### Capacity

```text
20 requested
20 assignments maximum
```

### Concurrency

```text
100 drivers accept simultaneously
20 slots available
→ exactly 20 assignments
```

### Expiration

```text
expired offer
→ acceptance rejected
```

### Cancellation

```text
driver cancellation
→ capacity reopened
→ redispatch
```

### Requirement cancellation

```text
user cancels
→ dispatch stops
→ pending offers invalidated
```

---

# 77. Load Testing

Before production launch, dispatch should be load-tested for:

* high candidate counts
* multiple simultaneous requirements
* large acceptance bursts
* location updates
* concurrent dispatch jobs
* Redis/queue delays
* database contention

The test should specifically attempt to break:

```text
capacity integrity
assignment uniqueness
offer uniqueness
dispatch idempotency
```

---

# 78. Performance Strategy

Dispatch performance should prioritize:

```text
PostGIS spatial indexes
proper database indexes
bounded candidate queries
efficient ranking
batch operations
queue-based execution
Redis coordination
```

Avoid:

```text
loading all drivers into application memory
```

Example of prohibited architecture:

```text
SELECT * FROM drivers
        ↓
Node.js memory
        ↓
calculate distance for everyone
```

The database should perform appropriate filtering.

---

# 79. Database Responsibilities

PostgreSQL/PostGIS remains authoritative for:

```text
drivers
locations
availability state
requirements
offers
assignments
capacity
```

Redis is used for:

```text
locks
queues
temporary coordination
caching
```

Redis must not become the permanent source of truth for assignment capacity.

---

# 80. Dispatch and Realtime

Dispatch state changes should produce reliable events.

Example:

```text
Offer Created
    ↓
Realtime Event
    ↓
Push Notification
```

Assignment:

```text
Assignment Created
    ↓
User realtime update
    ↓
Driver realtime update
```

Trip:

```text
Trip Started
    ↓
User receives status update
```

---

# 81. User Experience Supported by Dispatch

User should be able to see:

```text
Requested: 20
Assigned: 15
Remaining: 5
```

and operational status such as:

```text
Dispatching
Partially Fulfilled
Fully Fulfilled
No Drivers Available
```

The UI must consume backend state rather than recreate dispatch calculations.

---

# 82. Driver Experience Supported by Dispatch

Driver receives:

```text
New opportunity
```

with sufficient information to make a decision.

The driver should not need to understand:

* dispatch wave
* ranking score
* candidate pool
* other drivers
* internal dispatch logic

The driver simply sees:

```text
Offer
    ↓
Accept / Decline
```

---

# 83. Admin Experience Supported by Dispatch

Admin should be able to understand:

```text
Why is this requirement not fulfilled?
```

Useful operational information:

```text
Requested
Assigned
Remaining
Current dispatch wave
Candidate count
Offer count
Accepted count
Expired count
Last dispatch attempt
```

Sensitive internal scoring should be exposed only if there is a legitimate operational requirement.

---

# 84. Explainability

Dispatch should maintain enough operational metadata to explain outcomes.

Example:

```text
Requirement not fulfilled because:
- 8 eligible drivers found
- 5 offers accepted
- 3 offers expired
- no additional eligible drivers within configured radius
```

This is much more useful than:

```text
AI could not find drivers.
```

---

# 85. Operational Timeline

A requirement timeline may contain:

```text
Requirement created
Dispatch started
Wave 1 started
Offers sent
Driver accepted
Assignment created
Wave 2 started
Driver cancelled
Redispatch started
Requirement fulfilled
```

Timeline events should be immutable historical records.

---

# 86. Dispatch Logging

Logs should answer:

```text
Which requirement?
Which dispatch run?
Which wave?
How many candidates?
Why was a driver excluded?
How many offers?
How many acceptances?
How long did it take?
What failed?
```

But logs must not contain unnecessary personal or sensitive data.

---

# 87. Exclusion Reasons

For debugging/operations, candidate filtering should optionally record aggregate exclusion reasons.

Examples:

```text
WRONG_VEHICLE
NOT_VERIFIED
OFFLINE
BUSY
OUTSIDE_RADIUS
STALE_LOCATION
CONFLICTING_ASSIGNMENT
SUSPENDED
```

Do not persist massive per-driver diagnostic data indefinitely without a retention reason.

---

# 88. Dispatch Configuration Governance

Business-critical configuration changes should be:

```text
authenticated
authorized
validated
audited
versioned where necessary
```

An admin should not be able to accidentally configure:

```text
radius = 999999 km
```

without validation.

---

# 89. No Hidden Dispatch Logic

Dispatch behavior must not be scattered across:

```text
controllers
Flutter
Next.js
database triggers
random workers
notification services
```

The central dispatch domain owns dispatch policy.

Clients only display its results.

---

# 90. Forbidden Dispatch Architecture

Never implement:

```text
Flutter
 ↓
Find nearby drivers
 ↓
Choose one
 ↓
Create assignment
```

Never implement:

```text
Next.js
 ↓
Calculate dispatch
 ↓
Write assignment directly
```

Never implement:

```text
Redis
 ↓
assignment count
```

as the sole capacity authority.

Never implement:

```text
client timestamp
 ↓
offer expiration
```

as the authoritative mechanism.

---

# 91. V1 Scope

Dispatch V1 includes:

```text
Driver eligibility
Vehicle matching
Location filtering
Deterministic ranking
Controlled waves
Offer creation
Offer expiry
Atomic acceptance
Assignment creation
Partial fulfillment
Radius expansion
Redispatch
No-driver handling
Admin operational intervention
Realtime notification triggers
Dispatch metrics
```

---

# 92. V1 Exclusions

Dispatch V1 does not include:

```text
ML-based matching
AI route optimization
Demand forecasting
Dynamic ML pricing
Autonomous fraud detection
Complex multi-stop optimization
Employee transport planning
Predictive ETA optimization
```

These belong to future phases.

---

# 93. TBD Parameters

The following must not be invented by an implementation agent:

```text
Initial dispatch radius
Radius expansion values
Wave size
Offer expiration duration
Oversubscription factor
Dispatch deadline
Ranking weights
Reliability formula
Location freshness threshold
Cancellation penalties
Pricing model
```

These should be finalized as product/commercial configuration.

---

# 94. Definition of Done

The Dispatch Engine is complete only when:

```text
[ ] Eligibility rules implemented
[ ] Vehicle matching implemented
[ ] Spatial filtering implemented
[ ] Candidate ranking implemented
[ ] Wave dispatch implemented
[ ] Offer creation implemented
[ ] Offer expiry implemented
[ ] Atomic acceptance implemented
[ ] Capacity invariant protected
[ ] Assignment uniqueness protected
[ ] Redispatch implemented
[ ] Cancellation handling implemented
[ ] No-driver handling implemented
[ ] Dispatch jobs are idempotent
[ ] Queue retries are safe
[ ] Realtime events integrated
[ ] Notifications decoupled
[ ] Auditability implemented
[ ] Metrics implemented
[ ] Structured logs implemented
[ ] Unit tests implemented
[ ] Integration tests implemented
[ ] Concurrency tests implemented
[ ] Load tests completed
[ ] Configuration validated
```

---

# 95. Final Dispatch Principle

AdhocX dispatch must be:

```text
Fast
+
Deterministic
+
Capacity-safe
+
Geographically intelligent
+
Operationally explainable
+
Failure tolerant
+
Auditable
```

The fundamental rule is:

> **Dispatch proposes who should fulfill the requirement. The transactionally protected backend decides who actually gets the assignment.**

No notification equals an assignment.

No client state equals an assignment.

No ranking result equals an assignment.

Only a valid backend transaction creates an authoritative assignment.