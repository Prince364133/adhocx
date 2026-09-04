# 08 — FOLDER STRUCTURE

**Product:** AdhocX
**Document:** Repository & Folder Structure
**Status:** Source of Truth
**Version:** V1
**Last Updated:** 2026-09-02

---

# 1. Purpose

This document defines the canonical repository structure for AdhocX V1.

It establishes:

* Monorepo organization.
* Application boundaries.
* Backend module structure.
* Flutter feature structure.
* Next.js Admin structure.
* Shared package boundaries.
* Test locations.
* Documentation locations.
* Infrastructure locations.
* Naming conventions.
* Dependency boundaries.

The purpose is to prevent:

* random folder creation
* duplicated utilities
* business logic in UI
* API logic inside screens
* cross-module coupling
* giant generic folders
* uncontrolled shared code
* AI-generated spaghetti architecture

---

# 2. Repository Architecture

AdhocX uses a monorepo.

Canonical top-level structure:

```text id="3c4v8m"
adhocx/
│
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
│
├── infrastructure/
│
├── scripts/
│
├── .github/
│
├── .gitignore
├── README.md
└── package/workspace configuration
```

---

# 3. Top-Level Responsibilities

| Directory            | Responsibility                                |
| -------------------- | --------------------------------------------- |
| `apps/mobile`        | Flutter User + Driver application           |
| `apps/admin`         | Next.js Admin application                     |
| `apps/api`           | NestJS backend                                |
| `packages/contracts` | Shared API contracts/schema artifacts         |
| `packages/config`    | Shared non-domain configuration               |
| `packages/tooling`   | Repository development tooling                |
| `docs`               | Product/engineering source-of-truth documents |
| `infrastructure`     | Deployment/infrastructure configuration       |
| `scripts`            | Repository automation scripts                 |
| `.github`            | CI/CD and GitHub configuration                |

---

# 4. Critical Boundary

The repository must preserve this boundary:

```text id="5j3q9e"
Mobile
   ↓
API
   ↓
Domain
   ↓
Database

Admin
   ↓
API
   ↓
Domain
   ↓
Database
```

Neither frontend application may directly access:

* PostgreSQL
* Redis
* internal backend modules
* backend repositories
* backend domain classes

---

# 5. Mobile Application

Location:

```text id="m8m5br"
apps/mobile/
```

Technology:

**Flutter + Dart**

One application contains:

```text id="p7x2dc"
User
Driver
Shared Mobile Infrastructure
```

---

# 6. Flutter Structure

Canonical structure:

```text id="j5x2pw"
apps/mobile/
│
├── android/
├── ios/
├── assets/
│   ├── icons/
│   ├── images/
│   └── fonts/
│
├── lib/
│   ├── core/
│   ├── features/
│   ├── shared/
│   └── main.dart
│
├── test/
├── integration_test/
├── pubspec.yaml
└── README.md
```

---

# 7. Flutter Core

```text id="r7c8kh"
lib/core/
├── config/
├── constants/
├── errors/
├── networking/
├── storage/
├── authentication/
├── authorization/
├── routing/
├── realtime/
├── notifications/
├── location/
├── permissions/
├── theme/
├── design_system/
├── utils/
└── extensions/
```

---

# 8. Core Responsibility Rules

`core/` contains infrastructure and cross-cutting concerns.

It must NOT become:

```text id="y0q4x1"
core/
└── everything.dart
```

Business logic belonging to a feature must remain inside that feature.

---

# 9. Flutter Features

Canonical feature structure:

```text id="b9q4h6"
lib/features/
├── auth/
├── user/
├── driver/
├── requirements/
├── offers/
├── assignments/
├── trips/
├── earnings/
├── payments/
└── profile/
```

Features should be organized by business capability rather than individual UI screens.

---

# 10. Feature Structure

A feature may follow:

```text id="t7g1x2"
feature/
├── data/
│   ├── datasources/
│   ├── models/
│   └── repositories/
│
├── domain/
│   ├── entities/
│   ├── repositories/
│   └── usecases/
│
└── presentation/
    ├── controllers/
    ├── pages/
    ├── widgets/
    └── state/
```

Not every feature needs every directory.

Do not create empty architectural folders merely to satisfy a template.

---

# 11. Flutter Data Layer

The data layer handles:

* API communication
* DTO/model conversion
* local persistence
* repository implementations

Example:

```text id="6g3gk5"
features/trips/data/
├── datasources/
│   ├── trips_remote_datasource.dart
│   └── trips_local_datasource.dart
│
├── models/
│   ├── trip_model.dart
│   └── trip_event_model.dart
│
└── repositories/
    └── trips_repository_impl.dart
```

---

# 12. Flutter Domain Layer

Domain contains business-facing abstractions.

Example:

```text id="eq1j3q"
features/trips/domain/
├── entities/
│   ├── trip.dart
│   └── trip_event.dart
│
├── repositories/
│   └── trips_repository.dart
│
└── usecases/
    ├── get_trip.dart
    ├── start_trip.dart
    └── complete_trip.dart
```

The domain layer must not depend on Flutter widgets.

---

# 13. Flutter Presentation Layer

Presentation contains:

* screens/pages
* widgets
* controllers/view models
* UI state

Example:

```text id="v2c0w5"
features/trips/presentation/
├── controllers/
│   └── trip_controller.dart
│
├── pages/
│   ├── trip_list_page.dart
│   ├── trip_details_page.dart
│   └── active_trip_page.dart
│
├── state/
│   └── trip_state.dart
│
└── widgets/
    ├── trip_card.dart
    ├── trip_status.dart
    └── trip_timeline.dart
```

---

# 14. User Feature Organization

User-specific workflows may live under:

```text id="v2k4s1"
features/user/
├── dashboard/
├── onboarding/
├── requirements/
├── trips/
├── payments/
└── profile/
```

If a feature is genuinely shared with Driver, it should not be duplicated.

---

# 15. Driver Feature Organization

Driver-specific workflows may live under:

```text id="w8q5dj"
features/driver/
├── dashboard/
├── onboarding/
├── kyc/
├── vehicle/
├── availability/
├── opportunities/
├── trips/
├── earnings/
└── profile/
```

---

# 16. Shared Mobile Components

Shared components belong under:

```text id="4j9n7b"
lib/shared/
├── widgets/
├── components/
├── models/
├── services/
└── helpers/
```

However:

> `shared/` is not a dumping ground.

A component should be placed there only when it is genuinely reusable across multiple features.

---

# 17. Design System Location

Central mobile design implementation belongs under:

```text id="0g6k5x"
lib/core/design_system/
```

Potential structure:

```text id="9v7p2d"
design_system/
├── tokens/
│   ├── colors.dart
│   ├── spacing.dart
│   ├── typography.dart
│   ├── radius.dart
│   └── elevation.dart
│
├── components/
│   ├── buttons/
│   ├── inputs/
│   ├── cards/
│   ├── badges/
│   ├── dialogs/
│   ├── sheets/
│   └── feedback/
│
└── theme/
```

This must implement `04_DESIGN_SYSTEM.md`.

---

# 18. Admin Application

Location:

```text id="u9c3a8"
apps/admin/
```

Technology:

**Next.js + TypeScript**

Canonical structure:

```text id="5d0y0e"
apps/admin/
├── app/
├── components/
├── features/
├── lib/
├── hooks/
├── styles/
├── public/
├── tests/
├── next.config.*
├── package.json
└── README.md
```

---

# 19. Admin App Router

The Next.js `app/` directory should primarily represent routing and page composition.

Example:

```text id="0zq2r8"
app/
├── login/
├── dashboard/
│
├── requirements/
│   ├── page.tsx
│   └── [id]/
│       └── page.tsx
│
├── trips/
│   ├── page.tsx
│   └── [id]/
│       └── page.tsx
│
├── drivers/
│   ├── page.tsx
│   └── [id]/
│       └── page.tsx
│
├── users/
│   ├── page.tsx
│   └── [id]/
│       └── page.tsx
│
├── payments/
├── settlements/
├── pricing/
├── reports/
├── support/
├── audit/
│
├── layout.tsx
└── page.tsx
```

---

# 20. Admin Components

Global reusable UI components:

```text id="j3j8cd"
components/
├── ui/
├── layout/
├── navigation/
├── tables/
├── forms/
├── feedback/
└── maps/
```

These components implement the centralized design system.

---

# 21. Admin Domain Components

Business-specific reusable components belong under:

```text id="r3g8a1"
features/
├── requirements/
├── trips/
├── drivers/
├── users/
├── payments/
├── settlements/
├── pricing/
└── reports/
```

Example:

```text id="f8r2p7"
features/drivers/
├── components/
│   ├── driver-status-badge.tsx
│   ├── driver-verification-panel.tsx
│   └── driver-summary.tsx
│
├── hooks/
├── api/
├── types/
└── utils/
```

---

# 22. Admin API Client

All backend communication must go through a centralized API client layer.

Example:

```text id="0u8t9a"
lib/api/
├── client.ts
├── errors.ts
├── auth.ts
└── interceptors.ts
```

Feature-specific API calls should remain near their feature where practical.

Example:

```text id="y8r5p3"
features/trips/api/
├── get-trips.ts
├── get-trip.ts
└── trip-actions.ts
```

---

# 23. Admin State Management

Application state must not be scattered through arbitrary React components.

The chosen state/data-fetching architecture must have clear ownership for:

* server state
* authentication
* UI state
* filters
* pagination
* realtime state

Do not introduce multiple state-management libraries without explicit architectural justification.

---

# 24. Backend Application

Location:

```text id="9p4w6x"
apps/api/
```

Technology:

**NestJS + TypeScript**

Canonical structure:

```text id="y4t1z0"
apps/api/
├── src/
├── test/
├── prisma/
│   or database/
├── scripts/
├── package.json
└── README.md
```

The exact ORM/database tooling can be finalized in implementation architecture, but it must not violate the database ownership rules.

---

# 25. Backend Source Structure

```text id="e2g9x7"
src/
├── modules/
├── common/
├── config/
├── database/
├── infrastructure/
├── workers/
├── app.module.ts
└── main.ts
```

---

# 26. Backend Modules

Canonical modules:

```text id="k6x3p1"
modules/
├── auth/
├── users/
├── users/
├── drivers/
├── vehicles/
├── requirements/
├── dispatch/
├── offers/
├── assignments/
├── trips/
├── locations/
├── notifications/
├── payments/
├── ledger/
├── settlements/
├── pricing/
├── support/
├── reports/
└── audit/
```

---

# 27. Backend Module Structure

Each module should generally follow:

```text id="r4h2v7"
module/
├── application/
├── domain/
├── infrastructure/
├── presentation/
└── module.ts
```

Example:

```text id="f4q9w2"
requirements/
├── application/
│   ├── commands/
│   ├── queries/
│   └── services/
│
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── events/
│   └── repositories/
│
├── infrastructure/
│   ├── persistence/
│   └── integrations/
│
├── presentation/
│   ├── controllers/
│   └── dto/
│
└── requirements.module.ts
```

Not every module needs every subdirectory.

---

# 28. Backend Presentation Layer

Contains:

* controllers
* request DTOs
* response DTOs
* transport-specific validation

Example:

```text id="q8t2r6"
presentation/
├── controllers/
└── dto/
```

Controllers must remain thin.

---

# 29. Backend Application Layer

Contains:

* use cases
* commands
* queries
* application services
* orchestration

Example:

```text id="c3k8p4"
application/
├── commands/
├── queries/
└── services/
```

This layer coordinates domain operations.

---

# 30. Backend Domain Layer

Contains:

* entities
* value objects
* domain services
* domain events
* repository interfaces
* business invariants

Example:

```text id="r9x2v5"
domain/
├── entities/
├── value-objects/
├── services/
├── events/
└── repositories/
```

Domain code must not import NestJS controllers or provider SDKs.

---

# 31. Backend Infrastructure Layer

Contains implementations of external/persistence concerns.

Example:

```text id="f5w7k2"
infrastructure/
├── persistence/
├── cache/
├── messaging/
├── notifications/
├── payments/
├── maps/
├── storage/
└── otp/
```

Provider-specific implementations belong here.

---

# 32. Backend Common

`common/` contains truly cross-cutting infrastructure.

Possible structure:

```text id="k5v3r1"
common/
├── errors/
├── logging/
├── guards/
├── interceptors/
├── decorators/
├── validation/
├── pagination/
└── types/
```

Do not put business entities into `common/`.

---

# 33. Backend Configuration

```text id="e6p4z8"
config/
├── app.config.ts
├── database.config.ts
├── redis.config.ts
├── auth.config.ts
├── storage.config.ts
└── integrations.config.ts
```

Configuration must come from environment/configuration mechanisms.

Secrets must not be committed.

---

# 34. Database Directory

Database-specific code belongs under:

```text id="v5c7m1"
database/
├── migrations/
├── seeds/
├── factories/
└── database.module.ts
```

Exact ORM conventions may modify this structure, but migrations must remain version-controlled.

---

# 35. Workers

Background jobs belong under:

```text id="t8r4q3"
workers/
├── dispatch/
├── notifications/
├── payments/
├── settlements/
├── reports/
└── cleanup/
```

Workers must invoke application/domain operations rather than duplicating business logic.

---

# 36. Worker Rule

Bad:

```text id="2z5j9a"
Worker
 └── contains its own trip completion logic
```

Good:

```text id="8q3w6v"
Worker
 ↓
Application Use Case
 ↓
Domain
```

There must be one authoritative implementation of a business operation.

---

# 37. Shared Contracts

Location:

```text id="m6x8r2"
packages/contracts/
```

Purpose:

* API schemas
* generated types where appropriate
* shared protocol definitions
* event contract definitions

Do not put business logic here.

---

# 38. Contract Rule

Shared contracts should describe communication.

Example:

```text id="k3v9w1"
TripResponse
CreateRequirementRequest
AcceptOfferRequest
```

They should not contain:

```text id="c7x2m5"
TripService
RequirementService
DatabaseRepository
```

---

# 39. Shared Configuration

Location:

```text id="h8q2w5"
packages/config/
```

May contain:

* lint configuration
* formatting configuration
* shared TypeScript configuration
* repository-wide constants that are genuinely non-domain-specific

Do not put secrets here.

---

# 40. Tooling Package

Location:

```text id="r3w7k1"
packages/tooling/
```

Potential contents:

```text id="7k2m9x"
eslint
prettier
scripts
code generation
testing utilities
```

Tooling must not contain production business logic.

---

# 41. Documentation

All authoritative project documents belong under:

```text id="d5v8p2"
docs/
```

Canonical structure:

```text id="q7x3m9"
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

These documents are the project source of truth.

---

# 42. Infrastructure

Infrastructure configuration belongs under:

```text id="v6x1n8"
infrastructure/
├── docker/
├── environments/
├── deployment/
├── database/
├── redis/
└── monitoring/
```

The exact cloud-provider implementation may evolve.

The repository structure should not embed unnecessary provider-specific assumptions.

---

# 43. Scripts

Repository automation belongs under:

```text id="m8r3q7"
scripts/
├── setup/
├── database/
├── codegen/
├── testing/
└── deployment/
```

Scripts should have clear names and documented purpose.

---

# 44. Testing Structure

Tests should live close to the code they validate where practical.

Additionally:

```text id="p6w4x9"
apps/
├── mobile/
│   ├── test/
│   └── integration_test/
│
├── admin/
│   └── tests/
│
└── api/
    ├── test/
    └── ...
```

System-level end-to-end tests may live under:

```text id="z8c5m2"
tests/
└── e2e/
```

if a centralized E2E suite is required.

---

# 45. Test Naming

Test names should describe behavior.

Bad:

```text id="b7m4x1"
test1
test2
works
```

Good:

```text id="p2x8r4"
should reject expired trip offer
should not allow second driver to claim occupied slot
should start trip only with valid OTP
```

---

# 46. Assets

Do not scatter assets throughout feature folders unless they are genuinely feature-specific.

Global mobile assets:

```text id="q3v8k2"
apps/mobile/assets/
```

Global Admin assets:

```text id="j6x4p1"
apps/admin/public/
```

---

# 47. Naming Conventions

## TypeScript

Use:

```text id="n5r2q7"
camelCase
PascalCase for classes/components/types
kebab-case for filenames where project convention allows
```

Examples:

```text id="y7m4p2"
trip.service.ts
trip.controller.ts
TripDetails.tsx
```

The project must select one filename convention and apply it consistently.

---

# 48. Dart Naming

Follow standard Dart conventions.

Examples:

```text id="c5x9r2"
trip_details_page.dart
trip_controller.dart
trip_repository.dart
```

Classes:

```text id="w3m7k1"
TripDetailsPage
TripController
TripRepository
```

---

# 49. No Generic Dump Folders

Avoid folders such as:

```text id="f6x2v8"
misc/
stuff/
temp/
helpers/
random/
common2/
new/
old/
```

If code does not have a clear ownership boundary, determine where it belongs before adding it.

---

# 50. Utilities Rule

A utility must have a clear purpose.

Bad:

```text id="r7x3k9"
utils/
└── everything.ts
```

Good:

```text id="m4v8q2"
date-format.ts
currency-format.ts
phone-format.ts
```

Domain-specific logic should not become generic utilities.

---

# 51. Shared Folder Rule

Before putting code into `shared/` or `common/`, ask:

> Is this genuinely shared by multiple independent features?

If not, keep it inside the owning feature/module.

This prevents premature abstraction.

---

# 52. Dependency Direction

The folder structure must reinforce this architecture:

```text id="s6p4w8"
Presentation
      ↓
Application
      ↓
Domain
      ↓
Infrastructure
```

Dependencies must not point upward randomly.

For example:

```text id="g8m2r5"
Domain → Flutter UI
```

is forbidden.

```text id="v4x7q1"
Domain → Next.js
```

is forbidden.

```text id="c9k3w6"
Domain → Payment SDK
```

is forbidden.

---

# 53. Cross-Module Dependency Rule

A module may depend on another module's public application/domain contract.

It must not reach directly into another module's private implementation.

Bad:

```text id="m7x2q8"
Dispatch
→ imports
Trips/internal/database.ts
```

Better:

```text id="p5r9k4"
Dispatch
→ Trip application interface
```

or a domain/application event.

---

# 54. Database Access Rule

Only backend infrastructure/database layers may access the database.

Forbidden:

```text id="q3m8x5"
Flutter → PostgreSQL
Admin → PostgreSQL
Controller → raw unrestricted SQL
```

The database boundary belongs to the API/backend.

---

# 55. Environment Files

Local environment files may exist where appropriate:

```text id="w5k2r7"
.env.local
.env.development
.env.test
```

But:

* secrets must not be committed
* production secrets must be managed externally
* `.env.example` should document required variables without real credentials

---

# 56. Generated Files

Generated code must be clearly identifiable and reproducible.

Do not manually modify generated files unless explicitly required by the generation system.

Recommended:

```text id="a8x4m1"
generated/
```

or tool-specific conventions.

---

# 57. Build Artifacts

Do not commit:

* build outputs
* temporary files
* local caches
* IDE state
* dependency directories

Examples:

```text id="h7m2q5"
node_modules/
build/
dist/
.dart_tool/
coverage/
```

unless a specific deployment workflow requires otherwise.

---

# 58. Documentation Change Rule

When architecture changes, update the relevant source-of-truth document.

For example:

```text id="n2w7x4"
New module
→ Update 07_ARCHITECTURE.md
→ Update 08_FOLDER_STRUCTURE.md
→ Update relevant API/database docs
```

Do not silently change architecture through code.

---

# 59. New Module Rule

Before creating a new backend module, the AI agent must answer:

1. What business responsibility does it own?
2. Why does an existing module not own it?
3. What data does it own?
4. What APIs does it expose?
5. What other modules depend on it?
6. Does it require its own state machine?
7. Does the architecture document need updating?

If these cannot be answered, do not create the module.

---

# 60. New Package Rule

Do not create a new shared package simply to move a few files around.

A package should exist because it has a clear independent responsibility.

---

# 61. New Folder Rule

Before creating a new top-level folder, determine whether an existing folder already owns the responsibility.

AI agents must prefer:

```text id="q6x9m3"
existing structure
```

over:

```text id="v3k8p2"
invented structure
```

---

# 62. Feature Ownership

Every significant piece of business logic must have one owner.

Example:

```text id="g4m8x1"
Trip acceptance
→ Offers / Assignments domain

Trip execution
→ Trips domain

Driver verification
→ Drivers domain

Financial posting
→ Ledger domain
```

Do not implement the same business rule in multiple modules.

---

# 63. Screen Ownership

Every screen should belong to a feature.

Bad:

```text id="b8x3m6"
pages/
├── random_screen.dart
├── trip_page.dart
├── another_trip_page.dart
```

Good:

```text id="r4k9x2"
features/trips/presentation/pages/
├── trip_list_page.dart
├── trip_details_page.dart
└── active_trip_page.dart
```

---

# 64. Component Ownership

A component should live at the narrowest appropriate scope.

Hierarchy:

```text id="c6x1m8"
Screen-specific
↓
Feature-specific
↓
Domain-shared
↓
Global design-system
```

Do not promote everything to global shared components prematurely.

---

# 65. API Ownership

Backend endpoints should belong to the domain module that owns the resource.

Examples:

```text id="m9x4q7"
Requirement endpoints
→ Requirements module

Trip endpoints
→ Trips module

Driver verification
→ Drivers module

Settlement endpoints
→ Settlements module
```

---

# 66. Worker Ownership

Background jobs should belong to the module responsible for the business operation.

Examples:

```text id="w3q8k5"
Offer expiry
→ Offers/Dispatch

Settlement processing
→ Settlements

Notification delivery
→ Notifications

Report generation
→ Reports
```

---

# 67. Avoid Duplicate Models

Do not create multiple competing definitions of the same domain concept.

Bad:

```text id="z4m8q2"
Trip
TripModel
TripData
TripEntity
TripRecord
TripObject
```

unless each has a clear architectural purpose.

If multiple representations are required, their transformation must be explicit.

---

# 68. Domain Entity vs DTO

Keep these concepts separate.

### Domain Entity

Represents business behavior/state.

### DTO

Represents transport/API data.

Example:

```text id="p7k3x5"
HTTP Request
→ DTO
→ Application
→ Domain Entity
```

Do not make HTTP DTOs the domain model by default.

---

# 69. Folder Structure and AI Development

The AI agent must use this structure as a constraint.

When implementing a feature:

```text id="x4m7q9"
Read source-of-truth docs
↓
Identify owning domain
↓
Identify application
↓
Identify layer
↓
Check existing component/service
↓
Implement inside existing structure
↓
Add tests
↓
Update documentation if architecture changed
```

---

# 70. AI Agent Forbidden Folder Behaviors

The AI agent MUST NOT:

1. Create duplicate modules.
2. Create random top-level folders.
3. Put business logic in `utils`.
4. Put business logic in UI components.
5. Put database queries inside Flutter.
6. Put database queries inside Next.js.
7. Put domain logic in controllers.
8. Put provider SDK calls in domain entities.
9. Duplicate existing components.
10. Create multiple competing API clients.
11. Create multiple competing state-management systems.
12. Create arbitrary "helpers" to bypass architecture.
13. Move code merely to make an import compile without understanding ownership.
14. Create a new abstraction for every trivial function.
15. Turn `common`, `shared`, or `utils` into dumping grounds.

---

# 71. Repository Dependency Diagram

Canonical dependency direction:

```text id="y6r4p8"
                    ┌───────────────┐
                    │     Docs      │
                    └───────┬───────┘
                            │
                      Architecture
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
     Flutter Mobile     Next.js Admin    NestJS API
          │                 │                 │
          └─────────────────┴────────┬────────┘
                                     │
                              Shared Contracts
                                     │
                              Backend Modules
                                     │
                          ┌──────────┴──────────┐
                          │                     │
                     PostgreSQL              Redis
                          │                     │
                          └──────────┬──────────┘
                                     │
                              External Services
```

The frontend applications communicate with the backend—not with infrastructure directly.

---

# 72. Canonical Repository Tree

The V1 repository should ultimately resemble:

```text id="d3x8m1"
adhocx/
│
├── apps/
│   │
│   ├── mobile/
│   │   ├── android/
│   │   ├── ios/
│   │   ├── assets/
│   │   ├── lib/
│   │   │   ├── core/
│   │   │   ├── features/
│   │   │   ├── shared/
│   │   │   └── main.dart
│   │   ├── test/
│   │   ├── integration_test/
│   │   ├── pubspec.yaml
│   │   └── README.md
│   │
│   ├── admin/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── public/
│   │   ├── styles/
│   │   ├── tests/
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── api/
│       ├── src/
│       │   ├── modules/
│       │   ├── common/
│       │   ├── config/
│       │   ├── database/
│       │   ├── infrastructure/
│       │   ├── workers/
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── test/
│       ├── scripts/
│       ├── package.json
│       └── README.md
│
├── packages/
│   ├── contracts/
│   ├── config/
│   └── tooling/
│
├── docs/
│   ├── 01_PRD.md
│   ├── 02_FEATURES.md
│   ├── 03_USER_ROLES_AND_PERMISSIONS.md
│   ├── 04_DESIGN_SYSTEM.md
│   ├── 05_UI_UX_GUIDELINES.md
│   ├── 06_SCREEN_SPECIFICATIONS.md
│   ├── 07_ARCHITECTURE.md
│   ├── 08_FOLDER_STRUCTURE.md
│   ├── 09_DATABASE.md
│   ├── 10_API_SPECIFICATION.md
│   ├── 11_DISPATCH_ENGINE.md
│   ├── 12_STATE_MACHINES.md
│   ├── 13_SECURITY.md
│   ├── 14_REALTIME_AND_NOTIFICATIONS.md
│   ├── 15_PAYMENTS_AND_LEDGER.md
│   ├── 16_ENGINEERING_STANDARDS.md
│   ├── 17_TESTING_STRATEGY.md
│   ├── 18_DEVOPS_AND_DEPLOYMENT.md
│   ├── 19_OBSERVABILITY.md
│   └── 20_AI_AGENT_RULES.md
│
├── infrastructure/
├── scripts/
├── .github/
├── .gitignore
└── README.md
```

---

# 73. Source-of-Truth Hierarchy

When folder structure conflicts with implementation preference:

```text id="r8m4x2"
Product Requirement
        ↓
Architecture
        ↓
Folder Structure
        ↓
Implementation
```

Code does not redefine architecture merely because the current implementation is convenient.

---

# 74. Refactoring Rule

If the codebase begins violating this structure, do not create additional folders to hide the problem.

Instead:

1. Identify ownership.
2. Identify dependency violation.
3. Move code to the correct layer/module.
4. Update imports.
5. Add/adjust tests.
6. Update architecture documentation if necessary.

---

# 75. Definition of Done for Repository Structure

The repository is structurally compliant when:

* [ ] Applications are isolated.
* [ ] Backend modules have clear ownership.
* [ ] Domain logic is separated from transport.
* [ ] Infrastructure is separated from domain.
* [ ] Flutter follows feature/layer boundaries.
* [ ] Admin follows domain/page boundaries.
* [ ] Shared packages have explicit responsibilities.
* [ ] No random top-level folders exist.
* [ ] No business logic lives in generic utilities.
* [ ] Tests have clear ownership.
* [ ] Documentation is version-controlled.
* [ ] Infrastructure is isolated from application code.
* [ ] Dependency direction is respected.

---

# 76. Final Repository Principle

The folder structure exists to make the architecture **visible in the codebase**.

A developer or AI agent should be able to look at a file and answer:

> **Which application owns this?**

> **Which business domain owns this?**

> **Which architectural layer does this belong to?**

> **Who is allowed to depend on it?**

If those questions cannot be answered, the code is probably in the wrong place.

The repository must remain boring, predictable, and disciplined.

That is a feature—not a limitation.