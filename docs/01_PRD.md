# AdhocX — Product Requirements Document

**Document:** `01_PRD.md`
**Product:** AdhocX
**Document Version:** 1.0
**Status:** Product Source of Truth
**Confidentiality:** Confidential
**Last Updated:** September 2026

---

# 1. Document Purpose

This document defines the product requirements for AdhocX V1.

It is the primary source of truth for:

* Product scope
* Product objectives
* Users
* Business workflows
* Functional requirements
* Non-functional product requirements
* User journeys
* Business rules
* MVP boundaries
* Success metrics
* Product acceptance criteria

Engineering, design, QA, and AI development agents must use this document as the authoritative product reference.

If another project document conflicts with this PRD, the conflict must be identified and resolved rather than silently choosing one interpretation.

Technical implementation details belong primarily in:

* `07_ARCHITECTURE.md`
* `09_DATABASE.md`
* `10_API_SPECIFICATION.md`
* `11_DISPATCH_ENGINE.md`
* `12_STATE_MACHINES.md`

Visual implementation details belong primarily in:

* `04_DESIGN_SYSTEM.md`
* `05_UI_UX_GUIDELINES.md`
* `06_SCREEN_SPECIFICATIONS.md`

---

# 2. Product Overview

AdhocX is a B2B transportation fulfillment marketplace that helps corporate transport users source verified commercial cabs and drivers for adhoc transportation requirements.

The current problem is that users frequently depend on Telegram and WhatsApp groups to locate additional vehicles when their existing fleet cannot satisfy a corporate requirement.

This creates:

* Slow vehicle allocation
* Excessive calls and messages
* Poor visibility
* Unclear availability
* Manual coordination
* Trust problems
* Difficult tracking
* Operational inefficiency

The supplied founder PRD describes AdhocX as a platform intended to replace this manual sourcing workflow with an automated marketplace and matching system.

---

# 3. Product Vision

## Vision

Build a fast, reliable and operationally transparent platform for adhoc corporate cab fulfillment.

The long-term product vision is to become infrastructure connecting:

* Corporate transport demand
* Transport users
* Verified commercial drivers
* Available vehicle supply

The V1 product will focus specifically on the user-to-driver fulfillment workflow.

---

# 4. Product Mission

AdhocX should allow a transport user to transform:

> "I need additional vehicles."

into:

> "My required vehicles have been automatically sourced, assigned and tracked."

without requiring Telegram groups, WhatsApp groups, repeated phone calls or manual driver allocation.

---

# 5. Business Model

## 5.1 Current Business Model

The initial marketplace serves transport users.

Example:

A user has a corporate transportation contract requiring 50 vehicles.

The user has only 40 suitable vehicles available.

The user needs an additional 10 vehicles.

Today, the user may search Telegram/WhatsApp groups for drivers or vehicle owners.

AdhocX digitizes that process.

### Current flow

User:

1. Creates a requirement.
2. Specifies vehicle type.
3. Specifies quantity.
4. Specifies location.
5. Specifies date and time.
6. Submits the requirement.
7. AdhocX identifies eligible drivers.
8. Eligible drivers receive offers.
9. Drivers accept.
10. AdhocX assigns the required number of drivers.
11. Drivers perform the work.
12. Trip is completed.
13. Earnings and settlement are processed.

---

# 6. Long-Term Business Direction

The long-term business may expand beyond users and allow corporate organizations to submit transportation requirements directly.

Potential future flow:

Corporate → AdhocX → Verified Supply

The architecture should therefore avoid unnecessarily coupling the demand model to the User entity.

However:

## Direct corporate transportation procurement is NOT part of V1.

The V1 product is focused on user-driven adhoc fulfillment.

---

# 7. Target Users

## 7.1 User

A transport company or transport operator responsible for fulfilling corporate transportation requirements.

Primary responsibilities:

* Create vehicle requirements
* Monitor fulfillment
* View assigned drivers
* Monitor active trips
* Review trip history
* Manage payments
* Manage account information

---

## 7.2 Driver

A verified commercial driver or vehicle owner who wants to receive adhoc transportation work.

Primary responsibilities:

* Register
* Complete KYC
* Register vehicle information
* Go online/offline
* Receive trip opportunities
* Accept/decline trips
* Navigate to pickup
* Start trips using OTP
* Complete trips
* View earnings
* Request withdrawals

The founder PRD explicitly identifies these driver functions.

---

## 7.3 Administrator

An internal AdhocX operations/admin user responsible for managing the marketplace.

Primary responsibilities:

* Monitor operations
* Verify drivers
* Approve users
* Manage pricing
* Manage settlements
* Review reports
* Handle support
* Review audit logs

These responsibilities are included in the supplied PRD.

---

# 8. V1 Product Surfaces

V1 consists of two applications.

## Application 1 — AdhocX Mobile

Technology is defined separately by the architecture documentation.

The mobile application contains two role experiences:

### User

### Driver

The same mobile application may expose different navigation, functionality and permissions depending on the authenticated user's role.

---

## Application 2 — AdhocX Admin

A separate web-based administration console.

The Admin application is intended primarily for desktop/tablet operational use.

---

# 9. Product Principles

AdhocX V1 must follow these principles.

## 9.1 Reliability over feature quantity

A small number of reliable workflows are more valuable than a large number of partially working features.

---

## 9.2 Operational clarity

Users must be able to understand the current state of a requirement or trip quickly.

---

## 9.3 Automation over manual coordination

The system should automate driver discovery, dispatch and status updates wherever practical.

---

## 9.4 Human intervention remains possible

Automation must not prevent internal operators from resolving exceptional situations.

Admin functionality must eventually provide visibility into operational failures.

---

## 9.5 Trust

Drivers and users must be verified before participating in the marketplace.

---

## 9.6 Explicit state

Trip, requirement, offer and assignment states must be explicit and controlled.

---

## 9.7 Financial traceability

Payments, earnings and settlements must be traceable.

---

# 10. V1 Objective

The primary V1 objective is:

> Enable a verified transport user to submit an adhoc vehicle requirement and reliably obtain verified driver/vehicle assignments through automated marketplace dispatch.

The system must demonstrate that the manual Telegram/WhatsApp sourcing process can be replaced by a structured digital workflow.

---

# 11. V1 Success Criteria

The V1 should demonstrate:

1. Users can successfully onboard.
2. Drivers can successfully onboard.
3. Drivers can complete verification.
4. Users can create requirements.
5. The system can identify eligible drivers.
6. Drivers receive trip offers.
7. Drivers can accept or decline.
8. The system can prevent over-assignment.
9. Users can see assignments in real time.
10. Drivers can execute the trip lifecycle.
11. Trips can be completed.
12. Driver earnings can be calculated.
13. Settlements can be recorded.
14. Admin users can monitor and intervene in operations.

---

# 12. Core Marketplace Workflow

The primary workflow is:

```text
User
   ↓
Create Requirement
   ↓
Requirement Validated
   ↓
Dispatch Engine
   ↓
Eligible Drivers Identified
   ↓
Driver Offers Sent
   ↓
Drivers Accept / Decline
   ↓
Assignments Created
   ↓
Requirement Fulfilled
   ↓
Driver Travels to Pickup
   ↓
Driver Arrives
   ↓
OTP Verification
   ↓
Trip Starts
   ↓
Trip Completes
   ↓
Earnings Created
   ↓
Settlement
```

The supplied PRD defines the core workflow as user posting → nearby driver notification → driver acceptance → user confirmation → pickup → OTP → completion → settlement.

---

# 13. User Requirements

A user must be able to create a transportation requirement.

A requirement should contain, at minimum:

* Vehicle type
* Number of vehicles
* Pickup location
* Date
* Pickup time
* Relevant trip requirements
* Applicable pricing/payment information

Exact fields are subject to the detailed feature and screen specifications.

---

# 14. Requirement Quantity

A requirement may request multiple vehicles.

Example:

```text
Requirement:
50 Sedans

Fulfilled:
38

Remaining:
12
```

The platform must distinguish:

* Requested quantity
* Offered quantity
* Accepted quantity
* Reserved quantity
* Assigned quantity
* Completed quantity
* Cancelled quantity

These quantities must not be inferred solely from frontend state.

---

# 15. Driver Eligibility

The system must only consider eligible drivers.

The initial eligibility criteria include:

* Driver is verified
* Driver is active
* Driver is online
* Driver is available
* Driver has an eligible vehicle
* Vehicle type matches requirement
* Vehicle documentation is valid
* Driver is within the applicable geographic search area
* Driver is not already committed to an incompatible assignment

The supplied PRD specifically identifies vehicle type, verification, online status and distance as matching filters.

---

# 16. Geographic Matching

The platform must use geographic location to identify nearby eligible drivers.

The initial concept is to:

1. Identify drivers within an initial radius.
2. Filter eligible drivers.
3. Dispatch offers.
4. Monitor acceptance.
5. Expand the search radius when required supply cannot be fulfilled.

The exact initial radius, maximum radius, expansion intervals and geographic rules are:

**TBD — Product/business decision.**

They must not be invented by an implementation agent.

---

# 17. Dispatch Model

The platform will use an automated dispatch system.

The dispatch system must:

1. Receive a valid requirement.
2. Identify eligible drivers.
3. Rank eligible candidates.
4. Send offers.
5. Accept driver responses.
6. Reserve/assign available capacity.
7. Continue dispatching if demand remains unfulfilled.
8. Expand the geographic search when appropriate.
9. Stop when the requirement is fulfilled or the system determines that fulfillment is unavailable.

Detailed dispatch behavior belongs in `11_DISPATCH_ENGINE.md`.

---

# 18. Driver Offer

A driver may receive an offer for an eligible requirement.

The offer should contain sufficient information for the driver to make an informed decision.

At minimum:

* Pickup location
* Date
* Time
* Vehicle requirement
* Estimated earning/payment information where available
* Offer expiration

The driver can:

* Accept
* Decline
* Allow offer to expire

---

# 19. Assignment Integrity

The system must never assign more drivers than the requested quantity.

Example:

```text
Requested = 20
Maximum assigned = 20
```

If multiple drivers attempt to accept simultaneously, backend transactional logic must determine the winning assignments.

Frontend behavior must never be trusted to enforce assignment limits.

---

# 20. Requirement States

The detailed state machine will be defined in `12_STATE_MACHINES.md`.

Initial conceptual states:

```text
DRAFT
POSTED
SEARCHING
PARTIALLY_ASSIGNED
ASSIGNED
COMPLETED
CANCELLED
UNFULFILLED
```

Exact state definitions and legal transitions must be documented separately.

---

# 21. Driver Trip Lifecycle

A driver must be able to:

1. Receive assignment.
2. View trip.
3. Navigate to pickup.
4. Mark/communicate arrival.
5. Verify trip start through OTP.
6. Start trip.
7. Complete trip.
8. Receive earning information.

The PRD explicitly identifies navigation, OTP trip start, trip completion, earnings and withdrawals as driver functionality.

---

# 22. OTP Trip Start

Trip commencement must require OTP verification where configured for the trip.

The system must:

* Generate/obtain a valid OTP.
* Validate the OTP server-side.
* Prevent unauthorized trip start.
* Record the successful verification event.
* Associate the verification with the relevant assignment/trip.

The OTP mechanism must be designed to handle:

* Incorrect OTP
* Expired OTP
* Repeated attempts
* Network failure
* Duplicate requests

---

# 23. Trip Completion

A driver can complete a trip only when the required completion conditions have been satisfied.

Completion must trigger the appropriate downstream processes, including:

* Trip state update
* Earnings calculation
* User status update
* Driver notification
* Settlement/accounting workflow
* Audit/event record

Exact settlement behavior will be defined in `15_PAYMENTS_AND_LEDGER.md`.

---

# 24. Driver Earnings

Drivers must be able to view:

* Trip earnings
* Total earnings
* Available balance
* Withdrawal history

The underlying financial model must use a traceable ledger rather than relying on a manually mutated balance field.

Exact financial rules are TBD until the commercial model is finalized.

---

# 25. Withdrawals

Drivers should be able to request withdrawals subject to:

* Account eligibility
* Available balance
* Minimum withdrawal amount, if applicable
* Verification requirements
* Payment provider rules

The exact rules are:

**TBD — Business decision.**

---

# 26. User Payments

The user must be able to view relevant payment information.

The final commercial model must define:

* When the user is charged
* Whether payment occurs before dispatch
* Whether payment is authorized before dispatch and captured after completion
* Cancellation charges
* Refunds
* Platform fees
* Driver earnings
* User settlement

These rules must be finalized before production payment implementation.

---

# 27. Admin Operations

The Admin application must provide operational visibility.

Initial capabilities:

### Dashboard

* Active requirements
* Searching requirements
* Assigned requirements
* Active trips
* Fulfillment metrics
* Operational exceptions

### Drivers

* Driver list
* Driver verification
* Documents
* Status
* Suspension
* Driver details

### Users

* User applications
* User approval
* User status
* User details

### Trips

* Active trips
* Completed trips
* Cancelled trips
* Assignment details
* Operational investigation

### Pricing

* Pricing configuration

### Settlements

* Settlement management
* Settlement status
* Reconciliation

### Reports

* Operational reporting

### Support

* Operational support workflows

### Audit Logs

* Administrative and important system actions

The supplied PRD explicitly includes these admin capabilities.

---

# 28. Driver Onboarding

Driver onboarding must support:

* OTP authentication
* Personal information
* KYC information
* Required document submission
* Vehicle information
* Verification status

A driver must not receive production trip offers until required verification conditions have been satisfied.

---

# 29. User Onboarding

User onboarding must support:

* OTP authentication
* User information
* Required business information
* Verification/approval workflow

Unapproved users must not access restricted marketplace functionality.

---

# 30. Authentication

The V1 authentication model uses OTP-based authentication.

The PRD explicitly identifies OTP authentication as part of security and onboarding.

Authentication implementation details belong in the architecture and security documentation.

---

# 31. Authorization

Every protected operation must be authorized according to:

* User identity
* Role
* Resource ownership
* Resource state
* Administrative permissions

Authentication alone is not sufficient.

Example:

A user may access its own requirements.

It must not automatically access another user's requirements simply because the user is authenticated.

---

# 32. Notifications

The system must provide notifications for important events throughout the trip lifecycle.

Potential notification events include:

* New trip offer
* Offer expiration
* Assignment
* Driver cancellation
* Requirement partially fulfilled
* Requirement fully fulfilled
* Driver arrival
* Trip start
* Trip completion
* Payment status
* Settlement status

The PRD requires real-time updates for users and drivers throughout the trip lifecycle.

---

# 33. Real-Time Experience

The system should provide real-time operational updates where appropriate.

User example:

```text
Requirement
20 vehicles requested

Assigned: 12
Searching: 8
```

When a driver accepts:

```text
Assigned: 13
Searching: 7
```

The interface should update without requiring manual refresh where practical.

---

# 34. Location

The platform requires geographic functionality for:

* Driver location
* Driver proximity
* Pickup location
* Map display
* Navigation
* Dispatch matching

The exact location update frequency, background tracking requirements and retention policies will be specified in architecture and realtime documentation.

---

# 35. Maps

The product requires map functionality for relevant driver/user workflows.

Maps must be used to support operational tasks rather than as decorative UI.

Primary use cases:

* Pickup location
* Driver location
* Navigation
* Nearby driver visualization
* Trip monitoring

---

# 36. Edge Cases

V1 must explicitly handle:

* Driver cancellation
* User cancellation
* No driver available
* Passenger no-show
* Network loss
* Payment failure

These edge cases are explicitly listed in the supplied PRD.

Additional edge cases must be identified during feature specification and state-machine design.

---

# 37. Network Failure

The mobile application must assume that network connectivity can fail.

The application should:

* Detect connectivity loss
* Display appropriate state
* Preserve relevant locally available information
* Retry safe operations where appropriate
* Avoid falsely confirming server-side actions
* Reconcile state after reconnection

The backend remains authoritative.

---

# 38. Duplicate Requests

Critical operations must be protected against duplicate submissions.

Examples:

* Accept trip
* Start trip
* Complete trip
* Payment
* Withdrawal
* Cancellation

The system must use appropriate idempotency/concurrency mechanisms.

---

# 39. Security Requirements

V1 security requirements include:

* OTP authentication
* Secure document storage
* Role-based access
* Secure payment integration

These requirements are explicitly identified in the supplied PRD.

Additional technical security standards will be defined in `13_SECURITY.md`.

---

# 40. Data Domains

The initial product domain includes:

```text
Users
Drivers
Vehicles
Users
Requirements
Trips
Offers
Assignments
Locations
Payments
Settlements
Notifications
Audit Logs
```

The supplied PRD identifies Users, Drivers, Users, Trips and Payments as core database entities.

The final database model is defined in `09_DATABASE.md`.

---

# 41. User Features — V1

## Authentication

* OTP login
* Session management
* Logout

## Dashboard

* Requirement overview
* Fulfillment status
* Active trips
* Operational alerts

## Requirement Management

* Create requirement
* View requirements
* View requirement details
* Bulk posting
* Track fulfillment
* Cancel requirement where permitted

## Driver Information

* View assigned driver
* View vehicle information
* View relevant trip information

## Live Status

* Assignment updates
* Driver/trip status
* Relevant location information

## Payments

* Payment information
* Transaction history
* Settlement information where applicable

## History

* Completed requirements
* Cancelled requirements
* Trip history

## Profile

* User information
* Account settings

The core user capabilities are consistent with the supplied PRD.

---

# 42. Driver Features — V1

## Authentication

* OTP login
* Logout

## Onboarding

* Personal information
* KYC
* Document submission
* Vehicle information

## Availability

* Online
* Offline

## Trip Discovery

* Nearby opportunities
* Eligible offers

## Trip Offers

* View offer
* Accept
* Decline
* Expiration

## Trip Execution

* Trip details
* Navigation
* Arrival
* OTP start
* Trip execution
* Completion

## Earnings

* Trip earnings
* Earnings history
* Available balance

## Withdrawals

* Withdrawal request
* Withdrawal history

These features align with the supplied driver scope.

---

# 43. Admin Features — V1

## Dashboard

* Operational overview
* Live requirements
* Active trips
* Fulfillment visibility

## Driver Management

* Driver verification
* KYC/document review
* Driver status
* Suspension/activation

## User Management

* User approval
* User status
* User information

## Trip Management

* Trip monitoring
* Assignment visibility
* Operational intervention

## Pricing

* Pricing configuration

## Settlements

* Settlement management

## Reports

* Operational reports

## Support

* Support workflows

## Audit

* Audit logs

These capabilities align with the supplied admin scope.

---

# 44. MVP Scope

The V1 MVP includes:

```text
User onboarding
Driver onboarding
Driver KYC
Vehicle registration
User requirement creation
Bulk posting
Driver availability
Geospatial matching
Automated dispatch
Driver accept/decline
Assignment
Live trip status
Navigation
OTP trip start
Trip completion
Driver earnings
Withdrawals
Payments
Settlement
Admin operations
Notifications
Audit logging
```

---

# 45. Explicit MVP Exclusions

The following are intentionally excluded from V1:

* Employee transportation planning
* AI route optimization

These exclusions are explicitly stated in the supplied PRD.

Additional exclusions:

* Consumer ride-hailing
* Public passenger marketplace
* Consumer driver onboarding
* Advanced AI dispatch
* Complex corporate HR integrations
* Multi-country operational rollout
* Multi-currency financial infrastructure
* Advanced predictive analytics

These additional exclusions are product recommendations and should be revisited only through an explicit scope decision.

---

# 46. Non-Goals

AdhocX V1 is not intended to:

1. Replace a full corporate transportation management system.
2. Manage employee rosters.
3. Optimize employee routes using AI.
4. Operate as a consumer taxi marketplace.
5. Become a general-purpose logistics marketplace.
6. Build a social network for drivers.
7. Replace every function of a transport user's existing operational system.

---

# 47. Product-Level Non-Functional Requirements

The product must prioritize:

## Reliability

Critical marketplace operations must be dependable.

## Responsiveness

Operational screens should provide immediate feedback.

## Transparency

Users should understand current status and next action.

## Security

Sensitive user, KYC and payment information must be protected.

## Scalability

The architecture must allow increasing:

* Drivers
* Users
* Requirements
* Offers
* Assignments
* Trips

without requiring a fundamental product rewrite.

## Auditability

Important operational and financial actions must be traceable.

---

# 48. Marketplace Reliability Requirements

The platform should measure:

* Requirement fulfillment rate
* Driver acceptance rate
* Driver cancellation rate
* Assignment time
* Offer response time
* No-driver rate
* No-show rate
* Trip completion rate

These measurements are required to understand whether AdhocX is actually improving the existing workflow.

---

# 49. Primary Success Metrics

The supplied PRD identifies:

* Assignment time
* Fulfillment rate
* Cancellation rate
* User retention
* Trips per day

as core success metrics.

V1 should additionally measure:

* Driver acceptance rate
* Average dispatch attempts
* Average dispatch radius
* Driver response time
* Requirement failure rate
* Payment success rate
* Settlement accuracy
* Repeat user usage

---

# 50. Product Health Metrics

## Fulfillment

```text
Fulfillment Rate =
Fulfilled Requirements / Total Requirements
```

## Assignment Time

Time from requirement posting to required assignment fulfillment.

## Cancellation Rate

```text
Cancelled Assignments / Total Assignments
```

## Driver Acceptance Rate

```text
Accepted Offers / Offers Sent
```

## User Retention

Percentage of users returning to use the marketplace over a defined period.

Exact reporting periods are TBD.

---

# 51. Operational SLA Definitions

The business must eventually define target values for:

* Maximum acceptable assignment time
* Minimum fulfillment rate
* Maximum cancellation rate
* Maximum driver response time
* Payment processing SLA
* Settlement SLA

These values are:

**TBD — Business/Operations decision.**

The engineering team must not invent contractual SLAs.

---

# 52. Roles and Permissions

The initial roles are:

```text
ADMIN
USER
DRIVER
```

Detailed permissions belong in:

`03_USER_ROLES_AND_PERMISSIONS.md`

---

# 53. Product Navigation

The mobile application must adapt to role.

## User

Primary navigation:

```text
Home
Requirements
Payments
Profile
```

## Driver

Primary navigation:

```text
Home
Trips
Earnings
Profile
```

Exact navigation can be refined during UX specification.

---

# 54. Admin Navigation

The Admin application is web-first.

Primary navigation:

```text
Dashboard
Trips
Drivers
Users
Payments
Settlements
Pricing
Reports
Support
Audit Logs
Settings
```

---

# 55. UX Requirements

The application must prioritize:

* Clear status
* Fast primary actions
* Low cognitive load
* Large mobile touch targets
* Strong confirmation feedback
* Clear error handling
* Clear offline state
* Minimal unnecessary navigation
* Consistent design system

Detailed UI/UX rules belong in:

`04_DESIGN_SYSTEM.md`

`05_UI_UX_GUIDELINES.md`

---

# 56. Driver UX Priority

The driver experience is time-sensitive and operational.

The interface must make the following actions extremely easy:

```text
Go Online
View Offer
Accept
Navigate
Arrive
Start
Complete
View Earnings
```

The driver must not need to navigate through unnecessary screens to perform core trip operations.

---

# 57. User UX Priority

The user experience should optimize:

```text
Create Requirement
Monitor Fulfillment
Understand Exceptions
View Assignments
Track Trips
Review Payments
```

The user must quickly understand:

```text
Requested
Assigned
Remaining
Searching
Completed
```

---

# 58. Admin UX Priority

The Admin experience should optimize:

```text
Observe
Investigate
Intervene
Resolve
Audit
```

Admin should have significantly greater information density than the mobile applications.

---

# 59. Business Rules Requiring Finalization

The following business decisions must be finalized before the relevant production implementation:

### Pricing

* Per-trip pricing model
* Vehicle-specific pricing
* User pricing
* Platform commission
* Driver payout

### Payment

* When user pays
* Authorization vs capture
* Refund rules
* Cancellation fees

### Dispatch

* Initial radius
* Maximum radius
* Wave size
* Offer duration
* Ranking weights
* Expansion strategy

### Driver

* Verification requirements
* Required documents
* Driver eligibility
* Availability rules

### Cancellation

* User cancellation policy
* Driver cancellation policy
* Penalties
* Reassignment behavior

### Settlement

* Settlement timing
* Payout cycle
* Minimum withdrawal
* Reconciliation process

These are deliberately not invented in this PRD.

---

# 60. V1 Acceptance Criteria

V1 is product-ready only when the following end-to-end workflow works reliably:

```text
User registers
        ↓
User approved
        ↓
Driver registers
        ↓
Driver verified
        ↓
Driver adds eligible vehicle
        ↓
Driver goes online
        ↓
User creates requirement
        ↓
System finds eligible driver supply
        ↓
Offers dispatched
        ↓
Drivers accept
        ↓
Required number assigned
        ↓
User sees assignments
        ↓
Driver navigates to pickup
        ↓
Driver arrives
        ↓
OTP verified
        ↓
Trip starts
        ↓
Trip completes
        ↓
Driver earnings recorded
        ↓
Settlement recorded
        ↓
Admin can audit entire process
```

---

# 61. Failure Acceptance Criteria

The system must also correctly handle:

```text
Driver declines
Driver offer expires
Driver cancels
User cancels
Insufficient driver supply
Network interruption
Duplicate accept request
Duplicate completion request
Payment failure
No-show
```

No critical failure may leave the requirement, assignment, payment or earning in an ambiguous state.

---

# 62. Data Ownership Principle

Every important piece of state must have a single authoritative owner.

Examples:

```text
Trip state
→ Backend database

Assignment state
→ Backend database

Financial state
→ Ledger/payment system

Realtime display
→ Derived from authoritative backend state

Mobile local state
→ Temporary/cache only
```

Client applications must never be treated as authoritative sources of business state.

---

# 63. Product Architecture Principle

The V1 product must be designed so that:

```text
User Demand
      ↓
Requirement
      ↓
Dispatch Engine
      ↓
Supply
```

is independent from the specific identity of the demand creator wherever practical.

This allows a future:

```text
Corporate
    ↓
Requirement
```

workflow without redesigning the entire dispatch engine.

This is a future-readiness principle, not a V1 feature.

---

# 64. Future Product Direction

After successful validation of the V1 user marketplace, potential future capabilities include:

* Direct corporate onboarding
* Corporate transportation requirements
* Employee transportation planning
* Recurring transportation
* Route optimization
* Advanced scheduling
* Corporate dashboards
* Enterprise integrations
* Advanced analytics
* Multi-region operations
* Multi-currency payments
* Automated pricing
* Intelligent dispatch

These features must not enter V1 unless explicitly approved through a scope change.

---

# 65. Product Change Control

No developer, designer or AI agent may expand product scope independently.

A new feature must have:

1. Business justification
2. Product decision
3. Updated requirements
4. UX impact assessment
5. Architecture impact assessment
6. Database/API impact assessment
7. Testing impact assessment

Scope changes must be explicitly documented.

---

# 66. Source of Truth Rules

The following hierarchy applies:

```text
Business/product decision
        ↓
01_PRD.md
        ↓
02_FEATURES.md
        ↓
03_USER_ROLES_AND_PERMISSIONS.md
        ↓
UX/design specifications
        ↓
Architecture
        ↓
Implementation
```

Implementation must never silently redefine product behavior.

If implementation discovers that a requirement is technically impossible, ambiguous or contradictory, the ambiguity must be raised before implementation proceeds.

---

# 67. Definition of Done — Product

A V1 feature is considered complete only when:

* User flow is defined
* Business rules are defined
* Permissions are defined
* UI states are defined
* API behavior is defined
* Database implications are defined
* Error cases are defined
* Loading states are defined
* Offline behavior is considered where applicable
* Tests exist
* Acceptance criteria pass
* Documentation is updated

---

# 68. AI Development Rule

AI development agents must not interpret missing information as permission to invent product requirements.

When a requirement is marked:

```text
TBD
```

the agent must:

1. Identify the missing decision.
2. Explain why it matters.
3. Stop the dependent implementation if the decision materially affects correctness.

The agent may make implementation-level decisions only when they do not alter product behavior or architectural constraints.

---

# 69. V1 Product Definition

The essence of AdhocX V1 can be summarized as:

```text
                    ADHOCX V1

              Corporate Demand
                     │
                  User
                     │
                     ▼
              Vehicle Requirement
                     │
                     ▼
              Matching Engine
                     │
                     ▼
              Verified Supply
                     │
                     ▼
               Driver Offers
                     │
                     ▼
                 Assignment
                     │
                     ▼
               Trip Execution
                     │
                     ▼
                 Completion
                     │
                     ▼
                 Earnings
                     │
                     ▼
                 Settlement
```

The product succeeds when this process becomes substantially faster, more reliable and more transparent than the user's existing Telegram/WhatsApp workflow.

---

# 70. Final V1 Product Statement

> **AdhocX is a B2B transportation fulfillment marketplace that enables verified transport users to rapidly source, assign and manage additional commercial vehicles and drivers through automated geographic matching and dispatch, replacing fragmented manual sourcing workflows with a reliable digital operational system.**

The V1 is intentionally narrow.

It focuses on:

**Demand → Matching → Dispatch → Assignment → Trip → Completion → Settlement.**

Everything else is secondary until this core loop is proven.