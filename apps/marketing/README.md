# AdhocX — Marketing Web Application (`apps/marketing`)

**Product:** AdhocX Marketing & Growth Portal  
**Framework:** Astro (SSR / SSG Hybrid with Island Architecture)  
**Status:** Architecture & Specifications Documented — Ready for Implementation upon Mentor/Reviewer Approval  
**Version:** V1.0  
**Last Updated:** September 2026  

---

## 1. Overview & Objective

`apps/marketing` is the public-facing marketing, driver acquisition, and enterprise lead-generation web application for **AdhocX**.

Built with the **Astro** tech stack, this web app is engineered for:
* **Sub-second Core Web Vitals (LCP < 1.2s, FID < 50ms, CLS = 0)**
* **Peak SEO Rankings & Search Engine Crawlability** (100% server-rendered static HTML with minimal client JS)
* **High-Converting Funnels** for both **Driver-Partners** and **Corporate Transport Users**
* **Consistent Brand Identity** strictly following the AdhocX Design System (`04_DESIGN_SYSTEM.md` & `05_UI_UX_GUIDELINES.md`)

---

## 2. Tech Stack: Astro

As mandated by the engineering lead and mentor:

| Layer | Choice | Rationale |
|---|---|---|
| **Framework** | **Astro 4.x / 5.x** | Content-driven, islands architecture, zero unnecessary client-side JavaScript, native Markdown/MDX support. |
| **Styling** | **Vanilla CSS + Design Tokens** (AdhocX tokens) | Full control over styling, no runtime CSS overhead, aligns with AdhocX design system (`#0B1220`, `#2563EB`, `#16A34A`, Inter font). |
| **Interactive Islands** | **React / Vanilla JS Islands** (client:visible, client:idle) | For dynamic calculators (e.g., Driver Bonus & Earnings Calculator, Corporate Cost Estimator, Lead Forms). |
| **SEO & Meta** | `astro-seo` + Schema.org JSON-LD | Automated OpenGraph, Twitter Cards, BreadcrumbList, LocalBusiness, FAQPage, and JobPosting schemas. |
| **Analytics & Tracking** | Plausible / GA4 / Meta Pixel with consent management | Event tracking for CTA clicks, driver signups, lead submissions, and campaign conversions. |

---

## 3. Directory Structure

```text
apps/marketing/
├── README.md                      <- Overview, setup, scripts, deployment
├── SPECIFICATION.md               <- Complete route map, sitemap, SEO & metadata spec
├── DESIGN_AND_UI.md               <- UI/UX guidelines, component specs, design tokens
├── CAMPAIGNS_AND_COPY.md          <- Marketing copy, campaigns (Driver ₹2,000 Bonus, User SLAs)
├── ASTRO_ARCHITECTURE.md          <- Component hierarchy, island architecture, Astro configs
│
├── public/                        <- Static assets (favicons, og-images, robots.txt, sitemap.xml)
├── src/
│   ├── components/                <- Reusable Astro UI components
│   │   ├── common/                <- Header, Footer, Button, Card, Badge, Modal
│   │   ├── driver/                <- DriverHero, BonusPromoCard, EarningsCalculator, OnboardingSteps
│   │   ├── enterprise/            <- EnterpriseHero, SlaPillars, FleetSimulator, QuoteForm
│   │   └── seo/                   <- SeoHead, JsonLd, OpenGraph
│   ├── content/                   <- Content collections (blog, press, driver-stories, faqs)
│   ├── layouts/                   <- BaseLayout.astro, DriverLayout.astro, EnterpriseLayout.astro
│   ├── pages/                     <- Astro file-based routing
│   │   ├── index.astro            <- Primary Home / Overview Landing Page
│   │   ├── drivers/               <- Driver acquisition portal & campaigns
│   │   │   ├── index.astro        <- Driver Landing & ₹2,000 Bonus Promotion
│   │   │   └── onboarding.astro   <- Step-by-step driver onboarding guide
│   │   ├── enterprise/            <- B2B Transport User / Corporate Fulfillment
│   │   ├── safety/                <- Safety, Verification & Trust Standards
│   │   ├── pricing/               <- Transparent pricing & commission models
│   │   ├── contact/               <- Inquiries & Partner support
│   │   └── legal/                 <- Terms, Privacy Policy, Driver Partner Agreement
│   └── styles/                    <- tokens.css, global.css, typography.css
├── astro.config.mjs               <- Astro configuration
├── package.json                   <- Dependencies & build scripts
└── tsconfig.json                  <- TypeScript configuration
```

---

## 4. Key Campaign Highlight: Driver 100 Rides ₹2,000 Bonus

To rapidly scale driver supply and ensure high initial retention, the marketing site prominently features the **AdhocX Century Milestone Bonus**:

* **Offer:** Complete **100 verified trips** within the first 30 days of onboarding.
* **Reward:** Instant **₹2,000 Cash Bonus** deposited directly into the driver's wallet/bank account.
* **Supporting Driver Benefits:**
  * Zero platform commissions during introductory period.
  * Instant weekly/daily bank payouts via UPI & IMPS.
  * Transparent trip allocations with fixed guaranteed rates.
  * 24/7 dedicated driver partner on-road support.

---

## 5. Development Workflow & PR Approval

1. **Phase 1 (Current):** Full technical and architectural documentation created and committed on branch `Varsha`.
2. **Phase 2 (Review):** Pull Request raised against `main` for mentor review and formal approval.
3. **Phase 3 (Implementation):** Upon PR merge/approval, generate the Astro app structure, UI components, styling, and interactive islands matching the documented specifications.
