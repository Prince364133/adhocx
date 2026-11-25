---
title: Data and Secret Protection
description: Verified validation, CORS, uploads, provider secrets and sensitive-data safeguards.
---

# Data and Secret Protection

**Evidence status:** Verified for API controls and configuration patterns.
Secret inventory is partially verified because live secret values must not be
inspected or reproduced.

## Input Validation

The API uses a global whitelist `ValidationPipe`:

- unknown fields are rejected
- DTO fields are transformed
- implicit conversion is disabled

Route-level validation must complement global validation for:

- state transitions
- tenant ownership
- provider signatures
- file size/type
- coordinate ranges
- financial amounts

## CORS

The API allows:

- configured production AdhocX subdomains
- configured origin environment values
- development localhost/LAN origins
- non-browser clients with no Origin header

The allowed-origin check should remain an explicit allowlist rather than a
wildcard in production.

## File Handling

The storage module includes:

- file sanitizer
- private/public upload controllers
- storage abstraction
- upload size limits

Private document URLs must not expose unrestricted object-storage resources.
Provider/document URLs and signed links should be documented as sensitive.

## Provider Secrets

Verified secret categories include:

- JWT access/refresh
- Admin bootstrap credentials
- PostgreSQL and Redis
- Razorpay keys and webhook secret
- Google Maps
- Google OAuth
- Firebase
- MSG91
- SMTP
- DigiO
- DigiLocker
- Cloudflare R2/S3

No secret value is documented in this page or the public site.

## Secret Storage

Use:

- Environment variables for runtime configuration
- GitHub Actions secrets for CI/CD
- Server-side `.env.production` permissions
- Secret rotation where provider support exists
- Separate development, test and production credentials

Committed workflow files must not contain fallback live credentials. Existing
fallback credentials must be rotated and removed rather than masked by
documentation.

## Sensitive Data

Do not publish:

- OTP values
- JWT tokens
- refresh tokens
- password hashes
- KYC/raw identity responses
- payment card data
- bank credentials
- webhook payload signatures
- private document URLs
- live customer locations

Audit and support logs must redact sensitive fields before storage or output
where not required for investigation.
