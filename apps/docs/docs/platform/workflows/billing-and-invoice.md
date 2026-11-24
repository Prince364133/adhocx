---
title: Billing and Payout Workflow
description: Verified corporate invoice, dispute, credit-note and payout workflow.
---

# Billing and Payout Workflow

**Evidence status:** Verified against corporate billing and payout services.

## Invoice Workflow

```mermaid
sequenceDiagram
  participant Admin
  participant API
  participant DB
  participant Corporate

  Admin->>API: Generate invoice batch
  API->>DB: Aggregate route billables
  API->>DB: Create draft/issued invoices
  Corporate->>API: View invoice and PDF
  Corporate->>API: Raise dispute
  API->>DB: Create dispute
  Admin->>API: Accept or reject dispute
  Admin->>DB: Create immutable credit note or reject
```

Invoices use paise values rather than frontend floating-point values for
corporate and GST calculations.

Issued invoices are not edited. Corrections use disputes and credit notes.

## Payout Workflow

```mermaid
stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> APPROVED
  APPROVED --> PROCESSING
  PROCESSING --> PAID: Provider confirmation
  PROCESSING --> FAILED: Provider rejection
  FAILED --> PROCESSING: Retry
  PAID --> REVERSED
```

Payout invariants:

- A payout batch has maker/checker separation.
- A checker cannot approve their own batch.
- Submission sends the batch to the provider.
- Submission never itself marks the payout paid.
- Provider callback confirmation performs the paid transition.
- Reversal creates compensating records.
- Reconciliation identifies mismatches and unmatched confirmations.
