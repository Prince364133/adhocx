---
title: Welcome
slug: /
description: A starting point for understanding AdhocX applications, platform architecture, and developer workflows.
---

# AdhocX Documentation

Welcome to the AdhocX knowledge hub. Use these guides to understand what the
platform does, how its applications fit together, and where to find
implementation details when building or troubleshooting a feature.

## Start here

| I want to... | Start with |
|---|---|
| Understand the product and its terminology | [Project overview](./platform/product/project-overview.md) and [glossary](./platform/product/glossary.md) |
| See all applications and how they communicate | [Application catalog](./apps/index.md) and [system architecture](./platform/architecture/system-context.md) |
| Set up the repository locally | [Local development setup](./platform/engineering/local-development.md) |
| Find routes, screens, services, and APIs for an app | Open its guide in the [application catalog](./apps/index.md) |
| Explore API endpoints interactively | [Swagger / OpenAPI](./apps/api/reference/swagger.md) |
| Understand a workflow across apps and backend | Follow the [marketplace lifecycle](./platform/workflows/marketplace-lifecycle.md) or [ETS roster-to-route flow](./platform/workflows/ets-roster-to-route.md) |
| Check documentation coverage and known gaps | [Completion dashboard](./platform/completion-dashboard.md) and [coverage matrix](./platform/coverage-matrix.md) |

## Applications

AdhocX has eight runnable workspaces. The API provides shared backend
capabilities; the user-facing applications serve different operational roles.
Choose an application to see its purpose, routes, features, and technical
implementation.

| Application | What it is for |
|---|---|
| [API](./apps/api/index.md) | Backend services, business rules, integrations, and data access |
| [Admin](./apps/admin/index.md) | Platform administration, verification, pricing, finance, and content |
| [Ops](./apps/ops/index.md) | Fleet operations, dispatch support, and safety incident handling |
| [Corporate](./apps/corporate/index.md) | Corporate tenant, employee transport, roster, route, and billing workflows |
| [Employee App](./apps/employee-app/index.md) | Commuter schedules, trip tracking, boarding, feedback, and safety |
| [Mobile](./apps/mobile/index.md) | Vendor and driver onboarding, requirements, offers, trips, and wallet |
| [Marketing](./apps/marketing/index.md) | Public product information and enterprise lead capture |
| [Documentation](./apps/docs/index.md) | How the documentation site is organized and maintained |

**ETS (Enterprise Transportation System)** is a shared business domain across
the API, Corporate, Employee App, Mobile, Ops, and Admin; it is not a separate
ninth application. See the [ETS current-state overview](./apps/ets/current-state-overview.md).

## Platform references

- [Architecture and diagrams](./platform/architecture/index.md) — system
  boundaries, application communication, deployment configuration, and
  selected end-to-end flows.
- [API and database references](./apps/api/reference/endpoint-inventory.md)
  and [Prisma data dictionary](./apps/api/data/data-dictionary.md) — endpoint
  inventories, model fields, relations, and schema evidence.
- [Developer workflow](./platform/engineering/developer-workflow.md),
  [testing guide](./platform/engineering/testing-overview.md), and
  [test execution runbook](./platform/engineering/test-execution.md).
- [Operations runbooks](./platform/operations/deployment-overview.md) —
  deployment boundaries, health checks, releases, recovery, and known
  operational gaps.
- [Documentation status](./platform/documentation-status.md) — how to
  interpret source-verified, partial, inventory, and planned content.

## Reading implementation claims

Documentation links to source files so developers can verify how behavior is
implemented. A route or model inventory is a discovery aid, not proof that
every workflow has been runtime-tested. Pages label known gaps and distinguish
implemented behavior from proposals or unverified production behavior.

