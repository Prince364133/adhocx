---
title: Ops
---

# Ops

## Functional Perspective

Ops gives operations teams a live fleet and incident control experience.
Staff can inspect routes, drivers, employees and support queues, reassign
routes and respond to safety/SOS events.

## Technical Perspective

Next.js 14 App Router starts at `apps/ops/src/app/layout.tsx`.
`OpsShell` performs a client-side stored-token/OPS-or-ADMIN check, configures
the shared Corporate API session and wraps pages with Corporate session
context. It auto-selects a tenant only for the migrated live, routes and
safety families; API authorization remains server-side.

- [Ops application reference](./application-reference.md)
- [Route-by-route reference](./route-by-route-reference.md)
- [Live operations runbook](./live-operations-runbook.md)
- [SOS and reassignment guide](./sos-and-reassignment-guide.md)
- [Detailed reference index](./detailed-reference.md)
- [Exact route inventory](./exact-route-inventory.md)
- [Safety, SOS, and Command Centre operations](../ets/applications/ops/11_SAFETY_SOS_AND_COMMAND_CENTRE_OPERATIONS.md)
