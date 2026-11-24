---
title: Mobile Screen and Component Catalog
description: Source map for Mobile routes, screen families, providers, services and reusable UI.
---

# Mobile Screen and Component Catalog

This catalog explains where the Flutter Mobile UI is implemented. The
[exact route inventory](./exact-route-inventory.md) maps all 172 named route
constants: 107 canonical path constants and 65 aliases. Canonical routes map
to their registered GoRouter destination and screen source. The inventory also
documents redirect-only paths; a route constant is not proof that the route
renders a distinct screen.

## Codebase organization

The Mobile workspace contains 280 Dart files under `apps/mobile/lib/`.
The following directory counts account for the complete current source
inventory; counts can change as the app evolves.

| Area | Dart files | Responsibility |
|---|---:|---|
| `presentation/` | 98 | Driver-facing screens, authentication/onboarding, trip and offer pages, overlays, and Corporate ETS source screens. |
| `user/` | 55 | Vendor/booker shell, requirement creation, fulfillment, trips, payments, profile and support screens. |
| `shared/` | 52 | Shared design system, maps, global states, and common interaction widgets. |
| `widgets/` | 27 | App scaffold and reusable common widgets, including some legacy/compatibility widget variants. |
| `services/` | 23 | Authentication, driver/vendor API services, notifications, location, feature flags, update checks and payments. |
| `core/` | 13 | API client, authentication support, security, configuration, logging and platform/test helpers. |
| `theme/` | 6 | Theme palette, spacing, typography, radius and theme provider. |
| `utils/` | 4 | Platform-specific dispatch sound implementations and vehicle helpers. |
| `main.dart`, `routes/` | 2 | Application bootstrap and the GoRouter registry. |

## Screen families and implementation

| Screen family | Main routes | Screen source areas | User purpose and connected state |
|---|---|---|---|
| Entry and identity | `/`, `/splash`, `/sign-in`, `/login-otp`, `/sign-up`, `/set-password`, `/forgot-password*`, `/reset-password`, `/choose-role` | `apps/mobile/lib/presentation/0*_*.dart`, `apps/mobile/lib/presentation/auth_screen/` | Sign in or create an account, complete OTP/password steps, and select the driver or vendor experience. `AuthProvider` observes `AuthService`; `AppRoutes.resolveRedirect` applies session and role gates. |
| Driver onboarding and review | `/onboarding-personal`, `/onboarding-vehicle`, `/onboarding-documents`, `/onboarding-face-verification`, `/onboarding-review`, `/welcome-success`, `/waitlist-gate-screen` | `apps/mobile/lib/presentation/1*_onboarding_*/`, `apps/mobile/lib/presentation/waitlist_gate_screen/` | Collect identity, emergency contact, driver, vehicle and document information, submit it for review, then show the account's review/verification state. `OnboardingProvider` holds draft state while `DriverService` and `DigioService` perform network operations. |
| Driver home and dispatch | `/home-screen`, `/opportunities-screen`, `/opportunities/details`, `/opportunities/offer` | `apps/mobile/lib/presentation/home_screen/`, `apps/mobile/lib/presentation/opportunities_screen/`, `apps/mobile/lib/presentation/dispatch_overlay/` | Monitor availability and view/act on offers. `/opportunities-screen` redirects to `/home-screen`; the home experience is the actual dispatch entry point. `DriverService` loads offers and performs accept/decline actions. |
| Driver trips | `/trips-screen`, `/trips/details`, `/trips/chat`, `/trips/:id`, `/trips/:id/chat` | `apps/mobile/lib/presentation/trips_screen/` | Review assigned trips, open a trip, message about it, confirm arrival/start/completion, and access trip actions. `DriverService` calls trip endpoints; trip location uses the location/permission services. |
| Driver profile, KYC and support | `/profile-screen`, `/profile/personal-info*`, `/profile/vehicle*`, `/profile/kyc`, `/profile/documents/details`, `/profile/support*`, `/driver/score`, `/profile/referral` | `apps/mobile/lib/presentation/profile_screen/`, `apps/mobile/lib/presentation/kyc_upload_screen/`, `apps/mobile/lib/presentation/driver_score_screen/` | Maintain profile and vehicle details, submit KYC, view trust score/referrals, and contact support. Some compatibility paths redirect to another screen; see the route inventory. |
| Driver wallet | `/wallet-screen`, `/earnings/transactions`, `/earnings/withdraw`, `/earnings/withdrawal-details` | `apps/mobile/lib/presentation/wallet_screen/` | Review earnings, settlements, bank details and withdrawal progress. Driver settlement requests use `DriverService`; server policy and account eligibility remain authoritative. |
| Vendor shell and requirements | `/user/home`, `/user/requirements`, `/user/requirements/create*`, `/user/requirements/review`, `/user/requirements/posted-confirmation`, `/user/requirements/drafts`, `/user/requirements/edit` | `apps/mobile/lib/user/home/`, `apps/mobile/lib/user/requirements/` | Create or manage trip requirements. The four-step draft is held by `RequirementDraftProvider`; `UserService` requests a server quote and posts the booking. |
| Vendor fulfillment and assignment | `/user/fulfillment/*`, `/user/requirements/details` | `apps/mobile/lib/user/fulfillment/` | Follow search/fulfillment, inspect assigned drivers and vehicles, view assignment timelines, and open cancellation actions. Detail screens receive IDs or records through GoRouter `state.extra` and/or query data. |
| Vendor trips and payments | `/user/trips/*`, `/user/payments*` | `apps/mobile/lib/user/trips/`, `apps/mobile/lib/user/payments/` | Review trips, status/history and payment outcomes. The `/user/trips` compatibility route redirects to requirements; separate history and active-trip routes are registered. Vendor payments are gated by a server-synchronized feature flag. |
| Vendor profile and support | `/user/profile*`, `/user/support/*` | `apps/mobile/lib/user/profile/`, `apps/mobile/lib/user/support/` | Maintain organization/contact settings and notification preferences, browse help and raise or review support tickets. |
| Shared and resilient UI | `/global-states-gallery`, universal location picker/search | `apps/mobile/lib/shared/global_states/`, `apps/mobile/lib/presentation/edge_cases/`, `apps/mobile/lib/presentation/location_picker/` | Render loading, empty, offline, expired-session and location-permission states, and select map locations. These are presentation/recovery aids, not substitutes for backend checks. |

## Application shell and state ownership

`main()` in `apps/mobile/lib/main.dart` initializes platform services before
building the widget tree. `MultiProvider` exposes `ThemeProvider`,
`LanguageProvider`, `AuthProvider`, `OnboardingProvider`,
`FeatureFlagsService`, `RequirementDraftProvider`, `AuthService`,
`DriverService` and `UserService`. Screen-local form/filter state remains in
the individual screen widgets; shared auth, onboarding and requirement draft
state use Provider/ChangeNotifier. The Corporate ETS coordinator is a separate
ChangeNotifier, but its active-route screen is not registered in GoRouter or
referenced by the app shell in the audited source; treat it as source code, not
as a currently reachable app route.

Reusable UI is split across `apps/mobile/lib/shared/widgets/` and
`apps/mobile/lib/widgets/`. Examples include phone/password/OTP fields,
document upload tiles, step headers, primary/secondary buttons, skeleton and
empty/error states, confirmation/cancellation dialogs, trip review dialogs,
safe-area helpers, and map widgets. Use the exact route inventory for the
screen class and source path behind each registered named route.

## Cross-reference

- [Driver feature guide](./driver-feature-guide.md) — driver actions and lifecycle behavior.
- [Vendor feature guide](./vendor-feature-guide.md) — requirement, fulfillment and payment workflows.
- [Service/API matrix](./service-api-matrix.md) — HTTP methods, frontend helpers and backend ownership.
- [Mobile application reference](./application-reference.md) — bootstrap, platform differences and shared architecture.
- [Corporate ETS driver source](../ets/applications/driver-app/09_DRIVER_MOBILE_APP_SPECIFICATION.md) — product specification; distinguish its planned behavior from the current route wiring described here.
