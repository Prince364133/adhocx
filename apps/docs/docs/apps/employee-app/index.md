---
title: Employee App
---

# Employee App

## Functional Perspective

The Employee App is the employee-facing client for employer-arranged
transport. An employee uses it to authenticate, review the commute schedule,
follow the assigned cab, submit schedule changes, confirm safe arrival, and
contact safety or support. Corporate dispatch and route creation belong to
the connected Corporate/Ops workflows; the Employee App consumes those
assignments rather than dispatching vehicles.

## Technical Perspective

Flutter starts at `apps/employee_app/lib/main.dart`. A shared
`EmployeeApiClient`, auth/rider repositories and Provider state connect feature
screens to the NestJS API. The route file declares 131 constants (110
canonical paths and 21 aliases), with 110 registered GoRoute entries; two
paths redirect to mobile-number entry. The client does not have a global
router auth guard. API authorization and ownership checks are authoritative.

- [Employee app architecture](./architecture.md)
- [Commuter feature guide](./commuter-feature-guide.md)
- [Employee app feature inventory](./feature-inventory.md)
- [Employee complete route reference](./detailed-route-reference.md)
- [Exact Flutter route inventory](./exact-route-inventory.md)
- [Route and screen catalog](./screen-component-catalog.md)
- [State and provider catalog](./state-provider-catalog.md)
- [Service/API matrix](./service-api-matrix.md)
- [Boarding, safety and API integration](./boarding-safety-and-api.md)
- [Employee mobile app specification](../ets/applications/employee-app/08_EMPLOYEE_MOBILE_APP_SPECIFICATION.md)
