# AdhocX — Master Dashboard UI/UX Guidelines (`UX.md`)

> **Status:** Canonical Single Source of Truth (Mandatory for ALL AdhocX Dashboards & Web Applications)  
> **Reference Implementation:** `apps/admin` (`AdminShell`, `Header`, `Sidebar`, `business-insights/page.tsx`, `components/common/*`)  
> **Governing Companion Docs:** [`DESIGN.md`](./DESIGN.md) · [`05_UI_UX_GUIDELINES.md`](./apps/docs/docs/platform/design/05_UI_UX_GUIDELINES.md) · [`04_DESIGN_SYSTEM.md`](./apps/docs/docs/platform/design/04_DESIGN_SYSTEM.md) · [`frontend-architecture.md`](./apps/docs/docs/platform/engineering/frontend-architecture.md)  
> **Last Updated:** 2026-11-27

---

## 1. Mandatory Governance & Redesign Protocol

This document is the **only authoritative UX specification** for designing, building, or redesigning any dashboard in the AdhocX ecosystem (`apps/admin`, `apps/ops`, `apps/corporate`, or any new portal).

When an engineer or AI agent is instructed to **"update the UI/UX of `<app>` following `DESIGN.md` and `UX.md`"**, it must automatically:
1. Adopt the exact `apps/admin` shell architecture (`Shell` -> `Sidebar` + `Header` + `.admin-content` -> `<main className="admin-page">`).
2. Import and use the centralized design tokens (`styles/style.css` from `apps/admin` as the reference token & utility layer).
3. Compose every dashboard page using the **Canonical 5-Band Page Blueprint** defined in Section 2.
4. Preserve all existing functional routes, API contracts, and business logic while bringing 100% of visual presentation and interaction patterns into parity with `apps/admin`.

---

## 2. Canonical 5-Band Dashboard Page Blueprint

Every dashboard page inside `<main className="admin-page">` follows this exact top-to-bottom information hierarchy (exemplified by `apps/admin/src/app/business-insights/page.tsx`):

1. **Band 1 — `PageHeader`**
   - Optional `breadcrumbs` (`Home / Section`) for nested detail routes.
   - Bold page `title`, concise operational `subtitle`, optional `liveStatus` pill (`liveTone`: `purple | success | warning | info | neutral`).
   - Right-aligned `actions` slot (`Button` size `sm`, variants `outline` for secondary utilities like Share/Export, `secondary` for Refresh/Sync, `primary` for the single primary creation/action CTA).
2. **Band 2 — Context & Filter Bar (`Card` + `SegmentedTabs` + Quick Filters)**
   - A compact `Card` housing `SegmentedTabs` on the left (switching primary domain slices, e.g. Drivers / Fleet / Vendors / Corporate, or status tabs with optional counts) and time-window/filter controls on the right (`Button` group or `FilterBar`).
   - Filter state should synchronize with URL query parameters (`useSearchParams`) where shareable views apply.
3. **Band 3 — Section Title & `KpiStrip`**
   - Concise section heading (`h2.text-title-md`) + 1-line description (`p.text-body-md.text-secondary`).
   - `KpiStrip` (`columns={4}` or `auto-fit` `minmax(150px, 1fr)`) displaying 4–6 scannable metrics. Each cell has: small icon + muted label, bold `tabular-nums` value (colored by semantic `tone`), and 1-line `subtext`. Interactive KPIs support `onClick` + `active` highlight to filter the table below.
4. **Band 4 — Primary Data Surface (`Card` + `DataTable` / Charts)**
   - A `Card` with a compact header row (title on left, `Showing N records` metadata on right).
   - `DataTable` with crisp 1px borders, clear column alignment (`align="right"` for financial/numeric columns), `StatusBadge` for state columns, `loading` skeleton state, and centered `EmptyState` when zero records match.
5. **Band 5 — Contextual Overlays (`Drawer` / `Modal` / `ConfirmDialog`)**
   - Row inspection, creation forms, and quick edits open in a right-hand slide-out `Drawer` (keeping list context visible).
   - Destructive or high-impact actions (revoke, suspend, approve payout, logout) always require `ConfirmDialog` with clear consequences.

---

## 3. Core UX Principles

1. **Operational Clarity:** At any moment, the user must immediately see: *What is happening? What is the status? What needs attention? What action can I take next?*
2. **Action Proximity:** Place row actions, export buttons, and refresh controls directly on the card/header they affect—never bury them behind extra pages.
3. **Progressive Disclosure:** Surface summary KPIs and key table columns first; reveal full entity details, audit trails, and secondary metadata inside a `Drawer` or `CollapsibleSection`.
4. **Zero Wasted Space:** Use full-width `.admin-content` (`width: 100%; max-width: none; padding: 1.35rem 1.25rem 1.85rem;`) so tables, KPI strips, and multi-column grids breathe naturally without wide blank margins on either side.

---

## 4. Shell & Global Chrome Behavior

- **Collapsible Icon-Rail Sidebar (`Sidebar`):**
  - Default collapsed `64px` rail maximizing workspace width; expands smoothly on hover/focus to `224px` showing group labels, nested sub-items, and active purple glow indicator.
  - Bottom utility zone houses cross-portal links, user badge, and logout trigger.
- **Sticky Top Header (`Header`):**
  - `50px` fixed height, always visible on scroll.
  - Left: Current route/context title.
  - Right: In-app notifications bell with unread badge & popover, `ThemeToggle` (Light / Dark / System), live API health status pill (`Healthy` / `Degraded` / `Offline`), signed-in user identity, and `Log Out` action.

---

## 5. Required Interactive States (Every Screen)

Every data-driven component or page must handle all four states using the shared primitives:
- **Loading:** `LoadingSkeleton` or `DataTable` `loading={true}` (never a blank white screen).
- **Empty:** `EmptyState` with contextual icon, clear title, and actionable next step or filter reset.
- **Error:** `ErrorState` or `FeedbackBanner` with human-readable message and a `Retry` button.
- **Feedback:** `ToastProvider` (`toast.success` / `toast.error`) for non-blocking mutation confirmations.

---

## 6. Accessibility & Responsiveness

- **Keyboard & Focus:** All interactive elements (`Button`, `KpiStrip` clickable cells, `SegmentedTabs`, `DataTable` rows) must have visible focus rings (`--border-focus`), proper `role` / `aria-pressed` attributes, and `Enter`/`Space` activation.
- **Responsive Breakpoint (`<= 768px`):** Sidebar rail narrows to `56px`, header compactly hides secondary status/profile metadata, `.admin-content` padding tightens to `1.52rem 1rem 1.75rem`, and `KpiStrip` / action bars wrap cleanly via `flex-wrap`.
