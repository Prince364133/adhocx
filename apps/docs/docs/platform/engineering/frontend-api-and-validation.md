---
title: Frontend API and Validation
description: Cross-frontend API, authentication, response and form validation conventions.
---

# Frontend API and Validation

**Evidence status:** Verified for Next.js and Flutter API client implementations.

## API Base URL Resolution

Each frontend resolves an API URL according to its runtime:

- Development port → `http://localhost:7001/api/v1`
- Production AdhocX domain → relative `/api/v1` or production API domain
- Flutter web → host/domain-aware resolution
- Native Flutter release → `https://api.adhocx.com/api/v1`
- Mobile compile-time Dart define → explicit override

The documentation must not reproduce environment-specific secrets or private
API configuration.

## Authentication

Client request implementations use bearer access tokens.

Verified behavior includes:

- Access and refresh token storage
- Silent refresh after 401
- Concurrent request queuing during refresh
- Session clearing when refresh fails
- Login redirect for expired protected sessions
- Secure storage preference for native Flutter

## Response Handling

Successful API responses commonly use:

```json
{
  "success": true,
  "data": {}
}
```

Frontend helpers unwrap `data` while preserving direct response compatibility
where needed.

Errors commonly use:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

## Form and Input Validation

Next.js applications use component and TypeScript validation patterns. Flutter
applications perform local format/required-field validation and also rely on
server validation.

The client is never the only validation authority. Server behavior uses
NestJS `ValidationPipe`, DTO declarations and business services.

## Upload Handling

The API accepts:

- JSON
- Multipart roster and document uploads
- Binary download responses

Next.js and Flutter clients must set multipart form boundaries through the
platform request implementation rather than manually adding a JSON content
type.
