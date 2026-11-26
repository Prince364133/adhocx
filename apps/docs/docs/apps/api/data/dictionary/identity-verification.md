---
title: Identity Verification Data Dictionary
description: Prisma model fields, constraints and relations for identity verification.
status: source-verified
last_reviewed: "2026-11-23"
---

# Identity Verification Data Dictionary

**Business responsibility:** Persisted DigiO/DigiLocker verification request and result records.
**Primary API ownership evidence:** `apps/api/src/modules/digio/`. Ownership is logical; other domains may read or update shared models.
**Related API references:** [DigiO verification](../../reference/endpoints/digio-controller.md). These are context links, not a claim that every route reads or writes every model in this group.

**Source:** `apps/api/prisma/schema.prisma` (1 models). Model sections cite the declaration line.

## Relationship overview

This ERD includes only direct Prisma foreign-key relations whose two models belong to this page. Cross-context relations remain listed in each model table; a SQL scalar without a Prisma relation is not drawn as a foreign key.

No Prisma foreign-key edge has both endpoints in this bounded-context group. See the model relation tables for cross-context references.

## DigioVerification {#digio-verification}

**Business purpose:** DigiO/DigiLocker verification result and audit
**Storage:** Prisma model `DigioVerification` maps to PostgreSQL table `digio_verifications`. **Schema declaration:** `apps/api/prisma/schema.prisma:2242`.

| Field | Prisma type / native type | Nullability | Default / behavior | Key and column mapping | Schema description |
|---|---|---|---|---|---|
| `id` | String | Required | `@default(uuid())` | `@id` | — |
| `tenantId` | String? | Nullable | `—` | column `tenant_id` | — |
| `userId` | String? | Nullable | `—` | column `user_id` | — |
| `driverId` | String? | Nullable | `—` | column `driver_id` | — |
| `vendorId` | String? | Nullable | `—` | column `vendor_id` | — |
| `vehicleId` | String? | Nullable | `—` | column `vehicle_id` | — |
| `verificationType` | String | Required | `—` | column `verification_type` | — |
| `category` | String | Required | `@default("KYC")` | — | — |
| `status` | String | Required | `@default("PENDING")` | — | — |
| `verified` | Boolean | Required | `@default(false)` | — | — |
| `identifier` | String? | Nullable | `—` | — | — |
| `uniqueRequestId` | String | Required | `—` | `@unique`; column `unique_request_id` | — |
| `digioRequestId` | String? | Nullable | `—` | `@unique`; column `digio_request_id` | — |
| `referenceId` | String? | Nullable | `—` | column `reference_id` | — |
| `verifiedName` | String? | Nullable | `—` | column `verified_name` | — |
| `matchScore` | Float? | Nullable | `—` | column `match_score` | — |
| `complianceOk` | Boolean? | Nullable | `—` | column `compliance_ok` | — |
| `complianceNotes` | String? | Nullable | `—` | column `compliance_notes` | — |
| `errorMessage` | String? | Nullable | `—` | column `error_message` | — |
| `summary` | Json? | Nullable | `—` | — | — |
| `rawResponse` | Json? | Nullable | `—` | column `raw_response` | — |
| `verifiedAt` | DateTime? | Nullable | `—` | column `verified_at` | — |
| `expiresAt` | DateTime? | Nullable | `—` | column `expires_at` | — |
| `createdAt` | DateTime | Required | `@default(now())` | column `created_at` | — |
| `updatedAt` | DateTime | Required | `@updatedAt` | column `updated_at` | — |

### Relations

| Relation field | Related model | Foreign-key mapping | On delete | Relation name |
|---|---|---|---|---|
| — | No Prisma relation fields | — | — | — |

### Model-level keys and indexes

| Declaration | Meaning |
|---|---|
| `@@index([userId, verificationType])` | Database index |
| `@@index([driverId, verificationType])` | Database index |
| `@@index([vendorId, verificationType])` | Database index |
| `@@index([vehicleId, verificationType])` | Database index |
| `@@index([tenantId])` | Database index |

## Reading the field tables

- `Required` means Prisma marks the scalar field non-null; `Nullable` means the Prisma type permits null.
- `[]` denotes a Prisma list field. Object/relation fields are not physical columns unless a scalar FK field is also listed.
- `@db.*`, `@map` and `@@map` preserve native PostgreSQL types and storage names declared in the schema.
- Defaults and `@updatedAt` are schema declarations, not guarantees that existing production databases have no drift.
- A missing description means the Prisma schema has no field-level documentation comment; field meaning should not be guessed from the name alone.
