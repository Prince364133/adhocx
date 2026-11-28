---
title: Frontend route inventory
description: Sidebar navigation, route inventory, adaptive skeleton mapping, environment variables, and UI constraints for the AdhocX Fleet Portal (apps/fleet).
last_reviewed: "2026-11-27"
---

# Frontend route inventory

The Fleet Portal (`apps/fleet`, Next.js 14 App Router, port `7008`) follows the exact navigation constraints in the Fleet specification.

## 1. Sidebar Navigation

- **Dashboard** (`/dashboard`)
- **Driver Management** (`/drivers`)
- **Live Operations** (`/live-operations`)
- **Earnings & Payouts** (`/earnings`)
- **Driver Incentives** (`/incentives`)
- **Shift & Ride Management** (`/shifts`) *(rendered only when `NEXT_PUBLIC_ENABLE_FLEET_SHIFTS=true`)*
- **Support Center** (`/support`)
- **Notifications** (`/notifications`)

Explicitly **excluded** from sidebar navigation: standalone `Trips`, `Vehicles`, `Settings`, and `Coupons` modules.

## 2. Route, Source & Skeleton Mapping

| Route | Source File | Purpose | Adaptive Skeleton | Key Interactive Flows |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `apps/fleet/src/app/page.tsx` | Root redirect (`/dashboard` or `/login`) | — | Server/middleware auth redirect |
| `/login` | `apps/fleet/src/app/login/page.tsx` | Fleet Admin / Manager sign-in | `AuthSkeleton` | Form validation, error feedback, redirect |
| `/dashboard` | `apps/fleet/src/app/dashboard/page.tsx` | Fleet overview & Fleet Code hub | `DashboardSkeleton` | Copy Fleet Code, controlled regenerate/disable modal, KPI strip, activity chart, status breakdown, recent events |
| `/drivers` | `apps/fleet/src/app/drivers/page.tsx` | Fleet driver & 1:1 vehicle list | `TablePageSkeleton` | Search/filter, `DriverProfileDrawer` (trips, monthly earnings, payouts, reassign vehicle, confirm removal) |
| `/live-operations` | `apps/fleet/src/app/live-operations/page.tsx` | Active drivers & rides | `TablePageSkeleton` | `Last refreshed` timestamp, status/driver filters, optional map with automatic table fallback |
| `/earnings` | `apps/fleet/src/app/earnings/page.tsx` | Earnings, payouts & shortfall | `CardsGridSkeleton` + `TablePageSkeleton` | Period filter (`This Month`, `Previous Month`, `Custom Date`), Request Payout modal, payout drawer, CSV export, shortfall claims |
| `/incentives` | `apps/fleet/src/app/incentives/page.tsx` | Target & Time-Based incentives | `TablePageSkeleton` | Create/edit modal, activate/pause/end confirmation, driver progress drawer (`DrawerSkeleton`) |
| `/shifts` | `apps/fleet/src/app/shifts/page.tsx` | Feature-flagged shift management | `TablePageSkeleton` | Shift list, create shift with overlap conflict warning (`NEXT_PUBLIC_ENABLE_FLEET_SHIFTS=true`) |
| `/support` | `apps/fleet/src/app/support/page.tsx` | Fleet support tickets | `TablePageSkeleton` | Create ticket modal with presigned/multipart attachments, `TicketDetailDrawer` (`DrawerSkeleton`), thread & reopen confirmation |
| `/notifications` | `apps/fleet/src/app/notifications/page.tsx` | Fleet account & driver alerts | `TablePageSkeleton` | Read/unread filter, mark all read, deep links to related entities, sidebar/header unread counter badge |

## 3. Environment Variables (`apps/fleet/.env.example`)

- `NEXT_PUBLIC_FLEET_API_URL` (default `http://localhost:7001/api/v1/fleet`; production routes to `/api/v1/fleet` on `*.adhocx.com`)
- `NEXT_PUBLIC_ENABLE_FLEET_SHIFTS` (`false` by default)
