# AdhocX — Marketing Web Application (`apps/marketing`)

**Product:** AdhocX Marketing & Growth Portal  
**Framework / Stack:** Astra Tech Stack (HTML-first, SEO & Bot-Crawler Optimized, Zero-Runtime Overhead)  
**Status:** Architecture & Specifications Documented — Ready for Implementation upon Mentor/Reviewer Approval  
**Version:** V1.0  
**Last Updated:** September 2026  

---

## 1. Overview & Objective

`apps/marketing` is the public-facing marketing, driver acquisition, and enterprise lead-generation web application for **AdhocX**.

Built with the **Astra** tech stack, this web app is engineered for:
* **Sub-second Core Web Vitals (LCP < 1.0s, FID < 40ms, CLS = 0)**
* **Peak SEO Rankings & Bot / Search Engine Crawlability** (Pure server-rendered semantic HTML with zero unnecessary client JS)
* **High-Converting Funnels** for both **Driver-Partners** and **Corporate Transport Users**
* **Consistent Brand Identity** strictly following the AdhocX Design System (`04_DESIGN_SYSTEM.md` & `05_UI_UX_GUIDELINES.md`)

---

## 2. Tech Stack: Astra

As mandated by the mentor (spelled **A-S-T-R-A**):

| Layer | Choice | Rationale |
|---|---|---|
| **Core Architecture** | **Astra Tech Stack** | HTML-first, highly optimized for web crawlers, search indexing, and ultra-fast page speeds. |
| **Styling** | **Vanilla CSS + Design Tokens** (AdhocX tokens) | Full control over styling, zero CSS runtime overhead, aligns strictly with AdhocX design system (`#0B1220`, `#2563EB`, `#16A34A`, Inter font). |
| **Interactive Components** | **Astra Interactive Islands / Modules** | Dynamic modules for Driver Bonus & Earnings Calculator, Corporate Cost Estimator, and Lead Forms. |
| **SEO & Meta** | Semantic Meta Tags + Schema.org JSON-LD | Automated OpenGraph, Twitter Cards, BreadcrumbList, LocalBusiness, FAQPage, and JobPosting schemas. |
| **Analytics & Tracking** | Privacy-first Analytics / Webhook pipeline | Event tracking for CTA clicks, driver signups, milestone bonus claims, and lead submissions. |

---

## 3. Directory Structure

```text
apps/marketing/
├── README.md                      <- Overview, setup, scripts, deployment
├── SPECIFICATION.md               <- Complete route map, sitemap, SEO & metadata spec
├── DESIGN_AND_UI.md               <- UI/UX guidelines, component specs, design tokens
├── CAMPAIGNS_AND_COPY.md          <- Marketing copy, campaigns (Driver ₹2,000 Bonus, User SLAs)
├── ASTRA_ARCHITECTURE.md          <- Astra component hierarchy, islands architecture & configs
│
├── public/                        <- Static assets (favicons, og-images, robots.txt, sitemap.xml)
├── src/
│   ├── components/                <- Reusable Astra UI components
│   │   ├── common/                <- Header, Footer, Button, Card, Badge, Modal
│   │   ├── driver/                <- DriverHero, BonusPromoCard, EarningsCalculator, OnboardingSteps
│   │   ├── enterprise/            <- EnterpriseHero, SlaPillars, FleetSimulator, QuoteForm
│   │   └── seo/                   <- SeoHead, JsonLd, OpenGraph
│   ├── layouts/                   <- BaseLayout, DriverLayout, EnterpriseLayout
│   ├── pages/                     <- Astra file-based routing
│   │   ├── index.html / .astra    <- Primary Home / Overview Landing Page
│   │   ├── drivers/               <- Driver acquisition portal & campaigns
│   │   │   ├── index.html         <- Driver Landing & ₹2,000 Bonus Promotion
│   │   │   └── onboarding.html    <- Step-by-step driver onboarding guide
│   │   ├── enterprise/            <- B2B Transport User / Corporate Fulfillment
│   │   ├── safety/                <- Safety, Verification & Trust Standards
│   │   ├── pricing/               <- Transparent pricing & commission models
│   │   ├── contact/               <- Inquiries & Partner support
│   │   └── legal/                 <- Terms, Privacy Policy, Driver Partner Agreement
│   └── styles/                    <- tokens.css, global.css, typography.css
├── astra.config.mjs               <- Astra build & server configuration
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

1. **Phase 1 (Current):** Full Astra technical and architectural documentation created and committed on branch `Varsha`.
2. **Phase 2 (Review):** Pull Request raised against `main` for mentor review and formal approval.
3. **Phase 3 (Implementation):** Upon PR merge/approval, generate the Astra app structure, UI components, styling, and interactive modules matching the documented specifications.
