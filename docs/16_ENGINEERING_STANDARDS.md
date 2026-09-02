# 16_ENGINEERING_STANDARDS.md

# AdhocX Engineering Standards

**Document Status:** Source of Truth
**Version:** V1
**Audience:** Backend Engineers, Flutter Engineers, Next.js Engineers, QA Engineers, DevOps Engineers, AI Coding Agents

---

# 1. Purpose

This document defines the engineering standards for building AdhocX.

It establishes rules for:

* Code quality
* Architecture adherence
* Naming
* Type safety
* Module boundaries
* Error handling
* API implementation
* Database access
* State management
* Frontend architecture
* Backend architecture
* Testing
* Logging
* Git
* Code review
* Dependency management
* Performance
* Maintainability
* AI-generated code

The objective is simple:

> **AdhocX must remain understandable, testable, predictable, and maintainable as the codebase grows.**

---

# 2. Engineering Philosophy

AdhocX is a production system, not a prototype.

Engineering decisions must prioritize:

```text
Correctness
>
Security
>
Maintainability
>
Observability
>
Performance
>
Developer convenience
```

Performance optimizations must not compromise correctness.

Developer convenience must not justify architectural shortcuts.

---

# 3. Source-of-Truth Hierarchy

Before implementing anything, engineers and AI agents must follow this hierarchy:

```text
01_PRD.md
      ↓
02_FEATURES.md
      ↓
03_USER_ROLES_AND_PERMISSIONS.md
      ↓
04_DESIGN_SYSTEM.md
05_UI_UX_GUIDELINES.md
06_SCREEN_SPECIFICATIONS.md
      ↓
07_ARCHITECTURE.md
08_FOLDER_STRUCTURE.md
09_DATABASE.md
10_API_SPECIFICATION.md
11_DISPATCH_ENGINE.md
12_STATE_MACHINES.md
13_SECURITY.md
14_REALTIME_AND_NOTIFICATIONS.md
15_PAYMENTS_AND_LEDGER.md
      ↓
16_ENGINEERING_STANDARDS.md
      ↓
17_TESTING_STRATEGY.md
18_DEVOPS_AND_DEPLOYMENT.md
19_OBSERVABILITY.md
20_AI_AGENT_RULES.md
```

If two documents appear to conflict, do not silently choose one.

Identify the conflict and resolve it explicitly.

---

# 4. Architecture Must Be Enforced

The architecture documents are not suggestions.

Code must respect:

```text
Presentation
    ↓
Application
    ↓
Domain
    ↓
Infrastructure
```

Dependencies must flow inward.

---

# 5. Backend Layer Responsibilities

## Presentation

Responsible for:

* HTTP controllers
* DTO validation
* authentication extraction
* request/response mapping
* WebSocket gateways

Must not contain business logic.

---

## Application

Responsible for:

* use cases
* orchestration
* transaction boundaries
* authorization coordination
* calling domain logic
* repository interfaces

---

## Domain

Responsible for:

* business rules
* invariants
* state transitions
* domain calculations
* domain policies

Must not depend on:

```text
NestJS
PostgreSQL
Redis
HTTP
Flutter
Next.js
```

---

## Infrastructure

Responsible for:

* database implementations
* Redis
* external APIs
* payment providers
* maps providers
* push notification providers
* storage providers

---

# 6. Thin Controllers

Controllers should be thin.

Good:

```typescript
@Post()
createRequirement(
  @CurrentUser() user: AuthenticatedUser,
  @Body() dto: CreateRequirementDto,
) {
  return this.createRequirement.execute(user, dto);
}
```

Bad:

```typescript
@Post()
async createRequirement(...) {
  // validate driver
  // query database
  // calculate radius
  // select drivers
  // create offers
  // send notifications
  // calculate price
  // update multiple tables
}
```

Controllers coordinate HTTP.

They do not implement business workflows.

---

# 7. Use Cases

Important business operations should be represented as explicit application use cases.

Examples:

```text
CreateRequirement
CancelRequirement
AcceptOffer
AssignDriver
StartTrip
CompleteTrip
InitiatePayment
RequestWithdrawal
VerifyDriver
```

A use case should have a clear responsibility.

Avoid giant services such as:

```text
GodService
TripEverythingService
CommonBusinessService
```

---

# 8. Domain Logic

Business rules must live close to the domain they govern.

Examples:

```text
Offer expiration
→ Offer domain

Requirement fulfillment
→ Requirement/dispatch domain

Trip transitions
→ Trip domain

Withdrawal eligibility
→ Financial domain
```

Do not duplicate the same rule across:

```text
Flutter
Next.js
NestJS
```

The backend remains authoritative.

---

# 9. TypeScript Strictness

Backend and Admin TypeScript must use strict type checking.

Required philosophy:

```text
No implicit any
No unnecessary any
No unsafe casts
No ignored compiler errors
```

Prefer:

```typescript
unknown
```

over:

```typescript
any
```

when the type is genuinely unknown.

---

# 10. Avoid Type Assertions

Avoid:

```typescript
const driver = response as Driver;
```

unless the boundary has been validated.

Prefer:

```text
runtime validation
+
typed transformation
```

External data is untrusted until validated.

---

# 11. Dart Type Safety

Flutter code must also maintain strict typing.

Avoid:

```dart
dynamic
```

unless there is a documented reason.

Prefer explicit models and typed serializers.

---

# 12. Nullability

Nullability must represent a real domain possibility.

Do not use nullable fields simply to avoid deciding what the model should be.

Bad:

```typescript
name?: string;
```

when name is actually required.

Good:

```typescript
name: string;
```

---

# 13. Naming

Names must describe intent.

Good:

```text
CreateRequirementUseCase
DriverAvailabilityRepository
CalculateTripEarning
RequirementStatus
```

Bad:

```text
Helper
Manager
Utils2
DataHandler
ThingService
```

---

# 14. Boolean Naming

Boolean values should clearly communicate state.

Prefer:

```text
isVerified
isAvailable
hasActiveTrip
canWithdraw
```

Avoid:

```text
verified
availableFlag
statusBool
```

unless the surrounding context makes it unambiguous.

---

# 15. Constants

Do not scatter magic values throughout code.

Bad:

```typescript
if (distance < 5000)
```

Prefer:

```typescript
const dispatchRadiusMeters = configuration.dispatchRadiusMeters;
```

Business configuration belongs in configuration/domain policy rather than random source files.

---

# 16. No Magic Business Rules

Never embed unresolved business decisions.

Bad:

```typescript
const commission = amount * 0.15;
```

if commission has not been finalized.

Correct:

```text
PricingPolicy
```

with the commercial rule explicitly configured.

If the requirement is unknown:

```text
TBD
```

must remain a product/configuration decision.

---

# 17. No Duplicate Business Logic

Never implement the same business rule independently in several locations.

Example:

```text
CanDriverAcceptOffer
```

should not be separately implemented in:

```text
Flutter
NestJS controller
NestJS worker
Admin
```

The backend must provide the authoritative decision.

Frontend may provide a UX prediction, but the backend decides.

---

# 18. API Contracts

API request/response contracts must be explicit.

The frontend must not depend on undocumented response fields.

Prefer shared/generated contracts where appropriate.

---

# 19. API Versioning

API changes must respect the versioning strategy defined in:

```text
10_API_SPECIFICATION.md
```

Breaking changes must not silently replace existing contracts.

---

# 20. DTOs

DTOs represent transport-layer input/output.

They are not automatically domain entities.

Do not pass raw HTTP DTOs deep into the domain if doing so couples the domain to transport concerns.

Preferred:

```text
HTTP DTO
 ↓
Application Input
 ↓
Domain
```

---

# 21. Database Models

Database entities/models are not automatically API models.

Avoid exposing database objects directly.

Bad:

```typescript
return databaseDriver;
```

Preferred:

```text
Database Model
 ↓
Domain/Application Model
 ↓
Response DTO
```

---

# 22. Repository Pattern

Application/domain logic should depend on repository interfaces.

Example:

```typescript
interface DriverRepository {
  findEligibleDrivers(criteria: DriverCriteria): Promise<Driver[]>;
}
```

The implementation belongs to infrastructure.

---

# 23. Repository Responsibilities

Repositories should handle persistence.

They should not become hidden business services.

Bad:

```text
DriverRepository.assignDriverAndChargeVendorAndSendNotification()
```

Good:

```text
DriverRepository.findById()
DriverRepository.save()
```

Business orchestration belongs in application services.

---

# 24. Database Transactions

Use database transactions when multiple changes must succeed together.

Critical examples:

```text
Accept Offer
Confirm Assignment
Post Ledger Entries
Create Withdrawal Reservation
Process Refund
```

---

# 25. Transaction Scope

Transactions should be:

```text
as small as safely possible
```

Do not keep a database transaction open while waiting for:

```text
HTTP API
payment provider
push provider
map provider
```

External calls should generally occur outside the database transaction with reliable state/retry mechanisms.

---

# 26. Concurrency

Concurrency must be treated as normal system behavior.

Examples:

```text
two drivers accept the same offer
two admins modify the same requirement
two withdrawal requests arrive simultaneously
two webhook deliveries arrive simultaneously
```

Correctness must not depend on requests arriving sequentially.

---

# 27. Database as Authority

PostgreSQL is authoritative for critical state.

Redis must not become the permanent source of truth for:

```text
assignments
payments
earnings
trip state
driver ownership
```

---

# 28. Redis Usage

Redis may be used for:

```text
cache
locks
queues
temporary coordination
rate limiting
ephemeral realtime state
```

Critical persisted business state belongs in PostgreSQL.

---

# 29. Idempotency

Operations that may be retried must support idempotency.

Examples:

```text
Accept Offer
Complete Trip
Payment Initiation
Webhook Processing
Withdrawal
Settlement
Refund
```

---

# 30. Idempotency Keys

Where appropriate:

```text
Idempotency-Key
```

must identify the logical operation.

The same operation retried with the same key should produce the same logical result rather than creating duplicate side effects.

---

# 31. Error Handling

Errors must be deliberate and typed.

Avoid:

```typescript
throw new Error("Something went wrong");
```

for every situation.

Use meaningful application errors such as:

```text
RequirementNotFound
OfferExpired
OfferAlreadyAccepted
InsufficientBalance
UnauthorizedOperation
InvalidStateTransition
PaymentProcessing
```

---

# 32. Error Categories

Errors should distinguish between:

```text
Validation
Authentication
Authorization
Not Found
Conflict
Invalid State
Business Rule
External Dependency
Infrastructure
Unexpected
```

---

# 33. Client Error Messages

User-facing messages must be understandable.

Bad:

```text
INVALID_STATE_TRANSITION_409
```

Good:

```text
This trip has already been started.
```

Internal error codes may still exist for programmatic handling.

---

# 34. Never Leak Internals

API responses must not expose:

```text
SQL errors
stack traces
provider secrets
database structure
internal service details
```

in production.

---

# 35. Error Recovery

Every important error should answer:

```text
What failed?
Can it be retried?
Who should retry?
What state is authoritative?
```

---

# 36. Logging

Use structured logs.

Prefer:

```json
{
  "event": "offer.accepted",
  "offerId": "123",
  "driverId": "456",
  "requestId": "789"
}
```

over:

```text
"Offer accepted!!!"
```

---

# 37. Logging Rules

Logs should contain useful context but must not contain sensitive information.

Never log:

```text
OTP
password
access token
refresh token
payment credentials
full KYC documents
bank credentials
```

---

# 38. Request IDs

Every API request should have a request/correlation identifier.

This identifier should be propagated where appropriate through:

```text
API
→ application
→ worker
→ external integration
```

This allows one operation to be traced across asynchronous systems.

---

# 39. Domain Events

Use domain/application events where they improve decoupling.

Examples:

```text
RequirementPosted
OfferAccepted
TripCompleted
PaymentSucceeded
WithdrawalCompleted
```

Events must not become a replacement for explicit state.

---

# 40. Event Consumers

Consumers must be idempotent.

If:

```text
TripCompleted
```

is delivered twice, the financial system must not create two earnings.

---

# 41. Outbox Pattern

For critical events, use the outbox pattern where required.

Conceptually:

```text
Database Transaction
       ↓
Business State
+
Outbox Event
       ↓
Commit
       ↓
Publisher
       ↓
Consumer
```

This avoids the classic:

```text
DB committed
event lost
```

failure.

---

# 42. External Services

External integrations must be isolated behind interfaces.

Examples:

```text
PaymentProvider
MapsProvider
NotificationProvider
StorageProvider
```

Business logic should not directly call SDK-specific APIs everywhere.

---

# 43. Provider Failure

Assume every external dependency can:

```text
timeout
fail
return malformed data
rate-limit
be temporarily unavailable
change behavior
```

The application must fail safely.

---

# 44. No Infinite Retries

Never implement:

```text
while(true) retry()
```

Retries must have:

```text
bounded attempts
backoff
observability
dead-letter handling where appropriate
```

---

# 45. Flutter Architecture

The Flutter application must follow a layered feature architecture.

Conceptually:

```text
Presentation
      ↓
Application/State
      ↓
Domain
      ↓
Data
      ↓
API / Storage
```

Exact state-management technology must be selected consistently and documented before implementation.

---

# 46. Flutter Feature Isolation

Vendor and Driver functionality must be organized as features.

Avoid one enormous:

```text
HomeScreen
```

containing both roles and all business logic.

---

# 47. Flutter Widgets

Widgets should focus on presentation and interaction.

Avoid embedding:

```text
API calls
database logic
complex business rules
```

directly inside widgets.

---

# 48. Flutter State

State must have explicit ownership.

Distinguish:

```text
server state
local UI state
session state
form state
temporary state
```

Do not create global state merely because it is convenient.

---

# 49. Flutter API Handling

Network responses must be:

```text
validated
mapped
typed
error-aware
```

Never assume HTTP 200 means the operation succeeded semantically.

---

# 50. Flutter Offline Behavior

The app must handle:

```text
network unavailable
slow network
request timeout
reconnection
stale data
```

Critical mutations must reconcile with backend state.

---

# 51. Flutter Navigation

Navigation must respect authenticated role and authorization.

Never rely solely on hiding navigation items.

A user navigating directly to a route must still be denied if unauthorized.

---

# 52. Flutter Design System

All UI must use centralized design tokens/components from:

```text
04_DESIGN_SYSTEM.md
```

Do not create random:

```text
colors
font sizes
radii
button styles
spacing
```

inside individual screens.

---

# 53. Flutter Screen Implementation

Every screen must correspond to:

```text
06_SCREEN_SPECIFICATIONS.md
```

If a required screen specification does not exist, do not invent a complete workflow.

Raise the missing requirement.

---

# 54. Next.js Architecture

Admin web application must separate:

```text
pages/routes
components
features
API clients
state
domain types
utilities
```

Do not place all logic in page components.

---

# 55. Admin Components

Reusable operational UI must use centralized components.

Examples:

```text
DataTable
StatusBadge
FilterBar
Drawer
Modal
ConfirmDialog
Pagination
EmptyState
ErrorState
LoadingState
```

---

# 56. Admin Data Fetching

Data fetching should be centralized through defined API clients/query mechanisms.

Avoid random:

```text
fetch(...)
```

scattered throughout components.

---

# 57. Admin Authorization

Frontend permissions improve UX.

Backend authorization remains authoritative.

Never assume:

```text
button hidden
=
operation secured
```

---

# 58. Forms

Forms must:

```text
validate
preserve input on recoverable errors
show field-level errors
prevent accidental duplicate submissions
handle loading
handle server errors
```

---

# 59. Loading States

Every asynchronous screen should define appropriate:

```text
initial loading
refreshing
mutation loading
partial loading
failure
empty
```

Do not display blank screens while data is loading.

---

# 60. Empty States

Empty state must communicate:

```text
what is empty
why it may be empty
what action is available
```

Example:

```text
No active requirements
Create a requirement to start fulfillment.
```

---

# 61. Error States

Errors should be actionable where possible.

Example:

```text
Unable to load trips.
Check your connection and try again.
```

Do not simply show:

```text
Error.
```

---

# 62. Optimistic UI

Optimistic updates may be used for low-risk interactions.

Do not use optimistic assumptions for critical operations such as:

```text
offer acceptance
trip start
trip completion
payment
withdrawal
financial changes
```

For critical operations:

```text
request
→ backend decision
→ authoritative state
→ UI reconciliation
```

---

# 63. API Cache Invalidation

After important mutations, cached data must be invalidated or reconciled correctly.

Never leave the UI showing a known stale state after a successful mutation.

---

# 64. Realtime UI

Realtime events should update or invalidate UI state.

They do not replace the API/database as the source of truth.

---

# 65. Realtime Duplicates

UI consumers must tolerate duplicate events.

Example:

```text
OfferAccepted
OfferAccepted
```

must not produce two assignments in frontend state.

---

# 66. Date and Time

Backend stores timestamps in UTC.

Clients convert timestamps for display.

Do not manually add/subtract timezone offsets throughout the application.

---

# 67. Money Formatting

Money must use a centralized formatting utility.

Do not manually format currency throughout screens.

Example:

```text
₹1,250.00
```

should come from the shared formatting logic.

---

# 68. Location Formatting

Distance and coordinates must use centralized utilities.

Avoid inconsistent:

```text
meters
km
miles
```

across screens.

---

# 69. Security Boundaries

Treat all client input as untrusted.

This includes:

```text
Flutter
Admin browser
external providers
webhooks
query parameters
headers
uploaded files
```

---

# 70. Validation

Validate at boundaries.

Examples:

```text
HTTP input
WebSocket input
Webhook input
file metadata
external provider responses
```

Do not assume data is valid because TypeScript says so.

---

# 71. File Uploads

Uploaded KYC documents must:

```text
validate type
validate size
validate authorization
use secure storage
avoid public exposure
```

Do not trust filename extensions alone.

---

# 72. Secrets

Never commit secrets.

Forbidden:

```text
API keys
database passwords
JWT secrets
payment credentials
cloud credentials
```

into source control.

---

# 73. Environment Configuration

Configuration must be explicit.

Examples:

```text
DATABASE_URL
REDIS_URL
PAYMENT_PROVIDER_KEY
MAPS_API_KEY
STORAGE_BUCKET
```

Use environment-specific configuration.

---

# 74. Configuration Validation

Application startup should fail fast when required configuration is missing or invalid.

Do not allow:

```text
undefined API key
```

to cause obscure runtime failures later.

---

# 75. Dependencies

Every dependency introduces:

```text
maintenance cost
security risk
bundle size
upgrade burden
```

Do not add packages for trivial functionality.

---

# 76. Dependency Evaluation

Before adding a package, consider:

```text
Do we actually need it?
Is the package maintained?
Does it solve a meaningful problem?
Does the architecture already provide this capability?
Does it introduce unnecessary coupling?
```

---

# 77. Dependency Pinning

Production dependencies should use controlled versions.

Avoid uncontrolled dependency drift.

Updates should be deliberate and tested.

---

# 78. Dead Code

Do not keep unused:

```text
imports
classes
functions
components
routes
dependencies
```

unless intentionally retained with documented reason.

---

# 79. Comments

Comments should explain:

```text
why
```

rather than:

```text
what
```

Bad:

```typescript
// Increment count
count++;
```

Good:

```typescript
// This retry is intentionally bounded because provider state may be ambiguous.
```

---

# 80. TODO Rules

Do not leave meaningless TODOs.

Bad:

```text
TODO fix this
TODO later
```

Good:

```text
TODO(#123): Replace temporary pricing policy after commercial rule approval.
```

---

# 81. Temporary Code

Temporary code must be clearly identifiable.

If a shortcut is necessary:

```text
document why
document scope
document replacement condition
```

Do not allow temporary code to silently become permanent architecture.

---

# 82. Code Duplication

Small duplication is sometimes preferable to premature abstraction.

Do not create generic abstractions until there is a real repeated pattern.

Avoid:

```text
BaseEverything
UniversalService
GenericRepositoryManager
```

---

# 83. Abstraction Rule

Use abstraction when it provides a real architectural benefit:

```text
provider substitution
domain isolation
reusable business behavior
testability
```

Do not abstract solely to reduce line count.

---

# 84. Functions

Functions should have a clear responsibility.

If a function is simultaneously:

```text
validating
calculating
persisting
notifying
formatting
```

it probably needs decomposition.

---

# 85. Service Size

There is no arbitrary maximum line count.

Instead ask:

```text
Does this service have one coherent responsibility?
Can it be tested independently?
Can its dependencies be understood?
```

If not, refactor.

---

# 86. State Machines

State transitions must follow:

```text
12_STATE_MACHINES.md
```

Never implement arbitrary:

```text
status = "COMPLETED"
```

without validating that the transition is allowed.

---

# 87. State Transition API

Prefer explicit transition operations:

```text
acceptOffer()
startTrip()
completeTrip()
cancelRequirement()
```

rather than unrestricted:

```text
updateStatus(status)
```

for business-critical entities.

---

# 88. Financial Code

Financial code must additionally follow:

```text
15_PAYMENTS_AND_LEDGER.md
```

No shortcuts are permitted.

---

# 89. Dispatch Code

Dispatch code must additionally follow:

```text
11_DISPATCH_ENGINE.md
```

Do not implement dispatch logic in controllers or frontend applications.

---

# 90. Authorization Code

Authorization must additionally follow:

```text
03_USER_ROLES_AND_PERMISSIONS.md
13_SECURITY.md
```

Never create ad-hoc permission checks.

---

# 91. UI Code

UI implementation must additionally follow:

```text
04_DESIGN_SYSTEM.md
05_UI_UX_GUIDELINES.md
06_SCREEN_SPECIFICATIONS.md
```

---

# 92. Database Code

Database implementation must additionally follow:

```text
09_DATABASE.md
```

No feature may create an independent database model that contradicts the canonical domain model.

---

# 93. Migration Rules

Database schema changes must use migrations.

Never manually modify production schema as an undocumented workaround.

Every migration must be:

```text
versioned
reviewable
repeatable
tested
```

---

# 94. Migration Safety

Consider:

```text
existing data
backward compatibility
index creation
locking
rollback strategy
deployment order
```

for production migrations.

---

# 95. Seed Data

Seed data must be clearly separated from production data.

Never use fake production credentials or secrets in seed scripts.

---

# 96. Testing Before Implementation Completion

A feature is not complete because:

```text
the screen works
```

or:

```text
the API returns 200
```

It is complete when the relevant behavior is tested.

---

# 97. Unit Tests

Unit tests should cover:

```text
domain rules
calculations
state transitions
validation
authorization policies
financial calculations
dispatch scoring
```

---

# 98. Integration Tests

Integration tests should cover:

```text
API
database
transactions
repositories
workers
external provider boundaries
```

---

# 99. End-to-End Tests

Critical flows require end-to-end coverage.

Examples:

```text
Vendor posts requirement
→ Driver accepts
→ Assignment confirmed
→ Trip starts
→ Trip completes
→ Earning created
```

---

# 100. Failure Testing

Tests must include failures.

Examples:

```text
network failure
timeout
duplicate request
duplicate webhook
concurrent acceptance
concurrent withdrawal
expired offer
cancelled requirement
unavailable driver
payment failure
```

---

# 101. Test Naming

Tests should describe behavior.

Good:

```text
rejects acceptance when offer has expired
```

Bad:

```text
test1
testAccept
works
```

---

# 102. Test Isolation

Tests must not depend on execution order.

Avoid shared mutable test state.

---

# 103. Test Data

Use factories/builders for complex test data.

Avoid enormous copy-pasted fixture objects throughout the repository.

---

# 104. Mocking

Mock external dependencies where appropriate.

Do not mock the entire application into meaninglessness.

Important domain/database integration behavior should be tested against realistic infrastructure where practical.

---

# 105. Git Branching

Use a disciplined branching strategy.

Recommended:

```text
main
  ↓
feature/<name>
```

or the team's explicitly selected equivalent.

Production code must not be committed directly without appropriate review controls.

---

# 106. Commit Messages

Commit messages should communicate intent.

Good:

```text
feat(dispatch): add offer expiry handling
fix(trip): prevent duplicate completion
feat(finance): add withdrawal idempotency
```

Bad:

```text
changes
fix
update
stuff
```

---

# 107. Pull Requests

Pull requests should describe:

```text
what changed
why
business impact
architecture impact
tests
known limitations
```

---

# 108. Code Review

Reviewers should check:

```text
correctness
architecture
security
authorization
concurrency
error handling
tests
observability
UX consistency
performance
```

---

# 109. No Drive-By Refactoring

Do not rewrite unrelated parts of the codebase while implementing a feature unless necessary.

Large unrelated changes make review and debugging harder.

---

# 110. No Mass-Rewrite by AI

AI agents must not rewrite entire modules simply because they prefer another style.

Existing working code should be changed surgically unless a deliberate refactor has been approved.

---

# 111. AI Agent Pre-Implementation Protocol

Before writing code, the AI agent must:

```text
1. Read relevant source-of-truth documents.
2. Identify affected modules.
3. Identify existing implementations.
4. Identify existing reusable components.
5. Check state-machine requirements.
6. Check authorization requirements.
7. Check API contract.
8. Check database model.
9. Check testing requirements.
10. Plan the smallest coherent implementation.
```

---

# 112. AI Agent Repository Inspection

The AI agent must inspect the existing repository before creating new files.

It must answer:

```text
Does this already exist?
Can it be reused?
Does a similar component already exist?
Is there already a service for this?
Is there already a model?
Is there already an API client?
```

---

# 113. AI Agent Duplication Rule

The AI agent must not create:

```text
Button2
TripCardNew
DriverServiceV2
UserHelperFinal
RequirementUtils2
```

merely because it failed to discover the existing implementation.

---

# 114. AI Agent Component Rule

Before creating a UI component:

```text
search existing design-system components
```

before creating a new one.

If an existing component is close but insufficient, extend it only when the extension is genuinely reusable.

---

# 115. AI Agent API Rule

Before creating an endpoint:

```text
search existing API contracts
search existing controller
search existing use case
search existing repository
```

Do not create duplicate endpoints for the same operation.

---

# 116. AI Agent Database Rule

Before adding a table/column:

```text
inspect canonical database model
inspect existing migrations
inspect related domain entities
```

Do not create a database field simply because the frontend needs a value.

---

# 117. AI Agent State Rule

Before changing a status field:

```text
read 12_STATE_MACHINES.md
```

Then verify:

```text
current state
allowed transition
authorization
side effects
transaction requirements
```

---

# 118. AI Agent Financial Rule

Before touching:

```text
payment
earning
wallet
withdrawal
settlement
refund
```

the agent must read:

```text
15_PAYMENTS_AND_LEDGER.md
```

and implement the ledger-safe model.

---

# 119. AI Agent Dispatch Rule

Before modifying:

```text
matching
offers
driver selection
radius
assignment
```

the agent must read:

```text
11_DISPATCH_ENGINE.md
```

---

# 120. AI Agent Security Rule

Before implementing authentication, authorization, uploads, payment integrations, or sensitive data:

```text
13_SECURITY.md
```

must be consulted.

---

# 121. AI Agent UX Rule

Before implementing a screen:

```text
06_SCREEN_SPECIFICATIONS.md
```

must be consulted.

Visual implementation must follow:

```text
04_DESIGN_SYSTEM.md
05_UI_UX_GUIDELINES.md
```

---

# 122. AI Agent No-Fabrication Rule

If a requirement is unspecified:

```text
DO NOT INVENT IT.
```

Instead:

```text
identify missing decision
mark as TBD
ask for clarification when implementation depends on it
```

Examples:

```text
commission percentage
cancellation penalty
dispatch timeout
KYC document list
settlement timing
```

---

# 123. AI Agent No-Fake-Functionality Rule

The agent must never create UI that appears functional when the backend does not support the operation.

Forbidden:

```text
fake payment success
fake driver assignment
fake earnings
fake realtime status
fake map position
fake API response
```

unless explicitly implemented as test/development fixtures and clearly isolated.

---

# 124. AI Agent No-Hardcoded-Data Rule

Production screens must not depend on hardcoded business data.

Bad:

```text
₹12,500 earnings
3 drivers nearby
Trip #AX102
```

as permanent implementation data.

Use API/state models.

---

# 125. AI Agent No-Business-Logic-in-UI Rule

Do not implement:

```text
commission calculation
dispatch selection
authorization decisions
trip state transitions
```

inside Flutter or React components.

---

# 126. AI Agent Change Discipline

Every AI-generated change should answer:

```text
What requirement does this implement?
Which source-of-truth document defines it?
Which modules are affected?
What tests prove it works?
```

---

# 127. AI Agent Compilation Discipline

After modifying code:

```text
format
lint
type-check
test
build affected application
```

where applicable.

An agent must not declare a task complete solely because the code was generated.

---

# 128. AI Agent Error Discipline

If a build/test fails:

```text
read the actual error
identify root cause
make targeted correction
rerun verification
```

Do not repeatedly generate unrelated code hoping the error disappears.

---

# 129. AI Agent Context Discipline

The agent should avoid loading the entire repository unnecessarily.

It should inspect:

```text
relevant documents
relevant module
relevant dependencies
relevant tests
```

then expand context only when necessary.

---

# 130. AI Agent Refactoring Rule

Refactoring should happen when:

```text
duplication is proven
architecture is violated
maintainability is materially impaired
security requires it
```

not merely because the agent prefers a different implementation style.

---

# 131. Performance Standards

Do not optimize blindly.

First identify the actual bottleneck.

Important performance areas include:

```text
database queries
dispatch candidate search
location queries
API latency
realtime event volume
mobile rendering
large admin tables
queue throughput
```

---

# 132. Database Performance

Avoid:

```text
N+1 queries
unbounded queries
missing indexes on high-volume paths
loading entire tables
```

Use:

```text
pagination
indexes
selective fields
appropriate joins
query analysis
```

---

# 133. API Performance

API endpoints should avoid unnecessary work.

Do not return huge datasets when the screen needs:

```text
20 records
```

Use pagination and purpose-specific response shapes.

---

# 134. Location Performance

Location updates are high-volume.

Do not persist every GPS event indefinitely without a retention strategy.

Follow the location architecture in:

```text
09_DATABASE.md
11_DISPATCH_ENGINE.md
14_REALTIME_AND_NOTIFICATIONS.md
```

---

# 135. Realtime Performance

Realtime systems must consider:

```text
event fan-out
payload size
connection count
reconnect storms
duplicate events
backpressure
```

Do not broadcast sensitive events to all connected clients.

---

# 136. Mobile Performance

Flutter screens should avoid unnecessary rebuilds.

Large lists should use efficient list rendering.

Images should be appropriately sized and cached.

---

# 137. Admin Performance

Admin tables must support:

```text
pagination
server-side filtering
server-side sorting
search
```

where dataset size requires it.

Do not load thousands of records into the browser unnecessarily.

---

# 138. Accessibility

Web UI must target WCAG 2.1 AA principles.

Mobile UI must provide:

```text
sufficient touch targets
semantic labels
readable text
clear states
accessible controls
```

---

# 139. Localization Readiness

User-facing strings should not be scattered in deeply nested business logic.

Prepare the system for localization even if V1 launches in one primary language.

---

# 140. Observability

Production functionality should provide enough telemetry to answer:

```text
Did it work?
How long did it take?
Why did it fail?
Which request caused it?
Which user/resource was affected?
```

Follow:

```text
19_OBSERVABILITY.md
```

---

# 141. Feature Flags

Feature flags may be used for controlled rollout.

However, do not allow feature flags to become hidden business logic.

Flags should be:

```text
named
documented
observable
removable
```

---

# 142. Environment Separation

At minimum distinguish:

```text
development
staging
production
```

Data and credentials must not be casually shared across environments.

---

# 143. Production Safety

Production code must assume:

```text
users retry
networks fail
devices disappear
workers restart
providers fail
requests arrive concurrently
data is imperfect
```

The architecture must remain correct under these conditions.

---

# 144. Definition of Done

A code change is considered complete only when:

```text
[ ] Relevant source-of-truth documents reviewed
[ ] Existing implementation inspected
[ ] Architecture boundaries respected
[ ] Authorization implemented
[ ] State transitions validated
[ ] Validation implemented
[ ] Error states handled
[ ] Loading states handled
[ ] Realtime behavior handled where required
[ ] Offline/network behavior considered
[ ] Database changes migrated
[ ] Idempotency considered
[ ] Concurrency considered
[ ] Tests added
[ ] Lint passes
[ ] Type-check passes
[ ] Relevant tests pass
[ ] Build succeeds
[ ] Logs/observability added where appropriate
[ ] No secrets committed
[ ] No fake production functionality
[ ] No unnecessary duplication
[ ] No unexplained TODOs
[ ] Documentation updated if behavior changed
```

---

# 145. Final Engineering Principle

The AdhocX codebase should be:

```text
boring
predictable
typed
tested
observable
secure
modular
```

A good engineer should be able to enter an unfamiliar module and understand:

```text
where the request enters
where authorization happens
where business rules live
where state changes
where data is persisted
where events are emitted
how failures are handled
how the behavior is tested
```

An AI agent must follow the same discipline.

The objective is not:

> **Generate code quickly.**

The objective is:

> **Build a system that remains correct after the AI is no longer in the room.**