---
title: Marketing
description: Developer entry point for the AdhocX public Marketing website.
status: source-mapped
last_reviewed: "2026-11-23"
---

# Marketing

## Functional perspective

Marketing is the public product-information and acquisition website. It
serves corporate transport buyers, vendors, commercial drivers, employees and
general visitors with product information, a corporate inquiry funnel,
articles, FAQs and legal pages. It does not provide authenticated trip
booking or dispatch operations.

## Technical perspective

The app is built with Astro 4 and React islands. Most route content is
generated as static HTML. React handles the enterprise form, estimator,
vehicle-category selector and the global AI assistant. The enterprise form
calls the public NestJS leads API; blog routes may fetch published content
during static generation. See the [application reference](./application-reference.md)
for architecture and boundaries.

## Documentation map

- [Application reference](./application-reference.md) — architecture,
  integrations, data and static deployment boundaries.
- [Complete page reference](./detailed-page-reference.md) — function and
  implementation for all 21 source page/endpoint routes.
- [Exact page inventory](./exact-page-inventory.md) — route-to-file
  reconciliation.
- [Component and feature catalog](./component-feature-catalog.md) — shared
  UI, interactive behavior, state and persistence.
- [Lead conversion guide](./lead-conversion-guide.md) — form fields, request
  payload, backend validation and database write.
- [SEO and publishing guide](./seo-and-publishing-guide.md) — metadata,
  JSON-LD, sitemap, RSS, blog builds and deploy configuration.

## Important implementation caveats

- `EnterpriseLeadForm` sends `inquiryPurpose`, which is not declared in the
  API DTO while the global API validation pipe rejects unknown fields.
- The form uses the phone input as `contactName` and as `phone`; it does not
  collect a separate contact person's name.
- A network failure whose message contains `fetch` is rendered as form
  success even though the API may not have stored a lead.
- `EarningsCalculator` is a static vehicle selector, not an earnings
  calculator. The home estimator is local illustrative arithmetic.
- The AI widget calls OpenAI from the browser; it is not an AdhocX support
  endpoint.
- Product, SLA, legal and safety statements in page copy are not independently
  verified by this documentation.
