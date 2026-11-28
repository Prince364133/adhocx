---
title: Admin Exact Route Inventory
description: Source-derived Next.js App Router page inventory.
status: partial
last_reviewed: "2026-11-23"
---

# Admin Exact Route Inventory

**Coverage status:** The 30 route rows reconcile with
`apps/admin/src/app/**/page.tsx`. Source-grounded interactions and API
relationships are documented in the [route-by-route reference](./route-by-route-reference.md);
deployed URL/runtime behavior and complete nested API/data traces are not
certified by this frontend inventory.

| Route pattern | Functional purpose | Source file |
|---|---|---|
| `/analytics` | Dedicated platform growth and marketplace analytics workspace | `apps/admin/src/app/analytics/page.tsx` |
| `/assignments/*` | Legacy Admin route that redirects to Ops `/assignments` | `apps/admin/src/app/assignments/[[...slug]]/page.tsx` |
| `/audit` | Read and filter audit events; inspect an event payload | `apps/admin/src/app/audit/page.tsx` |
| `/blogs` | Search, edit, publish and delete marketing content | `apps/admin/src/app/blogs/page.tsx` |
| `/business-insights` | Contextual entity growth and micro-finance insights workspace | `apps/admin/src/app/business-insights/page.tsx` |
| `/companies/:id` | View/edit tenant profile, offices, departments, zones and users | `apps/admin/src/app/companies/[id]/page.tsx` |
| `/companies` | Search tenant directory and onboard a company | `apps/admin/src/app/companies/page.tsx` |
| `/coupons` | Create, edit, activate and inspect coupon redemptions | `apps/admin/src/app/coupons/page.tsx` |
| `/dashboard` | Combined marketplace, corporate, supply, demand, trip and finance summary | `apps/admin/src/app/dashboard/page.tsx` |
| `/disputes` | Review and resolve marketplace disputes | `apps/admin/src/app/disputes/page.tsx` |
| `/drivers` | Review, update, verify, reject or suspend driver records | `apps/admin/src/app/drivers/page.tsx` |
| `/drivers/route-earnings` | Inspect a driver's route earnings derived from driver detail data | `apps/admin/src/app/drivers/route-earnings/page.tsx` |
| `/feature-flags` | Inspect and change supported runtime feature flags | `apps/admin/src/app/feature-flags/page.tsx` |
| `/finance` | Review finance summary, transactions and driver financial history | `apps/admin/src/app/finance/page.tsx` |
| `/fleets` | Provision fleets, portal access users, shortfall claims, metrics, credentials and lifecycle | `apps/admin/src/app/fleets/page.tsx` |
| `/login` | Authentication entry and session setup | `apps/admin/src/app/login/page.tsx` |
| `/notifications` | Estimate audience, test and send push campaigns; inspect delivery | `apps/admin/src/app/notifications/page.tsx` |
| `/` | Redirect to `/dashboard` | `apps/admin/src/app/page.tsx` |
| `/pricing/detail` | Compatibility entry to the shared rate-card workspace; mode comes from query parameters | `apps/admin/src/app/pricing/detail/page.tsx` |
| `/pricing/driver` | Shared pricing workspace opened in driver payout mode | `apps/admin/src/app/pricing/driver/page.tsx` |
| `/pricing/matrix` | Shared distance-pricing plan and slab editor | `apps/admin/src/app/pricing/matrix/page.tsx` |
| `/pricing` | Pricing Studio summary with links to vendor billing and driver payout rates | `apps/admin/src/app/pricing/page.tsx` |
| `/pricing/vendor` | Shared pricing workspace opened in vendor billing mode | `apps/admin/src/app/pricing/vendor/page.tsx` |
| `/reports` | Redirect to `/finance` | `apps/admin/src/app/reports/page.tsx` |
| `/requirements/*` | Legacy Admin route that redirects to Ops `/requirements` | `apps/admin/src/app/requirements/[[...slug]]/page.tsx` |
| `/safety/sos` | Quick-access emergency safety / SOS console | `apps/admin/src/app/safety/sos/page.tsx` |
| `/settlements` | Review bank details, process driver settlements, and approve/settle/reject Fleet Owner payouts | `apps/admin/src/app/settlements/page.tsx` |
| `/support` | Handle Corporate ETS, On-Demand, and Fleet Portal support tickets | `apps/admin/src/app/support/page.tsx` |
| `/trips/*` | Legacy Admin route that redirects to Ops `/trips` | `apps/admin/src/app/trips/[[...slug]]/page.tsx` |
| `/undefined/*` | Legacy malformed-path fallback that strips the `/undefined` prefix | `apps/admin/src/app/undefined/[[...slug]]/page.tsx` |
| `/users` | Currently renders the same vendor view as `/vendors`; no user list is shown | `apps/admin/src/app/users/page.tsx` |
| `/vendors/:vendorId/fulfillment` | Inspect a vendor's fulfillment and order activity | `apps/admin/src/app/vendors/[vendorId]/fulfillment/page.tsx` |
| `/vendors` | Vendor onboarding, search and lifecycle management | `apps/admin/src/app/vendors/page.tsx` |
| `/verifications` | Filter and review driver/vendor verification applications | `apps/admin/src/app/verifications/page.tsx` |

The [route-by-route reference](./route-by-route-reference.md) distinguishes
routes that render an Admin feature from compatibility routes that redirect
to another page or application.

## Sources and verification

- `apps/admin/src/app/**/page.tsx` — route page files counted in this inventory.
- [Traceability registry](../../platform/traceability-registry.md) — application ID and cross-application status.