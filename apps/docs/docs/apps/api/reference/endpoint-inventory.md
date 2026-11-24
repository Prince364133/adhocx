---
title: API Endpoint Inventory
description: Source-derived inventory of the AdhocX REST controller areas.
---

# API Endpoint Inventory

**Evidence status:** Verified against NestJS controller decorators. Route
counts include aliases and private upload routes where present.

All routes below are relative to the configured global prefix `/api/v1`
unless a controller explicitly defines an upload/docs-related alternate.

## Authentication and Identity

| Area | Prefix | Verified operations |
|---|---|---|
| Auth | `auth` | Admin login/MFA, login, OTP, social auth, password, refresh, profile, logout, account deletion |
| Users | `users` | User-service module; verify route implementation through controller inventory |
| KYC/DigiO | `kyc/digio` | Capabilities, consent, PAN, DL, RC, insurance, identity, banking and DigiLocker workflows |

## Marketplace and Supply

| Area | Prefix | Verified operations |
|---|---|---|
| Requirements | `requirements` | Create, list, summary, detail, cancel and retry |
| Offers | `offers` | List/detail and accept/decline/seen actions |
| Assignments | `assignments` | Assignment listing |
| Drivers | `drivers` | Profile, bank details, trust, availability, location and KYC |
| Referrals | `drivers/referral` | Validate, dashboard and referral claims |
| Vendors | `vendors` | Profile and profile photo |
| Vehicles | `vehicles` | Vehicle service module |
| Reviews | `reviews` | Create and retrieve reviews |

## Dispatch and Trips

| Area | Prefix | Verified operations |
|---|---|---|
| Dispatch | `dispatch` | Dispatch-service module and scheduler |
| Trips | `trips` | List/detail/events/messages, arrive, start, complete, cancel, no-show, location and SOS |
| Locations | `locations` | Geocoding/location service module |

## Payments and Finance

| Area | Prefix | Verified operations |
|---|---|---|
| Pricing | `pricing`, `vendor/pricing`, `driver/pricing` | Tariffs, policy, plans, slabs and trip quotes |
| Payments | `payments` | Initiate, wallet top-up, status, history and provider webhooks |
| Ledger | `driver` | Wallet and ledger |
| Settlements | `settlements` | Withdraw, wallet, list/detail, processing and bank review |
| Subscriptions | `subscriptions` | Status, orders and wallet renewal |
| Coupons | `coupons`, `admin/coupons` | Validate, availability and administration |

## Administration and Platform

| Area | Prefix | Verified operations |
|---|---|---|
| Admin | `admin` | Drivers, vendors, users, metrics, audit, finance, reports and support |
| Feature flags | `feature-flags`, `admin/feature-flags` | Public value and administrative management |
| Blogs | `blogs`, `admin/blogs` | Public content and administration |
| Notifications | `notifications` | Device tokens, preferences, in-app state and broadcast campaigns |
| Leads | `leads` | Enterprise and newsletter lead capture |
| App update | `app` | App version |
| Health | `health` | Health, live and ready probes |
| Disputes | `disputes` | Create/list/retrieve and resolve |

## Corporate ETS

| Area | Prefix | Verified operations |
|---|---|---|
| Tenants | `corporate/tenants` | Tenant/onboarding, offices, users, departments, zones, policy and employees |
| Rosters | `corporate/rosters` | Template, validation, upload, publish and requests |
| Routes | `corporate/routes` | Plan/stream/commit/export/optimize and route CRUD |
| Dispatch | `corporate/dispatch` | Start now, offers, status and driver duties |
| Trip execution | `corporate/trips` | Arrive, OTP, no-show, complete, telemetry and reschedule |
| Tracking | `corporate/trips` | Route tracking, timeline, playback and live fleet |
| Rider | `corporate/me` | Profile, schedule, trips, tracking, cancellation, feedback and tickets |
| Operations | `corporate/ops` | Board, live operations, route detail/reassign and driver operations |
| Safety | `corporate/safety` | SOS, acknowledge, investigate, escalate, close and deviation |
| Support | `corporate/support/tickets`, `ops/support/tickets` | Ticket CRUD, replies, assignment, priority and updates |
| Analytics | `corporate/analytics` | Metrics, exceptions, attendance and reports |
| Billing | `corporate/billing` | Invoices, disputes, payouts, credit notes and reconciliations |
| Scheduling | `corporate/scheduling` | Shift templates, holidays and auto-plan |
| Rate cards | `corporate/billing/rate-cards` | Corporate and driver rate cards |

## Route Verification Status

Controller source is the primary evidence for this inventory. The live Swagger
document is an additional runtime reference, but it is not available in every
deployment environment.

Use the Swagger/OpenAPI page to confirm DTO and response metadata for the
currently running API instance.
