---
title: Troubleshooting
description: Common setup, authentication, API, database, mobile and deployment issues.
---

# Troubleshooting

**Evidence status:** Verified against application and deployment patterns.
Some device/operator issues require local environment inspection.

## Application Will Not Start

1. Run `pnpm install --frozen-lockfile`.
2. Run `pnpm run predev:all`.
3. Check Node, pnpm and Flutter versions.
4. Check configured ports for conflicts.
5. Verify Docker container health.

## API is Unreachable

Check:

```text
http://localhost:7001/api/v1/health
```

If unavailable:

1. Confirm PostgreSQL and Redis are running.
2. Confirm `DATABASE_URL` is valid.
3. Confirm JWT secrets are set.
4. Review API startup logs.
5. Restart the API after dependencies are healthy.

## Login Fails

1. Verify identifier format.
2. Check OTP expiry and resend countdown.
3. Check Redis/rate-limit state.
4. Verify account role and tenant linkage.
5. Clear a stale browser/mobile session and retry.

Do not reuse test OTP settings against production.

## 401 Responses

- Access token may be expired.
- Refresh token may be missing or revoked.
- Account may be suspended.
- Password or credential change may revoke sessions.

Sign in again and confirm the account status.

## 403 Responses

403 means the account lacks role, tenant, office or resource permission.
The UI may hide actions, but server authorization is final.

## Database Migration Failure

1. Confirm `DATABASE_URL`.
2. Inspect Prisma migration status.
3. Verify migration/backup state.
4. Never run destructive resets in production.

## Redis/Live Updates Missing

1. Confirm Redis service/TLS settings.
2. Check for pub/sub fallback warnings.
3. Refresh live clients.
4. Verify stream tickets are valid and live.

## Flutter Build or SDK Error

1. Run `flutter doctor`.
2. Run `flutter pub get`.
3. Confirm Puro/Flutter SDK cache completeness.
4. Rebuild Flutter web cache when SDK web assets are missing.
5. Restart the development launcher process.

## Docusaurus Broken Links

Run:

```bash
pnpm --filter @adhocx/docs run build
```

Fix the source Markdown path or Docusaurus route reported in the build output.
