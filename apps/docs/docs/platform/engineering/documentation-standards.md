---
title: Documentation Standards
description: Standards for accurate, maintainable and evidence-based AdhocX technical documentation.
---

# Documentation Standards

AdhocX documentation is maintained as code under `apps/docs`. It uses the
existing Docusaurus theme and is organized as product and engineering
knowledge, not as a substitute for source code.

## Status Labels

Every factual statement should use one of these evidence labels where the
status may be unclear:

| Label | Definition |
|---|---|
| **Verified** | Confirmed by source code, configuration or executable behavior |
| **Partially Verified** | Present in one layer but incomplete or inconsistent across the system |
| **Needs Investigation** | Not enough evidence is available to classify safely |
| **Not Found** | No implementation or configuration evidence was found |
| **Planned / Not Implemented** | A specification or roadmap item with no confirmed implementation |

Do not describe planned functionality as shipped behavior.

## Page Structure

Use a consistent structure:

1. Frontmatter with `title` and `description`.
2. Concise purpose statement.
3. Verified, current-state architecture or behavior.
4. Evidence and source references.
5. Diagrams when they communicate relationships.
6. Known limitations or unresolved questions.
7. Related pages and ownership references.

Keep complex topics in separate pages. Prefer cross-links over duplicating
content.

## Source-of-Truth Hierarchy

Use this hierarchy when evidence conflicts:

1. Executable source code
2. Package manifests and build configuration
3. Database schema and migrations
4. CI/CD and deployment configuration
5. Tests and working simulations
6. Existing Markdown and audit documentation
7. Roadmap documents and implementation plans

Markdown roadmaps and audit files are historical or proposed evidence unless
the implementation is confirmed in the source tree.

## Diagrams

Use Mermaid for:

- System context
- Containers and application relationships
- Sequence flows
- State transitions
- Entity relationships
- Deployment topology

Every Mermaid diagram must correspond to implementation evidence. Labels for
planned components should not use the same visual treatment as verified
components.
The `check:docs` script parses public Mermaid blocks; the Docusaurus
production build also validates document rendering and internal links.

## Security and Privacy

Never publish:

- Live passwords or private keys
- Access tokens
- Database connection credentials
- Personal or customer data
- Private webhook secrets
- Provider secret values

Use environment variable names and redacted examples. Secret-bearing
deployment examples must be reviewed before publication.
The documentation check scans published Markdown for selected private-key
and token formats without echoing matched values. It cannot recognize every
secret type and does not replace code review or a dedicated secret scanner.

## Terminology

- **API**: the NestJS monolithic backend under `apps/api`.
- **Application**: one runnable workspace under `apps/*`.
- **Corporate**: the Next.js corporate transport portal.
- **ETS**: the enterprise transportation business domain implemented across Corporate, Employee, Ops, Mobile and API.
- **Ops**: the Next.js operational control desk.
- **Admin**: the Next.js platform governance desk.
- **Employee App**: the Flutter corporate commuter application.
- **Mobile**: the Flutter vendor/driver application.

## Internal vs Public Content

Public documentation belongs under `apps/docs/docs/platform` and
`apps/docs/docs/apps`. Internal planning and audit material may remain under
`apps/docs/docs/**/internal`, which is excluded from the generated public
documentation output.

Before publication, run `pnpm --filter @adhocx/docs check:docs`,
`pnpm --filter @adhocx/docs typecheck` and `pnpm --filter @adhocx/docs build`.
CI runs the same checks. The coverage check compares route/controller/model
source identifiers with their documentation inventories; it verifies
traceability, not the correctness or completeness of the described behavior.
