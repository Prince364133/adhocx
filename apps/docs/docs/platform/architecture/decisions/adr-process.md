---
title: ADR and Decision-Log Process
description: How to propose, record, review and supersede architecture decisions in AdhocX.
status: current
last_reviewed: "2026-11-23"
---

# ADR and Decision-Log Process

Architecture Decision Records (ADRs) preserve decisions that materially
affect system structure, data, integrations, security, deployment or
cross-application contracts. They complement the implementation references;
they do not replace them.

## When to create an ADR

Create an ADR when a choice has meaningful consequences for more than one
feature or team, constrains future design, or is expensive to reverse. Routine
implementation details belong in feature documentation or code review instead.

## Recording a decision

1. Copy `apps/docs/templates/adr-template.md` and assign the next sequential
   `ADR-NNNN` identifier.
2. Describe the context and the problem without presenting a proposal as
   shipped behavior.
3. List the considered options and relevant constraints. Cite source,
   requirements or verified operational evidence for factual claims.
4. State the decision, status, consequences and any migration or security
   implications. Distinguish observed current architecture from a newly
   approved choice.
5. Add the record to the [ADR index](./index.md), link related decisions and
   update the [decision changelog](./changelog.md).
6. Ask the relevant area evidence owner in the
   [governance guide](../../governance.md) to review technical accuracy.

## Status and supersession

Use **Proposed** for a decision awaiting approval, **Accepted** for the
approved direction, **Rejected** for a considered option that was not chosen,
and **Superseded** when a later ADR replaces it. Use **Source-observed** only
when the repository demonstrates an existing boundary but no original
decision record is available. Do not infer the original author, date or intent.

Do not silently rewrite an accepted decision when the architecture changes.
Create a new ADR, link the earlier record as superseded, and update the
changelog and current architecture references. Historical or rejected
decisions remain discoverable but must be labeled so they cannot be mistaken
for current implementation.

## Decision changelog

Add a dated entry to `changelog.md` for each ADR creation, status transition,
material correction or supersession. Include the ADR ID, change summary and
review reference where available. The changelog is a documentation history;
it is not proof of a production rollout or a meeting that is not recorded.

## Sources and verification

- `apps/docs/docs/platform/architecture/decisions/` — current ADR index,
  source-observed records and decision changelog.
- `apps/docs/docs/platform/governance.md` — area-level evidence owners and
  documentation review responsibilities.
- `apps/docs/templates/adr-template.md` — reusable structure for future ADRs.
