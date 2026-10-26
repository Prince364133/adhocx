# AdhocX Marketing Web Portal: Master Implementation Plan

**Objective:** Systematically resolve all 100 SEO/GEO/AEO issues and 100 UI/UX/Responsive issues identified in the audit report while strictly adhering to `DESIGN_AND_UI.md`, `SPECIFICATION.md`, and `CAMPAIGNS_AND_COPY.md`.

---

## Phase 1: Technical SEO Infrastructure & Sitemap Setup
- **Step 1.1**: Add `@astrojs/sitemap` to `apps/marketing/package.json` and configure `astro.config.mjs` with `site: 'https://www.adhocx.com'`.
- **Step 1.2**: Create `apps/marketing/public/robots.txt` with directives for all major search engines (Googlebot, Bingbot) and AI crawlers (PerplexityBot, ClaudeBot, GPTBot, CCBot), referencing `/sitemap-index.xml`.
- **Step 1.3**: Create dedicated OpenGraph marketing preview asset in `public/adhocx-og-banner.png` (or SVG representation) for crisp link unfurls across social and search crawlers.

## Phase 2: Design System & CSS Token Harmonization (`global.css`)
- **Step 2.1**: Refine CSS tokens:
  - Deepen secondary slate `--color-text-secondary` from `#475569` to `#334155` (passing WCAG 2.1 AA 4.5:1 ratio on light surfaces).
  - Define high-contrast border and focus-ring tokens (`:focus-visible` with 2px solid `--color-primary-600` and 4px offset).
  - Add fluid typography `clamp()` tokens for mobile (360px–480px), tablet (768px), and desktop (1200px+).
- **Step 2.2**: Implement mobile responsiveness utilities:
  - Resilient button wrapping and touch target expansion (`min-height: 44px`, `min-width: 44px`).
  - Responsive table container with horizontal scroll shadows and stacked mobile view.
  - Add `.skip-to-content` navigation landmark styling.
  - Add `prefers-reduced-motion` media queries to eliminate vestibular layout shifts.

## Phase 3: Modular SVG Icon Library & Global Layout Components
- **Step 3.1**: Create `apps/marketing/src/components/Icon.astro` with handcrafted, pixel-aligned SVG vectors replacing all emojis (`building`, `car`, `clock`, `shield-check`, `bank-note`, `sparkles`, `check`, `x-circle`, `arrow-right`, `phone`, `mail`, `chevron-down`).
- **Step 3.2**: Create `apps/marketing/src/components/FaqAccordion.astro` supporting accessible ARIA disclosure attributes (`aria-expanded`, `aria-controls`), keyboard navigation, and smooth expand/collapse.
- **Step 3.3**: Upgrade `apps/marketing/src/components/SeoHead.astro`:
  - Support `og:image`, `og:image:width`, `og:image:height`, `og:image:alt`.
  - Add `twitter:card`, `twitter:site`, `twitter:creator`.
  - Add `en-IN` language and regional Geo meta tags (`geo.region`, `geo.placename`).
  - Add theme-color meta tag (`#1B0E38`).
- **Step 3.4**: Upgrade `apps/marketing/src/components/Header.astro`:
  - Add `<a href="#main-content" class="skip-to-content">Skip to main content</a>`.
  - Improve mobile menu touch ergonomics, trap escape key, and prevent background scrolling when open.
- **Step 3.5**: Upgrade `apps/marketing/src/components/Footer.astro`:
  - Enhance contrast of muted links (`#94A3B8` -> `#CBD5E1` on dark background).
  - Add rich semantic sub-links for Hyderabad IT corridors (HITEC City, Gachibowli, Financial District), legal compliance, and commercial fleet solutions.

## Phase 4: Structured Data (Schema Graph), GEO & AEO Direct Answers
- **Step 4.1**: Upgrade root `BaseLayout.astro` and page schemas with multi-tier JSON-LD:
  - `Organization` with `sameAs`, contact point, and legal name.
  - `LocalBusiness` for Hyderabad commercial transport operations.
  - `Service` schema for Enterprise Fleet, Spot Cabs, and Scheduled Shift Mobility.
  - `FAQPage` schema on `index.astro`, `vendors.astro`, and `drivers.astro`.
  - `HowTo` schema for Corporate Sourcing and Driver Onboarding steps.
  - `BreadcrumbList` schema for structured navigation.
- **Step 4.2**: Incorporate 40–60 word Direct Answer paragraphs directly underneath primary H2/H3 question headers for high-probability featured snippet extraction.

## Phase 5: Comprehensive Page Refactoring
- **Step 5.1**: `index.astro` — Replace raw emojis, fluidize hero button stack for 360px screens, add interactive FAQ accordion, integrate direct answers, embed Hyderabad geographic anchors.
- **Step 5.2**: `vendors.astro` — Modernize comparison table (desktop table with mobile card-stack fallback), add vehicle category badges (Dzire, Ertiga, Innova Crysta), integrate enterprise rate card queries, embed FAQ accordion.
- **Step 5.3**: `drivers.astro` — Highlight ₹2,000 Century Milestone bonus terms with clear eligibility steps, document verification checklist with SVG checkmarks, add driver FAQ accordion.
- **Step 5.4**: `blogs.astro` & `blog-detail.astro` — Provide high-authority static seed articles on B2B transport logistics and driver economics so crawlers never index an empty state if the API is offline during build. Add rich `BlogPosting` schema.
- **Step 5.5**: `privacy.astro`, `terms.astro`, `delete-account.astro` — Add clean breadcrumbs, structured headings, and set `noindex` on `delete-account.astro`.

## Phase 6: Build Verification & Quality Assurance
- **Step 6.1**: Run `pnpm --filter @adhocx/marketing build`.
- **Step 6.2**: Verify that all 8 static pages generate with zero errors and clean exit code 0.
- **Step 6.3**: Validate schema markup and responsive styles.
