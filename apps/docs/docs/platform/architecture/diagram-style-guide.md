---
title: Architecture Diagram Style Guide
description: Source-first conventions for AdhocX Mermaid and architecture diagrams.
status: current
last_reviewed: "2026-11-23"
---

# Architecture Diagram Style Guide

## Principles

- Start from checked-in manifests, entrypoints, modules, controllers, Prisma
  schema, Docker Compose and gateway configuration.
- Label a workspace separately from a deployed container. Mark an unknown
  deployment target as unknown; do not infer it from a package manifest.
- Use present-tense relationships only when source shows the call or wiring.
  Qualify provider relationships with “when configured” unless deployment
  evidence proves availability.
- Keep diagrams to one audience and one level of detail. Link to the route,
  API, data or operations reference for exhaustive inventories.
- Mark representative sequences as examples, and show relevant failure or
  fallback behavior when it changes the system guarantee.
- Treat ERDs as projections of `apps/api/prisma/schema.prisma`. Show optional
  relations as optional and state which supporting entities are omitted.

## Mermaid conventions

- Use a flowchart with explicit boundaries and labels for C4 context,
  container and component views. The native Mermaid C4 renderer currently
  raises a browser runtime error on context pages in this Docusaurus setup.
  Do not switch back to native C4 blocks until browser rendering is verified.
- Use `sequenceDiagram` for request/event order and `erDiagram` for relational
  relationships. Use `flowchart` for deployment topology when the workspace
  manifest and Compose membership need to be contrasted.
- Put a short title in each diagram. Keep node labels concise; explain details
  and evidence immediately below the diagram.
- Use dashed arrows for unverified deployment/client relationships or
  explicitly stated source-only connections.
- Avoid credentials, secret values, personal data and production host details
  that are not already approved for public documentation.

## Rendering and review

The Docusaurus site enables Mermaid with `@docusaurus/theme-mermaid` in
`apps/docs/docusaurus.config.ts`. A production docs build is the required
syntax/render check. Review the rendered pages at desktop and mobile widths
when diagrams are materially revised.

When a source change alters a diagram, update the diagram and its evidence
notes in the same change. A successful Mermaid render validates syntax, not
the truth of the relationships; source reconciliation remains a separate
review step.
