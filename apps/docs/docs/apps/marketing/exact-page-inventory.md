---
title: Marketing Exact Page Inventory
description: Reconciled inventory of every Astro and TypeScript Marketing route.
status: source-mapped
last_reviewed: "2026-11-23"
---

# Marketing Exact Page Inventory

**Coverage status:** Source-mapped. The 21 entries below reconcile to 19 Astro
page files and two TypeScript endpoint files under
`apps/marketing/src/pages/`. Functional purpose, page interaction, backend
calls and static-generation behavior are detailed in the
[complete page reference](./detailed-page-reference.md).

| Route | Purpose | Source file |
|---|---|---|
| `/` | Main public product introduction and corporate inquiry conversion | `apps/marketing/src/pages/index.astro` |
| `/about` | Company identity, mission and operating context | `apps/marketing/src/pages/about.astro` |
| `/services` | Corporate ground-transport service information and inquiry | `apps/marketing/src/pages/services.astro` |
| `/industries` | Industry use cases and enterprise inquiry | `apps/marketing/src/pages/industries.astro` |
| `/pricing` | Pricing/proposal information and rate-card inquiry | `apps/marketing/src/pages/pricing.astro` |
| `/ets` | Enterprise Transportation System product overview | `apps/marketing/src/pages/ets.astro` |
| `/vendors` | Vendor/fleet partner information, inquiry and FAQs | `apps/marketing/src/pages/vendors.astro` |
| `/drivers` | Driver acquisition, vehicle-category selector and FAQs | `apps/marketing/src/pages/drivers.astro` |
| `/driver-app` | Driver app features, onboarding information and download links | `apps/marketing/src/pages/driver-app.astro` |
| `/employee-app` | Employee commuter app information and enterprise inquiry | `apps/marketing/src/pages/employee-app.astro` |
| `/blogs` | Local-source editorial listing, featured guides and glossary | `apps/marketing/src/pages/blogs.astro` |
| `/blogs/[slug]` | Static article detail routes generated from local and build-time API content | `apps/marketing/src/pages/blogs/[slug].astro` |
| `/safety` | Published safety and duty-of-care information | `apps/marketing/src/pages/safety.astro` |
| `/faq` | Category-filtered static FAQ page | `apps/marketing/src/pages/faq.astro` |
| `/contact` | Contact channels and enterprise lead form | `apps/marketing/src/pages/contact.astro` |
| `/terms` | Static terms and conditions | `apps/marketing/src/pages/terms.astro` |
| `/privacy` | Static privacy policy | `apps/marketing/src/pages/privacy.astro` |
| `/delete-account` | Static account-deletion instructions and support email link; `noindex` | `apps/marketing/src/pages/delete-account.astro` |
| `/404` | Missing-page recovery links; `noindex` | `apps/marketing/src/pages/404.astro` |
| `/rss.xml` | RSS XML generated from source articles and optional build-time API results | `apps/marketing/src/pages/rss.xml.ts` |
| `/sitemap.xml` | XML sitemap generated from Astro pages and source article slugs | `apps/marketing/src/pages/sitemap.xml.ts` |

The route catalog is a file-based route inventory, not a deployed URL check.
Astro is configured for static output; inspect generated artifacts and hosting
configuration for actual deployment behavior.

## Source and verification

- `apps/marketing/src/pages/`
- `apps/marketing/astro.config.mjs`
- [Complete page reference](./detailed-page-reference.md)
- [SEO and publishing guide](./seo-and-publishing-guide.md)
