---
title: Marketing Component and Feature Catalog
description: Source-level behavior and user workflows for shared Marketing UI and interactive features.
status: source-mapped
last_reviewed: "2026-11-23"
---

# Marketing Component and Feature Catalog

This catalog explains components by their implemented behavior. A component's
name or its promotional copy is not evidence that an advertised external
workflow exists.

## Shared UI and interaction components

| Component | Purpose and user behavior | Technical implementation and state | Used by / external effects |
|---|---|---|---|
| `BaseLayout.astro` | Gives public routes a consistent page frame, navigation, footer and search metadata. | Imports global CSS, renders a skip link, `Header`, page slot, `Footer`, and `CorporateAiAssistant` with `client:idle`; creates shared Organization/WebSite JSON-LD and merges page schema. | Used by Astro pages. No API call from the layout except the assistant's separate browser interaction. |
| `Header.astro` | Helps visitors navigate services, industries, safety, pricing, company information and the two mobile apps. | Astro markup plus browser event handlers for the app dropdown, Escape/outside click, mobile drawer, link-close behavior, viewport resize and scroll shadow. No framework state store. | Rendered by `BaseLayout`; links to existing Marketing routes. |
| `Footer.astro` | Provides service, app, company, support and legal navigation, plus company/location copy. | Static Astro markup with ordinary links. | Rendered by `BaseLayout`; links to Marketing pages and `/driver-app`. |
| `MobileStickyBar.astro` | Defines quick links for corporate fleet, driver acquisition and a phone call. | Astro component with CSS that forces `display: none !important`. `BaseLayout` imports it but does not render it. | No current page output; do not describe it as a visible feature. |
| `Icon.astro` | Shares small SVG icons across content and controls. | Selects inline SVG markup by icon name; no network or data dependency. | Used by FAQ, sticky-bar and other Astro UI. |
| `SeoHead.astro` | Emits document metadata and discovery links. | Uses page props for title, description, canonical, Open Graph, social cards and `noindex`; otherwise derives a canonical from `Astro.url`. Adds region, font, manifest, RSS and favicon links. | Used by `BaseLayout`; no API call. See [SEO guide](./seo-and-publishing-guide.md). |
| `FaqAccordion.astro` | Lets visitors expand question answers on acquisition pages. | Receives an `items` array; renders question buttons and hidden answer regions with `aria-expanded`/`aria-controls`; a small script toggles the answer and open styling. Reinitializes after Astro page navigation. | Used on `/drivers` and `/vendors`; no API call. The `/faq` page implements its own separate filter/details UI. |

## Interactive features

### Enterprise inquiry form

`EnterpriseLeadForm.tsx` is a React island used by the home, contact, services,
industries, pricing, vendor and employee-app pages. It collects company name,
phone, work email and a free-text requirement. The optional `purpose` URL query
parameter selects one of three hard-coded purpose labels; page props can also
provide a default purpose. It uses React component state for the values,
submitting flag, error text and confirmation display. There is no shared
application state or persistence.

The HTML form requires the four visible fields and uses `type="email"` and
`type="tel"`. On submit it sends JSON to `/api/v1/leads/enterprise`; field
mapping, server validation and integration defects are documented in the
[lead conversion guide](./lead-conversion-guide.md). A confirmation panel
offers a “Submit Another Request” action that clears the form's local fields.

Pages select different Astro hydration strategies: the contact, services,
industries, pricing and vendor forms use `client:load`; home uses
`client:visible`; employee-app uses `client:visible`. This controls when the
React component becomes interactive, not whether the API request is
server-validated.

### Corporate sizing estimator

`CorporateEstimator.tsx` is embedded on the home page with `client:visible`.
Its purpose is to let a buyer explore a rough fleet-size scenario without
submitting data. React state stores commuter count, shift model and vehicle
mix. Every interaction recalculates the display locally:

- Commuter range is 50–2,500 in increments of 25; initial value is 350.
- Shift multipliers are 1.0 (three shifts), 0.85 (two shifts) and 0.7
  (general office).
- Average occupancy is 5.8 for MUV, 3.6 for sedan and 4.4 for hybrid.
- Cab estimate is `max(4, round(commuters × 0.75 × shiftMultiplier / occupancy))`.
- Route estimate multiplies cabs by 2.8 for three shifts and 2.0 otherwise.
- “Monthly Admin Saved” is `round(commuters × 0.42)` hours.
- “Night Escort Compliance” is hard-coded as 100%.

These are component constants and arithmetic, not a quotation, dispatch plan,
backend result, validated SLA or stored lead. The page CTA links to the
enterprise inquiry section.

### Driver vehicle selector

Despite its component name, `EarningsCalculator.tsx` does not calculate
earnings. It keeps a selected vehicle ID in React state and switches the
visible static detail card among compact sedan, 6/7-seater MUV and executive
SUV. Each card displays example models, use cases, advertised features and
specification labels. The component includes a Google Play link. There are no
hours/week, payout formula, API request, bonus calculation or saved user
inputs in this component.

### Corporate AI assistant

`CorporateAiAssistant.tsx` is included by the shared layout with
`client:idle`, so it is available across pages after the browser is idle. It
starts with a local greeting, stores messages in `sessionStorage` under
`adhocx_chat_history_v3`, and displays replies in a floating conversation UI.
Suggested prompts and keyword checks can show a contact CTA. On send, it
combines a fixed system prompt with the current conversation and posts it from
the browser to OpenAI's Chat Completions endpoint using the `gpt-4o-mini`
model. API errors produce a local fallback answer and contact CTA.

No AdhocX API proxy for these chat calls was found. The browser request
transmits the conversation to the external provider; do not put provider
credentials or secrets in documentation. The widget is an external AI
integration, not a staffed support chat or authoritative product/configuration
source.

### Page-level FAQ filter

`/faq` does not use `FaqAccordion.astro`. It stores its questions in a local
array grouped into HR/mobility, operations, finance, driver and compliance
categories; category buttons filter `<details>` elements in the page. The
page also emits FAQPage JSON-LD from the same local questions. This is a
static FAQ and filtering experience, not a search against support tickets or
an API.

## State and persistence boundaries

| State/data | Location | Lifetime and effect |
|---|---|---|
| Estimator selections | React component state | Current component session only; recalculates local numbers. |
| Vehicle selection | React component state | Current component session only; selects a static detail record. |
| Lead form fields and status | React component state | Until cleared, route unload or component reset; only a request to the API can persist a lead. |
| Assistant conversation | React state and browser `sessionStorage` | Restored for the current browser tab session; sent to external AI on a new message. |
| FAQ list/filter | Static page array and DOM classes | Current generated page; no backend state. |
| Blog content | Source module or build-time API response | Frozen into static output at build time. |

No Redux, global React store, authenticated Marketing session, or client-side
database access was found in the audited app source.

## Source references

- `apps/marketing/src/layouts/BaseLayout.astro`
- `apps/marketing/src/components/`
- `apps/marketing/src/pages/index.astro`
- `apps/marketing/src/pages/drivers.astro`
- `apps/marketing/src/pages/faq.astro`
- [Lead conversion guide](./lead-conversion-guide.md)
- [Complete page reference](./detailed-page-reference.md)
