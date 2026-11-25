---
title: Mobile Release Runbook
description: Checked-in Android and iOS release workflow, artifact verification, and manual acceptance boundaries.
---

# Mobile Release Runbook

**Evidence status:** The release flow is mapped from
`.github/workflows/mobile-release.yml` and the Mobile Flutter manifest. No
release was triggered and no store account or published binary was inspected.

## What the workflow produces

| Target | Build output | Distribution behavior |
|---|---|---|
| Android | Release APK and Android App Bundle (AAB) | Uploaded as GitHub Actions artifacts and attached to a GitHub Release |
| iOS | Release `Runner.app` built without code signing, packaged in a zip | Uploaded as a GitHub Actions artifact and attached to a GitHub Release |
| Employee app | No target in this workflow | No Employee App release workflow was found |

The workflow can start on a `v*` tag, a push to `production`, or a manual
dispatch. It installs the Flutter stable channel and runs release build
commands; it does not run `flutter test`. The iOS output is unsigned and is
not an App Store-signed IPA or automated App Store Connect submission.

The publish job is configured to run with `if: always()` after the Android
and iOS jobs. Check that both expected artifacts exist and correspond to the
same commit before treating a GitHub Release as complete.

## Pre-release checklist

1. Confirm the release owner, version/tag, target app and approved release
   environment.
2. Run the relevant Flutter tests using the
   [test execution runbook](../engineering/test-execution.md).
3. Review compile-time API/service configuration. The workflow supplies
   endpoint configuration through Flutter `--dart-define` values; these are
   baked into the build and require a new build to change.
4. Confirm any provider keys/identifiers are safe for their client-side use
   and that no private credentials are embedded in the binary.
5. Confirm Android signing/distribution requirements and the iOS signing,
   provisioning and store steps that are not performed by this workflow.
6. Confirm a tested rollback/replacement path and support contact. No
   automated mobile rollback or staged rollout procedure is declared here.

## Post-build and install verification

For each release candidate, record the commit, tag, artifact checksums,
platform, version and build job result. Install the candidate in a
non-production test environment and verify:

- sign-in, session persistence and sign-out;
- one representative driver/vendor workflow against the approved test API;
- required location, camera, notification and map behavior on the target
  platform;
- network interruption and recovery behavior;
- app launch, resume, update and navigation on a supported OS/device;
- absence of test-only endpoints, credentials or data in the shipped build.

For iOS, a separate authorized signing and distribution step is required
before end users can install the unsigned output. Store submission, staged
rollout, crash monitoring and rollback are not automated in the checked-in
workflow.

## Manual release commands

From `apps/mobile`, after dependencies and signing/build configuration are
approved:

```powershell
flutter pub get
flutter test
```

The workflow is the authoritative source for release build flags and
compile-time configuration. Do not treat a bare local build as a release
artifact unless the approved `--dart-define` values and signing setup match
the release target. Avoid adding private credentials to command history or
committed environment files.

## Sources

- `.github/workflows/mobile-release.yml`
- `apps/mobile/pubspec.yaml` and `apps/mobile/package.json`
- `apps/mobile/Dockerfile` (separate Flutter Web build)
- [Mobile device test matrix](../engineering/mobile-device-test-matrix.md)
- [CI/CD workflow inventory](./ci-cd.md)
