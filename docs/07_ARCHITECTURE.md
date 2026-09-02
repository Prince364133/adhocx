# 07 — ARCHITECTURE

**Product:** AdhocX
**Document:** System Architecture
**Status:** Source of Truth
**Version:** V1
**Last Updated:** 2026-09-02

---

# 1. Purpose

This document defines the production architecture for AdhocX V1.

It establishes:

* Application boundaries.
* Backend architecture.
* Frontend architecture.
* Data architecture.
* Realtime architecture.
* Background processing.
* External integrations.
* Storage.
* Authentication boundaries.
* Deployment boundaries.
* Module ownership.
* Communication patterns.
* Reliability principles.
* Scalability principles.

This document does **not** define detailed database schemas, API contracts, or dispatch algorithms. Those are defined in:

```text
09_DATABASE.md
10_API_SPECIFICATION.md
11_DISPATCH_ENGINE.md
```

---

# 2. Architecture Objective

AdhocX V1 must be:

* production-grade
* maintainable
* observable
* testable
* secure
* transactionally correct
* horizontally scalable where required
* simple enough for a small engineering team to operate

The architecture must optimize for **correctness first, simplicity second, scale third**.

Do not introduce infrastructure complexity without a demonstrated requirement.

---

# 3. Architecture Decision

AdhocX V1 will use a:

> **Modular Monolith**

architecture for the backend.

The system is not a microservices architecture.

---

# 4. High-Level Architecture

```text id="4oh8nz"
                     ┌──────────────────────┐
                     │      AdhocX User     │
                     └──────────┬───────────┘
                                │
                ┌───────────────┴────────────────┐
                │                                │
        ┌───────▼────────┐              ┌────────▼────────┐
        │ Flutter Mobile │              │ Next.js Admin   │
        │ Vendor/Driver  │              │ Web Application  │
        └───────┬────────┘              └────────┬────────┘
                │                                │
                └───────────────┬────────────────┘
                                │
                         HTTPS / WebSocket
                                │
                     ┌──────────▼──────────┐
                     │   NestJS Backend    │
                     │  Modular Monolith   │
                     └──────────┬──────────┘
                                │
       ┌────────────────────────┼─────────────────────────┐
       │                        │                         │
┌──────▼──────┐          ┌──────▼──────┐          ┌──────▼──────┐
│ PostgreSQL  │          │    Redis    │          │ Object      │
│ + PostGIS   │          │ Cache/Jobs  │          │ Storage     │
└─────────────┘          └──────┬──────┘          └─────────────┘
                                │
                         ┌──────▼──────┐
                         │   Workers   │
                         │  BullMQ     │
                         └─────────────┘

External Integrations:
├── Maps / Geocoding
├── Push Notifications
├── Payment Provider
├── SMS/OTP Provider
└── Email Provider where required
```

---

# 5. Applications

AdhocX consists of three logical applications.

## 5.1 Flutter Mobile

One mobile application containing:

```text id="v5y7jf"
Vendor Experience
Driver Experience
```

Targets:

* Android
* iOS

The application must not expose unauthorized role functionality.

---

## 5.2 Next.js Admin

Separate web application.

Responsibilities:

* operational dashboard
* marketplace management
* verification
* requirements
* trips
* settlements
* pricing
* reports
* support
* audit

---

## 5.3 NestJS Backend

Single backend deployment initially.

Responsibilities:

* authentication
* authorization
* business logic
* marketplace workflows
* dispatch orchestration
* trip lifecycle
* financial operations
* notifications
* realtime
* administration
* persistence

---

# 6. Backend Architecture

The backend is a modular monolith.

Conceptually:

```text id="5d0zri"
NestJS
│
├── Auth
├── Users
├── Vendors
├── Drivers
├── Vehicles
├── Requirements
├── Dispatch
├── Offers
├── Assignments
├── Trips
├── Locations
├── Notifications
├── Payments
├── Ledger
├── Settlements
├── Pricing
├── Support
├── Reports
└── Audit
```

These are logical modules.

They do not automatically become separate deployable services.

---

# 7. Why Modular Monolith

A microservices architecture would introduce unnecessary complexity for V1:

* distributed transactions
* service discovery
* inter-service authentication
* distributed tracing
* deployment complexity
* operational overhead
* duplicated infrastructure
* harder local development

AdhocX does not need that complexity initially.

A modular monolith provides:

* strong module boundaries
* simpler transactions
* simpler development
* easier testing
* easier deployment
* future extraction paths

---

# 8. Module Independence

Modules should have clear responsibilities.

Example:

```text id="8d4v4y"
Requirements
```

owns requirement lifecycle.

```text id="j2jv8g"
Dispatch
```

owns candidate discovery and offer orchestration.

```text id="n2x5r5"
Trips
```

owns trip execution lifecycle.

The modules should not randomly access each other's internal implementation.

---

# 9. Dependency Direction

Preferred dependency direction:

```text id="oc5n7f"
Presentation
    ↓
Application
    ↓
Domain
    ↓
Infrastructure
```

The domain should not depend directly on:

* HTTP controllers
* Flutter
* Next.js
* Redis
* specific payment providers
* specific notification providers

Infrastructure implements interfaces required by the application/domain.

---

# 10. Backend Module Structure

Recommended conceptual structure:

```text id="w7h3dk"
src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── vendors/
│   ├── drivers/
│   ├── vehicles/
│   ├── requirements/
│   ├── dispatch/
│   ├── offers/
│   ├── assignments/
│   ├── trips/
│   ├── locations/
│   ├── notifications/
│   ├── payments/
│   ├── ledger/
│   ├── settlements/
│   ├── pricing/
│   ├── support/
│   ├── reports/
│   └── audit/
│
├── common/
├── config/
├── database/
└── main.ts
```

Exact folder structure is further defined in `08_FOLDER_STRUCTURE.md`.

---

# 11. Request Flow

A normal HTTP request should conceptually follow:

```text id="e4kz2f"
Client
 ↓
HTTP Controller
 ↓
Authentication
 ↓
Authorization
 ↓
DTO Validation
 ↓
Application Service / Use Case
 ↓
Domain Logic
 ↓
Repository / Infrastructure
 ↓
Database
 ↓
Domain/Event processing where required
 ↓
Response DTO
 ↓
Client
```

Controllers must remain thin.

---

# 12. Controllers

Controllers should:

* receive requests
* validate transport-level input
* authenticate/authorize
* invoke application operations
* map responses

Controllers must not contain:

* complex dispatch algorithms
* financial calculations
* trip state-machine logic
* direct SQL business workflows

---

# 13. Application Services

Application services coordinate business operations.

Examples:

```text id="7qkbrq"
CreateRequirement
AcceptOffer
StartTrip
CompleteTrip
VerifyDriver
ProcessWithdrawal
ApproveVendor
```

They coordinate:

* domain logic
* repositories
* transactions
* events
* external services

---

# 14. Domain Logic

Business rules should live close to the domain they govern.

Examples:

### Requirement

* valid lifecycle transitions
* quantity constraints
* cancellation rules

### Offer

* expiration
* acceptance eligibility
* decline behavior

### Trip

* start conditions
* completion conditions
* cancellation conditions

### Ledger

* financial invariants
* immutable entries

---

# 15. Repository Pattern

Persistence should be accessed through repositories or equivalent data-access abstractions where appropriate.

Example:

```text id="bqf4yp"
RequirementRepository
DriverRepository
TripRepository
OfferRepository
LedgerRepository
```

Business logic should not be tightly coupled to raw ORM calls scattered throughout the application.

---

# 16. PostgreSQL

PostgreSQL is the primary system of record.

It owns authoritative state for:

* users
* vendors
* drivers
* vehicles
* requirements
* offers
* assignments
* trips
* payments
* ledger entries
* settlements
* audit records
* other persistent business entities

---

# 17. PostGIS

PostGIS extends PostgreSQL for geographic operations.

Use it for:

* driver coordinates
* pickup coordinates
* destination coordinates
* radius searches
* proximity calculations
* geographic indexing

The exact geographic query strategy is defined in:

`11_DISPATCH_ENGINE.md`

---

# 18. Database Authority

PostgreSQL is authoritative.

Redis is not the source of truth.

For example:

```text id="ik7w6f"
Redis:
Driver appears available
```

does not override:

```text id="9m5pqm"
PostgreSQL:
Driver is suspended
```

Critical decisions must ultimately respect authoritative database state.

---

# 19. Redis

Redis is used for:

* caching
* short-lived coordination
* rate limiting
* temporary state
* queues
* job coordination
* realtime support where appropriate

Redis must not become an uncontrolled second database.

---

# 20. Background Jobs

Use:

**BullMQ + Redis**

for asynchronous jobs.

Examples:

```text id="15up2t"
Dispatch processing
Offer expiry
Notification delivery
Push retries
Payment reconciliation
Settlement processing
Report generation
Cleanup jobs
```

Jobs must be:

* retryable
* observable
* idempotent where necessary

---

# 21. Worker Architecture

Workers run separately from the API process but use the same backend codebase where practical.

Conceptually:

```text id="6x7nlo"
NestJS API
      │
      ├── PostgreSQL
      └── Redis
             │
             ▼
         BullMQ
             │
       ┌─────┴─────┐
       │           │
   Worker A     Worker B
```

This does not mean workers are separate microservices.

---

# 22. Realtime Architecture

Realtime communication uses:

**WebSockets / Socket.IO**

for appropriate operational events.

Examples:

```text id="0n8t6c"
Requirement updated
Assignment created
Offer received
Trip status changed
Driver location updated
Payment status changed
```

Realtime events are notifications of state changes.

They are not the authoritative source of truth.

---

# 23. Realtime Pattern

Recommended:

```text id="y3f4j8"
Domain operation
      ↓
Database transaction
      ↓
State committed
      ↓
Domain/application event
      ↓
Realtime publisher
      ↓
Connected clients
```

Do not broadcast an event claiming a state change before the database transaction succeeds.

---

# 24. Realtime Rooms

Clients should subscribe only to relevant channels/rooms.

Conceptual examples:

```text id="h3v2p7"
vendor:{vendorId}
driver:{driverId}
requirement:{requirementId}
trip:{tripId}
admin:operations
```

Authorization must be enforced before allowing subscription.

A client must not subscribe to another user's private channel.

---

# 25. Driver Location

Location updates are high-frequency data.

Do not treat every location update as a normal transactional database operation.

The architecture should separate:

```text id="xw5t9j"
Live location stream
```

from:

```text id="8f4a1h"
Authoritative business state
```

Location storage/update frequency should be controlled to avoid unnecessary database load.

Exact location architecture belongs to the dispatch/realtime specifications.

---

# 26. Push Notifications

Push notifications should use:

* Firebase Cloud Messaging for Android
* APNs for iOS

Push should be abstracted behind a notification service.

Conceptually:

```text id="9epz1k"
NotificationService
      │
      ├── FCM
      └── APNs
```

The business domain should not directly call FCM/APNs APIs.

---

# 27. Notification Architecture

A domain event may result in:

```text id="1f9g0v"
Domain Event
 ↓
Notification Handler
 ├── Push
 ├── In-app notification
 └── Realtime event
```

Notification delivery should be asynchronous where practical.

---

# 28. Authentication

Authentication uses OTP-based login for marketplace users according to product requirements.

Authentication responsibilities include:

* OTP request
* OTP verification
* session/token issuance
* session refresh where applicable
* logout/revocation
* rate limiting
* abuse prevention

Exact security implementation is defined in `13_SECURITY.md`.

---

# 29. Authorization

Authorization is centralized.

The system must evaluate:

```text id="l8w0t3"
Identity
+
Role
+
Permission
+
Resource Scope
+
Domain State
```

as defined in `03_USER_ROLES_AND_PERMISSIONS.md`.

---

# 30. API Style

The backend should expose versioned APIs.

Conceptually:

```text id="qpl6o8"
/api/v1/...
```

API contracts are defined in:

`10_API_SPECIFICATION.md`

The architecture must not allow individual developers to invent incompatible API conventions.

---

# 31. API Versioning

V1 APIs must be treated as contracts.

Breaking changes should require:

* explicit version change
* migration strategy
* frontend compatibility consideration

Do not silently break mobile clients.

Mobile applications may remain on older versions after deployment.

---

# 32. Mobile Architecture

Flutter application should use a layered structure.

Conceptually:

```text id="y5o4ll"
Presentation
     ↓
Application
     ↓
Domain
     ↓
Data
     ↓
Infrastructure
```

Possible structure:

```text id="xux3cu"
lib/
├── core/
├── features/
│   ├── auth/
│   ├── vendor/
│   ├── driver/
│   ├── requirements/
│   ├── trips/
│   ├── earnings/
│   └── profile/
├── shared/
└── main.dart
```

Exact structure belongs to `08_FOLDER_STRUCTURE.md`.

---

# 33. Flutter State Management

Use one centralized state-management approach.

The project must not mix several unrelated state-management patterns without a documented reason.

The selected approach must support:

* async state
* loading
* error
* cached data
* realtime updates
* authentication state
* role state

The implementation agent must choose one approved pattern and apply it consistently.

---

# 34. Mobile Data Flow

Conceptually:

```text id="l9r9z4"
Screen
 ↓
Controller / ViewModel
 ↓
Use Case
 ↓
Repository
 ↓
API / Local Storage
```

UI widgets must not directly perform raw HTTP calls.

---

# 35. Mobile Local Storage

Local storage may be used for:

* session information
* safe cached data
* application preferences
* temporary UI state

Sensitive credentials/secrets must use platform-appropriate secure storage.

Exact security requirements belong to `13_SECURITY.md`.

---

# 36. Offline Cache

Cached data must be clearly distinguished from authoritative server state.

Example:

```text id="3v08at"
Cached Trip Details
```

is not equivalent to:

```text id="4x2k1k"
Confirmed Current Trip State
```

Critical actions must be confirmed by the backend.

---

# 37. Admin Architecture

Next.js Admin should be structured by business domains rather than arbitrary page folders.

Conceptually:

```text id="5jv8pr"
app/
├── dashboard/
├── requirements/
├── trips/
├── assignments/
├── drivers/
├── vendors/
├── payments/
├── settlements/
├── pricing/
├── reports/
├── support/
└── audit/
```

Reusable UI components should live separately from domain pages.

---

# 38. Admin Data Fetching

Admin data should be fetched from the backend API.

The Admin frontend must not connect directly to PostgreSQL.

Architecture:

```text id="34ql0b"
Admin
 ↓
Backend API
 ↓
Application layer
 ↓
Database
```

---

# 39. File Storage

Object storage is required for documents such as:

* KYC documents
* vehicle documents
* other approved uploads

Recommended abstraction:

```text id="f53x0l"
ObjectStorage
```

The implementation may use an S3-compatible provider.

The application should not hard-code storage-provider logic throughout the domain.

---

# 40. File Upload Flow

Preferred pattern:

```text id="tq8uw2"
Client
 ↓
Request upload authorization
 ↓
Backend validates permission
 ↓
Signed upload URL
 ↓
Object storage
 ↓
Backend records file metadata
```

Do not route large files unnecessarily through the main API server.

---

# 41. External Services

External dependencies should be abstracted.

Potential integrations:

```text id="jym8h3"
MapsProvider
NotificationProvider
OTPProvider
PaymentProvider
ObjectStorage
```

The business domain should depend on interfaces rather than provider-specific SDK calls.

---

# 42. Maps Integration

Maps functionality may include:

* geocoding
* reverse geocoding
* route/navigation handoff
* distance estimation
* geographic search

Google Maps Platform is the initial recommended integration.

The architecture must isolate provider-specific logic.

---

# 43. Payment Integration

Payment provider integration must be abstracted.

Conceptually:

```text id="2a5h5r"
PaymentService
      ↓
PaymentProvider
```

This allows provider changes without rewriting the financial domain.

Razorpay may be the initial provider where appropriate, but the architecture must not make the entire product dependent on Razorpay-specific concepts.

---

# 44. Financial Authority

Payment provider state is not identical to internal financial state.

The platform must maintain its own financial records.

Conceptually:

```text id="d2x7dz"
Payment Provider
       ↓
Provider Event
       ↓
AdhocX Payment Domain
       ↓
Ledger
       ↓
Settlement
```

The provider is not the source of truth for the internal ledger.

---

# 45. Transactions

Database transactions are required for critical state changes.

Examples:

```text id="8y0w2s"
Accept Offer
Create Assignment
Start Trip
Complete Trip
Financial Posting
Settlement
```

Operations that must remain consistent should not be implemented as unrelated database writes without transaction boundaries.

---

# 46. Concurrency

AdhocX has inherently concurrent operations.

Examples:

```text id="f9x7j3"
Multiple Drivers accept same offer
Multiple workers process same requirement
Offer expires while Driver accepts
Admin modifies status while user acts
Payment callback arrives multiple times
```

The architecture must assume concurrent execution.

Correctness must be guaranteed through:

* database constraints
* transactions
* locking where necessary
* idempotency
* unique constraints
* atomic updates

---

# 47. Idempotency

Critical APIs and jobs should support idempotency where duplicate execution is possible.

Examples:

```text id="8hrxnd"
Accept offer
Start trip
Complete trip
Payment callback
Withdrawal request
Settlement processing
```

Repeated requests should not create duplicate business outcomes.

---

# 48. Event-Driven Internal Communication

Modules may communicate through application/domain events where useful.

Examples:

```text id="y9xq9u"
RequirementCreated
OfferCreated
OfferAccepted
AssignmentCreated
TripStarted
TripCompleted
PaymentUpdated
DriverVerified
VendorApproved
```

Events should represent meaningful domain facts.

Do not create events for every trivial setter.

---

# 49. Event Reliability

Events that are required for correctness must not be lost.

Where necessary, use a reliable event publication pattern such as an outbox mechanism.

Conceptually:

```text id="h5k7td"
Transaction
├── Business State
└── Outbox Event
        ↓
Committed together
        ↓
Publisher
        ↓
Redis / Queue / Realtime
```

The exact implementation belongs to the engineering/realtime documents.

---

# 50. Caching Strategy

Cache only data that benefits from caching.

Good candidates:

* relatively stable configuration
* frequently requested reference data
* safe read-heavy information

Do not cache critical mutable state without a clear invalidation strategy.

Avoid caching:

```text id="x7q2lm"
"driver is definitely available"
```

as an authoritative fact.

---

# 51. Database Connection Management

The backend must use managed connection pooling.

The application must not create uncontrolled database connections per request.

Worker processes must also use controlled connection limits.

---

# 52. Scalability Strategy

V1 should scale vertically first where practical.

When load increases:

```text id="y4s6s5"
API
↓
Horizontal replicas

Workers
↓
Horizontal worker replicas

Database
↓
Vertical scaling → read replicas/advanced strategy if needed

Redis
↓
Managed/scaled deployment
```

Do not prematurely introduce distributed architecture.

---

# 53. Stateless API

The API layer should be as stateless as practical.

Session/authentication state should not depend on a specific API instance.

This allows:

```text id="n6e3e4"
Load Balancer
       ↓
API 1
API 2
API 3
```

without user affinity being required for normal requests.

---

# 54. Deployment Environments

Minimum environments:

```text id="bdc1az"
Development
Staging
Production
```

Development must not accidentally access production resources.

---

# 55. Configuration

Configuration must be environment-specific.

Secrets must not be committed to source control.

Examples:

```text id="b2x0av"
DATABASE_URL
REDIS_URL
JWT_SECRET
OTP_PROVIDER_KEY
MAPS_API_KEY
PAYMENT_PROVIDER_KEY
STORAGE credentials
PUSH credentials
```

Exact secret-management strategy belongs to `18_DEVOPS_AND_DEPLOYMENT.md`.

---

# 56. Logging

Backend must produce structured logs.

Logs should contain useful operational context such as:

```text id="7p6zqv"
timestamp
level
service/module
requestId
userId where appropriate
operation
result
error information
```

Do not log:

* OTP values
* passwords
* payment secrets
* private credentials
* sensitive KYC document contents

---

# 57. Request Correlation

Requests should have a correlation/request ID.

Example:

```text id="v0r1oe"
HTTP Request
requestId = abc123
```

The same ID should be traceable across relevant:

* logs
* jobs
* events
* errors

where practical.

---

# 58. Error Architecture

The backend should use standardized error categories.

Conceptually:

```text id="g8z0a5"
Validation
Authentication
Authorization
Not Found
Conflict
Business Rule
Rate Limit
External Dependency
Internal Error
```

Clients should receive stable error structures.

Do not expose stack traces in production responses.

---

# 59. Health Checks

The backend should expose health/readiness mechanisms.

At minimum distinguish:

```text id="0x9jcr"
Liveness
Readiness
```

Readiness should account for required infrastructure dependencies.

---

# 60. Graceful Shutdown

API and workers must handle graceful shutdown.

On shutdown:

* stop accepting new work
* finish safe in-flight work where practical
* close database connections
* close Redis connections
* disconnect realtime infrastructure
* stop workers cleanly

---

# 61. Security Boundary

The architecture must enforce:

```text id="syj6wz"
Client
↓
Authentication
↓
Authorization
↓
Business Logic
↓
Database
```

Never rely on:

* frontend restrictions
* hidden fields
* obscured routes
* client-generated roles
* client-side validation alone

Security details are defined in `13_SECURITY.md`.

---

# 62. Admin Isolation

Admin APIs should be clearly separated from marketplace APIs logically.

For example:

```text id="t3g7j4"
/api/v1/vendor/...
/api/v1/driver/...
/api/v1/admin/...
```

The exact endpoint structure is defined in `10_API_SPECIFICATION.md`.

Admin access must always require explicit administrative permissions.

---

# 63. Audit Architecture

Sensitive administrative mutations must generate audit records.

Architecture:

```text id="9b5k3j"
Admin Action
 ↓
Authorization
 ↓
Business Operation
 ↓
Transaction
 ├── State Change
 └── Audit Event
```

Audit records should remain traceable even when the operation involves asynchronous work.

---

# 64. Observability

The system must eventually provide:

```text id="x0k1e9"
Logs
Metrics
Traces
Alerts
```

Operationally important metrics include:

* assignment latency
* fulfillment rate
* offer acceptance rate
* cancellation rate
* trip completion
* API latency
* error rate
* job failures
* notification failures
* payment failures

Detailed observability requirements are defined in `19_OBSERVABILITY.md`.

---

# 65. Testing Architecture

Architecture must support testing at multiple levels:

```text id="m3f8d2"
Unit Tests
Integration Tests
API Tests
Database Tests
Dispatch Tests
End-to-End Tests
```

The modular monolith should make domain logic testable without requiring the entire infrastructure stack for every unit test.

Detailed strategy belongs to `17_TESTING_STRATEGY.md`.

---

# 66. Monorepo

The recommended repository structure is a monorepo.

Conceptually:

```text id="w7v5kk"
adhocx/
├── apps/
│   ├── mobile/
│   ├── admin/
│   └── api/
│
├── packages/
│   ├── contracts/
│   ├── config/
│   └── tooling/
│
├── docs/
└── infrastructure/
```

The exact structure is finalized in:

`08_FOLDER_STRUCTURE.md`

---

# 67. Contract Sharing

Where practical, shared API contracts/types may be generated or maintained centrally.

However:

**Do not force Flutter/Dart and TypeScript into artificial code sharing.**

The mobile application remains Dart.

The Admin and backend remain TypeScript.

The important shared artifact is the **API contract**, not identical source code.

---

# 68. API Contract Flow

Preferred:

```text id="4x6m4z"
Backend API Contract
        ↓
Generated/validated client models
        ↓
Flutter client
        +
Next.js client
```

This reduces frontend/backend contract drift.

---

# 69. Domain Ownership

Each module owns its business state.

Examples:

| Domain        | Owner         |
| ------------- | ------------- |
| User identity | Users/Auth    |
| Vendor        | Vendors       |
| Driver        | Drivers       |
| Vehicle       | Vehicles      |
| Requirement   | Requirements  |
| Dispatch      | Dispatch      |
| Offer         | Offers        |
| Assignment    | Assignments   |
| Trip          | Trips         |
| Payment       | Payments      |
| Ledger        | Ledger        |
| Settlement    | Settlements   |
| Notification  | Notifications |
| Audit         | Audit         |

Cross-module operations should use defined application interfaces/events rather than arbitrary internal access.

---

# 70. Critical Workflow Architecture

The core workflow:

```text id="3h1c3n"
Vendor
  ↓
Create Requirement
  ↓
Requirement Module
  ↓
Dispatch Module
  ↓
Candidate Discovery
  ↓
Offer Module
  ↓
Driver
  ↓
Accept
  ↓
Assignment Module
  ↓
Trip Module
  ↓
OTP Start
  ↓
Trip Execution
  ↓
Completion
  ↓
Payment/Ledger
  ↓
Settlement
```

Each step must preserve transactional and state-machine correctness.

---

# 71. Dispatch Boundary

The Dispatch Engine is a distinct domain module.

It should own:

* candidate discovery
* eligibility evaluation
* ranking
* dispatch waves
* offer orchestration
* retry/expansion logic

It should not own:

* user authentication
* payment ledger
* UI
* notification provider implementation

Detailed dispatch behavior belongs to:

`11_DISPATCH_ENGINE.md`

---

# 72. Trip Boundary

Trip module owns:

* trip lifecycle
* trip state
* operational events
* start conditions
* completion conditions

It may consume:

* assignment information
* location information
* OTP verification

It should not directly implement:

* payment provider logic
* KYC verification
* dispatch ranking

---

# 73. Financial Boundary

Financial modules own:

```text id="c1py10"
Payments
Ledger
Settlements
Pricing
```

Financial operations must not be scattered across Requirements or Trips modules.

A Trip may emit a business event such as:

```text id="6asw30"
TripCompleted
```

The financial subsystem determines the resulting financial operation.

---

# 74. Notification Boundary

Business modules emit meaningful events.

Notification module decides:

* who should receive notification
* channel
* template
* delivery
* retry

Do not embed notification provider calls inside every business service.

---

# 75. External Dependency Failure

The system must assume external services can fail.

Examples:

```text id="u8i3t7"
Maps unavailable
Payment provider unavailable
OTP provider unavailable
Push provider unavailable
Object storage unavailable
```

Business state must remain internally consistent.

External failure handling must not corrupt domain state.

---

# 76. Integration Timeout Rules

External API calls must have:

* timeouts
* controlled retries where safe
* failure classification
* observability

Do not allow external requests to block application workers indefinitely.

---

# 77. Retry Rules

Retries must only occur where the operation is safe.

Good candidates:

```text id="zj7v54"
Push notification
Transient external API request
Background report generation
```

Dangerous without idempotency:

```text id="c5b5yy"
Financial posting
Withdrawal
Assignment creation
Trip completion
```

Critical retries require idempotency.

---

# 78. Data Consistency Priority

AdhocX prioritizes:

```text id="w9q4k4"
Correctness
>
Availability of stale information
>
Convenience
```

For example, it is better to temporarily show:

```text id="9kr6gn"
Updating...
```

than falsely tell a Driver:

```text id="6v03bq"
Trip accepted
```

when acceptance has not been confirmed.

---

# 79. Architecture Anti-Patterns

The AI agent must NOT introduce:

### Microservices without explicit approval

Do not split modules into independent services simply because they have different folders.

### Direct database access from frontend

Never.

### Business logic in controllers

Avoid.

### Business logic in UI widgets/components

Never.

### Redis as authoritative state

Never.

### Payment logic scattered through trip code

Never.

### Hard-coded provider SDK calls throughout domain logic

Never.

### Unbounded background jobs

Never.

### Hidden cross-module database mutations

Never.

### Client-controlled authorization

Never.

---

# 80. Architecture Evolution

The modular monolith must be designed so individual modules can eventually be extracted if scale justifies it.

Potential future extraction candidates:

```text id="s8s6ay"
Dispatch
Notifications
Payments
Location Processing
Reports
```

But extraction is a future optimization, not a V1 requirement.

---

# 81. Scaling Trigger Principle

A module should only be extracted when there is evidence such as:

* independent scaling requirement
* deployment isolation requirement
* team ownership boundary
* infrastructure bottleneck
* failure isolation requirement
* clearly defined service contract

Do not introduce microservices because they are architecturally fashionable.

---

# 82. Architecture Decision Summary

| Concern            | V1 Decision                          |
| ------------------ | ------------------------------------ |
| Mobile             | Flutter + Dart                       |
| Admin              | Next.js + TypeScript                 |
| Backend            | NestJS + TypeScript                  |
| Architecture       | Modular Monolith                     |
| Database           | PostgreSQL                           |
| Geographic data    | PostGIS                              |
| Cache/coordination | Redis                                |
| Background jobs    | BullMQ                               |
| Realtime           | WebSockets / Socket.IO               |
| Push               | FCM + APNs                           |
| Object storage     | S3-compatible                        |
| Maps               | Google Maps Platform initially       |
| Payments           | Provider abstraction                 |
| API                | Versioned HTTP API                   |
| Repository         | Monorepo                             |
| Deployment         | Containerized/managed infrastructure |
| Source of truth    | PostgreSQL                           |

---

# 83. Architecture Source-of-Truth Rules

The AI agent MUST follow these rules:

1. Do not introduce microservices for V1.
2. Keep the backend modular.
3. PostgreSQL is the authoritative persistent state.
4. Redis is not authoritative business state.
5. Critical mutations require transactional correctness.
6. Critical operations must account for concurrency.
7. Use idempotency where duplicate execution is possible.
8. Controllers remain thin.
9. Business logic belongs in application/domain layers.
10. Frontends never access PostgreSQL directly.
11. Provider-specific integrations must be abstracted.
12. Realtime events must follow committed state changes.
13. Background jobs must be observable and retry-safe.
14. Do not scatter financial logic across unrelated modules.
15. Do not scatter notification-provider calls across business logic.
16. Do not invent architecture that conflicts with this document.
17. If a new infrastructure dependency is proposed, document why existing infrastructure cannot satisfy the requirement.
18. Prefer the simplest architecture that preserves correctness.

---

# 84. Final Architecture Principle

AdhocX V1 should be architected as:

```text id="7f6v4m"
One Product
      ↓
Clear Domain Modules
      ↓
One Backend
      ↓
One Source of Truth
      ↓
Explicit State Machines
      ↓
Transactional Operations
      ↓
Async Processing Where Needed
      ↓
Realtime Communication
      ↓
Observable Production System
```

The objective is not to build the most complicated architecture possible.

The objective is to build an architecture that can reliably execute:

> **Requirement → Dispatch → Assignment → Trip → Completion → Settlement**

at production quality, while remaining understandable enough for the engineering team to evolve.

That is the architectural standard for AdhocX V1.