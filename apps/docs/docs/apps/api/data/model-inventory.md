---
title: Prisma Model Inventory
description: Source-derived inventory of Prisma models by domain.
status: inventory
last_reviewed: "2026-11-23"
---

# Prisma Model Inventory

**Coverage status:** Inventory. Model names below are reconciled against
declarations in `apps/api/prisma/schema.prisma`; this page is not a
field-level data dictionary. For every model's fields, keys, native types,
relationships and indexes, use the [Prisma data dictionary](./data-dictionary.md).
The dictionary also documents all 42 schema enums and links enum fields to
their declared values.

## Identity and Supply

| Model | Purpose |
|---|---|
| `User` | Account, role and corporate tenant identity |
| `Vendor` | Vendor organization profile and verification |
| `Driver` | Driver profile, availability and performance |
| `DriverReferral` | Referral and incentive relationship |
| `Vehicle` | Driver or registered vehicle details |

## Marketplace

| Model | Purpose |
|---|---|
| `Requirement` | Cab/vehicle demand |
| `Offer` | Marketplace driver offer |
| `Assignment` | Driver/requirement allocation |
| `Trip` | Marketplace trip lifecycle |
| `TripEvent` | Trip state and GPS event history |
| `Review` | Trip participant reviews |
| `Dispute` | Trip or support dispute |

## Finance

| Model | Purpose |
|---|---|
| `Payment` | Payment/transaction record |
| `LedgerEntry` | Wallet and ledger credit/debit |
| `Settlement` | Settlement/payout operation |
| `Coupon` | Coupon definition |
| `CouponRedemption` | Coupon use |
| `DriverSubscriptionPayment` | Driver subscription purchase |

## Pricing and Locality

| Model | Purpose |
|---|---|
| `VehiclePricingTier` | Vehicle category pricing inputs, including base fare, included distance and per-kilometer rate |
| `RateCardVersion` | Versioned rate-card header with audience, status and effective date |
| `RateCardRow` | Rate-card amount for a hub, zone and vehicle type |
| `LocalityMaster` | Locality display name, aliases, zone and optional geospatial/H3 metadata |
| `ZonalQuoteSnapshot` | Quote-time snapshot of selected rate versions, zone/locality and trip coordinates |
| `PricingPlan` | Distance pricing plan |
| `PricingSlab` | Pricing slab |
| `PricingAudit` | Pricing change audit |
| `TripQuote` | Marketplace trip quote |
| `TripPricingSnapshot` | Immutable trip price snapshot |

## Communications and Platform

| Model | Purpose |
|---|---|
| `BlogPost` | Marketing content |
| `DeviceToken` | Push target |
| `Notification` | Notification record |
| `NotificationPreference` | User channel preference |
| `NotificationCampaign` | Broadcast campaign |
| `NotificationCampaignRecipient` | Campaign recipient |
| `LeadCapture` | Marketing/enterprise lead |
| `AuditLog` | Administrative and domain audit |
| `FeatureFlag` | Runtime feature state |
| `SystemPolicyConfig` | Global policy configuration |

## Corporate and ETS

| Model | Purpose |
|---|---|
| `CorporateTenant` | Corporate organization |
| `CorporateOffice` | Tenant office |
| `CorporateEmployee` | Tenant employee |
| `CorporateEmployeeLocation` | Employee pickup location |
| `CorporateRoster` | Shift roster version |
| `CorporateRosterEntry` | Roster line |
| `CorporateTransportRequest` | Employee transport demand |
| `CorporateRoute` | Planned/executed route |
| `CorporateRouteStop` | Ordered route stop |
| `CorporateDepartment` | Organizational department |
| `CorporateTransportZone` | Tenant service zone |
| `CorporateCostCenter` | Cost allocation |
| `CorporateTenantPolicy` | Versioned policy |
| `CorporateShiftTemplate` | Recurring shift |
| `CorporateHoliday` | Tenant/office holiday |

## Corporate Operations and Finance

| Model | Purpose |
|---|---|
| `CorporateInvoice` | Tenant invoice |
| `CorporateInvoiceLine` | Invoice route billable |
| `CorporateInvoiceDispute` | Invoice dispute |
| `CorporateCreditNote` | Additive correction |
| `CorporateDriverEarning` | Driver route earning |
| `CorporatePayoutBatch` | Maker/checker payout batch |
| `CorporatePayout` | Individual payout |
| `CorporatePayoutProviderEvent` | Provider confirmation event |
| `CorporateRateCard` | Tenant rate card |
| `CorporateDriverRateCard` | Driver rate card |
| `CorporateDriverOffer` | Corporate route offer |
| `CorporateTripEvent` | Ordered route lifecycle event |
| `CorporateRouteAssignmentEvent` | Driver assignment history |
| `CorporateVehiclePosition` | Live vehicle GPS/history |
| `CorporateTripFeedback` | Employee trip feedback |

## Safety and Support

| Model | Purpose |
|---|---|
| `CorporateSosAlert` | Emergency alert/lifecycle |
| `CorporateSupportTicket` | Support case |
| `CorporateSupportTicketAttachment` | Ticket attachment |
| `CorporateSupportTicketComment` | Public/internal comment |
| `CorporateSupportTicketActivity` | Ticket audit activity |
| `CorporateTicketMessage` | Shared support message |

## KYC

| Model | Purpose |
|---|---|
| `DigioVerification` | DigiO/DigiLocker verification result and audit |

## Count Reconciliation

All 75 model declarations in `apps/api/prisma/schema.prisma` are represented
in this inventory. The model-level field and relation details are now
documented in 11 bounded-context pages. Deployment state, current row data
and migrations applied to a live database were not introspected; see the
[database data dictionary](./data-dictionary.md) and
[migration guide](./migrations-and-indexes.md).
