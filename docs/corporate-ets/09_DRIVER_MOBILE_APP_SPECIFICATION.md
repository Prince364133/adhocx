# 09 — DRIVER MOBILE APP SPECIFICATION

**Product:** AdhocX Direct Corporate Managed Transport (ETS)  
**Document:** Driver Mobile Application UX & Screen Specification  
**Status:** Source of Truth Baseline  
**Version:** 2.0 (Hyderabad Enterprise ETS Pilot)  
**Company:** Estemporaneo Technologies Private Limited  

---

> ### ⚠️ MANDATORY DESIGN & IMPLEMENTATION DIRECTIVE FOR ALL AI AGENTS & ENGINEERS
> Every AI agent, prompt, developer, and automated assistant modifying or contributing to this codebase **MUST STRICTLY ADHERE** to the project's foundational guidelines:
> 1. **Visual Foundation:** [`docs/04_DESIGN_SYSTEM.md and apps/marketing/DESIGN_AND_UI.md`](file:///c:/Users/saavi/Desktop/adhocx/docs/04_DESIGN_SYSTEM.md) (Colors, Typography, Spacing, Tokens, Radius, Component Styling)
> 2. **Interaction & User Journey Rules:** [`docs/05_UI_UX_GUIDELINES.md`](file:///c:/Users/saavi/Desktop/adhocx/docs/05_UI_UX_GUIDELINES.md) (Information Architecture, Screen States, Error Handling, Navigation)
> 3. **Engineering Authority & Constraints:** [`docs/20_AI_AGENT_RULES.md`](file:///c:/Users/saavi/Desktop/adhocx/docs/20_AI_AGENT_RULES.md) (Correctness > Architecture > Security > Speed. Zero hallucinated business rules. Preserved integrity).

---

# 1. Product Scope & Driver Relationship

In the AdhocX Corporate ETS model, **drivers contract directly with AdhocX as independent cab owners**. There is NO vendor intermediary, broker, or fleet middleman in the enterprise flow. Drivers operate commercial, legally compliant vehicles (Sedans or SUVs), register their documents directly via the Driver Mobile App, and receive route assignments and guaranteed transparent payouts directly from AdhocX.

---

# 2. Comprehensive Screen Inventory (PRD v2.0 Baseline)

| UI Screen ID | Screen Name | Route Path | Core Functionality & Features |
| :---: | :--- | :--- | :--- |
| **UI-01-01** | Driver Registration | `/auth/register` | Mobile phone entry, referral code, and terms of direct engagement. |
| **UI-01-02** | OTP Login | `/auth/otp` | Fast 6-digit SMS OTP authentication and device token binding. |
| **UI-01-03** | Document Capture | `/onboarding/documents` | Camera scan: Commercial Driving License, Aadhaar, PAN card, and selfie photo. |
| **UI-01-04** | Direct Agreement | `/onboarding/contract` | Digital driver agreement review, terms acceptance, and e-signature. |
| **UI-01-05** | Review Status | `/onboarding/status` | Compliance verification tracker (Pending, Approved, Rejected with resubmission). |
| **UI-02-01** | Vehicle Registration | `/vehicle/register` | Vehicle registration plate, commercial category, seating capacity (4 or 6), and fuel type. |
| **UI-02-02** | Vehicle Doc Upload | `/vehicle/documents` | RC (Registration Certificate), Commercial Insurance, Fitness Certificate, and Permit. |
| **UI-02-03** | Vehicle Status | `/vehicle/status` | Active vehicle compliance badge and document expiration warnings. |
| **UI-03-01** | Availability Home | `/home` | Master Online/Offline duty toggle, current operating zone, and shift status. |
| **UI-03-02** | Duty Schedule | `/duty/schedule` | Pre-committed shift rosters (e.g., Morning 08:00 AM batch commitment). |
| **UI-03-03** | Operating Zone Map | `/duty/zones` | Hyderabad authorized service zones and high-demand pickup clusters. |
| **UI-04-01** | Route Offer Popup | Overlay Modal | Full-screen offer alert: Pickup window, passenger count, distance, payout, and 60s timer. |
| **UI-04-02** | Offer Detail | `/offers/[id]` | Full itinerary preview showing Stop 1 to Stop 4 and destination corporate office. |
| **UI-04-03** | Acceptance Confirmation| `/offers/confirmed` | Atomic confirmation banner acknowledging route lock and commitment. |
| **UI-05-01** | Active Route Screen | `/route/active` | Current stop card, live turn-by-turn navigation link, and passenger list. |
| **UI-05-02** | Stop List Itinerary | `/route/stops` | Ordered list of all pickups with status indicators (`Pending`, `Boarded`, `No-Show`). |
| **UI-05-03** | Navigation HUD | `/route/nav` | Integrated Google Maps turn-by-turn guidance optimized for high-contrast sunlight. |
| **UI-05-04** | Boarding Verification | `/route/verify-otp` | 4-digit OTP numeric keypad, QR camera scanner, and 5-minute countdown buffer timer. |
| **UI-06-01** | In-Progress Route | `/route/in-transit` | Highway/arterial navigation toward corporate hub once all pickups conclude. |
| **UI-06-02** | Trip Events Log | `/route/events` | Automatic GPS-tagged log of arrivals, boarding timestamps, and departures. |
| **UI-06-03** | Issue / Breakdown Report| `/route/incident` | Report vehicle mechanical failure, traffic blockages, or passenger disputes. |
| **UI-06-04** | Driver SOS Trigger | Modal (`/safety/sos`)| High-priority distress button connecting instantly to AdhocX 24x7 Command Centre. |
| **UI-07-01** | Earnings Dashboard | `/earnings` | Daily, weekly, and monthly contracted gross earnings, incentives, and net payouts. |
| **UI-07-02** | Trip Earning Detail | `/earnings/trip/[id]` | Itemized route compensation: base route fare + extra distance + toll reimbursement. |
| **UI-07-03** | Payout History | `/earnings/payouts` | Automated bank payout batch transfers, UTR reference numbers, and payout dates. |
| **UI-07-04** | Payout Dispute | `/earnings/dispute` | Formal claim submission for missing tolls, parking fees, or route adjustments. |
| **UI-08-01** | Driver Profile | `/profile` | Driver credentials, license validity, verified badges, and aggregate rating. |
| **UI-08-02** | Document Renewal | `/profile/docs` | Expiry tracker for RC, Insurance, and DL with direct camera upload. |
| **UI-08-03** | Safety & Training | `/training` | Mandatory corporate passenger safety modules, POSH guidelines, and conduct rules. |
| **UI-08-04** | Driver Support | `/support` | 24x7 phone helpline to dispatch operations and ticketing for app issues. |

---

# 3. Critical Mobile Interaction Flows

### 3.1 Incoming Route Offer Modal (UI-04-01)
When dispatched by the H3 engine, the driver's phone rings with a distinctive operational ringtone, waking the screen:

```text
┌──────────────────────────────────────────┐
│ 🔔 NEW ROUTE OFFER: MORNING LOGIN BATCH  │
├──────────────────────────────────────────┤
│                                          │
│   ⏱️ TIME REMAINING TO ACCEPT: 48s       │
│                                          │
│   Corporate Client: Company X (Hitec City)│
│   First Pickup Time: 06:00 AM            │
│   First Pickup Area: Madhapur (2.4 km away)│
│                                          │
│   Route: 4 Stops ➔ Office Hub (4 Passengers) │
│   Est. Total Distance: 28.5 km           │
│   Est. Travel Time: 1 hr 45 min          │
│                                          │
│   ┌──────────────────────────────────┐   │
│   │   GUARANTEED PAYOUT: ₹ 850.00    │   │
│   └──────────────────────────────────┘   │
│                                          │
│   [        ACCEPT ROUTE (LOCKED)       ] │
│                                          │
│   [            Decline Offer           ] │
└──────────────────────────────────────────┘
```

### 3.2 Stop Arrival, 5-Minute Countdown & OTP Verification (UI-05-04)
When the driver arrives at Stop 1 (geofence verified):

```text
┌──────────────────────────────────────────┐
│ Stop 1 of 4: Pickup — Ananya Sharma      │
├──────────────────────────────────────────┤
│ Address: Flat 402, Lotus Apts, Madhapur  │
│ Passenger Phone: [ 📞 Call Masked ]      │
│                                          │
│   ⏱️ STOP WAIT TIMER: 04:12              │
│   (Mandatory 5-minute wait buffer active)│
│                                          │
│   Enter Passenger Boarding OTP:          │
│   ┌───┬───┬───┬───┐                      │
│   │ 8 │ 4 │ 9 │ 2 │                      │
│   └───┴───┴───┴───┘                      │
│   [ 📷 Scan QR Challenge ]               │
│                                          │
│   [    CONFIRM & VERIFY BOARDING       ] │
│                                          │
│   ────────────────────────────────────   │
│   [ Mark No-Show (Employee Absent) ]     │
│   (Button unlocks when timer hits 00:00) │
└──────────────────────────────────────────┘
```

---
*Refer to `10_SUPER_ADMIN_AND_TRIPS_RIDE_MANAGEMENT_PANEL.md` for super admin oversight.*

