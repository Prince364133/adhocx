# 15_PAYMENTS_AND_LEDGER.md

# AdhocX Payments & Ledger Specification

**Document Status:** Source of Truth
**Version:** V1
**Audience:** Backend Engineers, Mobile Engineers, Admin Engineers, Finance/Operations, QA Engineers, DevOps, AI Coding Agents

---

# 1. Purpose

This document defines the authoritative financial architecture for AdhocX V1.

It covers:

* User payments
* Driver earnings
* Ledger architecture
* Financial transactions
* Payment provider integration
* Payment status
* Settlement
* Driver withdrawals
* Refunds
* Adjustments
* Reconciliation
* Financial concurrency
* Financial auditability
* Financial failure handling
* Financial security

The goal is to ensure that every rupee entering, moving through, or leaving AdhocX is explainable.

---

# 2. Core Financial Principle

AdhocX must never model money as:

```text
user.balance += 500
```

or:

```text
driver.wallet = 12500
```

as the sole source of financial truth.

Instead:

```text
Business Event
      ↓
Financial Transaction
      ↓
Ledger Entries
      ↓
Derived Balance / Financial View
```

The ledger is the authoritative financial history.

---

# 3. Financial Invariants

The financial system must guarantee:

```text
No money is created accidentally.
No money disappears silently.
No transaction is duplicated.
No financial state is changed arbitrarily.
Every adjustment is traceable.
Every settlement is traceable.
Every withdrawal is traceable.
```

---

# 4. Money Representation

Money must never use floating-point arithmetic.

Forbidden:

```typescript
const amount = 1250.35;
```

for financial calculations.

Preferred representation:

```text
amountMinor = 125035
currency = INR
```

or a precisely defined decimal representation.

The platform must choose one canonical representation and use it consistently.

---

# 5. Currency

Every financial amount must have an explicit currency.

Example:

```json
{
  "amountMinor": 125000,
  "currency": "INR"
}
```

Do not assume currency merely because the application currently launches in one market.

---

# 6. Currency Rules

A financial transaction must not silently mix currencies.

For example:

```text
INR + USD
```

must never be calculated as though both amounts are interchangeable.

Multi-currency support is not required for V1 unless the business explicitly enables it.

---

# 7. Financial Domains

AdhocX financial architecture consists of:

```text
User Payments
Driver Earnings
Platform Revenue
Ledger
Settlements
Withdrawals
Refunds
Adjustments
Reconciliation
```

---

# 8. Financial Flow

A typical completed trip may produce:

```text
Trip Completed
      ↓
Calculate financial outcome
      ↓
Create financial transaction
      ↓
Create ledger entries
      ↓
User payment
      ↓
Driver earning
      ↓
Platform revenue
      ↓
Settlement
      ↓
Driver withdrawal
```

The exact commercial model is still **TBD**.

---

# 9. Commercial Rules Are Separate

The financial architecture must support configurable commercial rules.

These include:

```text
user price
driver earning
platform commission
markup
tax
cancellation charge
no-show charge
refund
other adjustments
```

The exact values and formulas are **TBD**.

Implementation agents must not invent them.

---

# 10. Financial Transaction

A financial transaction represents one logical financial business operation.

Examples:

```text
Trip earning
User payment
Driver earning
Refund
Commission
Withdrawal
Adjustment
Settlement
```

Conceptually:

```text
FinancialTransaction
--------------------
id
type
status
referenceType
referenceId
currency
createdAt
completedAt
metadata
```

The exact database schema belongs to `09_DATABASE.md`.

---

# 11. Ledger

The ledger records the financial effect of transactions.

A transaction may produce multiple ledger entries.

Example:

```text
Trip completed
      ↓
Financial transaction
      ↓
┌─────────────────────┐
│ Driver earning      │
│ Platform revenue    │
│ User obligation   │
└─────────────────────┘
```

---

# 12. Double-Entry Principle

The financial architecture should follow a double-entry-style model.

For a financial transaction:

```text
Total Debits = Total Credits
```

This provides a strong invariant against money creation/destruction.

The exact account model may be simplified for V1, but the underlying ledger must remain balanced.

---

# 13. Ledger Accounts

Conceptual accounts may include:

```text
User Payable
Driver Payable
Platform Revenue
Platform Receivable
Payment Clearing
Refund Liability
Driver Withdrawal Clearing
```

The exact chart of accounts is **TBD**.

---

# 14. Ledger Entry

A ledger entry should contain:

```text
id
transactionId
accountId
direction
amount
currency
reference
createdAt
```

Direction may be represented as:

```text
DEBIT
CREDIT
```

or through signed amounts if the implementation explicitly defines the semantics.

The system must use one consistent model.

---

# 15. Ledger Immutability

Ledger entries should be append-only.

Do not silently modify:

```text
amount
currency
account
historical transaction
```

after posting.

If an error occurs, create an explicit adjustment/reversal transaction.

---

# 16. Corrections

Incorrect transaction:

```text
Transaction A
```

must not simply be edited.

Instead:

```text
Transaction A
    ↓
Correction / Reversal
    ↓
Transaction B
```

This preserves financial history.

---

# 17. Balance Calculation

A user's available financial balance should be derived from ledger state or a safely maintained projection.

Conceptually:

```text
Available Balance
=
Credited Funds
-
Debited Funds
-
Reserved Funds
```

The exact formula depends on the account model.

---

# 18. Balance Projection

For performance, the system may maintain a materialized balance/projection.

However:

```text
Balance Projection
```

is not more authoritative than:

```text
Ledger
```

If they disagree, the system must be able to reconcile the projection against the ledger.

---

# 19. Wallet Terminology

The mobile application may use user-friendly terminology such as:

```text
Earnings
Available to withdraw
Pending
Withdrawn
```

Internally, the backend should maintain explicit financial accounts and ledger semantics.

Avoid using one generic:

```text
wallet.balance
```

to represent every financial state.

---

# 20. Driver Earnings

Driver earnings represent amounts owed to the driver.

Conceptual lifecycle:

```text
Trip Completed
      ↓
Earning Calculated
      ↓
Pending
      ↓
Available
      ↓
Withdrawn
```

The exact timing of availability is **TBD**.

---

# 21. Earnings States

Conceptually:

```text
PENDING
AVAILABLE
WITHDRAWN
ADJUSTED
```

The implementation may derive these from ledger/account state rather than maintaining a separate mutable earning status.

---

# 22. Earning Calculation

After trip completion:

```text
Trip
 ↓
Pricing Engine
 ↓
Financial Calculation
 ↓
Earning Transaction
 ↓
Ledger
```

The driver-facing earning must come from the backend calculation.

The driver cannot submit:

```json
{
  "earning": "1000"
}
```

and have the system trust it.

---

# 23. Pricing Snapshot

Financial transactions should preserve the pricing information used at the time of calculation.

This may include:

```text
base amount
distance component
time component
commission
tax
adjustments
final amount
currency
pricing version
```

Exact fields depend on finalized commercial rules.

---

# 24. Pricing Version

When a pricing configuration changes, historical transactions must not silently change.

Therefore financial calculations should retain a reference or snapshot of the pricing configuration/version used.

Example:

```text
Trip 1001
Pricing Version = 7
```

Changing pricing to Version 8 must not recalculate Trip 1001 automatically.

---

# 25. User Payment

User payment represents money the user owes to AdhocX or another relevant financial account.

Conceptual flow:

```text
Requirement / Trip
      ↓
Amount determined
      ↓
Payment initiated
      ↓
Provider processing
      ↓
Payment successful
      ↓
Ledger updated
```

The exact payment timing is **TBD**.

---

# 26. Payment States

Canonical payment states:

```text
PENDING
PROCESSING
PAID
FAILED
CANCELLED
REFUNDED
```

These states must remain aligned with `12_STATE_MACHINES.md`.

---

# 27. Payment Initiation

A payment may be initiated through:

```http
POST /user/payments/{paymentId}/initiate
```

The backend determines:

* amount
* currency
* payable party
* provider
* payment metadata

The client must not determine the authoritative amount.

---

# 28. Payment Provider Abstraction

The backend must not hard-code payment logic throughout the domain.

Preferred:

```text
Payment Domain
      ↓
Payment Provider Interface
      ↓
┌───────────────┐
│ Provider A    │
│ Provider B    │
└───────────────┘
```

A provider such as Razorpay may be selected for the initial market, but the domain model must not become dependent on provider-specific concepts.

---

# 29. Payment Provider Data

Store only provider information required for:

* reconciliation
* support
* refunds
* status checks
* auditability

Do not store unnecessary sensitive provider data.

---

# 30. Payment Idempotency

Payment initiation must support idempotency.

Example:

```text
Idempotency-Key: payment-operation-123
```

If the client retries due to network failure:

```text
same operation
```

must not create:

```text
two payment orders
```

unless the provider/domain explicitly requires a safe recovery flow.

---

# 31. Payment Webhooks

Payment providers may send webhook events.

Flow:

```text
Provider
   ↓
Webhook
   ↓
Signature verification
   ↓
Payload validation
   ↓
Event deduplication
   ↓
Payment state transition
   ↓
Ledger effect
```

Webhook handling must be idempotent.

---

# 32. Webhook Event IDs

Every provider webhook event should be uniquely identified.

Store the provider event ID where available.

If the same event is received twice:

```text
first → process
second → safely acknowledge/ignore
```

without duplicate financial effects.

---

# 33. Payment State vs Ledger State

Payment state and ledger state are separate.

Example:

```text
Payment = PAID
Ledger = POSTED
```

is expected.

But an external provider event should not directly manipulate arbitrary ledger records.

The application maps provider events into domain financial transitions.

---

# 34. Payment Failure

If payment fails:

```text
Payment → FAILED
```

The system must not treat the payment as successful.

The user should receive the appropriate notification.

Retry behavior depends on provider/business rules.

---

# 35. Payment Timeout

Payment processing may remain unresolved temporarily.

Example:

```text
Payment = PROCESSING
```

The system must not prematurely mark it:

```text
PAID
```

without authoritative confirmation.

---

# 36. Payment Reconciliation

The system should periodically reconcile:

```text
AdhocX payment records
        vs
Payment provider records
```

Potential mismatch:

```text
AdhocX = PROCESSING
Provider = PAID
```

should enter a reconciliation workflow rather than being ignored.

---

# 37. Reconciliation Job

Conceptually:

```text
Scheduled Reconciliation
        ↓
Fetch provider state
        ↓
Compare
        ↓
Identify mismatch
        ↓
Apply safe correction
OR
Create operational alert
```

Exact frequency is **TBD**.

---

# 38. Driver Settlement

Settlement represents the process of making earned money payable to the driver.

Conceptual flow:

```text
Trip Completed
      ↓
Earning Created
      ↓
Pending
      ↓
Settlement Eligible
      ↓
Settlement Processing
      ↓
Settled
```

Exact settlement timing is **TBD**.

---

# 39. Settlement States

Canonical conceptual states:

```text
PENDING
PROCESSING
SETTLED
FAILED
REVERSED
```

These must remain synchronized with the state-machine document.

---

# 40. Settlement Transaction

A settlement should reference the financial source.

Example:

```text
Settlement
    ↓
Driver
    ↓
Earnings
    ↓
Ledger Entries
    ↓
Payment/Transfer Reference
```

It must be possible to trace a settlement back to its underlying earnings.

---

# 41. Settlement Idempotency

Processing a settlement must be idempotent.

If a worker retries:

```text
same settlement
```

must not produce:

```text
two payouts
```

or duplicate ledger effects.

---

# 42. Withdrawal

Withdrawal allows a driver to request available funds.

Endpoint:

```http
POST /driver/withdrawals
```

Request:

```json
{
  "amountMinor": 125000,
  "currency": "INR"
}
```

The backend determines whether the driver has sufficient available funds.

---

# 43. Withdrawal Validation

Before withdrawal:

```text
authenticated driver
+
withdrawal permission
+
valid account state
+
valid amount
+
valid currency
+
sufficient available funds
+
no conflicting financial operation
```

must be satisfied.

---

# 44. Withdrawal Reservation

A withdrawal must not allow the same funds to be withdrawn twice.

Conceptually:

```text
Available
   ↓
Reserve
   ↓
Withdrawal Processing
   ↓
Success → Completed
Failure → Release/Reverse reservation
```

The reservation mechanism must be transactionally safe.

---

# 45. Concurrent Withdrawal Example

Driver has:

```text
Available = ₹1,000
```

Two requests arrive simultaneously:

```text
Withdrawal A = ₹800
Withdrawal B = ₹800
```

Correct behavior:

```text
A → succeeds
B → rejected
```

or otherwise safely queued according to business rules.

The system must never pay ₹1,600 from ₹1,000 of available funds.

---

# 46. Withdrawal States

Conceptual:

```text
REQUESTED
PROCESSING
COMPLETED
FAILED
CANCELLED
```

These must remain aligned with the state machine.

---

# 47. Withdrawal Failure

If a withdrawal fails:

```text
Withdrawal → FAILED
```

Funds must not disappear.

Any reserved amount must be safely restored or represented through an appropriate reversal.

---

# 48. Withdrawal Provider

The payout provider must also be abstracted.

Preferred:

```text
Settlement / Withdrawal Domain
          ↓
Payout Provider Interface
          ↓
Provider Implementation
```

This prevents the core financial model from being coupled to one provider.

---

# 49. Refunds

Refunds must be explicit financial transactions.

Never simply:

```text
payment.status = REFUNDED
```

without creating the corresponding financial effect.

Correct conceptual model:

```text
Original Payment
      ↓
Refund Transaction
      ↓
Ledger Reversal/Adjustment
      ↓
Provider Refund
```

---

# 50. Partial Refund

If partial refunds are supported:

```text
Original Payment = ₹10,000
Refund = ₹2,000
Remaining = ₹8,000
```

The ledger must represent the exact financial movement.

The same money must not be refunded twice.

---

# 51. Refund Idempotency

Refund operations must be idempotent.

A retry after a network timeout must not create multiple refunds.

Provider reference IDs and internal idempotency keys should be used.

---

# 52. Cancellation Financial Effects

Cancellation may create financial consequences.

Examples:

```text
driver cancellation fee
user cancellation fee
partial earning
refund
penalty
```

These are commercial rules and remain **TBD**.

The architecture must support them without assuming them.

---

# 53. No-Show Financial Effects

Passenger no-show may create a financial outcome.

The financial system must support:

```text
Trip → NO_SHOW
        ↓
Financial rule evaluation
        ↓
Adjustment / earning / refund
```

Exact policy is **TBD**.

---

# 54. Adjustments

Administrative financial corrections must be represented explicitly.

Example:

```text
Adjustment
    ↓
Reason
    ↓
Actor
    ↓
Original financial reference
    ↓
Ledger entries
```

No silent balance modification is allowed.

---

# 55. Administrative Adjustment

An admin must not have an endpoint like:

```http
PATCH /driver/wallet
```

with:

```json
{
  "balance": 50000
}
```

Instead:

```http
POST /admin/financial-adjustments
```

or an equivalent explicit financial operation may create a traceable adjustment.

Exact endpoint naming is subject to final API implementation.

---

# 56. Adjustment Authorization

Financial adjustments require:

```text
explicit permission
+
valid reason
+
actor identity
+
audit record
+
ledger transaction
```

High-risk adjustments may eventually require multiple approvals.

That policy is **TBD**.

---

# 57. Financial Audit Trail

Every financial transaction should be traceable through:

```text
Business Resource
      ↓
Financial Transaction
      ↓
Ledger Entries
      ↓
External Provider Reference
      ↓
Settlement / Refund / Withdrawal
```

Example:

```text
Trip 123
 ↓
Earning Transaction 456
 ↓
Ledger Entries 789, 790
 ↓
Settlement 321
 ↓
Payout Provider Reference XYZ
```

---

# 58. Financial Metadata

Transactions may store metadata such as:

```text
source type
source ID
pricing version
provider
provider reference
actor
reason
created timestamp
```

Metadata must not contain secrets.

---

# 59. Financial Event Ordering

Financial side effects must occur after authoritative business state is committed.

Example:

```text
Trip Completed
      ↓
Commit trip state
      ↓
Reliable event
      ↓
Financial calculation
      ↓
Ledger transaction
```

If financial calculation fails, the trip should not be incorrectly reverted simply because a downstream worker failed.

Instead the financial workflow enters an observable retry/reconciliation state.

---

# 60. Financial Worker Architecture

Financial processing may use asynchronous workers.

Example:

```text
Trip Completed
      ↓
Financial Event
      ↓
Queue
      ↓
Financial Worker
      ↓
Calculate
      ↓
Create Ledger Transaction
      ↓
Settlement workflow
```

Workers must be idempotent.

---

# 61. Ledger Transaction Atomicity

When a ledger transaction requires multiple entries:

```text
Debit Account
+
Credit Account
```

all entries must be committed atomically.

Never allow:

```text
Debit committed
Credit failed
```

to remain as a completed financial transaction.

---

# 62. Balanced Ledger

For every completed double-entry transaction:

```text
SUM(debits) = SUM(credits)
```

The backend should validate this invariant before committing the transaction.

---

# 63. Ledger Currency Integrity

For a single balanced transaction:

```text
Debit Currency = Credit Currency
```

unless the system explicitly implements FX/multi-currency accounting.

FX is outside V1 unless explicitly enabled.

---

# 64. Financial Transaction State

A transaction may conceptually move through:

```text
PENDING
POSTED
REVERSED
```

The exact financial transaction state is implementation-specific, while payment/settlement states follow their own state machines.

---

# 65. Reversal

A reversal should reference the original transaction.

Example:

```text
Transaction A
    ↓
Transaction B: REVERSAL_OF A
```

This creates a clear audit trail.

---

# 66. No Historical Mutation

Never:

```text
UPDATE ledger_entries
SET amount = ...
```

to hide an error.

Correct the history with a new transaction.

---

# 67. Financial Reconciliation

Reconciliation should occur at multiple levels.

### Payment reconciliation

```text
AdhocX ↔ Payment Provider
```

### Settlement reconciliation

```text
AdhocX ↔ Payout Provider
```

### Ledger reconciliation

```text
Derived balances ↔ Ledger
```

### Operational reconciliation

```text
Completed Trips ↔ Expected Earnings
```

---

# 68. Reconciliation Mismatch

A mismatch should create an explicit operational issue.

Example:

```text
Trip completed
Expected earning = ₹1,000
Ledger = ₹0
```

This must not be silently ignored.

Possible state:

```text
FINANCIAL_RECONCILIATION_REQUIRED
```

or an equivalent operational record.

---

# 69. Reconciliation Safety

Automated reconciliation may correct only clearly deterministic mismatches.

Ambiguous mismatches should be escalated to operations.

The system must not make destructive financial guesses.

---

# 70. Financial Notifications

Relevant financial state changes may generate notifications:

```text
Payment successful
Payment failed
Earnings available
Settlement completed
Withdrawal completed
Withdrawal failed
Refund processed
```

Notifications must always follow authoritative financial state.

---

# 71. Financial Privacy

Drivers should see:

```text
their own earnings
their own withdrawals
their own settlements
```

Users should see:

```text
their own payments
their own invoices/financial records where applicable
```

Admin access must be permission-controlled.

---

# 72. Financial Data Exposure

Never expose:

```text
internal ledger account IDs
other users' financial data
provider secrets
bank credentials
payment credentials
internal reconciliation metadata
```

unless explicitly required.

---

# 73. Financial API Rules

The API may expose:

```text
GET /driver/earnings
GET /driver/withdrawals
GET /user/payments
GET /admin/settlements
```

But clients cannot directly mutate ledger state.

---

# 74. Financial Authorization

A financial operation requires:

```text
Authentication
+
Financial Permission
+
Resource Ownership
+
Valid Financial State
+
Business Rules
+
Idempotency
+
Concurrency Protection
```

---

# 75. Financial Concurrency

The following operations require explicit concurrency protection:

```text
withdrawal
settlement
refund
payment processing
ledger posting
financial adjustment
earning creation
```

Database transactions and unique constraints should be used where appropriate.

---

# 76. Duplicate Earning Protection

Trip completion processing may be retried.

The system must guarantee:

```text
one qualifying trip
→
one canonical earning transaction
```

unless an explicit adjustment creates another financial transaction.

Use a unique business reference such as:

```text
earning source = tripId
```

where appropriate.

---

# 77. Duplicate Settlement Protection

A single earning should not be settled twice.

The settlement workflow must identify which ledger/earning amounts have already been settled.

---

# 78. Duplicate Withdrawal Protection

A withdrawal request must have a unique internal identity.

Retries must not create duplicate payout operations.

---

# 79. Payment Provider Timeout

Important case:

```text
AdhocX
 ↓
Provider payment request
 ↓
network timeout
```

The system must not assume:

```text
FAILED
```

simply because the HTTP request timed out.

The provider may have processed the payment.

Correct approach:

```text
PROCESSING / UNKNOWN
      ↓
provider reconciliation
      ↓
authoritative result
```

---

# 80. Payout Provider Timeout

Same principle applies to withdrawals.

If the payout request times out:

```text
do not blindly retry
```

because the provider may already have processed it.

Use provider reference/reconciliation mechanisms.

---

# 81. Financial Retry Policy

Retries must be:

```text
bounded
idempotent
observable
provider-aware
```

Never use:

```text
retry forever
```

for financial operations.

---

# 82. Financial Queue Failure

If a financial worker fails:

```text
Trip remains COMPLETED
Financial workflow remains observable
Worker retries safely
```

The system must not silently lose the financial event.

---

# 83. Outbox Requirement

For critical financial triggers:

```text
Business State
+
Financial Event
```

should use an outbox/reliable event mechanism when necessary to guarantee delivery.

---

# 84. Financial Observability

Track metrics such as:

```text
payments_total
payments_failed
payment_processing_duration
refunds_total
refund_failures
earnings_created
settlements_total
settlements_failed
withdrawals_total
withdrawals_failed
ledger_posting_failures
reconciliation_mismatches
financial_job_retries
```

---

# 85. Financial Alerts

Operations should be alerted for:

```text
large reconciliation mismatch
repeated payment failures
settlement backlog
withdrawal failure spike
ledger imbalance
duplicate financial transaction attempt
provider outage
```

Exact thresholds are **TBD**.

---

# 86. Financial Reporting

Admin financial reports should be derived from authoritative financial records.

Reports must not use:

```text
frontend state
cached UI values
arbitrary wallet balances
```

The ledger and financial transaction records remain authoritative.

---

# 87. Financial Export

Large financial exports should use asynchronous jobs.

Example:

```text
POST /admin/reports/financial/export
```

```text
QUEUED
 ↓
PROCESSING
 ↓
COMPLETED
 ↓
Secure download
```

Exports containing financial/PII data require authorization.

---

# 88. Financial Data Retention

Financial records may require longer retention than ordinary application data.

Retention must consider:

* legal requirements
* tax/accounting requirements
* business requirements
* audit requirements

Exact retention periods are **TBD**.

---

# 89. Financial Security

Financial endpoints must receive elevated security attention.

Priority controls:

```text
authentication
authorization
idempotency
concurrency control
audit logging
webhook verification
provider reconciliation
ledger immutability
```

---

# 90. Payment Provider Abstraction Rule

Business code should depend on interfaces such as:

```text
PaymentProvider
PayoutProvider
RefundProvider
```

rather than concrete providers.

This allows the system to replace or add providers without rewriting the financial domain.

---

# 91. Example End-to-End Financial Flow

Example only:

```text
Trip Completed
      ↓
Pricing calculation
      ↓
User obligation = ₹1,500
Driver earning = ₹1,200
Platform revenue = ₹300
      ↓
Ledger transaction
      ↓
User payment
      ↓
Driver earning becomes payable
      ↓
Settlement
      ↓
Driver withdrawal
```

The numbers above are illustrative only.

The actual commercial model is **TBD**.

---

# 92. Financial Failure Example

```text
Trip Completed
      ↓
Earning calculation
      ↓
Ledger posting fails
      ↓
Financial worker retries
      ↓
Retry succeeds
      ↓
Earning posted
```

The system should not require manual intervention for every transient infrastructure failure.

---

# 93. Financial Ambiguity Example

```text
Payment request sent
      ↓
Network timeout
      ↓
Unknown provider state
```

Correct:

```text
Do not assume FAILED.
Do not blindly create another payment.
Reconcile with provider.
```

---

# 94. Admin Financial Operations

Admin should be able to:

```text
view payments
view settlements
view reconciliation issues
view financial history
process approved settlement workflows
perform authorized adjustments
```

Admin should not have unrestricted direct ledger mutation.

---

# 95. Audit Requirements

Every financial administrative action should record:

```text
actorId
actorRole
action
resourceId
reason
timestamp
requestId
result
```

---

# 96. Financial Domain Boundaries

Financial domain owns:

```text
pricing result consumption
earnings
payments
ledger
settlements
withdrawals
refunds
adjustments
reconciliation
```

It does not own:

```text
authentication
dispatch
driver location
navigation
push delivery
```

---

# 97. Recommended Backend Structure

```text
payments/
├── application/
│   ├── initiate-payment
│   ├── process-webhook
│   ├── refund-payment
│   └── reconcile-payment
│
├── domain/
│   ├── payment
│   ├── financial-transaction
│   ├── ledger
│   ├── earning
│   ├── settlement
│   └── withdrawal
│
├── infrastructure/
│   ├── payment-provider
│   ├── payout-provider
│   ├── repositories
│   └── reconciliation
│
└── presentation/
    ├── payment-controller
    ├── withdrawal-controller
    └── webhook-controller
```

The exact folder organization must remain consistent with `08_FOLDER_STRUCTURE.md`.

---

# 98. Forbidden Financial Patterns

Never implement:

```text
wallet.balance += amount
```

as the financial source of truth.

Never:

```text
UPDATE ledger SET balance = ...
```

Never allow the mobile app to submit authoritative earnings.

Never trust payment provider status without verification.

Never process a webhook without signature verification.

Never create payouts without idempotency.

Never refund without a traceable financial transaction.

Never silently modify historical ledger entries.

Never allow admin UI to directly update financial database rows.

---

# 99. AI Agent Financial Rules

Any AI coding agent working on AdhocX must:

1. Read this document before implementing financial functionality.
2. Never use floating-point arithmetic for money.
3. Never treat a wallet balance as the sole source of truth.
4. Never directly modify ledger history.
5. Never allow clients to determine earnings.
6. Never allow clients to determine payment amounts.
7. Never trust payment webhooks without verification.
8. Implement webhook idempotency.
9. Implement payment idempotency.
10. Implement withdrawal idempotency.
11. Protect concurrent withdrawals.
12. Protect concurrent settlements.
13. Protect duplicate earning creation.
14. Use transactions for balanced ledger posting.
15. Preserve financial auditability.
16. Never hide financial corrections through mutation.
17. Use explicit adjustment/reversal transactions.
18. Never invent commission or pricing rules.
19. Keep provider-specific code behind abstractions.
20. Add tests for financial failure and retry scenarios.
21. Add concurrency tests for withdrawals and settlements.
22. Never mark financial success based solely on client state.
23. Never assume a provider timeout means failure.
24. Keep the ledger authoritative over projections.
25. Treat unresolved commercial rules as `TBD`.

---

# 100. Financial Testing Requirements

Tests must cover:

### Ledger

```text
balanced transaction
unbalanced transaction rejected
duplicate transaction rejected
reversal
adjustment
```

### Earnings

```text
trip completed
earning created once
retry does not duplicate earning
```

### Payments

```text
payment initiated
payment succeeds
payment fails
payment timeout
duplicate webhook
invalid webhook
refund
partial refund if supported
```

### Withdrawals

```text
valid withdrawal
insufficient funds
concurrent withdrawals
provider success
provider failure
provider timeout
retry
```

### Settlement

```text
settlement created
settlement success
settlement failure
settlement retry
duplicate settlement attempt
```

---

# 101. Financial Load Testing

The system should be tested under:

```text
high trip completion volume
simultaneous payment events
large settlement batches
many withdrawal requests
duplicate webhook bursts
provider latency
queue backlog
```

The primary objective is to preserve financial correctness under load.

---

# 102. Financial Reconciliation Testing

Test scenarios such as:

```text
provider says PAID
AdhocX says PROCESSING

provider says REFUNDED
AdhocX says PAID

payout provider says COMPLETED
AdhocX says PROCESSING

ledger projection differs from ledger
```

Each mismatch must result in a deterministic reconciliation workflow.

---

# 103. Financial Definition of Done

Financial functionality is complete only when:

```text
[ ] Money representation standardized
[ ] Currency handling standardized
[ ] Ledger implemented
[ ] Ledger balance invariant implemented
[ ] Ledger immutability implemented
[ ] Financial transactions implemented
[ ] Earnings implemented
[ ] Payment lifecycle implemented
[ ] Payment provider abstraction implemented
[ ] Webhook verification implemented
[ ] Webhook idempotency implemented
[ ] Settlement implemented
[ ] Withdrawal implemented
[ ] Withdrawal concurrency protection implemented
[ ] Refund workflow implemented
[ ] Adjustment workflow implemented
[ ] Reconciliation implemented
[ ] Financial audit trail implemented
[ ] Financial notifications implemented
[ ] Financial observability implemented
[ ] Retry policies implemented
[ ] Financial security implemented
[ ] Unit tests implemented
[ ] Integration tests implemented
[ ] Concurrency tests implemented
[ ] Reconciliation tests implemented
```

---

# 104. Final Financial Principle

AdhocX financial architecture must make this question answerable at any time:

> **“Where did this money come from, where did it go, and why?”**

The answer must be traceable through:

```text
Business Event
      ↓
Financial Transaction
      ↓
Ledger Entries
      ↓
Settlement / Payment / Withdrawal
      ↓
External Provider Reference
```

The platform must never depend on an unexplained mutable balance.

**Money is not UI state.
Money is not a number on a screen.
Money is a traceable financial event backed by an authoritative ledger.**