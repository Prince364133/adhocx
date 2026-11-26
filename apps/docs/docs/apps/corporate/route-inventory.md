---
title: Corporate route inventory
description: Corporate navigation and route families, including layouts that currently block their child pages.
---

# Corporate route inventory

The Corporate app has 65 App Router page files. For the source-to-purpose and
API mapping of every page, see the [exact route inventory](./exact-route-inventory.md)
and [route-by-route reference](./detailed-route-reference.md).

## Runtime route warning

The `layout.tsx` files at `/live`, `/bookings`, `/rosters`, and `/safety`
redirect all child URLs in those route trees to `/dashboard`. Their page files
and API helpers exist, but the pages do not currently render. This includes
deep links under each prefix. Do not treat those source implementations as
reachable product workflows until those redirects are changed.

## Primary shell navigation

`src/components/layout/PortalShell.tsx` currently displays:

| Navigation label | Destination | What the user can do |
|---|---|---|
| Overview | `/dashboard` | Review tenant dashboard metrics. |
| Routes | `/routes` | Browse tenant routes and open route detail. |
| Employees | `/employees` | Search and manage employee records according to role. |
| Cancellation Requests | `/cancellations` | Review cancelled transport requests. |
| Support | `/support` | Create and track support tickets. |
| Employee Support | `/employee-support` | Review employee-linked support cases. |
| Billing & Invoices | `/billing` | Browse billing summaries and invoices. |
| Transport Analytics | `/dashboard/analytics` | Review transport/trip analytics. |
| Company Profile | `/company-profile` | Manage tenant profile and organization information. |

The shell also supplies employee search, a notification dropdown, theme
toggle, user menu, and logout. Other pages can be opened through section tabs,
links, notifications, or direct URLs; the route file existing does not mean it
appears in primary navigation.

## Route families and behavior

| Feature area | Route patterns | Reachability and notes |
|---|---|---|
| Entry and authentication | `/`, `/login` | Root redirects to `/dashboard`; login uses the auth helpers. |
| Dashboard | `/dashboard`, `/dashboard/analytics`, `/dashboard/exceptions`, `/dashboard/live-summary` | Dashboard and analytics pages exist. The two compatibility paths redirect to `/dashboard`. |
| Employees and company | `/employees`, `/company-profile`, `/employee-support`, `/help`, `/notifications` | Root-level pages; employee/support and notification actions use tenant APIs. |
| Offices and settings | `/offices`, `/offices/:id`, `/offices/details`, `/offices/geofences`, `/offices/cost-centers`, `/settings`, `/settings/health`, `/settings/mapping`, `/settings/hrms` | Reachable. Office `:id` is consumed by the shared details page; `settings/hrms` is an alias. |
| Routes | `/routes`, `/routes/:id`, `/routes/details`, `/routes/active`, `/routes/allocation`, `/routes-list` | Route pages are reachable; `/routes-list` redirects to `/routes`; allocation is read-only. |
| Live operations | `/live`, `/live/trips`, `/live/trips/:id`, `/live/employees`, `/live/exceptions` | **Blocked by `/live/layout.tsx` redirect to `/dashboard`.** |
| Bookings | `/bookings`, `/bookings/overview`, `/bookings/approvals`, `/bookings/details`, `/bookings/:id`, `/cancellations` | **`/bookings/**` blocked by its layout.** `/cancellations` is a root-level route and remains separate. |
| Rosters and scheduling | `/rosters`, `/rosters/import`, `/rosters/calendar`, `/rosters/approve`, `/rosters/shifts` | **Blocked by `/rosters/layout.tsx` redirect.** The source review action publishes but does not call the approval helper. |
| Safety | `/safety`, `/safety/:id`, `/safety/:id/resolve`, `/safety/incidents/details`, `/safety/incidents/resolve`, `/safety/incidents/:id`, `/safety/incidents/:id/resolve`, `/safety/reports` | **Blocked by `/safety/layout.tsx` redirect.** Dynamic safety aliases also do not forward IDs to the query-based target. |
| Billing | `/billing`, `/billing/invoices`, `/billing/invoices/:id`, `/billing/details`, `/billing/disputes` | Reachable, with nested billing tabs. |
| Reports | `/reports`, `/reports/costs`, `/reports/fleet`, `/reports/usage`, `/reports/performance` | Reachable; `/reports/performance` re-exports the general reports page. |
| Support | `/support`, `/support/tickets`, `/support/tickets/details`, `/support/tickets/:id`, `/support/sla` | Reachable; ticket details re-export shared UI, while `/support/sla` redirects to `/support`. |

## Nested layouts

The root layout wraps the app in `PortalShell`. Feature layouts either wrap
children, add section tabs, or—on four route trees—redirect. Actual behavior is
recorded in the [exact route inventory](./exact-route-inventory.md); the parent
layout is evaluated before the route's page component.

