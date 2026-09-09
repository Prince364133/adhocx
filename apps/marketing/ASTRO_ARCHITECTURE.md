# Astro Architecture & Implementation Strategy (`apps/marketing`)

**Product:** AdhocX Marketing Web App  
**Framework:** Astro 4.x / 5.x  
**Deployment Target:** Vercel / Cloudflare Pages / Node SSR  
**Status:** Architecture Design Document  
**Version:** 1.0  

---

## 1. Why Astro for AdhocX Marketing?

1. **Content-Focused & Zero-JS by Default:** Astro renders entire pages to pure HTML/CSS at build time or on request, shipping 0 bytes of unnecessary client-side JavaScript. This delivers instant page loads and perfect 100/100 Core Web Vitals scores.
2. **Superior SEO & Bot Crawlability:** Traditional SPAs struggle with search engine and social media crawlers. Astro serves complete, fully rendered semantic HTML with dynamic OpenGraph, meta tags, and JSON-LD structured data directly on initial load.
3. **Island Architecture (Islands of Interactivity):** Interactive widgets (e.g., the Driver Earnings Calculator and Corporate Lead Form) are isolated into independent client-hydrated islands (`client:visible` or `client:idle`) without bloating the rest of the static page.
4. **Monorepo Compatibility:** Easily integrates into the AdhocX Turborepo monorepo alongside Next.js (`apps/admin`), Flutter (`apps/mobile`), and NestJS (`apps/api`).

---

## 2. Astro Project Layout

```text
apps/marketing/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   ├── sitemap-index.xml
│   └── og-images/
│       ├── home-og.png
│       ├── drivers-bonus-og.png
│       └── enterprise-og.png
└── src/
    ├── components/
    │   ├── common/
    │   │   ├── Header.astro
    │   │   ├── Footer.astro
    │   │   ├── Button.astro
    │   │   ├── Badge.astro
    │   │   └── Container.astro
    │   ├── driver/
    │   │   ├── DriverHero.astro
    │   │   ├── DriverMilestoneCard.astro
    │   │   ├── OnboardingSteps.astro
    │   │   ├── DriverFaq.astro
    │   │   └── EarningsCalculator.tsx (React Island - client:visible)
    │   ├── enterprise/
    │   │   ├── EnterpriseHero.astro
    │   │   ├── ComparisonTable.astro
    │   │   ├── TrustBadges.astro
    │   │   └── EnterpriseLeadForm.tsx (React Island - client:idle)
    │   └── seo/
    │       ├── SeoHead.astro
    │       └── JsonLd.astro
    ├── layouts/
    │   ├── BaseLayout.astro
    │   ├── DriverLayout.astro
    │   └── EnterpriseLayout.astro
    ├── pages/
    │   ├── index.astro
    │   ├── drivers/
    │   │   ├── index.astro
    │   │   ├── calculator.astro
    │   │   └── terms-bonus.astro
    │   ├── enterprise.astro
    │   ├── safety.astro
    │   ├── pricing.astro
    │   ├── contact.astro
    │   └── 404.astro
    └── styles/
        ├── tokens.css
        ├── global.css
        └── typography.css
```

---

## 3. Hydration Strategy for Astro Islands

| Component | Technology | Hydration Directive | Rationale |
|---|---|---|---|
| `<EarningsCalculator />` | React / TSX | `client:visible` | Only loads React runtime when user scrolls down to the calculator section on `/drivers`. |
| `<EnterpriseLeadForm />` | React / TSX | `client:idle` | Hydrates in background after initial critical rendering is complete. |
| `<MobileNavDrawer />` | Vanilla JS / Alpine | `client:media="(max-width: 768px)"` | Only downloads and executes mobile menu toggle on viewport width < 768px. |
| All other components (Hero, Cards, Footer, Testimonials) | Astro Components | Zero JS (Pure HTML/CSS) | Eliminates client-side bundle size, giving maximum performance and SEO. |

---

## 4. Configuration Specification

### 4.1 `astro.config.mjs`
```javascript
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://adhocx.com',
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/admin') && !page.includes('/api'),
    }),
  ],
  output: 'hybrid', // SSG for static pages, SSR for dynamic lead form endpoints
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
});
```

### 4.2 `package.json` for `apps/marketing`
```json
{
  "name": "@adhocx/marketing",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev --port 3001",
    "start": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "lint": "eslint src --ext .js,.ts,.astro"
  },
  "dependencies": {
    "@astrojs/react": "^3.6.0",
    "@astrojs/sitemap": "^3.1.5",
    "astro": "^4.14.0",
    "astro-seo": "^0.8.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.4"
  }
}
```

---

## 5. Implementation Roadmap Post-PR Approval

1. **Step 1:** Initialize the Astro workspace package in `apps/marketing` using Turborepo and pnpm workspaces.
2. **Step 2:** Configure global CSS design tokens matching `docs/04_DESIGN_SYSTEM.md`.
3. **Step 3:** Implement Astro page layouts (`BaseLayout`, `DriverLayout`, `EnterpriseLayout`) and SEO component `<SeoHead />`.
4. **Step 4:** Build the Driver Landing Page featuring the **₹2,000 Milestone Bonus for 100 Rides** and the interactive `<EarningsCalculator />` React island.
5. **Step 5:** Build the Corporate Enterprise Landing Page with the lead generation form `<EnterpriseLeadForm />`.
6. **Step 6:** Run Lighthouse audit to verify 100/100 performance, SEO, accessibility, and best practices scores.
