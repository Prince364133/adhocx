---
title: API Endpoint Reference
description: Source-derived route-by-route reference grouped by NestJS controller.
status: partial
last_reviewed: "2026-11-23"
---

# API Endpoint Reference

**Source coverage:** 50 controller classes, 431 HTTP method decorator declarations, and 436 controller/method path variants parsed from TypeScript AST.

Each controller page records declared route paths, Swagger purpose/response annotations, request parameters and DTOs, guard/role/resource declarations, direct handler-to-service calls, direct Prisma delegate references in the first service method, and explicit exception types found in those source bodies. **Partial** means this static reference does not prove complete downstream behavior or runtime routing.

The configured `/api/v1` prefix and exclusions are described in [API conventions](./api-conventions.md). Decorator paths containing their own `api/v1` segment and prefix exclusions need runtime/Swagger verification; the pages preserve source-declared paths instead of guessing the effective deployment URL.

| Stable controller ID | Controller / area | Route methods | Path variants | Endpoint details | Source |
|---|---|---:|---:|---|---|
| `API-CTRL-APP` | AppController (Root) | 1 | 1 | [Open controller reference](./endpoints/app-controller.md) | `apps/api/src/app.controller.ts` |
| `API-CTRL-UPLOADS` | UploadsController (Uploads) | 2 | 4 | [Open controller reference](./endpoints/uploads-controller.md) | `apps/api/src/common/storage/uploads.controller.ts` |
| `API-CTRL-CORPORATE-ANALYTICS` | CorporateAnalyticsController (Corporate ETS - Analytics & Reports) | 5 | 5 | [Open controller reference](./endpoints/corporate-analytics-controller.md) | `apps/api/src/domains/corporate/analytics/corporate-analytics.controller.ts` |
| `API-CTRL-CORPORATE-BILLING` | CorporateBillingController (Corporate ETS - Dual Financial Ledgers, Invoicing & Payouts) | 18 | 18 | [Open controller reference](./endpoints/corporate-billing-controller.md) | `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts` |
| `API-CTRL-CORPORATE-PAYOUT-WEBHOOK` | CorporatePayoutWebhookController (Corporate ETS - Payout Provider Callback) | 1 | 1 | [Open controller reference](./endpoints/corporate-payout-webhook-controller.md) | `apps/api/src/domains/corporate/billing/corporate-payout-webhook.controller.ts` |
| `API-CTRL-CORPORATE-RATE-CARD` | CorporateRateCardController (Corporate ETS - Rate Cards) | 6 | 6 | [Open controller reference](./endpoints/corporate-rate-card-controller.md) | `apps/api/src/domains/corporate/billing/corporate-rate-card.controller.ts` |
| `API-CTRL-CORPORATE-DISPATCH` | CorporateDispatchController (Corporate ETS - Autonomous Dispatch & DDA) | 8 | 8 | [Open controller reference](./endpoints/corporate-dispatch-controller.md) | `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts` |
| `API-CTRL-CORPORATE-TRIP-EXECUTION` | CorporateTripExecutionController (Corporate ETS - Trip Execution & OTP Boarding) | 22 | 22 | [Open controller reference](./endpoints/corporate-trip-execution-controller.md) | `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts` |
| `API-CTRL-CORPORATE-OPERATIONS` | CorporateOperationsController (Corporate ETS - Command Centre Operations) | 4 | 4 | [Open controller reference](./endpoints/corporate-operations-controller.md) | `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts` |
| `API-CTRL-CORPORATE-ROUTE-CANCELLATION` | CorporateRouteCancellationController (Corporate ETS - Command Centre Operations) | 1 | 1 | [Open controller reference](./endpoints/corporate-route-cancellation-controller.md) | `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts` |
| `API-CTRL-CORPORATE-OPS-DRIVERS` | CorporateOpsDriversController (Corporate ETS - Command Centre Operations) | 6 | 6 | [Open controller reference](./endpoints/corporate-ops-drivers-controller.md) | `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts` |
| `API-CTRL-CORPORATE-RIDER` | CorporateRiderController (Corporate Rider Self-Service) | 12 | 12 | [Open controller reference](./endpoints/corporate-rider-controller.md) | `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts` |
| `API-CTRL-CORPORATE-ROSTER` | CorporateRosterController (Corporate ETS - Rosters) | 8 | 8 | [Open controller reference](./endpoints/corporate-roster-controller.md) | `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts` |
| `API-CTRL-CORPORATE-ROUTING` | CorporateRoutingController (Corporate ETS - Routing) | 17 | 17 | [Open controller reference](./endpoints/corporate-routing-controller.md) | `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts` |
| `API-CTRL-CORPORATE-SAFETY` | CorporateSafetyController (Corporate ETS - Safety SOS & Command Centre) | 13 | 13 | [Open controller reference](./endpoints/corporate-safety-controller.md) | `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts` |
| `API-CTRL-CORPORATE-SUPPORT-TICKET` | CorporateSupportTicketController (Corporate ETS - Support Tickets) | 15 | 15 | [Open controller reference](./endpoints/corporate-support-ticket-controller.md) | `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts` |
| `API-CTRL-OPS-SUPPORT-TICKET` | OpsSupportTicketController (OPS - Support Tickets) | 4 | 4 | [Open controller reference](./endpoints/ops-support-ticket-controller.md) | `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts` |
| `API-CTRL-CORPORATE-SCHEDULING` | CorporateSchedulingController (Corporate ETS - Scheduling (shift templates, holidays, auto-planner)) | 5 | 5 | [Open controller reference](./endpoints/corporate-scheduling-controller.md) | `apps/api/src/domains/corporate/scheduling/corporate-scheduling.controller.ts` |
| `API-CTRL-CORPORATE-TENANT` | CorporateTenantController (Corporate ETS - Tenants, Offices & Employees) | 34 | 34 | [Open controller reference](./endpoints/corporate-tenant-controller.md) | `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts` |
| `API-CTRL-CORPORATE-TRACKING` | CorporateTrackingController (Corporate ETS - Tracking, Timeline & Playback) | 5 | 5 | [Open controller reference](./endpoints/corporate-tracking-controller.md) | `apps/api/src/domains/corporate/tracking/corporate-tracking.controller.ts` |
| `API-CTRL-ADMIN` | AdminController (Admin Operations) | 39 | 39 | [Open controller reference](./endpoints/admin-controller.md) | `apps/api/src/modules/admin/admin.controller.ts` |
| `API-CTRL-APP-UPDATE` | AppUpdateController (App Update) | 1 | 1 | [Open controller reference](./endpoints/app-update-controller.md) | `apps/api/src/modules/app-update/app-update.controller.ts` |
| `API-CTRL-ASSIGNMENTS` | AssignmentsController (Assignments) | 1 | 1 | [Open controller reference](./endpoints/assignments-controller.md) | `apps/api/src/modules/assignments/assignments.controller.ts` |
| `API-CTRL-AUTH` | AuthController (Authentication) | 16 | 18 | [Open controller reference](./endpoints/auth-controller.md) | `apps/api/src/modules/auth/auth.controller.ts` |
| `API-CTRL-BLOGS` | BlogsController (Blogs & Content Hub) | 4 | 4 | [Open controller reference](./endpoints/blogs-controller.md) | `apps/api/src/modules/blogs/blogs.controller.ts` |
| `API-CTRL-ADMIN-BLOGS` | AdminBlogsController (Admin Blog Management) | 6 | 6 | [Open controller reference](./endpoints/admin-blogs-controller.md) | `apps/api/src/modules/blogs/blogs.controller.ts` |
| `API-CTRL-COUPONS` | CouponsController (Coupons & Promotions) | 2 | 2 | [Open controller reference](./endpoints/coupons-controller.md) | `apps/api/src/modules/coupons/coupons.controller.ts` |
| `API-CTRL-ADMIN-COUPONS` | AdminCouponsController (Admin Coupon Operations) | 7 | 7 | [Open controller reference](./endpoints/admin-coupons-controller.md) | `apps/api/src/modules/coupons/coupons.controller.ts` |
| `API-CTRL-DIGIO` | DigioController (Digio KYC / KYB) | 40 | 40 | [Open controller reference](./endpoints/digio-controller.md) | `apps/api/src/modules/digio/digio.controller.ts` |
| `API-CTRL-DISPUTES` | DisputesController (Disputes) | 7 | 7 | [Open controller reference](./endpoints/disputes-controller.md) | `apps/api/src/modules/disputes/disputes.controller.ts` |
| `API-CTRL-DRIVERS` | DriversController (Drivers) | 8 | 8 | [Open controller reference](./endpoints/drivers-controller.md) | `apps/api/src/modules/drivers/drivers.controller.ts` |
| `API-CTRL-REFERRALS` | ReferralsController (Driver Referrals) | 4 | 4 | [Open controller reference](./endpoints/referrals-controller.md) | `apps/api/src/modules/drivers/referrals/referrals.controller.ts` |
| `API-CTRL-FEATURE-FLAGS` | FeatureFlagsController (Feature Flags (Client)) | 2 | 2 | [Open controller reference](./endpoints/feature-flags-controller.md) | `apps/api/src/modules/feature-flags/feature-flags.controller.ts` |
| `API-CTRL-ADMIN-FEATURE-FLAGS` | AdminFeatureFlagsController (Admin Feature Flags) | 5 | 5 | [Open controller reference](./endpoints/admin-feature-flags-controller.md) | `apps/api/src/modules/feature-flags/feature-flags.controller.ts` |
| `API-CTRL-HEALTH` | HealthController (Health) | 3 | 3 | [Open controller reference](./endpoints/health-controller.md) | `apps/api/src/modules/health/health.controller.ts` |
| `API-CTRL-LEADS` | LeadsController (Marketing & Leads) | 3 | 3 | [Open controller reference](./endpoints/leads-controller.md) | `apps/api/src/modules/leads/leads.controller.ts` |
| `API-CTRL-LEDGER` | LedgerController (Driver Wallet & Ledger) | 2 | 2 | [Open controller reference](./endpoints/ledger-controller.md) | `apps/api/src/modules/ledger/ledger.controller.ts` |
| `API-CTRL-NOTIFICATIONS` | NotificationsController (Realtime & Notifications) | 17 | 17 | [Open controller reference](./endpoints/notifications-controller.md) | `apps/api/src/modules/notifications/notifications.controller.ts` |
| `API-CTRL-OFFERS` | OffersController (Offers) | 5 | 5 | [Open controller reference](./endpoints/offers-controller.md) | `apps/api/src/modules/offers/offers.controller.ts` |
| `API-CTRL-PAYMENTS` | PaymentsController (Payments) | 12 | 12 | [Open controller reference](./endpoints/payments-controller.md) | `apps/api/src/modules/payments/payments.controller.ts` |
| `API-CTRL-ADMIN-PRICING` | AdminPricingController (Admin Pricing Engine) | 8 | 8 | [Open controller reference](./endpoints/admin-pricing-controller.md) | `apps/api/src/modules/pricing/admin-pricing.controller.ts` |
| `API-CTRL-DRIVER-QUOTE` | DriverQuoteController (Driver Trip Earnings & Rate Card) | 2 | 2 | [Open controller reference](./endpoints/driver-quote-controller.md) | `apps/api/src/modules/pricing/driver-quote.controller.ts` |
| `API-CTRL-PRICING` | PricingController (Vehicle Categories & Platform Policy) | 8 | 8 | [Open controller reference](./endpoints/pricing-controller.md) | `apps/api/src/modules/pricing/pricing.controller.ts` |
| `API-CTRL-VENDOR-QUOTE` | VendorQuoteController (Vendor Trip Quotes & Bookings) | 3 | 3 | [Open controller reference](./endpoints/vendor-quote-controller.md) | `apps/api/src/modules/pricing/vendor-quote.controller.ts` |
| `API-CTRL-REQUIREMENTS` | RequirementsController (Requirements) | 6 | 6 | [Open controller reference](./endpoints/requirements-controller.md) | `apps/api/src/modules/requirements/requirements.controller.ts` |
| `API-CTRL-REVIEWS` | ReviewsController (Reviews) | 3 | 3 | [Open controller reference](./endpoints/reviews-controller.md) | `apps/api/src/modules/reviews/reviews.controller.ts` |
| `API-CTRL-SETTLEMENTS` | SettlementsController (Settlements & Withdrawals) | 6 | 6 | [Open controller reference](./endpoints/settlements-controller.md) | `apps/api/src/modules/settlements/settlements.controller.ts` |
| `API-CTRL-SUBSCRIPTIONS` | SubscriptionsController (Driver Subscriptions) | 7 | 7 | [Open controller reference](./endpoints/subscriptions-controller.md) | `apps/api/src/modules/subscriptions/subscriptions.controller.ts` |
| `API-CTRL-TRIPS` | TripsController (Trips) | 13 | 14 | [Open controller reference](./endpoints/trips-controller.md) | `apps/api/src/modules/trips/trips.controller.ts` |
| `API-CTRL-VENDORS` | VendorsController (Vendors) | 4 | 4 | [Open controller reference](./endpoints/vendors-controller.md) | `apps/api/src/modules/vendors/vendors.controller.ts` |
| `API-CTRL-FLEET-ADMIN` | FleetController (Platform Admin Fleet Provisioning) | 11 | 11 | [Fleet API reference](../../fleet/api-reference.md#5-admin-fleet-operations) | `apps/api/src/domains/fleet/fleet.controller.ts` |
| `API-CTRL-FLEET-ADMIN-OPS` | FleetAdminOperationsController (Admin Portal Access, Payouts, Support & Shortfalls) | 11 | 11 | [Fleet API reference](../../fleet/api-reference.md#5-admin-fleet-operations) | `apps/api/src/domains/fleet/fleet-admin-ops.controller.ts` |
| `API-CTRL-FLEET-AUTH` | FleetAuthController (Fleet Portal Auth) | 3 | 3 | [Fleet API reference](../../fleet/api-reference.md#1-authentication--fleet-code) | `apps/api/src/domains/fleet/portal/auth/fleet-auth.controller.ts` |
| `API-CTRL-FLEET-CODE` | FleetCodeController (Fleet Code Management) | 3 | 3 | [Fleet API reference](../../fleet/api-reference.md#1-authentication--fleet-code) | `apps/api/src/domains/fleet/portal/code/fleet-code.controller.ts` |
| `API-CTRL-FLEET-DASHBOARD` | FleetDashboardController (Fleet Dashboard) | 1 | 1 | [Fleet API reference](../../fleet/api-reference.md#2-dashboard-drivers--live-operations) | `apps/api/src/domains/fleet/portal/dashboard/fleet-dashboard.controller.ts` |
| `API-CTRL-FLEET-DRIVERS` | FleetDriversController (Fleet Drivers & 1:1 Vehicles) | 4 | 4 | [Fleet API reference](../../fleet/api-reference.md#2-dashboard-drivers--live-operations) | `apps/api/src/domains/fleet/portal/drivers/fleet-drivers.controller.ts` |
| `API-CTRL-FLEET-LIVE-OPS` | FleetLiveOpsController (Fleet Live Operations) | 1 | 1 | [Fleet API reference](../../fleet/api-reference.md#2-dashboard-drivers--live-operations) | `apps/api/src/domains/fleet/portal/live-operations/fleet-live-ops.controller.ts` |
| `API-CTRL-FLEET-FINANCE` | FleetFinanceController (Earnings, Payouts & Shortfall) | 5 | 5 | [Fleet API reference](../../fleet/api-reference.md#3-earnings-payouts-shortfall--incentives) | `apps/api/src/domains/fleet/portal/earnings-payouts/fleet-finance.controller.ts` |
| `API-CTRL-FLEET-INCENTIVES` | FleetIncentivesController (Driver Incentives) | 4 | 4 | [Fleet API reference](../../fleet/api-reference.md#3-earnings-payouts-shortfall--incentives) | `apps/api/src/domains/fleet/portal/incentives/fleet-incentives.controller.ts` |
| `API-CTRL-FLEET-SHIFTS` | FleetShiftsController (Feature-Flagged Shifts) | 3 | 3 | [Fleet API reference](../../fleet/api-reference.md#4-support-notifications--optional-shifts) | `apps/api/src/domains/fleet/portal/shifts/fleet-shifts.controller.ts` |
| `API-CTRL-FLEET-SUPPORT` | FleetSupportController (Fleet Support Center) | 6 | 6 | [Fleet API reference](../../fleet/api-reference.md#4-support-notifications--optional-shifts) | `apps/api/src/domains/fleet/portal/support/fleet-support.controller.ts` |
| `API-CTRL-FLEET-NOTIFICATIONS` | FleetNotificationsController (Fleet Notifications) | 4 | 4 | [Fleet API reference](../../fleet/api-reference.md#4-support-notifications--optional-shifts) | `apps/api/src/domains/fleet/portal/notifications/fleet-notifications.controller.ts` |

## Alias and deprecation handling

Paths declared as arrays on one HTTP decorator are grouped under the same handler in its controller page. Routes explicitly marked `deprecated` in Swagger are labeled there. A path name or existing client alias is not treated as deprecated unless the source marks or implements it as such.

## Request and response types

See the [request/response DTO catalog](./request-response-dto-catalog.md) for wire DTO fields and class-validator decorators. The [error-code catalog](./error-code-catalog.md), [webhook and idempotency reference](./webhooks-and-idempotency.md), and [API troubleshooting guide](./troubleshooting.md) explain shared behavior.

## Sources and verification

- `apps/api/src/**/*.controller.ts` — controller and route decorator source.
- `apps/api/src/main.ts` — global prefix, exclusions, validation pipe, interceptors and Swagger setup.
- `apps/api/prisma/schema.prisma` — model names used to identify direct service delegate references.
- These are static AST counts, not a live router/Swagger runtime diff.
