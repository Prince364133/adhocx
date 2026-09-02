# 20_AI_AGENT_RULES.md

# AdhocX AI Agent Engineering Rules

**Document Status:** Source of Truth
**Version:** V1
**Audience:** Antigravity, AI Coding Agents, AI Development Assistants, Human Engineers supervising AI-generated implementation

---

# 1. Purpose

This document defines how an AI coding agent must operate when building, modifying, testing, debugging, or reviewing AdhocX.

The agent is not an autonomous product designer.

The agent is not allowed to invent business rules.

The agent is not allowed to replace architecture with whatever implementation is easiest to generate.

The agent is an implementation system operating under the project's source-of-truth documentation.

The objective is:

> **Use AI to accelerate engineering without allowing AI-generated code to degrade the architecture, correctness, security, UX, or maintainability of AdhocX.**

---

# 2. Primary Principle

The agent must optimize for:

```text
Correctness
>
Architecture
>
Security
>
Maintainability
>
Testability
>
Observability
>
Performance
>
Speed of implementation
```

Fast incorrect code is worse than slow correct code.

---

# 3. Agent Authority

The AI agent may:

```text
read code
analyze code
plan implementation
write code
modify code
create tests
fix bugs
refactor approved areas
run verification
```

The AI agent may not independently decide:

```text
business model
commercial pricing
commission
legal policy
financial policy
KYC policy
product scope
security exceptions
production data changes
architectural migrations
```

unless those decisions are explicitly defined in the source-of-truth documents or explicitly authorized by the project owner.

---

# 4. Source-of-Truth Documents

Before implementation, the agent must understand the relevant documents.

The canonical documentation set is:

```text
docs/
├── 01_PRD.md
├── 02_FEATURES.md
├── 03_USER_ROLES_AND_PERMISSIONS.md
├── 04_DESIGN_SYSTEM.md
├── 05_UI_UX_GUIDELINES.md
├── 06_SCREEN_SPECIFICATIONS.md
├── 07_ARCHITECTURE.md
├── 08_FOLDER_STRUCTURE.md
├── 09_DATABASE.md
├── 10_API_SPECIFICATION.md
├── 11_DISPATCH_ENGINE.md
├── 12_STATE_MACHINES.md
├── 13_SECURITY.md
├── 14_REALTIME_AND_NOTIFICATIONS.md
├── 15_PAYMENTS_AND_LEDGER.md
├── 16_ENGINEERING_STANDARDS.md
├── 17_TESTING_STRATEGY.md
├── 18_DEVOPS_AND_DEPLOYMENT.md
├── 19_OBSERVABILITY.md
└── 20_AI_AGENT_RULES.md
```

These documents collectively define the engineering contract.

---

# 5. Documentation Hierarchy

The agent should reason through the documentation in this order:

```text
Product
 ↓
Features
 ↓
Roles / Permissions
 ↓
UX / Design
 ↓
Domain
 ↓
State
 ↓
Database
 ↓
Architecture
 ↓
API
 ↓
Dispatch / Realtime / Payments
 ↓
Engineering
 ↓
Testing
 ↓
DevOps
 ↓
Observability
 ↓
AI Agent Rules
```

---

# 6. Relevant-Document Rule

The agent does not need to reread all 20 documents for every small change.

It must read the documents relevant to the task.

Examples:

### UI task

Read:

```text
04
05
06
```

plus relevant domain/API documents.

### Dispatch task

Read:

```text
02
03
07
09
10
11
12
13
14
```

### Payment task

Read:

```text
03
07
09
10
12
13
15
19
```

### Database task

Read:

```text
07
08
09
10
12
15
16
```

---

# 7. Repository Inspection Rule

Before creating new code, inspect the existing repository.

The agent must determine:

```text
Does this already exist?
Is there an existing implementation?
Is there an existing component?
Is there an existing API?
Is there an existing service?
Is there an existing database model?
Is there an existing test utility?
Is there an existing pattern?
```

---

# 8. No Blind File Creation

Never create a new file simply because a requested concept sounds new.

First search the repository.

Forbidden behavior:

```text
"I couldn't find it quickly, so I'll create it."
```

---

# 9. Existing Architecture First

The agent must understand the current architecture before modifying it.

Do not introduce a new pattern merely because it is personally preferred.

Example:

If the project already uses:

```text
Repository
UseCase
Controller
```

do not introduce:

```text
ServiceManager
Handler
Interactor
```

for the same responsibility without a deliberate architectural reason.

---

# 10. No Architecture Drift

The agent must preserve:

```text
07_ARCHITECTURE.md
08_FOLDER_STRUCTURE.md
16_ENGINEERING_STANDARDS.md
```

unless an explicit architectural change has been approved.

---

# 11. No Framework Substitution

The agent must not silently replace the selected technology.

AdhocX V1 architecture is:

```text
Mobile → Flutter + Dart
Admin → Next.js + TypeScript
Backend → NestJS + TypeScript
Database → PostgreSQL + PostGIS
Cache/Queues → Redis + BullMQ
Realtime → WebSockets / Socket.IO
```

The agent must not replace these with alternatives merely because another framework is easier.

---

# 12. Monorepo Rule

The repository follows the canonical monorepo structure.

Do not create unrelated application roots such as:

```text
frontend2/
backend-new/
mobile-final/
admin-v2/
```

without explicit architectural approval.

---

# 13. Feature Ownership

Every feature should have an obvious owner.

Examples:

```text
Dispatch
→ dispatch module

Payments
→ payments/financial module

Trip lifecycle
→ trip module

Authentication
→ auth module
```

Do not scatter one business capability across arbitrary directories.

---

# 14. Backend Authority

The backend is authoritative for:

```text
authorization
business rules
state transitions
assignments
dispatch decisions
financial calculations
payments
earnings
settlements
```

The frontend is not authoritative.

---

# 15. Frontend Responsibility

Flutter and Admin should:

```text
display state
collect input
perform client-side validation
request operations
show loading
show errors
react to realtime events
```

They must not become the authoritative business engine.

---

# 16. No Business Logic Duplication

Never implement authoritative business rules in multiple clients.

Bad:

```text
Flutter calculates commission
Admin calculates commission
Backend calculates commission
```

Good:

```text
Backend
→ authoritative calculation
```

Frontend may display the result.

---

# 17. No Fake Functionality

The agent must never create fake production behavior.

Forbidden:

```text
fake successful payment
fake assignment
fake driver location
fake earnings
fake trip completion
fake realtime events
```

unless explicitly isolated as:

```text
test fixture
development mock
story/demo environment
```

---

# 18. No Hardcoded Production Data

Never hardcode:

```text
driver names
earnings
trip counts
payment values
driver locations
requirements
```

as permanent application behavior.

Use real API-backed data.

---

# 19. No Placeholder Production Logic

Do not implement:

```typescript
return true;
```

for authorization.

Do not implement:

```typescript
return [];
```

for driver matching.

Do not implement:

```typescript
return 1000;
```

for earnings.

Do not implement fake success responses merely to make the UI work.

---

# 20. TBD Rule

If a business rule is unspecified:

```text
DO NOT INVENT IT.
```

Examples include:

```text
commission percentage
dispatch radius
offer timeout
cancellation fee
settlement timing
KYC document requirements
pricing formula
withdrawal limits
```

These must remain:

```text
TBD
```

until defined.

---

# 21. Ambiguity Rule

When an unresolved decision materially affects implementation:

```text
STOP
→ identify ambiguity
→ explain impact
→ request clarification
```

Do not silently select a value.

---

# 22. Safe Defaults

The agent may choose a technical default when:

```text
the decision is implementation-level
the choice does not alter product behavior
the choice is reversible
the choice follows existing project conventions
```

Example:

```text
internal helper naming
test fixture structure
private function decomposition
```

Do not apply this principle to business decisions.

---

# 23. State Machine Rule

Before modifying any business status:

```text
read 12_STATE_MACHINES.md
```

Determine:

```text
current state
allowed transition
actor
authorization
side effects
transaction requirement
```

---

# 24. No Arbitrary Status Mutation

Forbidden:

```typescript
entity.status = "COMPLETED";
```

for critical domain state without transition validation.

Prefer:

```text
completeTrip()
```

or an equivalent explicit transition operation.

---

# 25. Terminal State Rule

Terminal states must be treated as terminal unless an explicitly defined transition exists.

Examples:

```text
CANCELLED
COMPLETED
REFUNDED
```

The agent must not invent ways to reopen them.

---

# 26. Authorization Rule

Every protected operation must respect:

```text
authentication
+
role
+
permission
+
resource ownership
+
state
+
business rules
```

---

# 27. UI Authorization Is Not Security

The agent must never consider:

```text
button hidden
```

equivalent to:

```text
operation secured
```

Backend authorization is mandatory.

---

# 28. Resource Ownership

For every resource access, ask:

```text
Who owns this resource?
Who may read it?
Who may modify it?
Who may delete/cancel it?
```

Never accept client-supplied ownership as authoritative.

---

# 29. IDOR Prevention

For example:

```text
GET /trips/{tripId}
```

must verify that the authenticated user has permission to access that trip.

Never:

```text
findById(tripId)
return result
```

without resource-level authorization.

---

# 30. Security Document Rule

Before implementing sensitive functionality, read:

```text
13_SECURITY.md
```

Sensitive functionality includes:

```text
authentication
OTP
KYC
file uploads
payments
withdrawals
financial operations
admin actions
location data
```

---

# 31. Financial Rule

Before touching:

```text
payment
earning
wallet
ledger
settlement
withdrawal
refund
```

read:

```text
15_PAYMENTS_AND_LEDGER.md
```

---

# 32. No Mutable Wallet Source of Truth

Never implement:

```text
wallet.balance += amount
```

as the sole financial truth.

Financial behavior must remain ledger-based.

---

# 33. Financial Immutability

Never silently modify historical ledger records.

Corrections require:

```text
reversal
adjustment
```

or another explicitly defined financial transaction.

---

# 34. Financial Idempotency

Every financial operation must consider retries.

Examples:

```text
payment
refund
settlement
withdrawal
earning
webhook
```

---

# 35. Financial Concurrency

Assume financial requests may arrive simultaneously.

Never rely on:

```text
"the user probably won't tap twice."
```

---

# 36. Dispatch Rule

Before touching:

```text
matching
candidate selection
radius
offer creation
offer acceptance
assignment
redispatch
```

read:

```text
11_DISPATCH_ENGINE.md
```

---

# 37. Dispatch Authority

The dispatch engine may:

```text
identify candidates
rank candidates
create offers
trigger waves
```

But final assignment integrity is determined transactionally by the backend.

---

# 38. Dispatch Concurrency

The agent must explicitly consider:

```text
two drivers accept simultaneously
driver accepts after offer expiry
requirement cancelled during acceptance
slot becomes unavailable
driver becomes unavailable
```

---

# 39. No Naive Broadcast Dispatch

Do not implement:

```text
send offer to every driver
first N responses win
```

unless explicitly specified and protected by the dispatch architecture.

---

# 40. Realtime Rule

Before modifying realtime behavior, read:

```text
14_REALTIME_AND_NOTIFICATIONS.md
```

Realtime is for:

```text
awareness
updates
notifications
```

not authoritative state.

---

# 41. Realtime Duplication

Consumers must tolerate duplicate events.

Never assume:

```text
exactly once
```

delivery.

---

# 42. Realtime Ordering

Never blindly apply an older event over a newer state.

Use the project's defined:

```text
version
timestamp
sequence
reconciliation
```

mechanism.

---

# 43. Offline Rule

Mobile clients must assume:

```text
network can disappear
```

Critical operations must reconcile with backend state.

---

# 44. No False Success

If the backend response has not confirmed:

```text
payment
assignment
trip start
trip completion
withdrawal
```

the UI must not claim that it succeeded.

---

# 45. API Rule

Before adding or modifying an API:

```text
read 10_API_SPECIFICATION.md
```

Then inspect:

```text
controller
use case
domain
repository
DTO
tests
```

---

# 46. No CRUD-First Thinking

Do not automatically create:

```text
GET
POST
PATCH
DELETE
```

for every database table.

APIs represent business operations, not database structure.

---

# 47. Explicit Operations

Prefer business operations such as:

```text
acceptOffer
startTrip
completeTrip
cancelRequirement
requestWithdrawal
verifyDriver
```

where appropriate.

---

# 48. API Error Handling

Every important API operation should define:

```text
success
validation failure
authorization failure
conflict
invalid state
external failure
unexpected failure
```

---

# 49. Database Rule

Before changing database structure:

```text
read 09_DATABASE.md
```

and inspect existing migrations.

---

# 50. No Database Duplication

Do not create a second table/model representing the same domain concept.

For example, do not create:

```text
driver_profiles
drivers_v2
driver_data
```

to solve a problem that belongs in the canonical Driver model.

---

# 51. Migration Rule

Schema changes require migrations.

Never rely on:

```text
manual production SQL
```

as the permanent implementation.

---

# 52. Database Integrity

Prefer database constraints where appropriate:

```text
foreign keys
unique constraints
check constraints
indexes
```

Do not enforce every invariant only in application code.

---

# 53. Database Transactions

Use transactions for operations requiring atomicity.

Examples:

```text
offer acceptance
assignment creation
ledger posting
withdrawal reservation
refund
settlement
```

---

# 54. Redis Rule

Redis is not the source of truth for critical business state.

Do not store the only copy of:

```text
trip state
assignment
payment
earning
```

in Redis.

---

# 55. Cache Invalidation

If cached data becomes stale after a mutation, invalidate or update it appropriately.

Do not knowingly return stale critical information indefinitely.

---

# 56. Flutter Rule

Before implementing mobile UI:

```text
read 04_DESIGN_SYSTEM.md
05_UI_UX_GUIDELINES.md
06_SCREEN_SPECIFICATIONS.md
```

---

# 57. Native Mobile Principle

The Flutter application must behave as a proper Android/iOS application.

Do not treat it as:

```text
web page inside a mobile shell
```

---

# 58. Mobile Touch Targets

Follow the design-system requirements.

Controls must remain usable in realistic mobile conditions.

---

# 59. Driver UX Rule

Driver workflows should minimize cognitive load.

Important actions must be:

```text
obvious
large
fast
state-aware
```

---

# 60. Driver Safety Rule

Do not design interaction patterns that unnecessarily require prolonged attention while driving.

Critical workflows should be simple and operationally focused.

---

# 61. Vendor UX Rule

Vendor workflows should prioritize:

```text
speed
visibility
fulfillment
```

especially when creating requirements under time pressure.

---

# 62. Admin UX Rule

Admin is an operational console.

Prefer:

```text
tables
filters
dense information
timelines
drawers
maps
```

where appropriate.

---

# 63. Design System Rule

Before creating a UI component:

```text
search existing components
```

First.

---

# 64. No One-Off Styling

Do not create random:

```text
colors
font sizes
radii
spacing
button styles
```

inside individual screens.

Use centralized tokens.

---

# 65. No UI Reinvention

If:

```text
StatusBadge
DataTable
Modal
Button
Input
TripCard
```

already exists, reuse it.

---

# 66. Screen Specification Rule

Every production screen should map to:

```text
06_SCREEN_SPECIFICATIONS.md
```

If the screen is not specified and implementation requires product decisions, stop and clarify.

---

# 67. Loading/Error/Empty Rule

Every asynchronous screen should account for:

```text
loading
success
empty
error
refreshing
mutation
```

where relevant.

---

# 68. No Blank Screens

Do not leave users with unexplained blank areas while data loads.

---

# 69. No Optimistic Critical Operations

Do not assume success for:

```text
assignment
payment
withdrawal
trip start
trip completion
```

before backend confirmation.

---

# 70. Type Safety

TypeScript must remain strict.

Avoid unnecessary:

```text
any
unknown casts
non-null assertions
```

where proper modeling is possible.

---

# 71. Dart Type Safety

Flutter code should also remain strongly typed.

Avoid unnecessary:

```text
dynamic
```

and uncontrolled nullable state.

---

# 72. External Data

External data must be treated as untrusted.

Validate:

```text
API responses
webhooks
file metadata
provider responses
deep-link parameters
```

where appropriate.

---

# 73. Error Handling Rule

Do not swallow exceptions.

Bad:

```typescript
try {
  await operation();
} catch {}
```

unless there is a documented reason.

---

# 74. Error Logging

When an error is handled, preserve enough context to diagnose it.

Include where appropriate:

```text
operation
resource
requestId
attempt
error category
```

Never expose secrets.

---

# 75. No Sensitive Logging

Never log:

```text
OTP
password
tokens
payment credentials
bank credentials
KYC contents
```

---

# 76. Observability Rule

Before introducing an important workflow, consider:

```text
What should be logged?
What should be measured?
How will failures be diagnosed?
```

Read:

```text
19_OBSERVABILITY.md
```

---

# 77. Business Metrics

Important workflows should expose business telemetry.

Examples:

```text
assignment time
fulfillment rate
offer acceptance
cancellation rate
payment success
withdrawal success
```

---

# 78. Worker Rule

Every background job must assume:

```text
job may run twice
worker may crash
network may fail
provider may timeout
```

---

# 79. Worker Idempotency

A retried job must not create duplicate business side effects.

---

# 80. Queue Failure

If a worker fails:

```text
log
retry where appropriate
preserve state
alert when necessary
```

Do not silently discard important jobs.

---

# 81. External Provider Rule

Every external provider can fail.

Assume:

```text
timeout
5xx
rate limit
malformed response
partial outage
```

---

# 82. Timeout Rule

Every external call should have an appropriate timeout.

Never allow an external provider to block a request indefinitely.

---

# 83. Retry Rule

Retries must be:

```text
bounded
idempotent
observable
backoff-aware
```

---

# 84. Provider Timeout Rule

A timeout does not necessarily mean failure.

Especially for:

```text
payments
payouts
refunds
```

the provider may have completed the operation.

Use reconciliation where required.

---

# 85. Testing Rule

Every meaningful feature must include appropriate tests.

At minimum consider:

```text
happy path
validation
authorization
invalid state
failure
retry
idempotency
concurrency
```

where relevant.

---

# 86. Test Before Declaring Complete

The agent must not say:

```text
"Implemented successfully."
```

until relevant verification has been performed.

---

# 87. Verification Sequence

After implementation, run the applicable:

```text
format
lint
type check
unit tests
integration tests
build
E2E tests
```

---

# 88. Failure Investigation

If verification fails:

```text
read actual failure
→ identify root cause
→ make targeted fix
→ rerun
```

Do not randomly rewrite code.

---

# 89. No Test Suppression

The agent must never:

```text
delete failing test
skip failing test
weaken assertion
disable lint
disable type checking
```

merely to make CI green.

---

# 90. Regression Testing

When fixing a bug, add a regression test whenever practical.

The test should reproduce the original failure.

---

# 91. Concurrency Testing

For operations involving scarce resources or money, explicitly test concurrent requests.

Examples:

```text
offer acceptance
assignment
withdrawal
settlement
refund
trip completion
```

---

# 92. Performance Testing

Do not optimize based on intuition alone.

Measure where practical.

Important performance paths:

```text
dispatch
location queries
trip APIs
admin tables
realtime
queues
payments
```

---

# 93. No Premature Optimization

Do not add:

```text
complex caching
premature microservices
unnecessary queues
```

without a demonstrated need.

---

# 94. Architecture Scope Rule

V1 uses a modular monolith.

Do not split the backend into microservices merely because the code has multiple modules.

---

# 95. Refactoring Rule

Refactor when:

```text
architecture is violated
duplication is harmful
security requires it
maintainability is materially impaired
```

Do not refactor unrelated areas during every feature.

---

# 96. Minimal Change Principle

When implementing a task:

> **Make the smallest coherent change that fully satisfies the requirement.**

Do not modify unrelated modules unnecessarily.

---

# 97. No Mass Rewrite

The agent must not rewrite an entire subsystem simply because it prefers a different implementation.

Large refactors require explicit justification.

---

# 98. Dependency Rule

Before adding a package:

```text
search existing dependencies
determine whether existing tooling solves the problem
evaluate maintenance/security cost
```

---

# 99. No Dependency for Trivial Problems

Do not add an entire package to solve a problem that requires:

```text
10 lines of stable code
```

unless the dependency provides substantial value.

---

# 100. Naming Rule

Use names that communicate intent.

Good:

```text
CreateRequirementUseCase
DriverAvailabilityRepository
CompleteTrip
PaymentReconciliationService
```

Bad:

```text
Helper
Manager
Utils
DataHandler
ThingService
```

---

# 101. Function Responsibility

Functions should have one coherent responsibility.

If a function:

```text
validates
calculates
persists
notifies
formats
```

all at once, consider decomposition.

---

# 102. Comments

Comments should explain why.

Do not write comments that merely restate the code.

---

# 103. TODO Rule

TODOs must identify meaningful unfinished work.

Good:

```text
TODO(#123): Replace temporary pricing policy after commercial rules are approved.
```

Bad:

```text
TODO fix
TODO later
```

---

# 104. Temporary Implementation Rule

Temporary implementations must be:

```text
explicit
isolated
documented
replaceable
```

Never allow temporary behavior to look like finalized business logic.

---

# 105. Git Rule

Use meaningful commits.

Examples:

```text
feat(dispatch): add offer expiry handling
fix(trip): prevent duplicate completion
feat(finance): add withdrawal idempotency
```

---

# 106. Pull Request Rule

A PR should communicate:

```text
what changed
why
tests
architecture impact
known limitations
```

---

# 107. AI Commit Rule

AI agents should not create meaningless commits such as:

```text
changes
update
fix stuff
```

---

# 108. Production Deployment Rule

The AI agent must not bypass established deployment controls.

Never:

```text
edit production DB directly
disable CI
skip migration
expose secrets
```

---

# 109. Migration Safety

Before changing production schema, determine:

```text
existing data impact
application compatibility
worker compatibility
rollback implications
index/locking impact
```

---

# 110. Deployment Compatibility

Before releasing API changes, consider older mobile clients.

Mobile applications may remain in the wild after deployment.

---

# 111. API Backward Compatibility

Do not remove or change existing API behavior without considering:

```text
mobile versions
Admin version
background workers
external integrations
```

---

# 112. Build Rule

A production-ready change must produce a successful relevant build.

Examples:

```text
Flutter build
Next.js build
NestJS build
```

as applicable.

---

# 113. Environment Rule

Never assume development configuration equals production configuration.

Verify:

```text
environment variables
provider configuration
database
Redis
storage
```

---

# 114. Secrets Rule

Never expose secrets in:

```text
source code
logs
frontend
Git
test fixtures
```

---

# 115. Production Data Rule

Never copy production:

```text
PII
KYC documents
payment information
```

into development or staging without an explicitly approved sanitization process.

---

# 116. Incident Rule

If the agent detects a potentially dangerous issue involving:

```text
financial corruption
authorization bypass
data loss
security vulnerability
production outage
```

it must prioritize containment and explicit reporting over continuing normal feature implementation.

---

# 117. Stop Conditions

The AI agent must stop and ask for clarification when:

```text
product behavior is ambiguous
commercial rule is missing
architecture conflicts
database model conflicts
state transition is undefined
security boundary is unclear
financial behavior is undefined
required API contract is missing
```

---

# 118. Continue Conditions

The agent may continue without clarification when:

```text
implementation detail is obvious
existing project convention resolves it
documentation explicitly defines it
the decision is internal and reversible
```

---

# 119. Evidence-Based Coding

The agent should prefer:

```text
existing code
documentation
tests
contracts
database schema
```

over assumptions.

---

# 120. No Hallucinated APIs

Do not assume a library or internal module has a function.

Verify it exists before using it.

Bad:

```text
authService.verifyDriverAccess()
```

if no such method exists.

Search first.

---

# 121. No Hallucinated Components

Do not assume:

```text
TripCard
StatusBadge
MapView
```

exists.

Search the repository.

---

# 122. No Hallucinated Database Fields

Do not write:

```text
driver.isOnline
```

without verifying the canonical model.

The actual source of truth may be:

```text
availabilityState
```

or another documented representation.

---

# 123. No Hallucinated Endpoints

Do not write frontend calls to endpoints that have not been defined/implemented.

Verify:

```text
API contract
backend route
DTO
response
```

---

# 124. No Hallucinated Provider Features

Do not assume an external provider supports an operation.

Verify the provider integration or abstraction.

---

# 125. Data Flow Understanding

Before implementing a feature, the agent should understand:

```text
UI
 ↓
API
 ↓
Use Case
 ↓
Domain
 ↓
Database
 ↓
Event
 ↓
Worker
 ↓
External Provider
```

where applicable.

---

# 126. Feature Implementation Workflow

The preferred workflow is:

```text
1. Read requirement
2. Read relevant source-of-truth documents
3. Inspect repository
4. Identify affected modules
5. Identify existing reusable code
6. Identify dependencies
7. Identify state transitions
8. Identify authorization
9. Identify database impact
10. Identify API impact
11. Identify realtime impact
12. Identify financial impact
13. Plan implementation
14. Implement
15. Write/update tests
16. Run verification
17. Review diff
18. Report result
```

---

# 127. Plan Before Code

For non-trivial work, the agent should produce a short implementation plan before making broad changes.

The plan should state:

```text
affected modules
data changes
API changes
UI changes
tests
risks
```

---

# 128. Small Tasks

For trivial changes, the agent does not need a large written plan.

However, it should still inspect the relevant implementation and source-of-truth rules.

---

# 129. Diff Review

Before declaring completion, inspect the resulting diff.

Check for:

```text
unrelated changes
debug code
dead code
secrets
duplicate logic
temporary hacks
incorrect formatting
```

---

# 130. Generated Files

Do not commit unnecessary:

```text
build artifacts
temporary files
IDE files
logs
generated secrets
```

unless explicitly required.

---

# 131. Documentation Synchronization

If implementation changes an architectural or behavioral contract, update the relevant documentation.

Examples:

```text
API change
→ API specification

state change
→ State machines

database change
→ Database document

screen behavior change
→ Screen specification

deployment change
→ DevOps document
```

---

# 132. Documentation Is Code

Source-of-truth documentation must be treated as part of the system.

Stale documentation is an engineering defect.

---

# 133. Feature Completion Report

When finishing a non-trivial task, the agent should report:

```text
Implemented:
- ...

Changed:
- ...

Tests:
- ...

Verification:
- ...

Known limitations:
- ...

TBD / blocked:
- ...
```

---

# 134. No False Completion

The agent must never claim:

```text
"Everything is complete."
```

if:

```text
tests fail
build fails
required dependency is missing
business decision is unresolved
critical functionality is mocked
```

---

# 135. Partial Completion

If only part of the task can be completed safely:

```text
complete the safe portion
clearly identify what remains
do not fabricate the rest
```

---

# 136. Code Quality Gate

Before completion, ask:

```text
Does this follow the architecture?
Does it use existing patterns?
Is authorization correct?
Are state transitions correct?
Is data integrity protected?
Are retries safe?
Are failures handled?
Is it observable?
Is it tested?
```

---

# 137. Product Quality Gate

Ask:

```text
Does this solve the actual user task?
Does the UI match the design system?
Are loading/error/empty states handled?
Does the workflow match the screen specification?
Is the terminology consistent?
```

---

# 138. Security Quality Gate

Ask:

```text
Can another user access this resource?
Can the client manipulate the authoritative value?
Can this operation be replayed?
Can secrets leak?
Can unauthorized users invoke it?
Can uploaded data cause harm?
```

---

# 139. Financial Quality Gate

For financial functionality ask:

```text
Can money be duplicated?
Can money disappear?
Can the same payout happen twice?
Can a webhook be replayed?
Can concurrent withdrawals exceed funds?
Can historical financial data be silently modified?
```

---

# 140. Dispatch Quality Gate

For dispatch functionality ask:

```text
Can two drivers consume one slot?
Can expired offers be accepted?
Can cancelled requirements receive assignments?
Can unavailable drivers receive offers?
Can the dispatch worker retry safely?
Can capacity exceed requirement?
```

---

# 141. Realtime Quality Gate

Ask:

```text
Can events duplicate?
Can events arrive out of order?
Can unauthorized users receive them?
Can reconnect lose important state?
Can stale events overwrite newer state?
```

---

# 142. Production Quality Gate

Ask:

```text
Can it be deployed safely?
Can it be rolled back?
Is the database compatible?
Are workers compatible?
Is the feature observable?
Can an incident be diagnosed?
```

---

# 143. AI Anti-Pattern: Coding From Prompt Alone

Forbidden workflow:

```text
User asks feature
 ↓
AI immediately generates code
```

Correct:

```text
User asks feature
 ↓
Read requirements
 ↓
Read architecture
 ↓
Inspect repository
 ↓
Plan
 ↓
Implement
 ↓
Test
```

---

# 144. AI Anti-Pattern: UI-First Development

Do not build screens first and invent backend behavior afterward.

Correct sequence:

```text
business behavior
→ domain
→ state
→ API
→ UI
```

when the feature requires backend behavior.

---

# 145. AI Anti-Pattern: Database-First Product Design

Do not allow the database schema to define the product automatically.

Correct sequence:

```text
user need
→ business rule
→ domain
→ data model
```

---

# 146. AI Anti-Pattern: CRUD Generator

Do not generate CRUD endpoints for every table automatically.

AdhocX is a business workflow system.

---

# 147. AI Anti-Pattern: Giant Service

Do not create:

```text
AdhocXService
AppService
MarketplaceService
EverythingService
```

containing unrelated business behavior.

---

# 148. AI Anti-Pattern: Generic Utility Explosion

Do not create:

```text
utils.ts
helpers.ts
common.ts
misc.ts
```

as dumping grounds.

---

# 149. AI Anti-Pattern: Copy-Paste Architecture

Do not duplicate:

```text
same repository
same DTO
same validation
same API client
same component
```

with tiny naming differences.

---

# 150. AI Anti-Pattern: Magic Numbers

Do not hardcode:

```text
5000
15000
0.15
30
60
```

when they represent business configuration.

---

# 151. AI Anti-Pattern: Silent Assumptions

Never silently assume:

```text
commission
radius
timeout
fee
limit
policy
```

if the project has not defined it.

---

# 152. AI Anti-Pattern: Happy Path Only

Never implement only:

```text
success
```

without considering:

```text
failure
retry
timeout
concurrency
authorization
```

where applicable.

---

# 153. AI Anti-Pattern: Test Theater

Do not create tests that merely exercise code without verifying meaningful behavior.

Bad:

```text
expect(service).toBeDefined();
```

as the primary test of a complex workflow.

---

# 154. AI Anti-Pattern: Snapshot Everything

Snapshots must not replace behavioral assertions.

---

# 155. AI Anti-Pattern: Disable Until Green

Forbidden sequence:

```text
test fails
 ↓
disable test
 ↓
CI green
```

---

# 156. AI Anti-Pattern: Fixing Symptoms

If an error occurs:

```text
find root cause
```

rather than adding random conditions until the error disappears.

---

# 157. AI Anti-Pattern: Overengineering

Do not introduce:

```text
microservices
event buses
complex abstractions
ML models
advanced caching
```

without an actual requirement.

---

# 158. AI Anti-Pattern: Underengineering

Do not simplify critical workflows into unsafe shortcuts.

Examples:

```text
first driver wins
wallet.balance += amount
UI-only authorization
status = COMPLETED
```

---

# 159. AI Anti-Pattern: Dependency Cargo Cult

Do not install packages simply because AI-generated examples commonly use them.

---

# 160. AI Anti-Pattern: Architecture by Library

The project architecture determines library usage.

A library does not determine the architecture.

---

# 161. AI Anti-Pattern: "Works on My Machine"

The agent must verify:

```text
build
tests
types
lint
```

rather than assuming local behavior is sufficient.

---

# 162. AI Anti-Pattern: Ignoring Existing Code

The agent must not implement a second version of something that already exists because it failed to inspect the repository.

---

# 163. AI Anti-Pattern: Giant PR

Prefer focused changes.

A single feature should not unexpectedly modify:

```text
30 unrelated modules
```

---

# 164. AI Anti-Pattern: Unreviewed Refactor

Do not combine:

```text
feature implementation
+
mass architecture rewrite
```

unless explicitly required.

---

# 165. AI Anti-Pattern: Fake Completeness

Never say:

```text
"Production ready"
```

when important functionality is:

```text
mocked
hardcoded
untested
undefined
```

---

# 166. Master Pre-Commit Checklist

Before considering a task complete:

```text
[ ] Requirement understood
[ ] Relevant source-of-truth documents read
[ ] Existing implementation inspected
[ ] Existing components reused where appropriate
[ ] Architecture respected
[ ] Folder structure respected
[ ] API contract respected
[ ] Database model respected
[ ] State machine respected
[ ] Authorization implemented
[ ] Security requirements considered
[ ] Realtime requirements considered
[ ] Financial requirements considered
[ ] Dispatch requirements considered
[ ] Loading states handled
[ ] Empty states handled
[ ] Error states handled
[ ] Offline behavior considered
[ ] Idempotency considered
[ ] Concurrency considered
[ ] Observability added where appropriate
[ ] Tests added/updated
[ ] Lint passes
[ ] Type checking passes
[ ] Tests pass
[ ] Build passes
[ ] Diff reviewed
[ ] No secrets
[ ] No fake production data
[ ] No unnecessary dependencies
[ ] No unrelated changes
[ ] Documentation updated if necessary
```

---

# 167. Master Decision Rule

When uncertain, the agent should choose in this order:

```text
1. Explicit project requirement
2. Source-of-truth documentation
3. Existing project convention
4. Established engineering standard
5. Safest reversible implementation
6. Ask for clarification
```

Do not reverse this order.

---

# 168. Conflict Resolution

If documents conflict:

```text
DO NOT silently choose.
```

Instead:

```text
identify conflict
→ identify affected behavior
→ explain conflict
→ request resolution
→ update source of truth
→ implement
```

---

# 169. Change Management

When a decision changes, update:

```text
source-of-truth document
+
affected implementation
+
tests
```

Do not let implementation become the only place where a decision exists.

---

# 170. Final Agent Contract

The AI agent working on AdhocX agrees to the following principles:

```text
I will not invent business rules.

I will not fabricate functionality.

I will not treat frontend state as backend truth.

I will not bypass authorization.

I will not bypass state machines.

I will not corrupt financial history.

I will not ignore concurrency.

I will not disable tests to hide failures.

I will not introduce architecture without reason.

I will inspect before creating.

I will reuse before duplicating.

I will test before declaring completion.

I will report uncertainty instead of hiding it.

I will prefer correctness over speed.

I will leave the codebase better understood than I found it.
```

---

# 171. The AdhocX AI Development Loop

The canonical loop is:

```text
┌───────────────────────────────┐
│        REQUIREMENT            │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│       READ THE DOCS           │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│      INSPECT THE REPO         │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│        PLAN THE CHANGE        │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│      IMPLEMENT SURGICALLY     │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│         WRITE TESTS           │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│          VERIFY               │
│ lint / type / test / build    │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│        REVIEW THE DIFF        │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│       REPORT THE RESULT       │
└───────────────────────────────┘
```

---

# 172. Final Principle

The AI agent is not the architect of AdhocX.

The documentation, product requirements, business rules, architecture, state machines, security model, financial model, and engineering standards define the system.

The AI agent's job is to execute those decisions accurately.

Therefore:

> **Do not optimize for how much code the AI can generate. Optimize for how much correct, maintainable software the team can safely ship.**

The standard is not:

> “The AI wrote it.”

The standard is:

> **“The system is correct, tested, observable, secure, maintainable, and understandable.”**

That is the definition of successful AI-assisted engineering for AdhocX.