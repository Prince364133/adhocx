---
title: Admin Route and Feature Reference
description: Entry point to Admin functionality and source-level route documentation.
status: partial
last_reviewed: "2026-11-23"
---

# Admin Route and Feature Reference

This page is the navigation entry for Admin's feature and route documentation.
The complete source-grounded purpose, interaction, frontend component, API,
backend reference and data boundary for each of the 30 App Router pages is in
the [Admin route-by-route reference](./route-by-route-reference.md).

Read the [Admin application reference](./application-reference.md) first for
the portal's overall responsibilities and shared architecture, then use the
[exact route inventory](./exact-route-inventory.md) to locate a page.

## Verified implementation notes

- `/users` and `/vendors` currently render the same vendor-management
  component; the `/users` page does not render a platform-user list.
- `/reports` redirects to `/finance`.
- `/requirements/*`, `/trips/*` and `/assignments/*` redirect to their Ops
  portal destinations.
- The route-specific API and data relationships remain **Partial** where
  runtime behavior or complete nested backend calls have not been verified.

## Sources

- `apps/admin/src/app/**/page.tsx`
- `apps/admin/src/lib/api/client.ts`
- [API endpoint references](../api/reference/exact-controller-endpoints.md)
