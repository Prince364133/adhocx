# 09 — DATABASE

**Product:** AdhocX
**Document:** Database Architecture & Data Model
**Status:** Source of Truth
**Version:** V1
**Last Updated:** 2026-09-02

---

# 1. Purpose

This document defines the authoritative database architecture for AdhocX V1.

It establishes:

* Database technology.
* Core entities.
* Entity ownership.
* Relationships.
* Lifecycle state storage.
* Geographic data.
* Financial data boundaries.
* Constraints.
* Indexing strategy.
* Transaction requirements.
* Concurrency requirements.
* Audit requirements.
* Data retention principles.
* Migration rules.

Primary database:

> **PostgreSQL + PostGIS**

PostgreSQL is the authoritative persistent source of truth for AdhocX.

Redis is not a replacement for PostgreSQL.

---

# 2. Database Principles

The database must prioritize:

1. Correctness.
2. Referential integrity.
3. Transactional consistency.
4. Concurrency safety.
5. Query performance.
6. Auditability.
7. Data ownership.
8. Operational simplicity.

The database must not be designed merely around frontend screens.

The domain model is authoritative.

---

# 3. High-Level Data Domains

The database is divided conceptually into:

```text id="z6v4n8"
Identity
├── Users
├── Roles
└── Sessions

Marketplace
├── Users
├── Drivers
├── Vehicles
├── Requirements
├── Offers
└── Assignments

Trip Operations
├── Trips
├── Trip Events
└── Locations

Financial
├── Pricing
├── Payments
├── Ledger
└── Settlements

Communication
├── Notifications
└── Notification Delivery

Operations
├── Support
├── Audit Logs
└── System Configuration
```

---

# 4. Core Entity Map

Conceptually:

```text id="4y8p2w"
User
├── User
├── Driver
└── Admin capability

User
└── Requirements

Driver
└── Vehicles

Requirement
├── Offers
├── Assignments
└── Trips

Offer
└── Assignment

Assignment
└── Trip

Trip
├── Trip Events
├── Locations
└── Payment

Payment
└── Ledger Entries

Settlement
└── Ledger Entries
```

The exact physical schema may evolve during implementation, but these ownership relationships must remain clear.

---

# 5. UUIDs

Primary identifiers should use UUIDs or another collision-resistant server-generated identifier.

Do not use sequential integer IDs as public-facing identifiers by default.

Example:

```text id="p4v7n2"
user_id
vendor_id
driver_id
vehicle_id
requirement_id
offer_id
assignment_id
trip_id
payment_id
settlement_id
```

Internal database optimization may use additional identifiers where justified, but public identifiers should not expose unnecessary sequential information.

---

# 6. Timestamps

Persistent business entities should generally include:

```text id="8v2k5m"
created_at
updated_at
```

Timestamp storage should be timezone-safe.

Recommended:

> Store timestamps in UTC.

Convert to the appropriate display timezone at the application/UI layer.

---

# 7. Soft Delete

Do not automatically add:

```text id="4r7x1p"
deleted_at
```

to every table.

Soft deletion should only be used where business requirements require historical preservation and logical deletion.

For financial, audit, and operational records, deletion may be prohibited entirely.

---

# 8. User Entity

Conceptual structure:

```text id="5n8q2r"
users
├── id
├── phone
├── status
├── created_at
└── updated_at
```

Potential status values are defined by the account lifecycle requirements.

Do not duplicate user identity information across User and Driver records unnecessarily.

---

# 9. User Identity

Phone number must have an appropriate uniqueness strategy.

A user should not accidentally receive multiple active identities because of inconsistent phone-number formatting.

Phone normalization must happen before persistence.

---

# 10. User Entity

Conceptual:

```text id="r6x3m9"
users
├── id
├── user_id
├── organization_name
├── status
├── verification_status
├── approved_at
├── created_at
└── updated_at
```

The exact organization/KYC fields depend on finalized onboarding requirements.

Do not invent additional regulatory fields without product/security approval.

---

# 11. User Ownership

A User owns:

```text id="x8m2q5"
Requirements
Trips associated with its requirements
User-visible payment records
User profile
```

The database must preserve this ownership relationship.

---

# 12. Driver Entity

Conceptual:

```text id="q4v8n1"
drivers
├── id
├── user_id
├── verification_status
├── account_status
├── availability_status
├── created_at
└── updated_at
```

Additional KYC information belongs in the appropriate verification/document structures rather than being indiscriminately placed in the Driver table.

---

# 13. Driver Verification

Driver verification must have explicit state.

Conceptually:

```text id="k5p7r2"
verification_status
├── NOT_STARTED
├── SUBMITTED
├── UNDER_REVIEW
├── APPROVED
└── REJECTED
```

Exact domain states must remain aligned with `12_STATE_MACHINES.md`.

---

# 14. Driver Eligibility

A Driver's:

```text id="m8q2x6"
Account Status
+
Verification Status
+
Vehicle Eligibility
+
Availability
```

collectively determine whether the Driver can participate in dispatch.

Do not store a manually maintained:

```text id="z3v7k1"
is_eligible = true
```

as the sole source of truth unless a specific denormalized optimization is documented.

Eligibility should be derived from authoritative state.

---

# 15. Vehicle Entity

Conceptual:

```text id="p7x4m9"
vehicles
├── id
├── driver_id
├── vehicle_type
├── registration_number
├── verification_status
├── status
├── created_at
└── updated_at
```

Exact vehicle fields depend on finalized business requirements.

---

# 16. Vehicle Ownership

A vehicle must have a clear relationship with its Driver/provider.

A Driver must not be able to arbitrarily claim another Driver's vehicle.

Authorization must enforce ownership.

---

# 17. Requirement Entity

The Requirement is one of the most important domain entities.

Conceptual:

```text id="w3m8q6"
requirements
├── id
├── vendor_id
├── status
├── vehicle_type
├── required_quantity
├── pickup_location
├── destination_location
├── pickup_at
├── notes / approved metadata
├── created_at
└── updated_at
```

Exact fields are finalized against the product specification.

---

# 18. Requirement Quantity

A requirement must represent capacity explicitly.

Example:

```text id="g5q8x2"
required_quantity = 20
```

Fulfillment should not rely on manually edited counters as the only source of truth.

Conceptually:

```text id="m9x4v7"
Required
-
Valid Assigned Capacity
=
Remaining
```

Where useful, derived counts may be cached/materialized for performance, but authoritative relationships must remain queryable.

---

# 19. Quantity Integrity

The database must prevent invalid fulfillment such as:

```text id="v7x2p4"
Assigned > Required
```

unless a specific business rule explicitly permits over-allocation.

The assignment process must enforce this transactionally.

---

# 20. Requirement Ownership

Every requirement must belong to exactly one User.

Database relationship:

```text id="x2m7q9"
users 1 ─────── N requirements
```

A User must not be able to create a requirement owned by another User.

---

# 21. Requirement Location

Pickup and destination should support geographic coordinates.

Recommended PostGIS representation:

```text id="n6v3k8"
geography(Point, 4326)
```

or an equivalent appropriate PostGIS representation.

Location metadata may also include:

```text id="q8x2m5"
latitude
longitude
address
place_id
```

where required.

---

# 22. Location Authority

Coordinates should be stored in a normalized, consistent coordinate reference system.

Do not mix:

* latitude/longitude order
* coordinate systems
* units

within the database.

The application must define one canonical geographic representation.

---

# 23. Driver Live Location

Driver location is operational data.

Conceptually:

```text id="p5x8m2"
driver_locations
├── driver_id
├── location
├── recorded_at
└── source
```

High-frequency location updates must be designed carefully.

Do not write every GPS event to PostgreSQL indefinitely without a retention/performance strategy.

---

# 24. Geographic Indexing

PostGIS geographic columns must have appropriate spatial indexes.

Example conceptual index:

```text id="k4m7q2"
GIST(location)
```

This is essential for efficient proximity queries.

---

# 25. Dispatch Candidate Query

Candidate discovery may use geographic filtering such as:

```text id="b8x5m1"
Drivers within radius R
```

combined with eligibility filters:

```text id="n2q7v4"
verified
+
active
+
available
+
correct vehicle type
+
geographically eligible
```

Detailed ranking and wave logic belong to:

`11_DISPATCH_ENGINE.md`

---

# 26. Offer Entity

An Offer represents a temporary opportunity presented to a Driver.

Conceptual:

```text id="r8m3x7"
offers
├── id
├── requirement_id
├── driver_id
├── status
├── expires_at
├── created_at
└── updated_at
```

Additional fields may be required depending on dispatch implementation.

---

# 27. Offer Uniqueness

The database should prevent unintended duplicate active offers for the same Driver/requirement/slot where the business model does not permit them.

This should be enforced through appropriate:

* unique constraints
* transactional checks
* state conditions

---

# 28. Offer Expiration

Offer expiration must be represented explicitly.

```text id="q7x4m2"
expires_at
```

The backend determines whether an offer is actually expired.

The client countdown is not authoritative.

---

# 29. Assignment Entity

An Assignment represents confirmed allocation of a Driver/vehicle capacity to a Requirement.

Conceptual:

```text id="m3v8q5"
assignments
├── id
├── requirement_id
├── driver_id
├── vehicle_id
├── offer_id
├── status
├── assigned_at
├── cancelled_at
├── created_at
└── updated_at
```

---

# 30. Assignment Integrity

An assignment must reference:

* a valid requirement
* an eligible Driver
* a valid vehicle
* the appropriate offer where applicable

The database must enforce referential integrity.

---

# 31. Assignment Capacity

Assignment creation is a concurrency-sensitive operation.

Two concurrent acceptances must not both consume the same remaining slot.

This requires:

```text id="h7x2m9"
Database transaction
+
Appropriate locking/atomic condition
+
Integrity constraint
```

Application-level checks alone are insufficient.

---

# 32. Trip Entity

A Trip represents the operational execution of an assignment.

Conceptual:

```text id="v4q8m3"
trips
├── id
├── assignment_id
├── requirement_id
├── vendor_id
├── driver_id
├── vehicle_id
├── status
├── scheduled_at
├── started_at
├── completed_at
├── cancelled_at
├── created_at
└── updated_at
```

Some fields may be derivable through relationships, but denormalization may be justified for operational query performance.

If duplicated, synchronization rules must be explicit.

---

# 33. Trip State

Trip state is authoritative in PostgreSQL.

Possible conceptual states:

```text id="n5x8q1"
ASSIGNED
ARRIVING
AT_PICKUP
STARTED
COMPLETED
CANCELLED
```

The final state vocabulary is defined in:

`12_STATE_MACHINES.md`

---

# 34. Trip Events

Important trip lifecycle events should be persisted.

Conceptual:

```text id="p8m4x7"
trip_events
├── id
├── trip_id
├── event_type
├── actor_type
├── actor_id
├── metadata
├── occurred_at
└── created_at
```

Examples:

```text id="f3q7m2"
ASSIGNED
DRIVER_ARRIVED
OTP_VERIFIED
TRIP_STARTED
TRIP_COMPLETED
TRIP_CANCELLED
```

---

# 35. Event Immutability

Historical domain events should generally be append-only.

Do not rewrite historical operational events to make the current UI look correct.

If a correction is required, record a new corrective event.

---

# 36. OTP Trip Start

OTP verification should not be stored as a plain reusable secret.

The system should record the verification outcome and relevant metadata required for audit/operation.

Do not store unnecessary plaintext authentication secrets.

---

# 37. Payment Entity

Payment records represent financial interactions.

Conceptual:

```text id="x7m2q8"
payments
├── id
├── vendor_id
├── trip_id
├── amount
├── currency
├── status
├── provider
├── provider_reference
├── created_at
└── updated_at
```

Exact payment relationships depend on the final commercial model.

---

# 38. Financial Amounts

Never use floating-point database fields for monetary values.

Use an exact representation such as:

```text id="g4v8m1"
DECIMAL / NUMERIC
```

or integer minor units.

The chosen convention must be consistent across the entire financial subsystem.

---

# 39. Currency

Currency must be explicit where financial records exist.

Do not assume currency from UI locale.

Example:

```text id="m8q3x6"
currency = INR
```

The exact supported currency model is a business decision.

---

# 40. Ledger

The financial subsystem requires a traceable ledger.

Conceptual:

```text id="p3x7m9"
ledger_accounts
├── id
├── owner_type
├── owner_id
└── account_type

ledger_entries
├── id
├── transaction_id
├── account_id
├── direction
├── amount
├── currency
├── reference_type
├── reference_id
├── created_at
```

The detailed financial model belongs to:

`15_PAYMENTS_AND_LEDGER.md`

---

# 41. Ledger Immutability

Ledger entries must be treated as immutable financial facts.

Do not:

```text id="k5x2v8"
UPDATE old ledger entry amount
```

to correct a financial mistake.

Corrections should use compensating entries.

---

# 42. Settlement Entity

Conceptual:

```text id="q8m4x2"
settlements
├── id
├── recipient_type
├── recipient_id
├── amount
├── currency
├── status
├── period_start
├── period_end
├── processed_at
├── created_at
└── updated_at
```

Exact settlement ownership depends on the final commercial model.

---

# 43. Pricing Entity

Pricing must be configurable rather than hard-coded throughout the codebase.

Conceptual:

```text id="v3x7m1"
pricing_rules
├── id
├── vehicle_type
├── pricing_basis
├── amount/configuration
├── status
├── effective_from
├── effective_to
├── created_at
└── updated_at
```

This is intentionally conceptual.

The final pricing model remains a commercial/product decision.

---

# 44. Notification Entity

Persistent in-app notification records may contain:

```text id="m7q2x5"
notifications
├── id
├── recipient_type
├── recipient_id
├── type
├── title
├── body
├── read_at
├── created_at
```

Push delivery records may be maintained separately.

---

# 45. Notification Delivery

Where delivery reliability matters:

```text id="r4x8m2"
notification_deliveries
├── id
├── notification_id
├── channel
├── status
├── provider_reference
├── attempts
├── last_attempt_at
└── created_at
```

This allows delivery failures to be investigated without corrupting the underlying business event.

---

# 46. Device Tokens

Push tokens belong to user/device registrations.

Conceptually:

```text id="x5m8q3"
device_tokens
├── id
├── user_id
├── platform
├── token
├── active
├── last_seen_at
└── created_at
```

Tokens must not be assumed to remain valid forever.

---

# 47. Support Entity

Support cases may reference:

```text id="q3v7m8"
user
user
driver
requirement
trip
payment
```

The support system should preserve operational context.

---

# 48. Audit Log

Audit records should be append-oriented.

Conceptual:

```text id="m2x8q4"
audit_logs
├── id
├── actor_id
├── actor_role
├── action
├── resource_type
├── resource_id
├── result
├── reason
├── metadata
├── request_id
└── created_at
```

Sensitive administrative mutations must be auditable.

---

# 49. Audit Immutability

Normal application workflows must not allow modification or deletion of historical audit events.

---

# 50. Session Data

Authentication/session storage may contain:

```text id="x8q4m1"
user/session identifier
refresh/session metadata
expiration
revocation state
device metadata where required
```

Exact authentication storage strategy belongs to `13_SECURITY.md`.

---

# 51. Foreign Keys

Business relationships must use foreign keys.

Examples:

```text id="p4m8x2"
requirements.vendor_id
offers.requirement_id
offers.driver_id
assignments.requirement_id
assignments.driver_id
trips.assignment_id
payments.trip_id
```

Do not rely solely on application code for referential integrity.

---

# 52. Cascading Deletes

Cascading deletion must be used carefully.

Do not configure broad:

```text id="v7x2m4"
ON DELETE CASCADE
```

relationships where deletion could destroy operational or financial history.

For critical records, prefer:

* restricted deletion
* soft deactivation
* archival strategies

where appropriate.

---

# 53. Unique Constraints

Unique constraints should protect business invariants.

Potential examples:

```text id="m5x8q2"
users.phone
vehicles.registration_number
```

and domain-specific uniqueness rules such as active assignment constraints where applicable.

The exact constraints must follow finalized business rules.

---

# 54. Check Constraints

Database-level check constraints should protect simple invariants.

Examples:

```text id="q8x3m6"
required_quantity > 0
amount >= 0
```

Do not rely on application validation for invariants that can safely be enforced at database level.

---

# 55. Indexing Philosophy

Indexes should support actual query patterns.

Do not index every column.

Common query patterns include:

```text id="x4m7p2"
User → requirements
Driver → offers
Driver → assignments
Requirement → assignments
Requirement → offers
Trip → events
Trip → location
Payment → user
Settlement → recipient
```

---

# 56. Composite Indexes

Composite indexes should follow real query predicates.

Example conceptual:

```text id="n7q2m5"
requirements(vendor_id, status, created_at)
```

or:

```text id="p3x8m4"
offers(driver_id, status, expires_at)
```

Exact indexes should be validated against query plans and real workload.

---

# 57. Partial Indexes

Partial indexes may be used for active operational states.

Example concept:

```text id="g8m4x1"
active offers only
active assignments only
```

This can improve operational query performance where appropriate.

---

# 58. Spatial Indexes

PostGIS location columns require spatial indexes for proximity queries.

Use appropriate GiST/SP-GiST strategies based on actual query patterns.

---

# 59. Database Transactions

Transactions are mandatory for critical state changes.

Examples:

```text id="x7m2q5"
Accept Offer
Create Assignment
Start Trip
Complete Trip
Financial Posting
Settlement
```

---

# 60. Accept Offer Transaction

Conceptually:

```text id="r4x8m2"
BEGIN

1. Lock/check requirement capacity
2. Validate offer
3. Validate Driver
4. Validate offer expiration
5. Create assignment
6. Update offer
7. Update relevant requirement state
8. Record event

COMMIT
```

The exact transaction implementation belongs to the backend/domain design.

---

# 61. Concurrency Protection

The database must assume multiple requests can execute simultaneously.

Examples:

```text id="q5m8x3"
Driver A accepts
Driver B accepts
Offer expires
Admin intervenes
```

Concurrency correctness must not depend on request ordering.

---

# 62. Optimistic vs Pessimistic Concurrency

Use the simplest correct strategy.

Possible mechanisms:

* row locks
* atomic conditional updates
* unique constraints
* optimistic versioning

The chosen mechanism should be based on the operation's contention characteristics.

---

# 63. Versioning

Entities subject to frequent concurrent updates may use a version field if optimistic concurrency is appropriate.

Conceptually:

```text id="m7x3q8"
version
```

The implementation should not introduce version fields everywhere without a reason.

---

# 64. Database as Source of Truth

The following must ultimately be backed by authoritative database state:

```text id="x8m2q4"
Driver verification
Driver eligibility
Requirement status
Assignment
Trip status
Payment status
Ledger
Settlement
Audit
```

---

# 65. Redis vs PostgreSQL

Redis may contain:

```text id="p4x7m1"
cached availability
temporary dispatch coordination
job state
rate limits
short-lived offer acceleration data
```

But PostgreSQL contains the authoritative business state.

If Redis and PostgreSQL disagree:

> PostgreSQL wins.

---

# 66. Data Retention

Different data categories require different retention strategies.

### Financial

Retain according to applicable business/legal requirements.

### Audit

Retain sufficiently for operational/security investigation.

### Trip history

Retain according to product/business requirements.

### High-frequency location

May have shorter retention than core trip records.

Exact retention periods are TBD unless explicitly defined by business/legal requirements.

Do not invent legal retention periods.

---

# 67. Sensitive Documents

KYC documents should not be stored as raw binary blobs inside ordinary relational records unless specifically justified.

Prefer:

```text id="n8m4x2"
PostgreSQL
→ metadata/reference

Object Storage
→ document bytes
```

Access must be authorization-controlled.

---

# 68. Document Metadata

Document metadata may include:

```text id="x3q7m8"
document_id
owner_type
owner_id
document_type
storage_key
verification_status
created_at
updated_at
```

Do not expose storage keys directly to unauthorized clients.

---

# 69. Database Migrations

Every schema change must be version-controlled through migrations.

Do not manually modify production schema as an undocumented operation.

Migration sequence:

```text id="m7x2q5"
Code Change
↓
Migration
↓
Test
↓
Staging
↓
Production
```

---

# 70. Migration Safety

Production migrations should consider:

* existing data
* lock duration
* table size
* backward compatibility
* rollback strategy
* deployment order

Avoid destructive schema changes without a migration plan.

---

# 71. Seed Data

Seed data may be used for:

* development
* testing
* controlled staging configuration

Production seed scripts must never create fake marketplace activity.

Do not insert fake Drivers, trips, payments, or assignments into production simply to populate dashboards.

---

# 72. Test Data

Tests should create isolated test data.

Factories/builders should generate valid domain states.

Test data must respect:

* foreign keys
* unique constraints
* domain invariants
* state transitions

---

# 73. Database Testing

Critical database behavior must be tested.

Examples:

```text id="q8m3x7"
Cannot exceed requirement capacity
Cannot accept expired offer
Cannot start unassigned trip
Cannot modify immutable ledger entry
Cannot access another user's data
Cannot create invalid foreign relationship
```

---

# 74. Data Access Boundaries

Backend modules should not freely mutate another module's tables.

For example:

```text id="x4m7p2"
Dispatch
```

should not directly modify arbitrary:

```text id="m8q3v6"
ledger_entries
```

Financial state belongs to the Financial domain.

Cross-domain changes should occur through application operations/events.

---

# 75. Read Models

If operational screens become expensive to query, dedicated read models/materialized views may be introduced.

But:

> Do not introduce CQRS/read models before actual query requirements justify them.

The source of truth remains the underlying domain data.

---

# 76. Denormalization

Denormalization is permitted only when it solves a demonstrated performance problem.

Every denormalized field must have:

* owner
* update mechanism
* consistency strategy
* reason for existence

Example:

```text id="p6x2m8"
assigned_count
```

may be maintained for performance, but the assignment relationships remain authoritative.

---

# 77. Database Security

Database credentials must:

* come from secure configuration
* use least privilege
* never be committed to source control
* differ by environment

Production database access should be restricted.

---

# 78. Direct Production Database Access

Application developers and AI agents must not treat production database access as a normal debugging mechanism.

Production mutations must go through controlled operational processes.

---

# 79. PII

Personal information must be stored only when required.

Potential personal data includes:

* phone numbers
* names
* addresses
* vehicle information
* KYC information

Access should follow the role/permission model.

---

# 80. Data Minimization

Do not store:

```text id="x8q3m5"
"just in case"
```

data.

Every persistent field should have a clear business or operational purpose.

---

# 81. Database Naming

Use consistent naming.

Recommended:

```text id="m5x7q2"
snake_case
plural table names
singular conceptual entity names
```

Examples:

```text id="q8m4x1"
users
users
drivers
vehicles
requirements
offers
assignments
trips
trip_events
payments
ledger_entries
settlements
audit_logs
```

---

# 82. Database Comments/Documentation

Important non-obvious constraints should be documented.

Examples:

* why a partial unique index exists
* why a field is denormalized
* why a record cannot be deleted
* why a lock is required

Future developers must not remove a constraint simply because its purpose is unclear.

---

# 83. AI Agent Database Rules

The AI agent MUST:

1. Read this document before modifying schema.
2. Check existing entities before creating new ones.
3. Avoid duplicate representations of the same concept.
4. Use foreign keys for business relationships.
5. Add constraints for enforceable invariants.
6. Add indexes based on actual query patterns.
7. Use transactions for critical mutations.
8. Consider concurrency for shared resources.
9. Never treat Redis as authoritative business state.
10. Never store money as floating-point.
11. Never silently change existing state semantics.
12. Use migrations for schema changes.
13. Never destroy historical financial/audit data casually.
14. Never expose sensitive document storage directly.
15. Never create production fake data.
16. Never add fields without a documented business/technical reason.
17. Update this document when the domain model materially changes.

---

# 84. AI Agent Forbidden Patterns

Do NOT create:

```text id="g5m8x2"
is_driver_available_everywhere
is_trip_complete_everywhere
driver_balance
wallet_balance
requirement_assigned_count_as_only_truth
```

as uncontrolled duplicated state.

Also avoid:

```text id="m7x3q9"
generic_data
metadata_json
everything_json
```

as a substitute for proper schema design.

JSON/JSONB is appropriate only where the data is genuinely flexible or provider-specific.

---

# 85. Database Source-of-Truth Hierarchy

When data conflicts:

```text id="q4x8m2"
Domain rules
      ↓
PostgreSQL transaction
      ↓
Committed state
      ↓
Read/cache projections
      ↓
UI
```

The UI is the last representation—not the authority.

---

# 86. Core Relationship Diagram

```text id="x7m3q8"
                    ┌────────────┐
                    │    User    │
                    └─────┬──────┘
                          │
                ┌─────────┴─────────┐
                │                   │
          ┌─────▼─────┐       ┌────▼─────┐
          │   User  │       │  Driver   │
          └─────┬─────┘       └────┬──────┘
                │                  │
                │             ┌────▼─────┐
                │             │  Vehicle │
                │             └────┬─────┘
                │                  │
          ┌─────▼────────┐        │
          │ Requirement  │◄───────┘
          └─────┬────────┘
                │
         ┌──────┴───────┐
         │              │
    ┌────▼────┐   ┌─────▼──────┐
    │  Offer  │   │ Assignment │
    └─────────┘   └──────┬──────┘
                          │
                    ┌─────▼────┐
                    │   Trip   │
                    └─────┬────┘
                          │
                    ┌─────▼────┐
                    │ Payment  │
                    └─────┬────┘
                          │
                    ┌─────▼────┐
                    │  Ledger  │
                    └──────────┘
```

---

# 87. Core Database Invariants

The following are fundamental:

### Identity

A user identity must be unique according to the authentication model.

### Ownership

A Requirement belongs to one User.

### Vehicle

A Vehicle has a valid ownership relationship.

### Offer

An Offer references a valid Requirement and Driver.

### Assignment

An Assignment cannot consume unavailable capacity.

### Trip

A Trip references a valid Assignment.

### Financial

Financial records must use exact monetary representation.

### Ledger

Ledger history is immutable.

### Audit

Audit history is append-oriented.

### Geographic

Spatial data uses a consistent coordinate representation.

---

# 88. Database Definition of Done

Database implementation is not complete when tables exist.

It is complete when:

* [ ] Entities are clearly owned.
* [ ] Foreign keys exist.
* [ ] Important invariants have constraints.
* [ ] Critical operations have transaction boundaries.
* [ ] Concurrency risks are addressed.
* [ ] Spatial queries are indexed.
* [ ] Financial values are exact.
* [ ] Audit history is protected.
* [ ] Sensitive data access is controlled.
* [ ] Migrations are versioned.
* [ ] Query patterns have appropriate indexes.
* [ ] Tests cover critical invariants.

---

# 89. Final Database Principle

The database should make invalid business states **difficult or impossible to represent**.

Do not rely entirely on:

```text id="m3x8q7"
Frontend validation
```

or:

```text id="p7m2x5"
Backend developer discipline
```

when PostgreSQL can enforce the invariant.

The desired architecture is:

```text id="x8q4m1"
UI
  ↓
API
  ↓
Domain Rules
  ↓
Transaction
  ↓
Database Constraints
  ↓
Durable Truth
```

The database is not merely storage.

It is the final integrity boundary of AdhocX.