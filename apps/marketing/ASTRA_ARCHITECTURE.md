# Astra Architecture & Implementation Strategy (`apps/marketing`)

**Product:** AdhocX Marketing Web App  
**Framework / Stack:** Astra Tech Stack (A-S-T-R-A)  
**Deployment Target:** Vercel / Cloudflare Pages / Node SSR  
**Status:** Architecture Design Document  
**Version:** 1.0  

---

## 1. Why Astra Tech Stack for AdhocX Marketing?

1. **HTML-First & SEO Crawler Native:** As specified by the tech lead, Astra is built from the ground up to render clean, semantic HTML structure that search engine bots, web crawlers, and social media parsers index instantly without executing complex client JS.
2. **Sub-Second Speed & Zero Runtime Bloat:** Eliminates unnecessary client-side JavaScript bundles, achieving a 100/100 Lighthouse performance rating and near-zero First Input Delay (FID) / Interaction to Next Paint (INP).
3. **Interactive Islands Architecture:** Dynamic widgets (such as the **Driver ₹2,000 Milestone Bonus Calculator** and the **Enterprise Fleet Lead Form**) operate as isolated interactive islands, lazy-hydrated only when visible in the user's viewport.
4. **Monorepo Seamlessness:** Fits cleanly inside the AdhocX Turborepo structure alongside Next.js (`apps/admin`), Flutter (`apps/mobile`), and NestJS (`apps/api`).

---

## 2. Astra Project Layout

```text
apps/marketing/
├── astra.config.mjs
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
    │   │   ├── Header.astra
    │   │   ├── Footer.astra
    │   │   ├── Button.astra
    │   │   ├── Badge.astra
    │   │   └── Container.astra
    │   ├── driver/
    │   │   ├── DriverHero.astra
    │   │   ├── DriverMilestoneCard.astra
    │   │   ├── OnboardingSteps.astra
    │   │   ├── DriverFaq.astra
    │   │   └── EarningsCalculator.tsx (Astra Island - client:visible)
    │   ├── enterprise/
    │   │   ├── EnterpriseHero.astra
    │   │   ├── ComparisonTable.astra
    │   │   ├── TrustBadges.astra
    │   │   └── EnterpriseLeadForm.tsx (Astra Island - client:idle)
    │   └── seo/
    │       ├── SeoHead.astra
    │       └── JsonLd.astra
    ├── layouts/
    │   ├── BaseLayout.astra
    │   ├── DriverLayout.astra
    │   └── EnterpriseLayout.astra
    ├── pages/
    │   ├── index.astra
    │   ├── drivers/
    │   │   ├── index.astra
    │   │   ├── calculator.astra
    │   │   └── terms-bonus.astra
    │   ├── enterprise.astra
    │   ├── safety.astra
    │   ├── pricing.astra
    │   ├── contact.astra
    │   └── 404.astra
    └── styles/
        ├── tokens.css
        ├── global.css
        └── typography.css
```

---

## 3. Hydration Strategy for Astra Interactive Islands

| Component | Technology | Hydration Directive | Rationale |
|---|---|---|---|
| `<EarningsCalculator />` | React / TSX | `client:visible` | Only loads module when user scrolls to the calculator on `/drivers`. |
| `<EnterpriseLeadForm />` | React / TSX | `client:idle` | Hydrates in background after initial critical rendering is complete. |
| `<MobileNavDrawer />` | Vanilla JS / Micro-module | `client:media="(max-width: 768px)"` | Only executes navigation drawer toggle on mobile viewports. |
| All other components (Hero, Cards, Footer, Testimonials) | Astra Components | Zero JS (Pure HTML/CSS) | Completely eliminates client-side bundle size. |

---

## 4. Package Configuration (`apps/marketing/package.json`)

```json
{
  "name": "@adhocx/marketing",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astra dev --port 3001",
    "start": "astra dev",
    "build": "astra build",
    "preview": "astra preview",
    "lint": "eslint src --ext .js,.ts,.html"
  },
  "dependencies": {
    "@astrajs/react": "^3.6.0",
    "@astrajs/sitemap": "^3.1.5",
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

1. **Step 1:** Initialize the Astra workspace package in `apps/marketing` under the monorepo.
2. **Step 2:** Configure global CSS design tokens matching `docs/04_DESIGN_SYSTEM.md`.
3. **Step 3:** Implement Astra page layouts (`BaseLayout`, `DriverLayout`, `EnterpriseLayout`) and `<SeoHead />`.
4. **Step 4:** Build the Driver Landing Page featuring the **₹2,000 Milestone Bonus for 100 Rides** and interactive `<EarningsCalculator />`.
5. **Step 5:** Build the Corporate Enterprise Landing Page with the lead generation form `<EnterpriseLeadForm />`.
6. **Step 6:** Run Lighthouse audit to verify 100/100 performance, SEO, accessibility, and best practices scores.
