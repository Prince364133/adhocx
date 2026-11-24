---
title: Marketing Complete Page Reference
description: Functional purpose and actual Astro, React, API, and data behavior for every Marketing route.
status: source-mapped
last_reviewed: "2026-11-23"
---

# Marketing Complete Page Reference

This reference covers the 21 files under `apps/marketing/src/pages/`: 19
Astro pages, including the dynamic blog template, and two TypeScript endpoints.
Content is described as it appears in source. Product, SLA, compliance, and
performance statements on public pages are marketing copy; this page does not
independently verify them against operations or production.

## Route reference

| Route | Page purpose and audience | Features and user actions | Frontend implementation | API/service | Database |
|---|---|---|---|---|---|
| `/` | Introduces AdhocX to corporate mobility buyers, employees, drivers, and vendors. | Explore services, apps, proof points, FAQ and RFP content; change commuter/shift/fleet inputs; submit corporate inquiry. | `apps/marketing/src/pages/index.astro`; `CorporateEstimator` and `EnterpriseLeadForm` React islands; `BaseLayout`. | Form intends `POST /api/v1/leads/enterprise`; estimator is local-only. | Successful API request creates `LeadCapture`; estimator has no persistence. |
| `/about` | Explains company identity, operating context and governance to prospects and partners. | Read company narrative, operating corridors and conversion links. | `apps/marketing/src/pages/about.astro`, static Astro content and page JSON-LD. | None found. | None. |
| `/services` | Describes corporate ground-transport services to transport, HR and procurement teams. | Review service capabilities and submit an RFP/proposal inquiry. | `apps/marketing/src/pages/services.astro`; `EnterpriseLeadForm` loaded on the page; shared shell. | Intended enterprise-lead POST. | `LeadCapture` on successful backend persistence. |
| `/industries` | Presents industry-specific commute/transport use cases. | Browse vertical use cases and submit an enterprise/RFP inquiry. | `apps/marketing/src/pages/industries.astro`; `EnterpriseLeadForm` with RFP purpose; shared shell. | Intended enterprise-lead POST. | `LeadCapture` on successful backend persistence. |
| `/pricing` | Explains commercial pricing/proposal context; it is not a live rate quotation engine. | Read pricing content and request a tailored rate card. | `apps/marketing/src/pages/pricing.astro`; `EnterpriseLeadForm` with quotation purpose. | Intended enterprise-lead POST; no pricing API call found. | `LeadCapture` for an accepted inquiry. |
| `/ets` | Introduces the Enterprise Transportation System to corporate buyers. | Read product/platform descriptions and use page links/CTAs. | `apps/marketing/src/pages/ets.astro`, static sections and page JSON-LD. | None found on this route. | None. |
| `/vendors` | Acquires fleet operators and vendor partners while explaining commercial fleet categories and program claims. | Read onboarding/contract information, submit the shared enterprise form, expand FAQ items. | `apps/marketing/src/pages/vendors.astro`; `EnterpriseLeadForm`; `FaqAccordion.astro`. | Intended enterprise-lead POST; FAQ is local content. | `LeadCapture` on successful backend persistence. |
| `/drivers` | Acquires commercial drivers and points them toward the Driver app. | Compare vehicle categories, select a category in the feature selector, expand driver FAQs, follow app/onboarding links. | `apps/marketing/src/pages/drivers.astro`; `EarningsCalculator` React island (vehicle selector, not earnings math); `FaqAccordion.astro`. | No API call found. | None. |
| `/driver-app` | Describes the separate Driver mobile app and its advertised workflows. | Read feature and onboarding information; follow application download links. | `apps/marketing/src/pages/driver-app.astro`, static content and links. | No API call found. | None. |
| `/employee-app` | Describes the separate employee commuter app to employees and corporate buyers. | Read advertised commute/safety features and submit an enterprise inquiry. | `apps/marketing/src/pages/employee-app.astro`; `EnterpriseLeadForm` visible-on-scroll island. | Intended enterprise-lead POST. | `LeadCapture` on successful backend persistence. |
| `/blogs` | Publishes AdhocX mobility articles, featured resources and an ETS glossary. | Browse featured content and open article links. No search/filter UI was found in this page source. | `apps/marketing/src/pages/blogs.astro` renders `ARTICLES_CONTENT` and a static article grid. | No visitor-time API call; page content is local source data. | No direct browser DB access. |
| `/blogs/[slug]` | Presents one article with metadata, breadcrumbs, related links and reading content. | Read article and navigate to the blog index/related articles. | `apps/marketing/src/pages/blogs/[slug].astro`; Astro `getStaticPaths()` combines local articles with published API records during build. | Build-time `GET /api/v1/blogs?status=PUBLISHED&limit=50`; failures fall back to seeded articles. | Reads `BlogPost` data through the blogs API during build; no browser DB access. |
| `/safety` | Communicates advertised safety and duty-of-care practices to enterprise buyers and employees. | Read claims and navigate to safety/contact sections. | `apps/marketing/src/pages/safety.astro`, static sections and JSON-LD. | None found. | None. |
| `/faq` | Self-service answers for HR, operations, finance, drivers and compliance readers. | Filter FAQs by persona and expand native disclosure items; use contact CTA. | `apps/marketing/src/pages/faq.astro`; local FAQ array, category filter script, native `<details>`, FAQPage JSON-LD. | None found. | None. |
| `/contact` | Provides inquiry contact channels and a corporate consultation form. | Use phone/email links or submit required company, contact-phone, email and requirement fields. | `apps/marketing/src/pages/contact.astro`; `EnterpriseLeadForm` hydrated with `client:load`. | Intended enterprise-lead POST. | `LeadCapture` if the server accepts and persists the request. |
| `/terms` | Displays the published service terms, including operating model, eligibility, refund and incentive text. | Read the terms and navigate to related pages. | `apps/marketing/src/pages/terms.astro`, static legal copy. | None. | None. |
| `/privacy` | Explains the published privacy and data-handling statements. | Read collection/use/security/deletion text and follow the deletion link. | `apps/marketing/src/pages/privacy.astro`, static legal copy and breadcrumbs. | None. | None. |
| `/delete-account` | Gives account-deletion instructions for users of the separate mobile app. | Follow in-app steps or open a prefilled support email; no web deletion form is present. | `apps/marketing/src/pages/delete-account.astro`; `noindex`; `mailto:` link. | No API call or deletion workflow is implemented by this page. | No direct database action. |
| `/404` | Helps a visitor recover from a missing URL. | Navigate to selected service, pricing, insight, contact or home pages. | `apps/marketing/src/pages/404.astro`; `noindex`; static links. | None. | None. |
| `/rss.xml` | Syndicates article summaries for RSS readers. | Subscribe using the feed URL exposed in metadata. | `apps/marketing/src/pages/rss.xml.ts`; Astro endpoint emits XML during static generation. | Build-time `GET /api/v1/blogs?status=PUBLISHED&limit=20`; on error it uses `ARTICLES_CONTENT`. | Published `BlogPost` data when API fetch succeeds; local content otherwise. |
| `/sitemap.xml` | Lists crawlable pages and seeded article URLs for search engines. | Search crawlers consume the XML; visitors are not expected to interact with it. | `apps/marketing/src/pages/sitemap.xml.ts`; generates canonical-origin URLs and priority/frequency metadata. | None. | None; page paths and seeded article data come from source. |

## User-facing workflows

### Corporate inquiry

The home, contact, services, industries, pricing, vendor and employee-app
pages render the shared enterprise form. Visitors enter company, phone,
email and a free-text requirement, then submit. The React island posts to the
public leads endpoint, displays an error on ordinary non-2xx responses, and
switches to a confirmation panel when `submitted` becomes true. The current
request contract and false-success edge case are detailed in the
[lead conversion guide](./lead-conversion-guide.md).

### Driver and vendor discovery

The driver and vendor routes explain partner offerings and link into the
separate mobile apps or inquiry workflow. The driver-page component called
`EarningsCalculator` only switches between static vehicle-category cards; it
does not estimate earnings, compute a bonus, or call an API. Claims shown in
the marketing copy are not verified by those pages.

### Blog publishing

Local article records in `src/data/blogArticles.ts` render the blog index and
seeded detail routes. The dynamic detail template may add published records
fetched by Astro during build. RSS generation also attempts a build-time
published-blog request and falls back to local article records. A static
build does not continuously refresh these records after deployment.

## Route and integration boundaries

- Only enterprise lead forms make a first-party write request from these pages.
- Blog detail and RSS content can read the blogs API at build time. They are
  not live browser-rendered feeds.
- `/delete-account` is instructional email routing, not an account-deletion
  API.
- The estimator and vehicle selector are local UI state; no quote or earnings
  service is called.
- Safety, legal, SLA, refund, compliance, earnings and guarantee statements
  are source-visible copy, not runtime-verified behavior.

See the [component catalog](./component-feature-catalog.md), [lead guide](./lead-conversion-guide.md)
and [SEO guide](./seo-and-publishing-guide.md) for implementation detail.

## Sources and verification

- `apps/marketing/src/pages/` — all 21 source page/endpoint files.
- `apps/marketing/src/components/` and `src/layouts/BaseLayout.astro` — shared
  UI and behavior.
- `apps/marketing/src/data/blogArticles.ts` — local article data.
- `apps/api/src/modules/leads/` and `apps/api/src/modules/blogs/` — backend
  integration sources.
- `apps/api/prisma/schema.prisma` — `LeadCapture` and `BlogPost` data models.
