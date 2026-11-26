---
title: Prisma Data Dictionary
description: Field-level reference for every Prisma model, including keys, relations, native types and indexes.
status: source-verified
last_reviewed: "2026-11-23"
---

# Prisma Data Dictionary

## What this database represents

PostgreSQL is the API’s authoritative relational store for account identity, supply, marketplace and trip records, finance, corporate transport operations, platform configuration and verification metadata. Prisma declares the application data model; Redis, object storage and browser/mobile caches serve separate operational or file/UI purposes and are not represented as Prisma models.

## Coverage and provenance

| Schema measure | Count |
|---|---:|
| Prisma models | 75 |
| Prisma enums | 42 |
| Prisma fields (scalar, enum and relation fields) | 1272 |
| Scalar and enum fields | 1052 |
| Relation fields | 220 |
| Model-level index/unique/primary-key declarations | 157 |

The generated Prisma DMMF was compared with `apps/api/prisma/schema.prisma`: all model names and field names reconcile. The database server was not introspected; deployed database drift, live row counts and production values are not certified by this dictionary.

Each model page lists all fields, Prisma/native type, nullability, declared defaults, primary/unique annotations, storage mappings, schema comments, relation direction and delete behavior, and model-level indexes/constraints. If the schema has no field comment, the documentation deliberately does not invent a semantic definition.

## Bounded-context model pages

| Data context | Functional responsibility | Models and detailed reference |
|---|---|---|
| Identity and Supply | Accounts, role identity, vendor and driver profiles, referrals and vehicles. | [User](./dictionary/identity-and-supply.md#user), [Vendor](./dictionary/identity-and-supply.md#vendor), [Driver](./dictionary/identity-and-supply.md#driver), [DriverReferral](./dictionary/identity-and-supply.md#driver-referral), [Vehicle](./dictionary/identity-and-supply.md#vehicle) |
| Marketplace and Trips | Demand publication, offers, assignments, trip lifecycle, reviews and disputes. | [Requirement](./dictionary/marketplace-and-trips.md#requirement), [Offer](./dictionary/marketplace-and-trips.md#offer), [Assignment](./dictionary/marketplace-and-trips.md#assignment), [Trip](./dictionary/marketplace-and-trips.md#trip), [TripEvent](./dictionary/marketplace-and-trips.md#trip-event), [Review](./dictionary/marketplace-and-trips.md#review), [Dispute](./dictionary/marketplace-and-trips.md#dispute) |
| Payments and Promotions | Payments, wallet ledger entries, settlements, coupon definitions/redemptions and driver subscription payments. | [Payment](./dictionary/payments-and-promotions.md#payment), [LedgerEntry](./dictionary/payments-and-promotions.md#ledger-entry), [Settlement](./dictionary/payments-and-promotions.md#settlement), [Coupon](./dictionary/payments-and-promotions.md#coupon), [CouponRedemption](./dictionary/payments-and-promotions.md#coupon-redemption), [DriverSubscriptionPayment](./dictionary/payments-and-promotions.md#driver-subscription-payment) |
| Pricing and Locality | Vehicle pricing inputs, versioned pricing plans, quotes, pricing snapshots, locality metadata and pricing audit. | [VehiclePricingTier](./dictionary/pricing-and-locality.md#vehicle-pricing-tier), [RateCardVersion](./dictionary/pricing-and-locality.md#rate-card-version), [RateCardRow](./dictionary/pricing-and-locality.md#rate-card-row), [LocalityMaster](./dictionary/pricing-and-locality.md#locality-master), [ZonalQuoteSnapshot](./dictionary/pricing-and-locality.md#zonal-quote-snapshot), [PricingPlan](./dictionary/pricing-and-locality.md#pricing-plan), [PricingSlab](./dictionary/pricing-and-locality.md#pricing-slab), [PricingAudit](./dictionary/pricing-and-locality.md#pricing-audit), [TripQuote](./dictionary/pricing-and-locality.md#trip-quote), [TripPricingSnapshot](./dictionary/pricing-and-locality.md#trip-pricing-snapshot) |
| Platform and Communications | Audit records, content, push registration and notifications, campaigns, leads, runtime flags and system policy configuration. | [AuditLog](./dictionary/platform-and-communications.md#audit-log), [BlogPost](./dictionary/platform-and-communications.md#blog-post), [DeviceToken](./dictionary/platform-and-communications.md#device-token), [Notification](./dictionary/platform-and-communications.md#notification), [NotificationPreference](./dictionary/platform-and-communications.md#notification-preference), [NotificationCampaign](./dictionary/platform-and-communications.md#notification-campaign), [NotificationCampaignRecipient](./dictionary/platform-and-communications.md#notification-campaign-recipient), [LeadCapture](./dictionary/platform-and-communications.md#lead-capture), [FeatureFlag](./dictionary/platform-and-communications.md#feature-flag), [SystemPolicyConfig](./dictionary/platform-and-communications.md#system-policy-config) |
| Corporate Tenancy and Organization | Corporate tenant identity, offices, employees, departments, service zones, cost centers, tenant policies and employee locations. | [CorporateTenant](./dictionary/corporate-tenancy-and-organization.md#corporate-tenant), [CorporateOffice](./dictionary/corporate-tenancy-and-organization.md#corporate-office), [CorporateEmployee](./dictionary/corporate-tenancy-and-organization.md#corporate-employee), [CorporateEmployeeLocation](./dictionary/corporate-tenancy-and-organization.md#corporate-employee-location), [CorporateDepartment](./dictionary/corporate-tenancy-and-organization.md#corporate-department), [CorporateTransportZone](./dictionary/corporate-tenancy-and-organization.md#corporate-transport-zone), [CorporateCostCenter](./dictionary/corporate-tenancy-and-organization.md#corporate-cost-center), [CorporateTenantPolicy](./dictionary/corporate-tenancy-and-organization.md#corporate-tenant-policy) |
| Corporate Rosters and Scheduling | Versioned employee rosters, transport demand, shift templates and tenant/office holidays. | [CorporateRoster](./dictionary/corporate-rosters-and-scheduling.md#corporate-roster), [CorporateRosterEntry](./dictionary/corporate-rosters-and-scheduling.md#corporate-roster-entry), [CorporateTransportRequest](./dictionary/corporate-rosters-and-scheduling.md#corporate-transport-request), [CorporateShiftTemplate](./dictionary/corporate-rosters-and-scheduling.md#corporate-shift-template), [CorporateHoliday](./dictionary/corporate-rosters-and-scheduling.md#corporate-holiday) |
| Corporate Routing, Execution and Safety | Routes, ordered stops, driver offers, assignment and trip events, vehicle positions, trip feedback and SOS records. | [CorporateRoute](./dictionary/corporate-routing-execution-and-safety.md#corporate-route), [CorporateRouteStop](./dictionary/corporate-routing-execution-and-safety.md#corporate-route-stop), [CorporateDriverOffer](./dictionary/corporate-routing-execution-and-safety.md#corporate-driver-offer), [CorporateRouteAssignmentEvent](./dictionary/corporate-routing-execution-and-safety.md#corporate-route-assignment-event), [CorporateTripEvent](./dictionary/corporate-routing-execution-and-safety.md#corporate-trip-event), [CorporateVehiclePosition](./dictionary/corporate-routing-execution-and-safety.md#corporate-vehicle-position), [CorporateTripFeedback](./dictionary/corporate-routing-execution-and-safety.md#corporate-trip-feedback), [CorporateSosAlert](./dictionary/corporate-routing-execution-and-safety.md#corporate-sos-alert) |
| Corporate Billing and Payouts | Tenant invoices and line items, disputes and credit notes, driver earnings, rate cards, payout batches, payouts and provider events. | [CorporateInvoice](./dictionary/corporate-billing-and-payouts.md#corporate-invoice), [CorporateInvoiceLine](./dictionary/corporate-billing-and-payouts.md#corporate-invoice-line), [CorporateInvoiceDispute](./dictionary/corporate-billing-and-payouts.md#corporate-invoice-dispute), [CorporateCreditNote](./dictionary/corporate-billing-and-payouts.md#corporate-credit-note), [CorporateDriverEarning](./dictionary/corporate-billing-and-payouts.md#corporate-driver-earning), [CorporatePayoutBatch](./dictionary/corporate-billing-and-payouts.md#corporate-payout-batch), [CorporatePayout](./dictionary/corporate-billing-and-payouts.md#corporate-payout), [CorporatePayoutProviderEvent](./dictionary/corporate-billing-and-payouts.md#corporate-payout-provider-event), [CorporateRateCard](./dictionary/corporate-billing-and-payouts.md#corporate-rate-card), [CorporateDriverRateCard](./dictionary/corporate-billing-and-payouts.md#corporate-driver-rate-card) |
| Corporate Support | Tenant support tickets, attachments, comments, activities and shared ticket messages. | [CorporateSupportTicket](./dictionary/corporate-support.md#corporate-support-ticket), [CorporateSupportTicketAttachment](./dictionary/corporate-support.md#corporate-support-ticket-attachment), [CorporateSupportTicketComment](./dictionary/corporate-support.md#corporate-support-ticket-comment), [CorporateSupportTicketActivity](./dictionary/corporate-support.md#corporate-support-ticket-activity), [CorporateTicketMessage](./dictionary/corporate-support.md#corporate-ticket-message) |
| Identity Verification | Persisted DigiO/DigiLocker verification request and result records. | [DigioVerification](./dictionary/identity-verification.md#digio-verification) |

## Supporting references

- [Enum values and model usage](./enums.md)
- [Tenant data isolation map](./tenant-data-isolation.md)
- [Prisma model purpose inventory](./model-inventory.md)
- [Migration history, indexes and retention notes](./migration-history.md)
- [Database architecture and conceptual diagrams](./database-overview.md)
- [Prisma migrations and operational guidance](./migrations-and-indexes.md)

## How to use this dictionary

1. Start with the functional responsibility in the bounded-context table.
2. Use the model page for exact fields, keys, native database annotations and declared relation behavior.
3. Follow relation links to related models; a relation field without local FK columns is the inverse side of a relation stored on the linked model.
4. Use the tenant map for direct tenant identifiers and the API/service responsibilities that enforce access scope.
5. Consult the migrations page before schema changes. The model schema is the current declared shape; migrations are its evolution history.
