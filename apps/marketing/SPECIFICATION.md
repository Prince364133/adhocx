# Marketing Web App Specification (`apps/marketing`)

**Product:** AdhocX Marketing & Driver/Enterprise Growth Website  
**Technology:** Astro Framework (SSR/SSG Hybrid)  
**Status:** Engineering & Product Specification  
**Version:** 1.0  
**Target Audience:** Commercial Drivers, Fleet Operators, Corporate Transport Users, Enterprise Logistics Managers  

---

## 1. Executive Summary & Goals

The AdhocX Marketing Web App serves as the top-of-funnel discovery and conversion engine for the AdhocX platform. It directly targets two distinct user cohorts with tailor-made conversion funnels:

1. **Driver Supply & Fleet Operators:** Acquire verified commercial drivers with strong earning incentives (specifically the **₹2,000 Milestone Bonus for 100 Rides**, transparent payouts, zero commission guarantee).
2. **Corporate Demand & Transport Users:** Provide corporate logistics and mobility managers with instant proof of automated vehicle fulfillment, compliance standards, 99.9% SLA guarantees, and enterprise booking workflows.

---

## 2. Page & Route Map

| URL Route | Page Name | Primary Objective | Target Audience | Primary CTA |
|---|---|---|---|---|
| `/` | **Global Home Landing** | Introduce AdhocX B2B fulfillment & dual-sided marketplace | All Visitors | "Book Corporate Cabs" / "Drive with Us" |
| `/drivers` | **Driver Partner Portal** | Drive driver signups & app downloads with Milestone Campaign | Commercial Drivers | "Download Driver App & Claim ₹2,000 Bonus" |
| `/drivers/calculator` | **Driver Earnings Simulator** | Show potential weekly & monthly earnings + milestone bonuses | Prospective Drivers | "Start Onboarding" |
| `/enterprise` | **Corporate & User Portal** | Convert corporate transport users looking to source commercial cabs | Corporate Logistics & HR | "Schedule Enterprise Demo / Get Started" |
| `/safety` | **Trust & Safety Standards** | Showcase driver background checks, GPS tracking, vehicle audits | All / Risk Teams | "Read Safety Charter" |
| `/pricing` | **Pricing & Transparency** | Explain transparent commission, fixed rates, billing & invoicing | Users & Drivers | "View Rate Card" |
| `/about` | **About AdhocX** | Company mission, leadership, vision, and contact channels | Investors & Partners | "Contact Us" |
| `/contact` | **Enterprise Inquiries** | Lead capture form for high-volume enterprise contracts | B2B Decision Makers | "Submit Inquiry" |

---

## 3. Detailed Page Breakdown & Content Architecture

### 3.1 Home Page (`/`)
* **Hero Section:**
  * Headline: *"Automated B2B Fleet Fulfillment on Demand"*
  * Subheadline: *"Say goodbye to chaotic WhatsApp and Telegram cab sourcing. AdhocX instantly matches corporate transport requirements with verified commercial cabs and drivers."*
  * Dual Action CTAs:
    * Primary (Blue `#2563EB`): `Get Corporate Fleet Access`
    * Secondary (Neutral Outlined): `Become a Driver Partner (Earn ₹2,000 Bonus)`
* **Operational Proof Banner:** Live fulfillment stats (e.g., 99.4% On-Time SLA, 15-Minute Dispatch Guarantee, 100% Commercial Fleet).
* **Pain Point vs Solution Grid:** Comparison between traditional manual sourcing (calls, delays, no audit trail) vs AdhocX automated fulfillment (reverse-auction matching, real-time telemetry, automated GST billing).
* **How It Works (3 Steps):**
  1. Post requirement (Date, vehicle class, passenger capacity, route).
  2. Automated matching & dispatch engine selects verified driver/fleet.
  3. Live tracking, digital OTP boarding, and transparent settlement.
* **Driver Milestone Highlight:** Interactive teaser card showcasing the ₹2,000 reward for 100 trips.
* **Trust & Compliance Badges:** ISO certification, Police verification badge, 24/7 Ops control room.

---

### 3.2 Driver Portal (`/drivers`) — Featuring Milestone Incentive
* **Hero Section:**
  * Badge: `🎉 Limited Time Driver Incentive: ₹2,000 Milestone Bonus`
  * Headline: *"Drive with AdhocX. Guaranteed Trips. ₹2,000 Bonus on Your First 100 Rides."*
  * Subheadline: *"Earn steady daily income with scheduled corporate routes, outstation bookings, and transparent instant weekly payouts."*
  * CTA: `Download Driver App (Android/iOS)`
* **Milestone Bonus Program Card:**
  * **Criteria:** Complete 100 trips in your first 30 days.
  * **Bonus:** ₹2,000 directly credited to bank account via UPI/IMPS.
  * **Zero Platform Deductions:** 100% bonus retention.
* **Why Drive with AdhocX:**
  * **Predictable Corporate Trips:** Pre-scheduled employee pickup and drop shifts.
  * **Weekly & Instant Settlements:** Direct bank transfer every Monday, or instant cashout on demand.
  * **No Surge Manipulation:** Transparent kilometer and hourly rate cards.
  * **Driver Welfare & Insurance:** ₹5,00,000 accidental cover while on duty.
* **Interactive Driver Earnings Calculator (Astro Island):**
  * Sliders for: Vehicle Type (Sedan, Hatchback, SUV, Traveller), Daily Hours (4h, 8h, 12h), Days/Week.
  * Live calculated output: Estimated Monthly Earnings + ₹2,000 Century Bonus = Total Net Payout.
* **4-Step Onboarding Process:**
  1. Download AdhocX Driver App.
  2. Upload Aadhaar, Driving License, Commercial RC, Insurance & Police Verification.
  3. Quick telephonic or in-person verification (within 24 hours).
  4. Go online and start earning.

---

### 3.3 Corporate / User Portal (`/enterprise`)
* **Hero Section:**
  * Headline: *"Enterprise Cab Logistics, Unified & Automated"*
  * Subheadline: *"Never drop a corporate transport SLA again. Access verified commercial fleets on demand with real-time audit trails."*
  * CTA: `Request Enterprise Access`
* **Core Value Propositions:**
  * **100% Commercial Compliance:** Verified yellow-board vehicles, valid commercial fitness, insurance, and background-checked chauffeurs.
  * **Reverse-Auction & Instant Dispatch:** Get competitive market rates without price gouging.
  * **Centralized Corporate Billing:** Single consolidated monthly GST tax invoice with detailed trip logs.
  * **Dedicated SLA Manager:** 24/7 priority operations desk with replacement cab guarantee in < 20 minutes.
* **Interactive Lead Capture Form (Astro Island):**
  * Fields: Name, Corporate Email, Company Name, Monthly Fleet Volume (<10, 10-50, 50-200, 200+), Phone Number.
  * Direct webhook integration to CRM / API backend.

---

## 4. Technical SEO & Performance Architecture

### 4.1 Core Web Vitals Targets
* **Largest Contentful Paint (LCP):** < 1.0s (leveraging Astro zero-JS SSG and optimized WebP images).
* **First Input Delay (FID) / Interaction to Next Paint (INP):** < 40ms.
* **Cumulative Layout Shift (CLS):** 0.00.
* **Lighthouse Score Target:** 100 Performance, 100 Accessibility, 100 Best Practices, 100 SEO.

### 4.2 Metadata & OpenGraph Structure
Every page includes dynamic SEO metadata via `<SeoHead />`:
* `title`: `AdhocX | {Page Title} — Corporate Fleet Fulfillment & Driver Portal`
* `description`: Targeted 150-160 character description optimized for search snippets.
* `canonical`: Absolute canonical URL.
* `openGraph`: `og:title`, `og:description`, `og:image` (1200x630 branded card), `og:type`, `og:locale`.
* `twitter`: `twitter:card` (`summary_large_image`), `twitter:creator`, `twitter:site`.

### 4.3 Schema.org JSON-LD Structured Data
* **Organization Schema:** Name, Logo, Address, Contact, Social Profiles.
* **WebSite Schema:** SearchAction targeting site search.
* **JobPosting Schema (for Driver Portal):** Allows Google for Jobs to index "Commercial Cab Driver Partner with ₹2,000 Signing Bonus".
* **FAQPage Schema:** Rich accordion FAQs on driver & enterprise pages to capture Google Rich Snippets.
* **BreadcrumbList Schema:** Clean site hierarchy navigation.

---

## 5. Analytics & Conversion Tracking

* **Custom Analytics Events:**
  * `driver_bonus_cta_click` (triggers when user clicks "Claim ₹2,000 Bonus")
  * `driver_app_download_click` (tracks Android APK / Play Store clicks)
  * `driver_calculator_interact` (tracks estimated earnings calculation)
  * `enterprise_lead_submit` (tracks corporate lead form submission)
  * `rate_card_download` (tracks PDF / rate card views)
* **Privacy & Cookie Consent:** Minimalist, zero-cookie default, fully GDPR & DPDP compliant.
