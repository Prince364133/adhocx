---
title: Mobile Device Test Matrix
description: Current Flutter test evidence and a proposed Android/iOS device acceptance matrix for Mobile and Employee apps.
---

# Mobile Device Test Matrix

**Status:** The repository contains Flutter widget/unit test files but does
not declare a CI emulator matrix or a release device/OS support policy. The
matrix below is a recommended manual acceptance baseline, not a claim that
these device runs are automated or already passed.

## Current automated evidence

| App | Test files | Automated command | Runtime/device evidence not implied |
|---|---:|---|---|
| Mobile driver/vendor | 31 `*_test.dart` files under `apps/mobile/test/` | `flutter test` from `apps/mobile` | Plugin/system behavior on Android/iOS, location, camera, face detection, maps, notifications, secure storage and network state |
| Employee commuter | 23 `*_test.dart` files under `apps/employee_app/test/` | `flutter test` from `apps/employee_app` | Physical-device permissions, network behavior, route/boarding workflows and OS-specific layout |

The root `pnpm test` is not a Flutter test command: each Flutter workspace's
package `test` script prints a reminder and exits. The checked-in CI workflow
does not run `flutter test`. The Mobile release workflow builds Android
APK/AAB and an unsigned iOS app; building release artifacts does not execute
the Flutter test suite or certify device behavior.

## Proposed device coverage

Use the product/release owner's supported OS versions when selecting actual
devices. The repository does not pin a minimum Android/iOS version or list
approved device models, so do not treat specific versions below as contractual.

| App and target | Minimum recommended sample | Core scenarios to exercise manually |
|---|---|---|
| Mobile — Android | One physical Android phone plus one emulator; include a small viewport and a current supported OS from the release policy | Sign-in/session persistence; dispatch/offer and trip actions; location permission and background/foreground transitions; map rendering; camera/KYC path; notification behavior; offline/reconnect; secure sign-out |
| Mobile — iOS | One physical iPhone plus one simulator, when iOS is a release target | Repeat core trip/location/map flows; camera and permission prompts; app background/restore; push notification delivery in an approved test environment; layout and navigation |
| Employee — Android | One physical Android phone plus one emulator; include the smallest supported viewport | Sign-in and session state; schedule/trip details; boarding workflow; profile/emergency-contact updates; safety actions; denied permissions and network loss |
| Employee — iOS | One physical iPhone plus one simulator, when iOS is a release target | Repeat core commute/boarding and safety flows; verify platform dialogs, navigation, persistence and responsive layout |
| Optional web smoke | Chrome run target exists in the Mobile/Employee scripts | Use only if web is an intended supported product target; the dev command alone does not establish production support |

Mobile depends on platform plugins including Maps, geolocation, camera,
Google ML Kit face detection, Firebase messaging, secure storage, local
notifications and permission handling. Those integrations need real
simulator/device checks; widget tests cannot by themselves validate the OS,
provider or hardware behavior. The Employee app's smaller dependency set
includes routing, HTTP, local preferences, connectivity and permission
handling; test its actual commuter and safety workflows rather than assuming
Mobile-only plugins exist there.

## Release-run record

For each supported app/OS combination, record:

| Field | What to capture |
|---|---|
| Build identity | Commit, build flavor/version, API environment and install source |
| Device | Model, OS version, screen size, simulator/emulator or physical |
| Account and data | Test account role and non-production scenario data; never store credentials in the report |
| Permission state | Granted, denied, denied permanently, and re-enabled where relevant |
| Network state | Online, interrupted, restored, and any intentionally degraded test network |
| Result | Scenario, expected/actual outcome, pass/fail, evidence location and issue reference |
| Cleanup | Test trip/record cleanup and logout/data reset result |

Do not test live payment, KYC, messaging or production employee/driver
accounts without explicit environment-owner approval. Use mocked or sandbox
providers when the workflow permits them.

## Commands

```powershell
Set-Location apps\mobile
flutter pub get
flutter test

Set-Location ..\employee_app
flutter pub get
flutter test
```

These are automated Flutter tests. Manual device acceptance requires a
separately approved test build, device, account and non-production API. See
the [test execution runbook](./test-execution.md), [Mobile driver guide](../../apps/mobile/driver-feature-guide.md),
and [Employee commuter guide](../../apps/employee-app/commuter-feature-guide.md).
