---
title: Frontend API Consumption
description: How the Next.js and Flutter clients communicate with the AdhocX API.
---

# Frontend API Consumption

**Evidence status:** Verified for application configuration and API client
patterns; individual route consumption is partially verified and should be
expanded application by application.

## Next.js Applications

| Application | API configuration |
|---|---|
| Admin | `NEXT_PUBLIC_API_URL`, with a local default around `localhost:7001/api/v1` |
| Ops | Root environment loader and Next.js external package configuration |
| Corporate | Root environment loader and Google Maps browser configuration |

The Next.js clients use browser-side fetch/API helper code. The Admin
application includes `src/lib/api/client.ts`; Corporate and Ops include
application-specific API calls and shared environment variables.

## Flutter Applications

| Application | API-related implementation |
|---|---|
| Mobile | `lib/services/api_client.dart`, core networking client and feature services |
| Employee App | `lib/services/employee_api_client.dart` and HTTP repositories |

The Flutter run scripts provide the API URL through Dart defines or environment
configuration. The employee app uses dedicated HTTP auth/rider repositories.

## Mobile Example

```text
API_URL=http://localhost:7001/api/v1
Authorization=Bearer <access-token>
```

The mobile application must treat API responses as authoritative. It must not
derive role authority or trip state transitions only in the client.

## Integration Rules

- Use `/api/v1` as the versioned API base.
- Send bearer tokens only in authenticated application contexts.
- Never place access tokens in ordinary query parameters.
- Use stream tickets for browser EventSource/live-stream authentication.
- Treat provider webhooks as server-only callbacks.
- Map API errors to visible UI states rather than exposing raw server details.
- Do not store production credentials in the documentation or client source.
