# AdhocX — Master Design System (`DESIGN.md`)

> **Status:** Canonical Single Source of Truth (Mandatory for ALL AdhocX Dashboards & Web Applications)  
> **Reference Implementation:** `apps/admin` (`apps/admin/src/styles/style.css`, `apps/admin/src/components/common/*`)  
> **Governing Companion Docs:** [`UX.md`](./UX.md) · [`04_DESIGN_SYSTEM.md`](./apps/docs/docs/platform/design/04_DESIGN_SYSTEM.md) · [`05_UI_UX_GUIDELINES.md`](./apps/docs/docs/platform/design/05_UI_UX_GUIDELINES.md) · [`frontend-architecture.md`](./apps/docs/docs/platform/engineering/frontend-architecture.md)  
> **Last Updated:** 2026-11-27

---

## 1. Mandatory Governance Rule

**All dashboards and web frontends across the entire AdhocX platform** (`apps/admin`, `apps/ops`, `apps/corporate`, and any future internal/external web portals) **MUST strictly and exclusively follow this document and [`UX.md`](./UX.md) as the single source of truth.**

When redesigning or building any dashboard or page:
1. **Do not invent** ad-hoc colors, fonts, border radii, shadows, or custom card/table/tab styles.
2. **Use only** the centralized CSS design tokens and component primitives defined in the `apps/admin` reference implementation.
3. **Match** the `apps/admin` shell, spacing, visual density, light/dark theme parity, and component hierarchy 1:1.

---

## 2. Design Philosophy & Visual Identity

AdhocX is an **enterprise B2B transportation operations platform**. Every dashboard must feel like **Stripe Dashboard + Linear + modern logistics command software**:
- **Clarity over decoration:** No ornamental gradients, no heavy drop shadows, no flashy consumer-app animations.
- **High-density operational legibility:** Designed for operators and analysts working 8+ hours/day.
- **Full-width canvas utilization:** Content stretches cleanly across the viewport with compact, balanced horizontal padding (`1.25rem` / `20px`)—never artificially boxed into narrow centered columns that waste screen real estate.
- **Tabular precision:** All KPIs, currency amounts (`₹`), counts, percentages, and timestamps use `tabular-nums`.

---

## 3. Color Theory & Token Architecture

AdhocX follows a **60–30–10 Operational Color Theory** engineered for low eye fatigue and instant status scanning:

### 3.1 The 60–30–10 Rule
- **60% Neutral Canvas & Surfaces:** Cool Slate (`#f8fafc` canvas, `#ffffff` cards, `#f1f5f9` elevated surfaces, `#e2e8f0` 1px borders) in Light Mode; Deep Charcoal (`#121212` canvas, `#1b1b1b` cards, `#222222` elevated, `#383838` borders) in Dark Mode.
- **30% Structural Chrome & Typography:** Crisp Slate text hierarchy (`#0f172a` primary, `#475569` secondary, `#64748b` muted) and glassmorphic navigation chrome (`blur(20px) saturate(180%)`). Never use pure `#000000` for body text.
- **10% Brand Authority & Semantic Signals:**
  - **Primary Brand Authority (`#5728b2`):** Primary CTAs, active navigation indicators, active `SegmentedTabs`, focus rings, and brand badges.
  - **Secondary Brand Accent (`#ff5f09`):** Logo "X" accent and high-energy operational callouts.
  - **Supporting Chart & Accent Palette:** Indigo (`#4f46e5`, `#6366f1`), Violet (`#7c3aed`, `#8b5cf6`), Lavender (`#a78bfa`), Cyan (`#0891b2`).
  - **Semantic Status Colors:** Strictly reserved for state communication (Success, Warning, Danger, Info)—never used as decorative backgrounds.

### 3.2 Exact Light Mode Tokens (`:root`)

```css
:root {
  /* Brand Identity */
  --brand-primary: #5728b2;
  --brand-primary-hover: #461f94;
  --brand-primary-subtle: rgba(87, 40, 178, 0.08);
  --brand-primary-border: rgba(87, 40, 178, 0.24);
  --brand-primary-gradient: linear-gradient(135deg, #5728b2 0%, #431e8e 100%);
  --brand-secondary: #ff5f09;
  --brand-orange: #ff5f09;
  --brand-orange-subtle: rgba(255, 95, 9, 0.1);
  --brand-indigo: #4f46e5;
  --brand-indigo-bright: #6366f1;
  --brand-purple: #7c3aed;
  --brand-violet: #8b5cf6;
  --brand-lavender: #a78bfa;
  --brand-chart-purple: #5b42f3;
  --brand-cyan: #0891b2;

  /* Neutral Canvas & Surfaces */
  --bg-base: #f8fafc;
  --bg-canvas: #f8fafc;
  --bg-surface: #ffffff;
  --bg-card: #ffffff;
  --bg-card-elevated: #f8fafc;
  --bg-surface-elevated: #f1f5f9;
  --bg-surface-hover: #e2e8f0;
  --bg-surface-active: #cbd5e1;

  /* Borders & Dividers */
  --border: #e2e8f0;
  --border-subtle: #e2e8f0;
  --border-light: #cbd5e1;
  --border-focus: #5728b2;
  --border-hover: #94a3b8;

  /* Typography Foreground */
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #64748b;
  --text-inverse: #f8fafc;
  --text-brand: #5728b2;

  /* Semantic Status Tokens */
  --color-success: #15803d;
  --color-success-bg: rgba(22, 163, 74, 0.08);
  --color-success-border: rgba(22, 163, 74, 0.24);

  --color-warning: #b45309;
  --color-warning-bg: rgba(217, 119, 6, 0.09);
  --color-warning-border: rgba(217, 119, 6, 0.25);

  --color-danger: #dc2626;
  --color-danger-bg: rgba(220, 38, 38, 0.08);
  --color-danger-border: rgba(220, 38, 38, 0.24);

  --color-info: #0369a1;
  --color-info-bg: rgba(2, 132, 199, 0.08);
  --color-info-border: rgba(2, 132, 199, 0.24);
}
```

### 3.3 Exact Dark Mode Overrides (`[data-theme="dark"]`, `html.dark`, `.dark`)

```css
[data-theme="dark"], html.dark, .dark {
  --bg-base: #121212;
  --bg-canvas: #121212;
  --bg-surface: #1b1b1b;
  --bg-card: #1b1b1b;
  --bg-card-elevated: #222222;
  --bg-surface-elevated: #222222;
  --bg-surface-hover: #292929;
  --bg-surface-active: #383838;

  --border: #383838;
  --border-subtle: #383838;
  --border-light: #4a4a4a;
  --border-focus: #bdbdbd;
  --border-hover: #5c5c5c;

  --text-primary: #f5f5f5;
  --text-secondary: #bdbdbd;
  --text-muted: #a0a0a0;
  --text-inverse: #121212;
  --text-brand: #f5f5f5;

  --color-success: #22c55e;
  --color-success-bg: rgba(34, 197, 94, 0.12);
  --color-warning: #f59e0b;
  --color-warning-bg: rgba(245, 158, 11, 0.12);
  --color-danger: #f87171;
  --color-danger-bg: rgba(248, 113, 113, 0.12);
  --color-info: #38bdf8;
  --color-info-bg: rgba(56, 189, 248, 0.12);
}
```

---

## 4. Typography, Spacing, Radii & Elevation

### 4.1 Typography Scale
- **Font Family:** `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- **Monospace:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- **Scale Tokens:**
  - `--text-xs`: `0.6875rem` (11px) · `--text-sm`: `0.75rem` (12px) · `--text-base`: `0.8125rem` (13px)
  - `--text-md`: `0.875rem` (14px) · `--text-lg`: `1rem` (16px) · `--text-xl`: `1.125rem` (18px)
  - `--text-2xl`: `1.35rem` (21.6px) · `--text-3xl`: `1.625rem` (26px)
  - Supporting compact dashboard tokens: `--text-micro: 0.68rem`, `--text-caption: 0.7rem`, `--text-label: 0.72rem`, `--text-control: 0.74rem`, `--text-body: 0.85rem`, `--text-title-sm: 1.05rem`, `--text-title-md: 1.08rem`, `--text-title-lg: 1.15rem`.

### 4.2 Spacing, Radii & Shadows
- **Spacing Scale:** `4px` (`--space-1`), `8px` (`--space-2`), `12px` (`--space-3`), `16px` (`--space-4`), `20px` (`--space-5`), `24px` (`--space-6`), `32px` (`--space-8`).
- **Border Radii:**
  - `--radius-xs: 4px` · `--radius-sm: 6px` · `--radius-md: 8px` (buttons/inputs)
  - `--radius-lg: 10px` · `--radius-xl: 12px` (cards, tables, panels) · `--radius-2xl: 16px` (modals) · `--radius-pill: 9999px` (badges/pills)
- **Shadows (Subtle, Operational):**
  - `--shadow-card: 0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.03)`
  - `--shadow-elevated: 0 8px 24px -4px rgba(15, 23, 42, 0.08), 0 2px 6px -2px rgba(15, 23, 42, 0.04)`
  - `--shadow-modal: 0 20px 50px -12px rgba(15, 23, 42, 0.18), 0 4px 16px -4px rgba(15, 23, 42, 0.08)`
  - `--shadow-drawer: -12px 0 40px -8px rgba(15, 23, 42, 0.16)`

---

## 5. Layout Shell & Full-Width Viewport Standard

All dashboard applications must replicate the exact `apps/admin` shell geometry:

| Region | Class / Component | Exact Specification |
|---|---|---|
| **Root Shell** | `.admin-layout` (`AdminShell`) | `display: flex; min-height: 100vh; background-color: var(--bg-base);` |
| **Sidebar Rail** | `.admin-sidebar` (`Sidebar`) | Fixed left, `64px` collapsed (`56px` mobile), glassmorphic (`--sidebar-glass-bg`, `backdrop-filter: var(--sidebar-glass-blur)`), expands smoothly to `224px` |
| **Main Column** | `.admin-main` | `flex: 1; margin-left: 64px; display: flex; flex-direction: column; min-width: 0;` |
| **Sticky Top Header** | `.admin-header` (`Header`) | `height: 50px; padding: 0 1.25rem; background: var(--bg-surface); border-bottom: 1px solid var(--border); position: sticky; top: 0;` |
| **Page Content Container** | `.admin-content` | `padding: 1.35rem 1.25rem 1.85rem; flex: 1; width: 100%; max-width: none; margin: 0;` (`padding: 1.52rem 1rem 1.75rem;` on `<= 768px`) |
| **Page Stack** | `<main className="admin-page">` | `width: 100%; display: flex; flex-direction: column; gap: 1.25rem;` |

> **Important:** Never add `max-width: 1200px` / `1260px` / `1280px` wrappers inside `.admin-content` or individual pages unless rendering a narrow centered auth/form dialog. Dashboards must use the full available horizontal width.

---

## 6. Canonical Component Library (`components/common`)

Every dashboard must build UI exclusively from the shared `components/common` primitives (mirrored from `apps/admin/src/components/common/index.ts`):
- **Page Structure:** `PageHeader`, `Card`, `CollapsibleSection`
- **Navigation & Filtering:** `SegmentedTabs`, `FilterBar`, `Pagination`
- **Metrics & Data:** `KpiStrip`, `MetricCard`, `DataTable`, `StatusBadge`, `Badge`
- **Actions & Forms:** `Button`, `Form`, `Input`, `Select`, `Textarea`
- **Overlays & Feedback:** `Drawer`, `BottomSheet`, `Modal`, `ConfirmDialog`, `FeedbackBanner`, `ToastProvider`, `EmptyState`, `ErrorState`, `LoadingSkeleton`
