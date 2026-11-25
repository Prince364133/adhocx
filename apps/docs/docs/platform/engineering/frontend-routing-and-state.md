---
title: Frontend Routing and State
description: Route organization, session state and application navigation patterns.
---

# Frontend Routing and State

**Evidence status:** Verified for Next.js and Flutter route definitions.

## Next.js Routing

Next.js applications use file-system route conventions:

```text
src/app/dashboard/page.tsx       -> /dashboard
src/app/routes/[id]/page.tsx     -> /routes/:id
src/app/rosters/import/page.tsx  -> /rosters/import
```

Catch-all routes are used where a page intentionally handles nested routes,
such as Admin requirements, trips and assignments.

Dynamic route values must be treated as untrusted identifiers. Authorization
is enforced by the API and tenant/resource guards.

## Next.js Session State

The client applications use:

- local storage for access/refresh/session metadata
- cookies for middleware-compatible administrative sessions where implemented
- session context for corporate/ops tenant state
- silent refresh on 401 responses
- route redirects for unauthenticated or forbidden states

Session state is presentation state, not the source of authorization.

## Flutter Routing

Flutter route modules are centralized in `lib/routes/app_routes.dart`.

The Mobile app includes vendor, driver and shared route surfaces. The
Employee app uses feature-sliced route names for schedule, tracking, boarding,
safety and profile areas.

Flutter navigation must not rely only on route-level UI hiding. Server-side
role and ownership checks remain authoritative.

## State Patterns

| Pattern | Used by |
|---|---|
| Provider/ChangeNotifier | Flutter applications |
| Repository/provider | Employee app |
| API singleton/cache | Mobile app |
| React session context | Corporate and Ops |
| Shell verification state | Admin |
| Local browser session storage | Next.js applications |
| Static/build-time state | Marketing and Docusaurus |

## Loading and Error States

Client applications should represent:

- loading
- anonymous/session-expired
- forbidden/unauthorized
- network unavailable
- server validation error
- stale or empty data
- retry/recovery

The Admin, Corporate and Ops shells contain explicit session loading or
redirect behavior. Flutter apps include global and edge-case state utilities.
