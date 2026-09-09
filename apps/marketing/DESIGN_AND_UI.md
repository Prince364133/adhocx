# UI/UX & Design System Specification (`apps/marketing`)

**Product:** AdhocX Marketing & Growth Portal  
**Document:** Visual Language, Design Tokens & Component Specifications  
**Governing Documents:** AdhocX `04_DESIGN_SYSTEM.md` & `05_UI_UX_GUIDELINES.md`  
**Status:** Approved for Implementation  
**Version:** 1.0  

---

## 1. Design Philosophy

The AdhocX Marketing Web App bridges high-converting promotional storytelling with the calm, reliable, professional B2B visual identity defined in the core AdhocX design system:

* **Clarity & Trust:** No deceptive marketing patterns or distracting animations. Every section provides concise, quantifiable operational value.
* **Speed & Responsiveness:** Ultra-lightweight CSS tokens, zero heavy client JavaScript overhead, sub-100ms visual interaction response.
* **Visual Cohesion:** Shares identical typography (`Inter`), semantic color tokens (`#0B1220`, `#2563EB`, `#16A34A`, `#D97706`), corner radius (`6px`, `8px`, `12px`), and spacing scales with the AdhocX Admin and Mobile applications.

---

## 2. Centralized Design Tokens

### 2.1 Color Palette

```css
:root {
  /* Brand Primary */
  --color-primary-900: #0B1220; /* Dark Navy / Brand Backgrounds */
  --color-primary-800: #111827; /* Dark Surfaces / Footers */
  --color-primary-700: #1E293B; /* Card Surfaces (Dark Mode / Hero) */
  --color-primary-600: #2563EB; /* Primary Action Blue */
  --color-primary-500: #3B82F6; /* Interactive Blue */
  --color-primary-400: #60A5FA; /* Lighter Accent Blue */

  /* Neutral Surfaces */
  --color-bg: #F8FAFC;          /* Page Light Background */
  --color-surface: #FFFFFF;     /* Light Surface / Card */
  --color-surface-muted: #F1F5F9; /* Alternate Section Background */
  --color-border: #E2E8F0;      /* Standard Border */
  --color-border-strong: #CBD5E1; /* High-contrast Border */

  /* Text Colors */
  --color-text-primary: #0F172A;   /* Deep Slate Main Text */
  --color-text-secondary: #475569; /* Medium Slate Supporting Text */
  --color-text-muted: #94A3B8;     /* Light Slate Muted Text */
  --color-text-inverse: #FFFFFF;   /* White Text on Dark Surfaces */

  /* Semantic Highlights */
  --color-success: #16A34A; /* Verified / Bonus Claim / Positive Payouts */
  --color-success-bg: #DCFCE7;
  --color-warning: #D97706; /* Limited Time Offer / Pending Alerts */
  --color-warning-bg: #FEF3C7;
  --color-error: #DC2626;   /* Alert / Notice */
  --color-info: #0284C7;    /* Informational Notes */
}
```

### 2.2 Typography Hierarchy

* **Font Family:** `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
* **Hierarchy:**
  * **Hero Display Title:** `48px / 1.15` (Desktop), `32px / 1.2` (Mobile) — Bold `700`
  * **Section Heading (H2):** `36px / 1.2` (Desktop), `26px / 1.25` (Mobile) — SemiBold `600`
  * **Card / Subsection Heading (H3):** `22px / 1.3` — SemiBold `600`
  * **Subheading / Lead Text:** `18px / 1.5` — Regular `400` or Medium `500`
  * **Body Text:** `16px / 1.6` — Regular `400`
  * **Caption / Small Text:** `13px / 1.4` — Medium `500`
  * **Button / Badge Text:** `14px / 1.0` — Medium `500` or SemiBold `600`

### 2.3 Spacing & Elevation

* **Spacing Grid:** `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`, `96px`
* **Border Radii:**
  * Badges & Buttons: `8px`
  * Standard Cards & Panels: `12px`
  * Outer Modal / Featured Containers: `16px`
* **Box Shadows:**
  * Subdued Card: `0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)`
  * Elevated Card (Hover): `0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)`
  * Prominent CTA Focus: `0 0 0 3px rgba(37, 99, 235, 0.25)`

---

## 3. Core UI Component Specifications

### 3.1 Global Header & Navigation (`<Header.astro>`)
* **Background:** Sticky with backdrop blur (`rgba(255, 255, 255, 0.95)` / `backdrop-filter: blur(8px)`).
* **Left:** Wordmark Logo **AdhocX** with primary blue typography.
* **Center Navigation:** `For Corporate Users`, `For Drivers & Fleets`, `Driver Bonus (₹2K)`, `Safety`, `Pricing`.
* **Right CTAs:**
  * Driver Portal: `Drive with Us` (Outlined Button)
  * Corporate Login / Book: `Corporate Portal` (Primary Filled Button `#2563EB`)

---

### 3.2 Driver Milestone Bonus Card (`<DriverMilestoneCard.astro>`)
* **Visual Treatment:** Highlight container with subtle emerald-to-blue gradient border accent (`#16A34A` to `#2563EB`).
* **Header Badge:** `Special Promotion • Century Driver Program` in emerald pill badge.
* **Headline:** `Complete 100 Rides → Get ₹2,000 Bonus`
* **Breakdown Subgrid:**
  * `Trips Required:` `100 Trips`
  * `Eligibility Period:` `First 30 Days`
  * `Bonus Payout:` `₹2,000 Direct to Bank`
  * `Commission During Offer:` `0% Deduction`
* **Progress Simulator:** Visual animated step indicator showing Milestone 1 (25 trips), Milestone 2 (50 trips), Milestone 3 (75 trips), and Goal (100 trips = ₹2,000 unlocked).

---

### 3.3 Interactive Driver Earnings Calculator (`<EarningsCalculator.tsx>` Island)
* **Interactive Controls:**
  * Vehicle Category selector: `Mini Hatchback` / `Prime Sedan` / `SUV (Ertiga/Innova)` / `Traveller`
  * Daily Driving Hours slider: `4 hrs` to `12 hrs` (default `8 hrs`)
  * Days per week: `5 days` / `6 days` / `7 days`
* **Real-time Calculated Outputs:**
  * Estimated Weekly Base Earnings: `₹12,500`
  * Estimated Monthly Base Earnings: `₹50,000`
  * Milestone Bonus: `+ ₹2,000`
  * Total Projected Payout: `₹52,000 / month`
* **Action:** Direct button linking to `Download Driver App & Claim Bonus`.

---

### 3.4 Corporate Fleet Sourcing Form (`<EnterpriseLeadForm.tsx>` Island)
* **Form Layout:** Clean 2-column responsive layout with field validation.
* **Fields:**
  * Company Name (Text input)
  * Work Email (Email input with business domain validation)
  * City / Operational Base (Dropdown: Delhi NCR, Bengaluru, Mumbai, Hyderabad, Chennai, Kolkata, Pune, Bhubaneswar, etc.)
  * Monthly Vehicle Demand (Options: 5-20, 20-50, 50-100, 100+)
  * Phone Number (10-digit Indian mobile validation)
* **Feedback States:**
  * Loading state with spinner
  * Instant Success modal with reference ID and callback ETA (< 30 minutes)

---

### 3.5 Global Footer (`<Footer.astro>`)
* **Columns:**
  * **Brand Column:** AdhocX logo, brief company mission, copyright, social links (LinkedIn, Twitter, YouTube).
  * **Product & Solutions:** Corporate Cab Fulfillment, Scheduled Shift Transport, Spot Adhoc Fleet, Reverse-Auction Engine.
  * **Driver Partners:** Driver Onboarding, ₹2,000 Bonus Terms, Rate Card, Driver Support, Driver Safety.
  * **Compliance & Legal:** Terms of Service, Privacy Policy, Driver Agreement, Safety Guidelines, GST Invoicing.
