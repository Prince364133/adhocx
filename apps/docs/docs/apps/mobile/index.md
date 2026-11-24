---
title: Mobile
---

# Mobile

## Functional Perspective

The Mobile app provides separate Driver and Vendor/Booker experiences. Drivers
can onboard, submit KYC, see dispatch offers, execute trips and manage earnings
and support. Vendors can build transport requirements, follow fulfillment,
review trips and use payments when the wallet feature is enabled. The API
remains authoritative for pricing, account verification, trip state and
payments. Some route constants redirect instead of opening a separate page;
the exact route inventory records that runtime behavior.

## Technical Perspective

Flutter starts at `apps/mobile/lib/main.dart`, registers Provider/services,
uses GoRouter and calls AdhocX APIs through `ApiClient` and feature services.
The router file declares 172 named constants: 107 canonical path constants
and 65 role/compatibility aliases. GoRouter contains 119 registered entries,
including deep-link aliases and redirects. Corporate ETS driver screen files
exist, but the active-route screen is not registered in the audited router.

## Documentation

- [Mobile application reference](./application-reference.md)
- [Route and workflow reference](./detailed-route-reference.md)
- [Exact route inventory and screen mapping](./exact-route-inventory.md)
- [Screen and component catalog](./screen-component-catalog.md)
- [Driver feature guide](./driver-feature-guide.md)
- [Vendor feature guide](./vendor-feature-guide.md)
- [Service/API matrix](./service-api-matrix.md)
- [Driver mobile app specification](../ets/applications/driver-app/09_DRIVER_MOBILE_APP_SPECIFICATION.md)
- [Driver KYC verification plan](./compliance/22_DIGIO_DRIVER_KYC_VERIFICATION_PLAN.md)
