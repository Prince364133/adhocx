# 06 — SCREEN SPECIFICATIONS

**Product:** AdhocX
**Document:** Screen Specifications
**Status:** Source of Truth
**Version:** V1
**Last Updated:** 2026-09-02

---

# 1. Purpose

This document defines the screen-level requirements for AdhocX V1.

It specifies:

* Which screens exist.
* Which role can access each screen.
* The purpose of each screen.
* Navigation entry points.
* Required information.
* Primary and secondary actions.
* UI states.
* Loading states.
* Empty states.
* Error states.
* Permission restrictions.
* State-dependent behavior.
* Mobile vs Admin behavior.

This document must be implemented together with:

* `01_PRD.md`
* `02_FEATURES.md`
* `03_USER_ROLES_AND_PERMISSIONS.md`
* `04_DESIGN_SYSTEM.md`
* `05_UI_UX_GUIDELINES.md`

---

# 2. Screen Specification Standard

Every screen specification follows this structure:

```text
Screen
├── Purpose
├── Actor
├── Entry Points
├── Exit / Navigation
├── Information
├── Primary Actions
├── Secondary Actions
├── State Variants
├── Loading State
├── Empty State
├── Error State
├── Permission Rules
└── Acceptance Criteria
```

The implementation agent must not create a screen without satisfying this structure.

---

# 3. Application Structure

AdhocX V1 consists of:

```text
AdhocX Mobile
├── Vendor Experience
└── Driver Experience

AdhocX Admin
└── Admin Experience
```

---

# 4. Mobile Authentication Screens

These screens are shared by Vendor and Driver where applicable.

---

## 4.1 Splash / Initialization

### Purpose

Initialize the application and determine the appropriate authenticated state.

### Actor

Vendor / Driver.

### Responsibilities

* Initialize application.
* Restore authenticated session where valid.
* Determine role/context.
* Load required configuration.
* Navigate to appropriate destination.

### States

```text
Initializing
Authenticated
Unauthenticated
Session Expired
Initialization Failed
```

### Rules

The splash screen must not perform unnecessary long-running operations.

If initialization fails, provide an actionable error/retry state.

---

# 5. Login Screen

### Purpose

Allow a user to initiate OTP authentication.

### Actor

Vendor / Driver.

### Information

* Phone number.
* Country/region if required.
* Terms/privacy references where applicable.

### Primary Action

```text
Continue
```

### Validation

* Phone number required.
* Valid format required.

### States

```text
Idle
Submitting
OTP Sent
Error
```

### Error examples

```text
Invalid phone number.
Unable to send OTP.
Please try again.
```

---

# 6. OTP Verification Screen

### Purpose

Verify the authentication OTP.

### Information

* Masked phone number.
* OTP input.
* Resend option.
* Countdown where applicable.

### Primary Action

```text
Verify
```

### States

```text
Entering
Verifying
Success
Invalid OTP
Expired OTP
Network Error
```

### Rules

* OTP verification must be backend-authoritative.
* Prevent excessive resend attempts according to authentication/security rules.
* Do not expose OTP values in logs.

---

# 7. Role Resolution

After authentication:

```text
Authenticate
↓
Resolve account
↓
Resolve role
↓
Load role-specific experience
```

If a user is not authorized for a required role, the application must provide an appropriate error or onboarding path.

The UI must not infer privileged roles from client-controlled values.

---

# 8. Vendor Onboarding

## 8.1 Vendor Onboarding Screen

### Purpose

Collect required Vendor information.

### Information

Fields are based on approved Vendor onboarding requirements.

The exact commercial/KYC field set remains subject to product/business confirmation where not yet specified.

### Actions

```text
Continue
Save where supported
Submit
```

### States

```text
Not Started
In Progress
Submitted
Under Review
Approved
Rejected
```

---

# 9. Vendor Pending Approval

### Purpose

Explain that the Vendor account is awaiting approval.

### Information

```text
Application status
Submission date
Current status
```

### UX

The user must understand:

* why marketplace functionality is unavailable
* that review is pending
* what action, if any, is required

---

# 10. Vendor Rejected

### Purpose

Explain rejection and provide a path for correction/resubmission where allowed.

### Information

* Rejection status.
* Reason where permitted.
* Required corrections.

### Primary Action

```text
Review & Resubmit
```

Only show the action if resubmission is actually permitted.

---

# 11. Vendor Home

### Purpose

Provide the Vendor with an operational overview.

### Priority

1. Active fulfillment.
2. Requirements needing attention.
3. Current trips.
4. Relevant payment information.
5. Secondary actions.

### Primary Actions

```text
Create Requirement
View Requirements
```

### Components

Potential components:

```text
Fulfillment Summary
Requirement Card
Trip Summary
Payment Summary
Recent Activity
```

### States

#### Active state

Display active operational information.

#### Empty state

```text
No active requirements.

Create a requirement to begin fulfillment.
```

#### Loading

Use skeletons.

#### Error

Provide retry without losing navigation context.

---

# 12. Vendor Requirements List

### Purpose

Show Vendor-created requirements.

### Entry

Vendor navigation → Requirements.

### Information

Each item should expose enough information to identify the requirement:

```text
Requirement ID
Vehicle type
Quantity
Date
Time
Pickup
Fulfillment
Status
```

### Actions

```text
Create Requirement
Open Requirement
```

### Filters

Where useful:

```text
Status
Date
Vehicle Type
Fulfillment
```

### States

```text
Loading
Data
Empty
Error
```

---

# 13. Create Requirement

### Purpose

Create a transportation fulfillment requirement.

### Flow

```text
Create Requirement
↓
Trip Details
↓
Vehicle Requirements
↓
Pickup / Destination
↓
Date / Time
↓
Review
↓
Submit
```

The exact field set must follow approved product requirements.

---

# 14. Requirement Details

### Purpose

Show complete information about one Vendor requirement.

### Information

```text
Requirement ID
Status
Vehicle type
Required quantity
Assigned quantity
Pending quantity
Pickup
Destination
Date
Time
Assignments
Activity
```

### Primary Action

Depends on state.

Potential actions:

```text
View Fulfillment
Cancel Requirement
```

Only show actions allowed by current state.

---

# 15. Requirement Fulfillment View

### Purpose

Provide detailed visibility into fulfillment.

### Primary Information

```text
Required
Assigned
Pending
```

Example:

```text
20 Required
14 Assigned
6 Pending
```

### Information

* Assignment list.
* Driver.
* Vehicle.
* Assignment status.
* Offer/dispatch state where appropriate.

### Realtime

The view should update when backend realtime infrastructure reports relevant changes.

---

# 16. Requirement Cancellation

### Purpose

Allow Vendor to cancel a requirement when cancellation is permitted.

### Confirmation

Display:

* Requirement identifier.
* Current state.
* Consequence of cancellation.

### States

```text
Confirming
Submitting
Cancelled
Failed
```

---

# 17. Vendor Trip List

### Purpose

Show Vendor trips.

### Information

```text
Trip ID
Requirement
Driver
Vehicle
Pickup
Destination
Date/time
Status
```

### Filters

Where useful:

```text
Status
Date
Driver
Vehicle type
```

---

# 18. Vendor Trip Details

### Purpose

Show a specific trip.

### Information

```text
Trip ID
Requirement
Driver
Vehicle
Pickup
Destination
Trip status
Relevant timestamps
Activity
```

### Primary Action

State-dependent.

Examples:

```text
View Driver
Track Trip
Contact Support
```

---

# 19. Vendor Payments

### Purpose

Show Vendor payment information.

### Information

```text
Payment ID
Related trip/requirement
Amount
Status
Date
```

### States

```text
Loading
Data
Empty
Error
```

Financial terminology must follow `15_PAYMENTS_AND_LEDGER.md`.

---

# 20. Vendor Payment Details

### Purpose

Provide detailed information for a payment.

### Information

```text
Payment ID
Amount
Related requirement/trip
Status
Created
Updated
Relevant transaction information
```

Do not expose internal financial data that the Vendor is not authorized to see.

---

# 21. Vendor Profile

### Purpose

Allow the Vendor to view and manage permitted account information.

### Sections

```text
Account
Organization
Contact
Verification
Preferences
Support
```

Only permitted fields may be edited.

---

# 22. Driver Onboarding

## 22.1 Driver Registration

### Purpose

Collect required Driver profile information.

### Information

Based on approved onboarding requirements.

Do not invent KYC document requirements until finalized.

---

# 23. Driver KYC

### Purpose

Allow Driver to submit verification information.

### Lifecycle

```text
Not Started
↓
In Progress
↓
Submitted
↓
Under Review
↓
Approved / Rejected
```

### Information

* Current verification status.
* Required documents/information.
* Submission state.

### Actions

```text
Continue
Submit
Resubmit
```

Only display actions appropriate to current state.

---

# 24. Driver KYC Rejection

### Purpose

Explain what requires correction.

### Information

```text
Verification rejected
Reason
Required correction
```

### Primary Action

```text
Correct & Resubmit
```

Only when permitted.

---

# 25. Vehicle Registration

### Purpose

Register a commercial vehicle associated with the Driver.

### Information

Required vehicle fields are defined by the finalized onboarding/business requirements.

### Actions

```text
Save
Submit
Edit
```

### State

```text
Not Registered
Pending Verification
Verified
Rejected
```

Exact vehicle verification requirements remain subject to product definition.

---

# 26. Driver Home

### Purpose

Provide immediate operational status.

### Priority

1. Active trip.
2. New offer.
3. Availability.
4. Today's earnings.
5. Secondary information.

---

## 26.1 Driver Available State

Example:

```text
You're available

We'll notify you when a matching trip is available.
```

Primary interaction:

```text
Set Offline
```

---

## 26.2 Driver Offline State

Example:

```text
You're offline

You won't receive new trip opportunities.
```

Primary interaction:

```text
Go Online
```

Availability state must be backend-confirmed.

---

# 27. Driver Opportunity List

### Purpose

Show eligible trip opportunities.

### Information

```text
Pickup
Date/time
Vehicle type
Estimated earnings where available
Distance/relevant proximity
Trip status
```

### Actions

```text
Open Offer
```

The list must only show opportunities the Driver is eligible to view.

---

# 28. Trip Offer Details

### Purpose

Allow Driver to evaluate and respond to an offer.

### Information

```text
Trip ID
Pickup
Destination where available
Date/time
Vehicle type
Estimated earnings
Relevant trip information
Offer expiration
```

### Primary Actions

```text
Accept
Decline
```

### States

```text
Available
Accepting
Accepted
Declining
Declined
Expired
Unavailable
Error
```

---

# 29. Offer Expired

### Purpose

Explain that the offer can no longer be accepted.

Example:

```text
This offer has expired.

It is no longer available for acceptance.
```

Possible action:

```text
View Other Trips
```

---

# 30. Offer No Longer Available

This is different from expiry.

Example:

```text
This trip is no longer available.

The available slot has already been assigned.
```

The UI must distinguish known business outcomes from generic errors.

---

# 31. Driver Trips List

### Purpose

Show Driver assignments and trip history.

### Information

```text
Trip ID
Pickup
Destination
Date/time
Vehicle
Status
```

### Categories

Potentially:

```text
Upcoming
Active
Completed
Cancelled
```

Exact categories follow the state model.

---

# 32. Driver Trip Details

### Purpose

Provide the operational interface for an assigned trip.

### Priority

```text
Current status
Pickup/destination
Primary action
Navigation
Trip details
```

---

# 33. Assigned Trip State

Display:

```text
Assigned
```

Primary action:

```text
Navigate to Pickup
```

---

# 34. Navigation State

### Purpose

Help Driver reach pickup.

### Primary Action

```text
Open Navigation
```

Navigation may hand off to an external maps application where appropriate.

The exact maps integration is defined by architecture/integration requirements.

---

# 35. Arrived at Pickup

### Purpose

Allow Driver to communicate arrival when the workflow supports it.

### Primary Action

```text
Arrived
```

Backend must validate whether this transition is allowed.

---

# 36. Start Trip / OTP

### Purpose

Start the trip using the required passenger OTP.

### Information

```text
Trip ID
Pickup
OTP field
```

### Primary Action

```text
Start Trip
```

### States

```text
Waiting for OTP
Verifying
Started
Invalid OTP
Expired/Invalid Session
Network Error
```

---

# 37. Active Trip

### Purpose

Provide the Driver with the active-trip interface.

### Priority

```text
Trip status
Destination
Navigation
Primary operational actions
```

Avoid unnecessary information while the Driver is actively operating the vehicle.

---

# 38. Complete Trip

### Purpose

Allow the Driver to complete an active trip.

### Confirmation

Where required:

```text
Complete this trip?
```

### States

```text
Confirming
Submitting
Completed
Failed
```

The UI must not show Completed until backend confirmation is received.

---

# 39. Driver Earnings

### Purpose

Show Driver financial information.

### Information

```text
Available
Pending
Total earnings
Recent trip earnings
Withdrawal information
```

Exact financial definitions come from `15_PAYMENTS_AND_LEDGER.md`.

---

# 40. Withdrawal Request

### Purpose

Allow Driver to request withdrawal of eligible funds.

### Flow

```text
Earnings
↓
Withdrawal
↓
Amount
↓
Review
↓
Confirm
↓
Processing
```

The user must clearly see the amount being withdrawn.

The system must prevent withdrawal of unavailable funds.

---

# 41. Withdrawal Status

Possible UI states:

```text
Pending
Processing
Completed
Failed
```

Exact financial state definitions follow the ledger/payment specification.

---

# 42. Driver Profile

### Sections

```text
Personal Information
Verification
Vehicle
Availability
Bank/payment information where applicable
Support
```

Sensitive financial/KYC information must follow permissions and security rules.

---

# 43. Driver Account Status

Driver should be able to understand their account state.

Examples:

```text
Active
Verification Pending
Verification Rejected
Suspended
```

Restricted functionality should explain why it is unavailable where appropriate.

---

# 44. Admin Authentication

Admin authentication is separate from the mobile marketplace experience.

The Admin application must provide:

```text
Login
Authentication
Session Management
Logout
```

Additional security requirements are defined in `13_SECURITY.md`.

---

# 45. Admin Dashboard

### Purpose

Operational command center.

### Primary metrics

Potential categories:

```text
Active Requirements
Fulfillment
Active Trips
Pending Driver Verification
Pending Vendor Approval
Payment Issues
Operational Alerts
```

Exact metrics should be based on actual available backend data.

Do not fabricate dashboard statistics.

---

# 46. Admin Requirements List

### Purpose

Monitor transportation requirements across the marketplace.

### Columns

Potential fields:

```text
Requirement ID
Vendor
Vehicle Type
Required Quantity
Assigned Quantity
Pending Quantity
Pickup
Date/Time
Status
Created
```

### Capabilities

```text
Search
Filter
Sort
Pagination
Open Details
```

---

# 47. Admin Requirement Details

### Purpose

Inspect a requirement operationally.

### Sections

```text
Overview
Fulfillment
Assignments
Dispatch Activity
Trip Information
Timeline
```

### Actions

Only state-appropriate administrative actions should appear.

---

# 48. Admin Trips List

### Purpose

Monitor trips across the marketplace.

### Columns

```text
Trip ID
Vendor
Driver
Vehicle
Pickup
Destination
Status
Date/Time
Created
Updated
```

### Capabilities

```text
Search
Filter
Sort
Pagination
Open Details
```

---

# 49. Admin Trip Details

### Purpose

Provide complete operational visibility into a trip.

### Sections

```text
Trip Overview
Vendor
Driver
Vehicle
Location
Current State
Timeline
Financial Information where authorized
Support/Operational Actions
```

---

# 50. Admin Assignments

### Purpose

Monitor requirement-to-driver assignment activity.

### Information

```text
Assignment ID
Requirement
Driver
Vehicle
Status
Created
Updated
```

### Operational visibility

Should allow Admin to understand:

```text
Which drivers were considered?
Which offers were sent?
Which were accepted/declined?
Which assignments succeeded?
```

Detailed dispatch telemetry is defined in `11_DISPATCH_ENGINE.md`.

---

# 51. Admin Driver List

### Purpose

Manage and review Drivers.

### Columns

```text
Driver ID
Name
Phone/contact where authorized
Verification
Vehicle
Availability
Account Status
Created
```

### Capabilities

```text
Search
Filter
Sort
Pagination
Open Driver
```

---

# 52. Admin Driver Details

### Sections

```text
Profile
Verification
KYC
Vehicle
Availability
Trip History
Earnings/Financial Information where authorized
Account Status
Audit History
```

### Actions

Potentially:

```text
Approve
Reject
Suspend
Reactivate
```

Only display actions allowed by current state and permissions.

---

# 53. Admin Driver Verification

### Purpose

Review and make a KYC verification decision.

### Information

```text
Driver information
Submitted documents
Verification status
Submission timestamps
Review information
```

### Actions

```text
Approve
Reject
```

Rejection should capture a reason where required.

---

# 54. Admin Vendor List

### Purpose

Manage Vendors.

### Columns

```text
Vendor ID
Organization
Contact
Verification
Status
Created
```

### Capabilities

```text
Search
Filter
Sort
Pagination
Open Vendor
```

---

# 55. Admin Vendor Details

### Sections

```text
Organization
Verification
Requirements
Trips
Payments
Account Status
Audit History
```

---

# 56. Admin Vendor Approval

### Purpose

Approve or reject Vendor onboarding.

### Actions

```text
Approve
Reject
```

Actions must be state-aware and auditable.

---

# 57. Admin Pricing

### Purpose

Manage approved marketplace pricing configuration.

### Responsibilities

Potentially include:

```text
View pricing
Create pricing configuration
Edit pricing
Activate/deactivate pricing
```

Exact pricing model is a business decision and remains configurable rather than hard-coded into this screen specification.

---

# 58. Admin Payments

### Purpose

Monitor payment activity.

### Information

```text
Payment ID
Vendor
Related trip/requirement
Amount
Status
Created
Updated
```

### Filters

Potentially:

```text
Status
Date
Vendor
```

---

# 59. Admin Payment Details

### Purpose

Investigate individual payment records.

### Information

```text
Payment ID
Amount
Related records
Current state
Provider/reference information where authorized
Timeline
Failure information
```

---

# 60. Admin Settlements

### Purpose

Monitor and process settlement operations.

### Information

```text
Settlement ID
Driver/vendor
Amount
Status
Period
Created
Processed
```

### Actions

State-dependent and permission-controlled.

---

# 61. Admin Reports

### Purpose

Provide operational reporting.

Potential report categories:

```text
Trips
Fulfillment
Drivers
Vendors
Revenue/payments
Cancellations
Operational performance
```

Only metrics backed by actual data should be displayed.

---

# 62. Admin Support

### Purpose

Allow Admin to investigate and support users.

### Information

Potentially:

```text
User
Related requirement
Related trip
Issue
Status
Created
Updated
```

### Actions

```text
Review
Update support status
Add internal notes where supported
```

---

# 63. Admin Audit Logs

### Purpose

Provide visibility into sensitive administrative actions.

### Information

```text
Timestamp
Actor
Role
Action
Resource
Resource ID
Result
Context/reason
Request ID where available
```

Audit records should be read-only to normal Admin workflows.

---

# 64. Global Loading State

Every screen that performs asynchronous data loading must provide a loading state.

Use design-system skeletons where practical.

---

# 65. Global Empty State

Every collection screen must define an empty state.

Examples:

```text
No requirements found.
No trips found.
No drivers found.
No vendors found.
No payments found.
```

If filters caused the empty result:

```text
No results match your filters.

[Clear Filters]
```

---

# 66. Global Error State

Every network-backed screen must define an error state.

Minimum structure:

```text
What happened
+
Recovery action
```

Example:

```text
Unable to load requirements.

Please check your connection and try again.

[Retry]
```

---

# 67. Permission-Denied State

If the user attempts to access a resource they are not authorized to access:

```text
You don't have permission to view this information.
```

Do not reveal sensitive details about the resource.

---

# 68. Not-Found State

If a requested resource does not exist or is no longer accessible:

```text
This requirement could not be found.
```

Do not expose whether another user's private resource exists when authorization rules prohibit that disclosure.

---

# 69. Session Expiration

When the session expires:

```text
Your session has expired.

Please sign in again.
```

Where safe, preserve the user's navigation context.

Do not preserve sensitive credentials or OTP information.

---

# 70. Realtime Screen Behavior

Screens displaying operational state should update when relevant realtime events are received.

Examples:

```text
Requirement fulfillment
Trip state
Driver assignment
Trip location
Payment state
```

If realtime connection is unavailable, show appropriate stale/offline indication.

---

# 71. Screen State Matrix

Every stateful screen must account for at least:

```text
Initial
Loading
Success/Data
Empty
Error
Unauthorized
Session Expired
```

Additional domain states must be defined where applicable.

---

# 72. Mutation State Matrix

Every mutation screen/action must account for:

```text
Idle
Submitting
Success
Business Failure
Validation Failure
Network Failure
Permission Failure
```

Critical mutations must prevent duplicate execution.

---

# 73. Screen-to-Role Matrix

| Screen              | Vendor |   Driver   |       Admin      |
| ------------------- | :----: | :--------: | :--------------: |
| Login               |    ✓   |      ✓     |     Separate     |
| OTP                 |    ✓   |      ✓     |     Separate     |
| Vendor Onboarding   |    ✓   |      ✗     |      Review      |
| Vendor Home         |    ✓   |      ✗     |         ✗        |
| Requirements        |    ✓   |      ✗     |         ✓        |
| Create Requirement  |    ✓   |      ✗     |        ✗*        |
| Requirement Details |  ✓ Own |      ✗     |         ✓        |
| Fulfillment         |  ✓ Own |      ✗     |         ✓        |
| Vendor Trips        |  ✓ Own |      ✗     |         ✓        |
| Vendor Payments     |  ✓ Own |      ✗     |         ✓        |
| Vendor Profile      |    ✓   |      ✗     |         ✓        |
| Driver Onboarding   |    ✗   |      ✓     |      Review      |
| Driver KYC          |    ✗   |      ✓     |      Review      |
| Vehicle             |    ✗   |      ✓     |      Review      |
| Driver Home         |    ✗   |      ✓     |         ✗        |
| Opportunities       |    ✗   |      ✓     | Operational view |
| Offer Details       |    ✗   |      ✓     |      Inspect     |
| Driver Trips        |    ✗   |    ✓ Own   |         ✓        |
| Active Trip         |    ✗   | ✓ Assigned |         ✓        |
| Earnings            |    ✗   |    ✓ Own   |         ✓        |
| Withdrawal          |    ✗   |      ✓     |  Manage/inspect  |
| Driver Profile      |    ✗   |    ✓ Own   |         ✓        |
| Admin Dashboard     |    ✗   |      ✗     |         ✓        |
| Admin Pricing       |    ✗   |      ✗     |         ✓        |
| Admin Settlements   |    ✗   |      ✗     |         ✓        |
| Reports             |    ✗   |      ✗     |         ✓        |
| Audit Logs          |    ✗   |      ✗     |         ✓        |

`*` Any Admin requirement-management creation capability must be explicitly defined before implementation; do not assume it exists.

---

# 74. Screen Implementation Rules

The AI agent MUST:

1. Implement only screens defined in this document or explicitly approved additions.
2. Reuse components from `04_DESIGN_SYSTEM.md`.
3. Follow UX behavior from `05_UI_UX_GUIDELINES.md`.
4. Enforce permissions from `03_USER_ROLES_AND_PERMISSIONS.md`.
5. Use actual domain states.
6. Handle loading, empty, and error states.
7. Avoid fake data in production flows.
8. Avoid inventing business rules.
9. Keep critical actions backend-confirmed.
10. Keep state transitions consistent with `12_STATE_MACHINES.md`.
11. Keep API interactions consistent with `10_API_SPECIFICATION.md`.
12. Never create arbitrary screen-specific design patterns.

---

# 75. Screen Completion Definition

A screen is complete only when:

```text
Visual Design
+
Navigation
+
Data
+
Actions
+
Permissions
+
Domain States
+
Loading
+
Empty
+
Error
+
Network Handling
+
Accessibility
```

have all been addressed.

A screen that only renders the happy path is incomplete.

---

# 76. No Speculation Rule

Where this document does not define:

* a field
* business rule
* status
* pricing behavior
* cancellation policy
* KYC requirement
* settlement rule
* dispatch behavior

the implementation agent must **not invent one**.

The agent should identify the missing requirement and defer it to the appropriate source-of-truth document.

---

# 77. Final Screen Architecture

The overall UX should converge toward:

```text
                 AdhocX
                   │
        ┌──────────┴──────────┐
        │                     │
   Mobile App             Admin App
        │                     │
   ┌────┴────┐          Operations Console
   │         │
Vendor     Driver
   │         │
Requirements Offers
Trips       Trips
Payments    Earnings
Profile     Profile
```

The application should remain operationally focused throughout.

---

# 78. Final Principle

Every screen exists to support a real user task.

Therefore:

> **No screen should exist merely because the database has an entity.**

The correct sequence is:

```text
User Need
↓
Business Workflow
↓
Domain State
↓
User Action
↓
Screen
↓
Component
```

Not:

```text
Database Table
↓
CRUD Screen
```

AdhocX is an operational marketplace, not a CRUD application.