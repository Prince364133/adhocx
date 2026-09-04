# 03 — USER ROLES AND PERMISSIONS

**Product:** AdhocX
**Document:** User Roles & Permissions
**Status:** Source of Truth
**Version:** V1
**Last Updated:** 2026-09-02

---

## 1. Purpose

This document defines the authoritative access-control model for AdhocX.

It establishes:

* Which user roles exist.
* What each role is allowed to access.
* What each role is allowed to create, view, modify, approve, cancel, or complete.
* Which actions require additional permissions or state conditions.
* Which actions are forbidden.
* How authorization must be enforced across mobile, admin, API, and backend services.

This document must be used together with:

* `01_PRD.md`
* `02_FEATURES.md`
* `07_ARCHITECTURE.md`
* `10_API_SPECIFICATION.md`
* `12_STATE_MACHINES.md`
* `13_SECURITY.md`

### Critical rule

**UI visibility is not authorization.**

Hiding a button does not constitute access control.

Every protected operation must be authorized by the backend.

---

# 2. Role Model

AdhocX V1 has three primary business roles:

| Role   | Surface            | Primary Responsibility                                             |
| ------ | ------------------ | ------------------------------------------------------------------ |
| User | Flutter Mobile App | Creates transportation requirements and manages fulfillment        |
| Driver | Flutter Mobile App | Provides vehicle capacity and executes assigned trips              |
| Admin  | Next.js Admin App  | Operates, verifies, controls, supports, and audits the marketplace |

There is one Flutter application for User and Driver roles.

The Admin application is a separate Next.js web application.

---

# 3. Role Separation

## 3.1 User

The User represents a transportation company/user that has a corporate transportation requirement and needs additional vehicle capacity.

The User can:

* Manage its organization/profile.
* Create transportation requirements.
* Post one or multiple vehicle requirements.
* Monitor fulfillment.
* View assigned drivers.
* View trip status.
* Cancel eligible requirements.
* View payment information.
* View historical trips.
* Receive operational notifications.

The User cannot:

* Approve drivers.
* Approve other users.
* Change marketplace pricing unless explicitly authorized by an Admin capability.
* Modify driver KYC.
* Modify driver earnings.
* Modify settlement records.
* Complete a trip on behalf of a driver.
* Assign an arbitrary unverified driver outside the dispatch/assignment rules.
* Access Admin functionality.

---

# 4. Driver

The Driver represents an individual commercial driver/vehicle provider participating in the AdhocX supply network.

The Driver can:

* Register/login.
* Complete onboarding.
* Submit KYC information.
* Register vehicle information.
* Set availability.
* View eligible trip opportunities.
* Receive trip offers.
* Accept or decline offers.
* View assigned trips.
* Navigate to pickup.
* Mark operational milestones where permitted.
* Start trips using the required OTP flow.
* Complete trips.
* View earnings.
* Request withdrawals where eligible.
* Receive notifications.

The Driver cannot:

* Approve their own KYC.
* Modify Admin-controlled verification status.
* Modify their own settlement records.
* Modify trip financial amounts.
* Assign themselves to arbitrary requirements.
* Assign another driver.
* Approve another driver.
* Approve a user.
* Change marketplace pricing.
* Access Admin functionality.

---

# 5. Admin

Admin is the operational control role for the AdhocX platform.

Admin capabilities include:

* Marketplace monitoring.
* Driver verification.
* User approval.
* Trip/requirement monitoring.
* Pricing management.
* Settlement management.
* Support operations.
* Reporting.
* Audit inspection.
* Operational intervention where explicitly supported.

Admin is a privileged role and must use stronger authorization controls than normal marketplace users.

---

# 6. Permission Model

Permissions should be represented as explicit capabilities rather than scattered role checks.

Recommended conceptual format:

```text
resource.action
```

Examples:

```text
trip.create
trip.view
trip.cancel
trip.accept
trip.start
trip.complete

driver.view
driver.verify

user.view
user.approve

payment.view
settlement.manage
pricing.manage

report.view
audit.view
```

The exact permission implementation belongs to the architecture/security documents.

The important rule is:

> **Authorization should be capability-based and centrally enforced.**

Do not implement authorization as dozens of unrelated:

```text
if user.role === ...
```

conditions throughout the codebase.

---

# 7. Permission Matrix

## 7.1 Authentication

| Action                   | User | Driver | Admin |
| ------------------------ | -----: | -----: | ----: |
| Request OTP              |      ✓ |      ✓ |     ✓ |
| Verify OTP               |      ✓ |      ✓ |     ✓ |
| Login                    |      ✓ |      ✓ |     ✓ |
| Logout                   |      ✓ |      ✓ |     ✓ |
| View own account         |      ✓ |      ✓ |     ✓ |
| Modify own basic profile |      ✓ |      ✓ |     ✓ |

---

# 8. User Permissions

| Capability                        | User |
| --------------------------------- | -----: |
| View own dashboard                |      ✓ |
| View own organization             |      ✓ |
| Edit own profile                  |      ✓ |
| Create requirement                |      ✓ |
| Create bulk requirement           |      ✓ |
| View own requirements             |      ✓ |
| View requirement details          |      ✓ |
| View fulfillment status           |      ✓ |
| View assigned drivers             |      ✓ |
| View assigned vehicle information |      ✓ |
| View trip status                  |      ✓ |
| Cancel eligible requirement       |      ✓ |
| View own payment records          |      ✓ |
| View own trip history             |      ✓ |
| Receive notifications             |      ✓ |
| Contact/support request           |      ✓ |
| View driver KYC documents         |      ✗ |
| Approve driver                    |      ✗ |
| Modify driver status              |      ✗ |
| Modify pricing                    |      ✗ |
| Modify settlement                 |      ✗ |
| View other users' data          |      ✗ |
| Access admin dashboard            |      ✗ |
| View audit logs                   |      ✗ |

---

# 9. Driver Permissions

| Capability                      | Driver |
| ------------------------------- | -----: |
| View own profile                |      ✓ |
| Edit permitted profile fields   |      ✓ |
| Submit KYC                      |      ✓ |
| View own KYC status             |      ✓ |
| Upload required documents       |      ✓ |
| Register vehicle                |      ✓ |
| View own vehicle                |      ✓ |
| Set online/offline availability |      ✓ |
| View eligible opportunities     |      ✓ |
| Receive trip offers             |      ✓ |
| Accept offer                    |      ✓ |
| Decline offer                   |      ✓ |
| View assigned trips             |      ✓ |
| View trip details               |      ✓ |
| Navigate to pickup              |      ✓ |
| Mark arrival where supported    |      ✓ |
| Enter/start trip OTP            |      ✓ |
| Complete assigned trip          |      ✓ |
| View own earnings               |      ✓ |
| Request withdrawal              |      ✓ |
| View own withdrawal history     |      ✓ |
| Receive notifications           |      ✓ |
| View another driver's data      |      ✗ |
| Approve own KYC                 |      ✗ |
| Modify KYC verification result  |      ✗ |
| Modify earnings                 |      ✗ |
| Modify settlement               |      ✗ |
| Modify pricing                  |      ✗ |
| Assign another driver           |      ✗ |
| Access user functions         |      ✗ |
| Access admin dashboard          |      ✗ |

---

# 10. Admin Permissions

Admin permissions are grouped by operational domain.

## 10.1 Dashboard

| Capability                 | Admin |
| -------------------------- | ----: |
| View operational dashboard |     ✓ |
| View marketplace metrics   |     ✓ |
| View active requirements   |     ✓ |
| View active assignments    |     ✓ |
| View active trips          |     ✓ |
| View operational alerts    |     ✓ |

---

## 10.2 Driver Management

| Capability                       | Admin |
| -------------------------------- | ----: |
| Search drivers                   |     ✓ |
| View driver profile              |     ✓ |
| View driver onboarding status    |     ✓ |
| Review KYC                       |     ✓ |
| Approve KYC                      |     ✓ |
| Reject KYC                       |     ✓ |
| Suspend driver                   |     ✓ |
| Reactivate driver                |     ✓ |
| View vehicle information         |     ✓ |
| View driver trip history         |     ✓ |
| View driver earnings information |     ✓ |

Admin actions affecting driver eligibility must be auditable.

---

# 11. User Management

| Capability                  | Admin |
| --------------------------- | ----: |
| Search users              |     ✓ |
| View user profile         |     ✓ |
| Review user onboarding    |     ✓ |
| Approve user              |     ✓ |
| Reject user               |     ✓ |
| Suspend user              |     ✓ |
| Reactivate user           |     ✓ |
| View user requirements    |     ✓ |
| View user trip history    |     ✓ |
| View user payment records |     ✓ |

---

# 12. Requirement Management

Admin can:

* View requirements.
* Filter requirements.
* Search requirements.
* Inspect requirement state.
* View fulfillment.
* View assigned drivers.
* Inspect dispatch status.
* Inspect failure conditions.
* Perform explicitly authorized operational interventions.

Admin must not have unrestricted mutation capabilities merely because they are an Admin.

For every administrative mutation, the system must define:

1. What the action does.
2. When it is allowed.
3. Which states permit it.
4. Whether confirmation is required.
5. Whether an audit event is generated.

---

# 13. Trip Management

Admin can:

* View active trips.
* View historical trips.
* Inspect trip state.
* Inspect driver.
* Inspect user.
* Inspect vehicle.
* Inspect timestamps.
* Inspect operational events.
* Support users when problems occur.

Administrative trip-state modification must be explicitly defined by the state-machine specification.

The implementation must **not** provide a generic:

```text
admin.changeTripStatus(anyStatus)
```

operation.

Every state transition must have an explicit business meaning.

---

# 14. Pricing Permissions

Pricing is Admin-controlled in V1.

| Action                       | User |           Driver | Admin |
| ---------------------------- | -----: | ---------------: | ----: |
| View applicable price        |      ✓ | Where applicable |     ✓ |
| Change marketplace pricing   |      ✗ |                ✗ |     ✓ |
| Create pricing configuration |      ✗ |                ✗ |     ✓ |
| Modify pricing configuration |      ✗ |                ✗ |     ✓ |
| Delete pricing configuration |      ✗ |                ✗ |     ✓ |

Exact pricing rules remain a commercial/product decision and must not be invented by the implementation agent.

---

# 15. Settlement Permissions

Financial records require strict authorization.

### User

Can:

* View their own payment records.
* View applicable invoices/charges.
* View payment status.

Cannot:

* Modify financial records.
* Modify settlement amounts.
* Mark payments as completed.

### Driver

Can:

* View their own earnings.
* View eligible withdrawal information.
* Request withdrawal.

Cannot:

* Modify earnings.
* Modify settlement amounts.
* Approve their own withdrawal.
* Mark their own payment as successful.

### Admin

Can:

* View settlement records.
* Review payment failures.
* Process/approve settlement operations where supported.
* Investigate payment discrepancies.
* View financial audit history.

Financial mutations must always be traceable.

---

# 16. Data Ownership

A user should only access data appropriate to their organizational and operational scope.

## User

Default data boundary:

```text
User
 ├── Own organization
 ├── Own requirements
 ├── Own assignments
 ├── Own trips
 └── Own financial records
```

A User must not access another User's records.

---

## Driver

Default data boundary:

```text
Driver
 ├── Own profile
 ├── Own KYC
 ├── Own vehicle
 ├── Eligible opportunities
 ├── Own assignments
 ├── Own trips
 └── Own earnings
```

A Driver must not access another Driver's private information.

---

## Admin

Admin has broader operational visibility according to assigned administrative permissions.

However:

> **Admin access is broad, not unlimited.**

Sensitive information should only be exposed when required for the operational function.

---

# 17. Resource-Level Authorization

Role checks alone are insufficient.

For example:

```text
User A
Requirement #100
```

and:

```text
User B
Requirement #200
```

Both users have:

```text
role = USER
```

But User A must not be able to access Requirement #200.

Therefore authorization must check both:

```text
role/capability
+
resource ownership/scope
```

Conceptually:

```text
can(user, action, resource)
```

Example:

```text
can(vendorA, "requirement.view", requirement100)
→ true

can(vendorA, "requirement.view", requirement200)
→ false
```

---

# 18. State-Based Authorization

Permission alone does not mean an action is currently valid.

Example:

A Driver may have:

```text
trip.start
```

permission.

But that does not mean the Driver can start any trip at any time.

The system must additionally verify:

* The trip belongs to the Driver.
* The assignment is valid.
* The trip is in the correct state.
* Required prerequisites are satisfied.
* OTP validation succeeds.
* The action has not already been completed.

Therefore:

```text
Authorization
+
Ownership
+
State validation
+
Business rules
```

must all pass.

---

# 19. Example: Accepting a Trip

A Driver's request to accept an offer should conceptually require:

```text
driver.authenticated
AND
driver.is_verified
AND
offer.belongs_to_driver_or_is_valid_for_driver
AND
offer.status == AVAILABLE
AND
offer.not_expired
AND
trip/requirement.state permits acceptance
AND
capacity remains available
```

The final acceptance must happen atomically.

The UI cannot guarantee this.

---

# 20. Example: Starting a Trip

A Driver cannot simply call:

```text
POST /trip/start
```

and change the trip state.

The backend must verify:

```text
authenticated driver
+
assigned driver matches current user
+
trip is in startable state
+
OTP is valid
+
OTP has not already been consumed
+
required prerequisites are satisfied
```

Only then can the state transition occur.

---

# 21. Example: Completing a Trip

Trip completion must verify:

```text
authenticated driver
+
driver is assigned to trip
+
trip is currently active
+
completion requirements satisfied
```

The system then performs the corresponding state transition and records the event.

Financial settlement must be handled separately according to the payment/ledger rules.

---

# 22. Administrative Actions

Administrative actions should be categorized.

### Read-only

Examples:

```text
driver.view
user.view
trip.view
requirement.view
settlement.view
report.view
audit.view
```

### Operational mutation

Examples:

```text
driver.verify
driver.suspend
user.approve
user.suspend
pricing.manage
settlement.process
```

### High-impact mutation

Any action affecting:

* financial records
* verification status
* marketplace eligibility
* trip state
* settlement
* account suspension

must have additional safeguards.

Depending on the final security architecture, these may include:

* confirmation
* reason/comment
* audit logging
* elevated authentication
* permission separation
* approval workflow

Exact implementation is defined in `13_SECURITY.md`.

---

# 23. Authentication vs Authorization

These are separate concepts.

### Authentication

Answers:

> Who are you?

Example:

```text
OTP → authenticated user
```

### Authorization

Answers:

> What are you allowed to do?

Example:

```text
authenticated driver
→ can accept eligible trip

authenticated user
→ can create requirement
```

Successful OTP verification must never automatically imply unrestricted access.

---

# 24. Role Switching

The mobile application supports both User and Driver experiences.

The application must not casually expose both role interfaces merely because a user has multiple capabilities.

The backend must determine the user's authorized role/context.

If multi-role accounts are eventually supported, the active role/context must be explicit and authorization must be evaluated against it.

The implementation must not infer permissions from UI navigation state.

---

# 25. Suspended Users

A suspended user must not continue performing protected marketplace actions.

Examples:

### Suspended Driver

Should not be able to:

* Accept new offers.
* Become eligible for new dispatch.
* Start new trips.
* Perform restricted marketplace actions.

Existing operational handling must follow the state-machine and support rules.

### Suspended User

Should not be able to:

* Create new requirements.
* Request new fulfillment.
* Perform restricted marketplace actions.

Exact handling of already-active requirements/trips is a business/state-machine concern and must be explicitly defined.

---

# 26. Verification-Dependent Permissions

Some permissions depend on verification status.

For example:

```text
Driver account exists
        ↓
KYC submitted
        ↓
KYC approved
        ↓
Driver eligible for marketplace dispatch
```

Therefore:

```text
authenticated
```

does not mean:

```text
marketplace eligible
```

The backend must enforce eligibility.

---

# 27. Permission Naming Convention

Use consistent permission names.

Recommended pattern:

```text
<resource>.<action>
```

Examples:

```text
user.view
user.update

user.view
user.update
user.approve
user.suspend

driver.view
driver.update
driver.verify
driver.suspend

vehicle.view
vehicle.create
vehicle.update

requirement.create
requirement.view
requirement.cancel

offer.view
offer.accept
offer.decline

assignment.view

trip.view
trip.start
trip.complete
trip.cancel

payment.view
payment.create

settlement.view
settlement.process

pricing.view
pricing.manage

report.view

support.create
support.manage

audit.view
```

The final permission registry should be centralized.

---

# 28. API Authorization Rules

Every protected API endpoint must define:

```text
Authentication requirement
+
Required permission
+
Resource scope
+
State/business validation
```

Example:

```text
POST /requirements
```

requires:

```text
authenticated
+
user role/capability
+
user account eligible
```

Example:

```text
POST /offers/:id/accept
```

requires:

```text
authenticated
+
driver capability
+
offer eligibility
+
offer not expired
+
capacity still available
```

Example:

```text
POST /admin/drivers/:id/verify
```

requires:

```text
authenticated
+
admin capability
+
driver verification action
```

---

# 29. Frontend Authorization Rules

Frontend applications should use permissions to control:

* navigation
* screen visibility
* action visibility
* disabled states
* contextual messaging

But frontend authorization is only a UX layer.

The frontend must never be treated as the security boundary.

For example:

```text
if (!canAcceptOffer) {
    hideAcceptButton();
}
```

is useful.

But the backend must independently reject unauthorized requests.

---

# 30. Forbidden Implementation Patterns

The AI agent must NOT implement:

### Pattern 1 — UI-only authorization

```text
if (user.role === "admin") {
   showAdminButton();
}
```

without backend enforcement.

---

### Pattern 2 — Trusting client-supplied role

Never trust:

```json
{
  "role": "ADMIN"
}
```

from the client.

The authenticated identity and permissions must come from trusted server-side authentication/authorization context.

---

### Pattern 3 — Client-supplied ownership

Never trust:

```json
{
  "vendorId": "someone-elses-id"
}
```

as proof that the caller can access that user.

---

### Pattern 4 — Generic Admin Override

Do not create unrestricted endpoints such as:

```text
/admin/force-change-anything
```

Admin capabilities must still be explicit and auditable.

---

### Pattern 5 — Direct database mutation

Business clients must not directly mutate authorization-sensitive records in the database.

Use domain/application operations.

---

# 31. Audit Requirements

The following actions should generate audit events:

* Driver verification.
* Driver rejection.
* Driver suspension.
* Driver reactivation.
* User approval.
* User rejection.
* User suspension.
* User reactivation.
* Pricing changes.
* Settlement operations.
* High-impact administrative trip actions.
* Other sensitive administrative mutations.

An audit record should conceptually contain:

```text
actor
actorRole
action
resource
resourceId
timestamp
result
reason/context
requestId
```

The exact schema belongs to the security/audit architecture.

---

# 32. Permission Decision Flow

For every protected operation:

```text
Request
   ↓
Authenticate identity
   ↓
Resolve role/capabilities
   ↓
Check permission
   ↓
Load resource
   ↓
Check ownership/scope
   ↓
Check current state
   ↓
Check business rules
   ↓
Perform atomic operation
   ↓
Record event/audit where required
   ↓
Return result
```

This sequence should be treated as a core backend security pattern.

---

# 33. V1 Role Summary

## User

**Goal:** Fulfill transportation requirements.

Primary actions:

```text
Create Requirement
→ Monitor Fulfillment
→ View Assignments
→ Track Trips
→ Manage Payments
→ View History
```

---

## Driver

**Goal:** Provide verified vehicle capacity and execute assigned trips.

Primary actions:

```text
Complete KYC
→ Register Vehicle
→ Set Availability
→ Receive Offer
→ Accept
→ Navigate
→ Start with OTP
→ Complete
→ Earn
→ Withdraw
```

---

## Admin

**Goal:** Operate and control the marketplace.

Primary actions:

```text
Monitor
→ Verify
→ Approve
→ Manage
→ Support
→ Set Pricing
→ Settle
→ Report
→ Audit
```

---

# 34. Source-of-Truth Rules

The following rules are mandatory for implementation:

1. **Three primary business roles exist in V1: User, Driver, Admin.**
2. User and Driver use the same Flutter mobile application.
3. Admin uses the separate Next.js application.
4. Backend authorization is mandatory.
5. UI hiding is never considered sufficient authorization.
6. Role permission and resource ownership must both be checked.
7. Permission and current domain state must both be checked.
8. Verification status can affect marketplace eligibility.
9. Financial permissions must be strictly controlled.
10. Administrative mutations must be auditable.
11. Do not create unrestricted Admin overrides.
12. Do not trust client-provided roles or ownership identifiers.
13. Do not invent permissions that are not required by the product.
14. When a new feature introduces a protected action, its permission must be explicitly defined.
15. Authorization logic must be centralized rather than duplicated throughout the codebase.

---

# 35. Relationship to Other Documents

This document defines **who can perform an action**.

It does not define:

* Detailed product behavior → `01_PRD.md`
* Complete feature behavior → `02_FEATURES.md`
* Visual design → `04_DESIGN_SYSTEM.md`
* UX behavior → `05_UI_UX_GUIDELINES.md`
* Screen-level requirements → `06_SCREEN_SPECIFICATIONS.md`
* System architecture → `07_ARCHITECTURE.md`
* Database schema → `09_DATABASE.md`
* API contracts → `10_API_SPECIFICATION.md`
* Dispatch logic → `11_DISPATCH_ENGINE.md`
* State transitions → `12_STATE_MACHINES.md`
* Security implementation → `13_SECURITY.md`
* Financial ledger → `15_PAYMENTS_AND_LEDGER.md`

If another document requires an action that is not represented here, the permission model must be updated before implementation.

---

# 36. Final Authorization Principle

AdhocX authorization must follow one fundamental rule:

> **A user may perform an operation only when the user is authenticated, has the required capability, has access to the target resource, and the current business state permits the operation.**

In shorthand:

```text
Allowed Action
=
Authentication
+
Permission
+
Resource Scope
+
Valid State
+
Business Rules
```

Anything less is not production-grade authorization.