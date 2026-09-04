# 04 — DESIGN SYSTEM

**Product:** AdhocX
**Document:** Design System
**Status:** Source of Truth
**Version:** V1
**Last Updated:** 2026-09-02

---

# 1. Purpose

This document defines the centralized visual and interaction foundation for AdhocX.

It governs:

* Color
* Typography
* Spacing
* Layout
* Components
* Elevation
* Borders
* Radius
* Icons
* Status indicators
* Forms
* Tables
* Cards
* Navigation
* Maps
* Feedback states
* Responsive behavior
* Accessibility
* Mobile interaction patterns

The objective is to ensure that every AdhocX screen looks and behaves like part of **one coherent B2B transportation operations product**.

---

# 2. Design Philosophy

AdhocX is an operational B2B platform.

The interface must prioritize:

1. **Clarity**
2. **Speed**
3. **Trust**
4. **Operational visibility**
5. **Information hierarchy**
6. **Low cognitive load**
7. **Consistency**
8. **Error prevention**

The design must feel closer to:

* Stripe Dashboard
* Linear
* modern logistics/operations software
* professional enterprise SaaS

It must NOT feel like:

* consumer ride-hailing software
* social media
* gaming UI
* crypto dashboard
* generic AI dashboard
* marketing landing page

---

# 3. Core Design Principles

## 3.1 Clarity over decoration

Every visual element must communicate something useful.

Do not add:

* decorative gradients
* unnecessary illustrations
* excessive shadows
* decorative animations
* ornamental shapes
* excessive glassmorphism

If removing an element does not reduce usability, question whether it belongs.

---

# 4. Platform Surfaces

AdhocX V1 has two visual environments.

## 4.1 Mobile

Technology:

**Flutter**

Used by:

* User
* Driver

The application must feel native to Android/iOS.

Mobile design prioritizes:

* large touch targets
* simple navigation
* readable information
* fast actions
* clear status
* network resilience
* one-handed operation where practical

---

## 4.2 Admin Web

Technology:

**Next.js + TypeScript**

The Admin application is:

* desktop-first
* information-dense
* operational
* table-oriented
* keyboard-friendly

Admin should optimize for operators who may spend several hours per day inside the application.

---

# 5. Brand Direction

AdhocX should visually communicate:

**Reliable + Fast + Professional + Operational**

The visual language should feel:

* confident
* precise
* calm
* trustworthy
* modern

Avoid making the interface overly aggressive or flashy.

---

# 6. Color System

All colors must be defined as centralized design tokens.

Components must never randomly introduce custom colors.

---

## 6.1 Primary

| Token       | Hex       | Usage                     |
| ----------- | --------- | ------------------------- |
| Primary 900 | `#0B1220` | deepest brand/dark UI     |
| Primary 800 | `#111827` | strong dark surfaces      |
| Primary 700 | `#1E293B` | dark UI elements          |
| Primary 600 | `#2563EB` | primary actions           |
| Primary 500 | `#3B82F6` | interactive/highlight     |
| Primary 400 | `#60A5FA` | lighter interactive state |

Primary action color:

```text
#2563EB
```

---

# 7. Neutral Colors

| Token          | Hex       | Usage                  |
| -------------- | --------- | ---------------------- |
| Background     | `#F8FAFC` | application background |
| Surface        | `#FFFFFF` | cards/panels           |
| Surface Muted  | `#F1F5F9` | secondary surfaces     |
| Border         | `#E2E8F0` | default borders        |
| Border Strong  | `#CBD5E1` | emphasized borders     |
| Text Primary   | `#0F172A` | primary text           |
| Text Secondary | `#475569` | supporting text        |
| Text Muted     | `#94A3B8` | low-emphasis text      |

Do not use pure black for normal text.

---

# 8. Semantic Colors

## Success

```text
Success: #16A34A
```

Used for:

* completed
* verified
* active success states
* successful payments
* successful assignments

---

## Warning

```text
Warning: #D97706
```

Used for:

* pending
* approaching expiry
* attention required
* delayed operational state

---

## Error

```text
Error: #DC2626
```

Used for:

* failures
* rejected
* cancelled
* destructive actions
* validation errors

---

## Info

```text
Info: #0284C7
```

Used for:

* informational messages
* neutral operational updates
* contextual information

---

# 9. Semantic Color Rule

Do not use colors merely because they look attractive.

Colors communicate meaning.

For example:

```text
Green → success/verified/completed
Amber → warning/pending/attention
Red → error/rejected/cancelled
Blue → primary action/information
```

A component must not use green to mean "available" on one screen and "completed" on another.

Semantic meaning must remain consistent.

---

# 10. Typography

Primary font:

**Inter**

Use the same typography system across Admin and Mobile wherever technically practical.

Fallback:

```text
Inter
→ system sans-serif fallback
```

---

# 11. Typography Scale

| Style       |    Size | Weight | Usage                        |
| ----------- | ------: | -----: | ---------------------------- |
| Display     |    40px |    700 | major dashboard numbers/hero |
| H1          |    32px |    700 | page title                   |
| H2          |    24px |    700 | major section                |
| H3          |    20px |    600 | subsection                   |
| H4          |    18px |    600 | card/section title           |
| Body Large  |    16px |    400 | important body               |
| Body        |    14px |    400 | standard UI                  |
| Body Medium |    14px |    500 | emphasized UI                |
| Small       |    13px |    400 | secondary information        |
| Caption     |    12px |    400 | metadata                     |
| Label       | 12–14px |    500 | form labels                  |

---

# 12. Typography Rules

Do:

* use hierarchy
* use weight to communicate importance
* maintain readable line height
* keep paragraphs short

Do not:

* use many font families
* use decorative fonts
* use uppercase everywhere
* use extremely thin text
* use large text for ordinary information

---

# 13. Spacing System

AdhocX uses a **4px base spacing grid**.

Core spacing values:

```text
4
8
12
16
20
24
32
40
48
64
```

Preferred usage:

| Space | Typical usage              |
| ----- | -------------------------- |
| 4px   | icon/text micro spacing    |
| 8px   | compact component spacing  |
| 12px  | field/internal spacing     |
| 16px  | standard component padding |
| 20px  | card padding               |
| 24px  | section spacing            |
| 32px  | major sections             |
| 40px  | page-level separation      |
| 48px  | major layout separation    |
| 64px  | large structural spacing   |

Avoid arbitrary values such as:

```text
13px
17px
27px
31px
```

unless there is a documented reason.

---

# 14. Border Radius

Recommended radius system:

| Token      |  Value | Usage            |
| ---------- | -----: | ---------------- |
| Radius XS  |    4px | tiny elements    |
| Radius SM  |    6px | controls         |
| Radius MD  |    8px | inputs/buttons   |
| Radius LG  |   10px | cards            |
| Radius XL  |   12px | modals/drawers   |
| Radius 2XL |   16px | large containers |
| Pill       | 9999px | badges/status    |

The default product language should use **moderate rounding**, not exaggerated rounded cards.

---

# 15. Elevation

AdhocX should use restrained elevation.

Default hierarchy:

### Level 0

Flat surface.

Used for:

* page backgrounds
* normal layouts

### Level 1

Subtle shadow/border.

Used for:

* cards
* dropdowns

### Level 2

Visible elevation.

Used for:

* modal
* drawer
* floating panel

### Level 3

High-priority overlay.

Used sparingly.

Avoid stacking multiple heavy shadows.

Borders should often provide enough separation without shadows.

---

# 16. Borders

Default border:

```text
1px solid #E2E8F0
```

Strong border:

```text
1px solid #CBD5E1
```

Borders should be:

* subtle
* consistent
* functional

Do not create borders around every nested element.

---

# 17. Iconography

Use one consistent icon family.

Recommended:

**Lucide**

Icons must:

* communicate a clear concept
* have consistent stroke style
* maintain consistent sizing
* not replace important text when meaning could be ambiguous

Common sizes:

```text
16px
18px
20px
24px
```

---

# 18. Icon Rules

Icons should not be decorative noise.

Bad:

```text
[random icon] Dashboard
[random icon] Trips
[random icon] Payments
```

if the icon does not improve recognition.

Good:

* recognizable navigation icons
* action icons
* status icons
* contextual utility icons

Every icon-only action must have an accessible label/tooltip where appropriate.

---

# 19. Touch Targets

Mobile interactive targets should generally be at least:

```text
44 × 44 px
```

Prefer larger targets for primary driver actions.

Critical Driver actions should be easy to hit without precision:

* Accept
* Decline
* Start Trip
* Complete Trip
* Call
* Navigate

---

# 20. Buttons

Buttons are centralized components.

Required variants:

```text
Primary
Secondary
Tertiary
Destructive
Success
Text
Icon
```

---

## 20.1 Primary Button

Use for the primary action of a screen.

Examples:

```text
Create Requirement
Accept Trip
Start Trip
Submit
Save
```

Primary button should not be used for every action on a screen.

---

## 20.2 Secondary Button

Used for alternative actions.

Examples:

```text
Cancel
View Details
Back
Edit
```

---

## 20.3 Destructive Button

Used for irreversible or dangerous actions.

Examples:

```text
Cancel Requirement
Reject Driver
Suspend User
```

Destructive actions should require appropriate confirmation when the consequence is significant.

---

# 21. Button States

Every button component must support:

```text
Default
Pressed
Hover
Focus
Disabled
Loading
Success where applicable
```

Loading must prevent accidental duplicate submission.

---

# 22. Inputs

Standard input variants:

```text
Text
Phone
Number
Search
Date
Time
Dropdown
Location
OTP
```

Every input must support:

```text
Default
Focused
Filled
Error
Disabled
Read-only
Loading where applicable
```

---

# 23. Form Rules

Every important form must communicate:

* field label
* required/optional state
* validation
* error message
* helper text where needed
* submission state

Do not rely exclusively on placeholder text as a label.

Bad:

```text
[ Enter your phone number ]
```

Good:

```text
Phone Number
[ +91 XXXXX XXXXX ]
```

---

# 24. Cards

Cards are used to group related information.

Typical uses:

* requirement summary
* driver summary
* vehicle summary
* earnings
* operational metrics
* trip summary

Cards should have:

```text
Surface
Border
Moderate radius
Consistent padding
Clear hierarchy
```

Cards should not become the default container for everything.

---

# 25. Status Badges

Status badges are centralized components.

Examples:

```text
Pending
Verified
Available
Assigned
En Route
Active
Completed
Cancelled
Rejected
Failed
```

Every status must have:

* semantic color
* consistent wording
* consistent visual structure

Never create custom status styling per screen.

---

# 26. Status Representation

Do not communicate status only through color.

Example:

Bad:

```text
●
```

where users must infer meaning from color.

Better:

```text
✓ Verified
```

or:

```text
● Verified
```

with accessible text.

---

# 27. Avatars

Avatar component should support:

* image
* initials
* fallback
* loading state

Use consistent sizes:

```text
24
32
40
48
64
```

Driver profile images should not dominate operational interfaces.

---

# 28. Navigation

## Mobile

Navigation should be simple.

Potential primary sections:

### User

```text
Home
Requirements
Trips
Payments
Profile
```

### Driver

```text
Home
Trips
Earnings
Profile
```

Exact navigation is finalized in `06_SCREEN_SPECIFICATIONS.md`.

Do not force both role experiences into the same navigation structure if their workflows differ.

---

# 29. Admin Navigation

Admin uses a desktop sidebar.

Conceptual structure:

```text
Dashboard

Operations
  Requirements
  Trips
  Assignments

Marketplace
  Drivers
  Users

Finance
  Payments
  Settlements
  Pricing

Analytics
  Reports

Support

System
  Audit Logs
  Settings
```

Exact information architecture belongs to the screen specification document.

---

# 30. Tables

Tables are preferred for dense Admin operational data.

Typical table columns:

```text
ID
Status
User
Driver
Vehicle
Location
Time
Amount
Updated
Actions
```

Tables should support where relevant:

* sorting
* filtering
* pagination
* search
* row actions
* column alignment
* loading
* empty state
* error state

---

# 31. Mobile Lists

Mobile should generally use list/card patterns instead of desktop-style tables.

Example:

```text
Trip #AX10291
Sedan • Delhi
Pickup 10:30 AM

Driver
Raj Kumar

Status
Assigned
```

The most important information must appear first.

---

# 32. Maps

Maps are operational tools, not decorative backgrounds.

Use maps for:

* driver proximity
* requirement locations
* active trip location
* operational visibility

Map overlays must not obscure essential information.

A map should always have a clear supporting information hierarchy.

---

# 33. Map Markers

Different entities must have visually distinguishable markers.

Examples:

```text
Requirement
Driver
Pickup
Destination
Active Trip
```

Marker semantics must remain consistent throughout the product.

---

# 34. Drawers and Modals

Use a modal for:

* confirmation
* focused short forms
* destructive action confirmation

Use a drawer for:

* detailed operational inspection
* side-by-side context
* extended information
* Admin record inspection

Do not use modals for entire workflows that require multiple complex steps.

---

# 35. Bottom Sheets

Mobile bottom sheets are appropriate for:

* action menus
* contextual details
* quick filters
* compact forms
* confirmation

They must not become an excuse to hide important information behind multiple layers.

---

# 36. Toasts

Toast notifications should communicate short-lived feedback.

Examples:

```text
Requirement created.
Trip accepted.
Changes saved.
Withdrawal requested.
```

Do not use toasts for:

* critical errors
* information users need to act on
* destructive confirmations
* long messages

Important errors require persistent UI.

---

# 37. Alerts

Use alerts for persistent conditions.

Examples:

```text
No drivers available.
Payment failed.
KYC rejected.
Network connection lost.
```

Alerts must explain:

1. What happened.
2. Why it matters.
3. What the user can do.

---

# 38. Loading States

Every asynchronous screen must define a loading state.

Use:

* skeletons
* progress indicators
* disabled actions during mutation

Avoid blank screens.

Bad:

```text
white screen
...
```

Good:

```text
[Requirement skeleton]
[Driver skeleton]
[Status skeleton]
```

---

# 39. Empty States

Every list must define an empty state.

Examples:

```text
No active requirements
```

with optional contextual action:

```text
Create Requirement
```

Empty states should not look like errors.

---

# 40. Error States

Error states must distinguish:

### Validation error

User entered invalid data.

### Network error

Connection failed.

### Server error

Backend failed.

### Business error

The requested operation is not currently permitted.

Each should have an appropriate recovery action.

---

# 41. Offline State

Mobile applications must explicitly communicate network loss.

Example:

```text
You're offline.
Some information may be outdated.
```

Critical actions must not falsely appear successful when the backend has not confirmed them.

---

# 42. Optimistic UI

Optimistic UI may only be used when incorrect temporary state cannot cause serious operational damage.

Do NOT optimistically confirm:

* trip acceptance
* trip start
* trip completion
* payment
* settlement
* driver assignment

For critical operations:

```text
Client request
→ Backend confirmation
→ UI state update
```

---

# 43. Confirmation Patterns

Confirmation is required for high-impact actions.

Examples:

```text
Cancel Requirement
Suspend Driver
Reject KYC
Cancel Trip
```

Confirmation should clearly communicate consequence.

Example:

```text
Cancel requirement?

This may stop the current fulfillment process.

[Keep Requirement] [Cancel Requirement]
```

Avoid vague confirmations such as:

```text
Are you sure?
```

---

# 44. Driver UX Priority

Driver UX has a unique constraint:

The Driver may interact with the app in operational environments where attention is limited.

Therefore:

* primary actions must be obvious
* screens should avoid unnecessary information
* text should be readable
* touch targets should be large
* critical states should be visually obvious
* navigation should require minimal steps
* important actions should not be buried

The Driver experience should favor:

```text
See → Understand → Act
```

over:

```text
Explore → Navigate → Search → Act
```

---

# 45. User UX Priority

User UX should optimize for fulfillment visibility.

The User should quickly understand:

```text
What did I request?
How many vehicles do I need?
How many are assigned?
How many are still pending?
What is happening now?
```

A requirement's fulfillment state should therefore be highly visible.

Example:

```text
20 Required
14 Assigned
6 Pending
```

---

# 46. Admin UX Priority

Admin UX should optimize for operational decision-making.

An Admin should quickly identify:

* what is happening
* what is blocked
* what needs attention
* who is affected
* what action is available

Do not prioritize visual decoration over information density.

---

# 47. Information Hierarchy

Every screen should have:

### Level 1

Primary task/status.

### Level 2

Important supporting information.

### Level 3

Metadata/details.

Example:

```text
TRIP #AX10291                    ← Level 1

Assigned • Sedan • 10:30 AM     ← Level 2

Created 09:14
Updated 09:42
Driver ID: DR-1821              ← Level 3
```

---

# 48. Responsive Design

## Mobile

Optimize for:

```text
360px+
```

without assuming a single device size.

Support:

* small phones
* standard phones
* larger phones

---

## Admin Web

Support common desktop widths.

The interface must remain usable at reduced desktop widths without unnecessary horizontal scrolling.

---

# 49. Responsive Rules

Do not simply shrink desktop layouts onto mobile.

Mobile requires:

* different information hierarchy
* different navigation
* different interaction patterns
* larger controls
* fewer simultaneous actions

Responsive design is not merely CSS resizing.

---

# 50. Accessibility

Target:

**WCAG 2.1 AA**

Requirements include:

* sufficient contrast
* accessible labels
* keyboard navigation on web
* visible focus states
* semantic controls
* screen-reader support
* non-color-only status communication
* adequate touch targets
* readable typography

---

# 51. Focus States

Web controls must have visible keyboard focus.

Do not remove browser focus indicators without replacing them with an equivalent accessible design.

---

# 52. Motion

Motion should communicate state or improve orientation.

Good:

* modal transition
* drawer transition
* loading indicator
* status update
* navigation transition

Avoid:

* excessive bouncing
* decorative page animations
* unnecessary parallax
* distracting effects

Motion must never block critical operations.

---

# 53. Animation Timing

Use restrained transitions.

Typical UI transitions:

```text
150–250ms
```

Longer transitions require a specific UX reason.

---

# 54. Component Architecture

All UI must be built from centralized components.

Recommended component hierarchy:

```text
Design Tokens
      ↓
Primitives
      ↓
Core Components
      ↓
Domain Components
      ↓
Screen Components
```

Example:

```text
Button
 ↓
TripActionButton
 ↓
TripDetailsScreen
```

Not:

```text
TripDetailsScreen
 └── custom one-off button
```

---

# 55. Component Categories

## Primitives

```text
Text
Icon
Spacing
Divider
Container
```

## Inputs

```text
TextField
PhoneField
OTPField
Select
DatePicker
TimePicker
LocationPicker
Checkbox
Radio
Switch
```

## Actions

```text
Button
IconButton
Link
FloatingActionButton
```

## Feedback

```text
Toast
Alert
Snackbar
ProgressIndicator
Skeleton
EmptyState
ErrorState
```

## Layout

```text
Card
Section
Modal
Drawer
BottomSheet
```

## Data

```text
Table
List
Badge
StatusBadge
Avatar
Timeline
```

## AdhocX Domain Components

```text
TripCard
RequirementCard
DriverCard
VehicleCard
AssignmentCard
EarningsCard
FulfillmentProgress
TripStatus
DriverAvailability
MapView
```

---

# 56. Component API Rules

Components must expose meaningful variants rather than encourage custom styling.

Prefer:

```text
Button(
  variant: primary,
  size: large,
  loading: true
)
```

over:

```text
Button(
  backgroundColor: blue,
  borderRadius: 9,
  padding: ...
)
```

The design system owns visual implementation.

---

# 57. No One-Off Styling

AI agents must not introduce arbitrary styling because:

> "It looks better here."

Any repeated visual pattern must become:

* an existing component
* an existing token
* or a formally added component/token

---

# 58. Design Token Architecture

Tokens should exist centrally.

Conceptually:

```text
tokens/
├── colors
├── typography
├── spacing
├── radius
├── elevation
├── breakpoints
└── motion
```

Flutter and Next.js may have platform-specific implementations, but the conceptual design tokens must remain aligned.

---

# 59. Light/Dark Mode

V1 officially targets:

**Light Mode**

However, tokens must be structured so that dark mode can be added later without rewriting every component.

Do not hard-code colors directly throughout screens.

---

# 60. Domain Status Vocabulary

Use consistent language.

Examples:

```text
Pending
Available
Offered
Accepted
Assigned
Arriving
At Pickup
Started
Completed
Cancelled
Rejected
Expired
Failed
```

The final authoritative state vocabulary comes from:

`12_STATE_MACHINES.md`

UI labels must map to domain states rather than inventing contradictory terminology.

---

# 61. Data Density

AdhocX should use different information densities for different surfaces.

### Driver

Low density.

### User

Moderate density.

### Admin

High density.

The same domain object does not need to expose every field everywhere.

---

# 62. Privacy in UI

Sensitive information should only be displayed when necessary.

Examples:

* KYC documents
* financial information
* private contact information
* sensitive account information

Role and permission rules from `03_USER_ROLES_AND_PERMISSIONS.md` apply.

---

# 63. Formatted Data

Common formatting must be centralized.

Examples:

* currency
* dates
* times
* phone numbers
* vehicle registration numbers
* IDs
* distances

Do not implement different formatting rules on different screens.

---

# 64. Internationalization Readiness

Even if V1 initially targets a single primary market/language, UI architecture should avoid hard-coded text scattered throughout logic.

Text should be structured so localization can be introduced later.

Dates, times, currency, and numbers must use centralized formatting.

---

# 65. Design QA Checklist

Before considering a screen complete, verify:

### Visual

* [ ] Correct colors.
* [ ] Correct typography.
* [ ] Correct spacing.
* [ ] Correct radius.
* [ ] Correct icon family.
* [ ] Correct component variants.
* [ ] No arbitrary styles.

### UX

* [ ] Primary action is obvious.
* [ ] Information hierarchy is clear.
* [ ] Loading state exists.
* [ ] Empty state exists.
* [ ] Error state exists.
* [ ] Disabled states exist.
* [ ] Destructive actions are clear.

### Accessibility

* [ ] Contrast is sufficient.
* [ ] Controls have labels.
* [ ] Touch targets are adequate.
* [ ] Web keyboard navigation works.
* [ ] Status is not communicated only by color.

### Engineering

* [ ] Existing components reused.
* [ ] Tokens reused.
* [ ] No duplicated visual constants.
* [ ] No screen-specific design system.
* [ ] Responsive behavior considered.

---

# 66. AI Agent Design Rules

The AI implementation agent MUST follow these rules.

### Rule 1

Never invent a new visual language for a screen.

### Rule 2

Check existing design tokens before adding styling.

### Rule 3

Reuse existing components before creating a new component.

### Rule 4

If a pattern appears more than once, consider extracting it into a reusable component.

### Rule 5

Do not introduce gradients unless explicitly approved.

### Rule 6

Do not introduce glassmorphism unless explicitly approved.

### Rule 7

Do not use excessive border radius.

### Rule 8

Do not use excessive shadows.

### Rule 9

Do not use multiple icon families.

### Rule 10

Do not use color as the only status indicator.

### Rule 11

Do not sacrifice operational clarity for visual novelty.

### Rule 12

Do not make critical Driver actions small or difficult to reach.

### Rule 13

Do not create custom components when an existing component satisfies the requirement.

### Rule 14

Do not hard-code design tokens inside screens.

### Rule 15

If the required design pattern does not exist, stop and evaluate whether the design system should be extended rather than creating a one-off implementation.

---

# 67. Design Decision Hierarchy

When making a UI decision, follow this order:

```text
Product Requirement
       ↓
User Role
       ↓
User Journey
       ↓
Domain State
       ↓
Design System
       ↓
Component
       ↓
Screen
```

Never reverse this hierarchy.

For example:

Do not decide:

> "Let's use a modal because it looks nice."

Instead determine:

> What action is happening → what state is involved → what information is required → which existing interaction pattern best supports it?

---

# 68. Definition of Design-System Compliance

A screen is considered design-system compliant only when:

```text
Screen
=
Approved Tokens
+
Approved Components
+
Correct Information Hierarchy
+
Correct Role Context
+
Correct Interaction Pattern
+
Accessibility
```

A visually attractive screen that violates these rules is **not considered complete**.

---

# 69. Final Design Principle

AdhocX should look like a product built by one disciplined design team—not like 40 independently generated AI screens.

The objective is not:

> "Make every screen beautiful."

The objective is:

> **Make every screen predictable, clear, trustworthy, and operationally efficient.**

Consistency is a product feature.