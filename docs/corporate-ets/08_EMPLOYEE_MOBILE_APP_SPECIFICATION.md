# 08 — EMPLOYEE MOBILE APP SPECIFICATION

**Product:** AdhocX Direct Corporate Managed Transport (ETS)  
**Document:** Employee Mobile Application UX & Screen Specification  
**Status:** Source of Truth Baseline  
**Version:** 2.0 (Hyderabad Enterprise ETS Pilot)  
**Company:** Estemporaneo Technologies Private Limited  

---

> ### ⚠️ MANDATORY DESIGN & IMPLEMENTATION DIRECTIVE FOR ALL AI AGENTS & ENGINEERS
> Every AI agent, prompt, developer, and automated assistant modifying or contributing to this codebase **MUST STRICTLY ADHERE** to the project's foundational guidelines:
> 1. **Visual Foundation:** [`docs/04_DESIGN_SYSTEM.md`](file:///c:/Users/saavi/Desktop/adhocx/docs/04_DESIGN_SYSTEM.md) (Colors, Typography, Spacing, Tokens, Radius, Component Styling)
> 2. **Interaction & User Journey Rules:** [`docs/05_UI_UX_GUIDELINES.md`](file:///c:/Users/saavi/Desktop/adhocx/docs/05_UI_UX_GUIDELINES.md) (Information Architecture, Screen States, Error Handling, Navigation)
> 3. **Engineering Authority & Constraints:** [`docs/20_AI_AGENT_RULES.md`](file:///c:/Users/saavi/Desktop/adhocx/docs/20_AI_AGENT_RULES.md) (Correctness > Architecture > Security > Speed. Zero hallucinated business rules. Preserved integrity).

---

# 1. Product Scope & User Journey

The AdhocX Employee Mobile App (built with Flutter for iOS and Android) provides corporate employees with a frictionless, transparent, and safe commute experience. It empowers employees to track their daily office pickup/drop, receive real-time notifications, view assigned vehicle/driver credentials, board securely using dynamic OTPs, and access instant emergency assistance.

---

# 2. Comprehensive Screen Inventory (PRD v2.0 Baseline)

| UI Screen ID | Screen Name | Route Path | Core Functionality & Features |
| :---: | :--- | :--- | :--- |
| **UI-01-01** | Welcome Screen | `/auth/welcome` | Branded corporate greeting, organization identifier input, and feature highlights. |
| **UI-01-02** | OTP / SSO Login | `/auth/login` | Corporate Single Sign-On (SAML/OIDC) or 6-digit SMS OTP verification. |
| **UI-01-03** | Permission Onboarding | `/auth/permissions` | Explicit, revocable system permission requests: Location and Push Notifications. |
| **UI-02-01** | Home Dashboard | `/home` | Next scheduled ride card, current status banner, quick SOS trigger, and refresh timestamp. |
| **UI-02-02** | Next Trip Card | Component (`/home`) | High-contrast card showing shift time, pickup point, driver assignment, and live ETA. |
| **UI-02-03** | Trip Status Detail | `/trips/status` | Detailed view of the current ride lifecycle (Scheduled, Dispatched, Arrived, Boarded). |
| **UI-03-01** | Schedule Calendar | `/calendar` | Weekly/monthly view of approved corporate rosters (Login and Logout shifts). |
| **UI-03-02** | Trip Details | `/calendar/trip/[id]` | Stop location, route sequence, designated co-passengers, and corporate transport rules. |
| **UI-03-03** | Cancellation Request | `/rides/cancel` | One-tap cancellation with 9-hour cutoff countdown and policy justification prompt. |
| **UI-03-04** | Change / Reschedule Request | `/rides/reschedule` | Shift modification picker (e.g., move from 07:00 AM to 09:00 AM) with instant feedback. |
| **UI-04-01** | Assigned Cab Card | `/ride/driver` | Driver display name, verified photo, cab model, color, and license plate number. |
| **UI-04-02** | Driver Detail Sheet | Modal (`/ride/driver`) | Driver aggregate rating, total completed enterprise trips, and masked proxy call button. |
| **UI-04-03** | Replacement Notice | Dialog (`/ride/alert`) | Modal notification displayed when an assigned driver is replaced due to breakdown. |
| **UI-05-01** | Live Map Screen | `/ride/live-map` | Real-time map displaying cab position, animated route polyline, and GPS freshness tag. |
| **UI-05-02** | Pickup Point Guidance | `/ride/pickup-point` | Walking directions from home to exact pickup point with photo/street landmark. |
| **UI-05-03** | Trip Progress Bar | Component (`/ride/live`) | Stop-by-stop progress indicator showing completed pickups and remaining transit time. |
| **UI-06-01** | Boarding OTP Screen | `/ride/boarding-otp` | High-visibility 4-digit numeric OTP and scannable QR code for driver verification. |
| **UI-06-02** | Boarding Success Card | Modal (`/ride/boarded`) | Haptic green feedback confirming successful boarding and estimated office arrival time. |
| **UI-06-03** | Trip Completion Screen | `/ride/completed` | Arrival summary, deboarding confirmation, and driver star rating prompt (1–5 stars). |
| **UI-07-01** | Safety Center | `/safety` | 24x7 Command Centre contacts, emergency guidelines, and trip-sharing tools. |
| **UI-07-02** | SOS Confirmation Dialog | Modal (`/safety/sos`) | Prominent 3-second abort countdown before broadcasting high-priority emergency alert. |
| **UI-07-03** | Support Tickets | `/support` | In-app ticket submission for forgotten items, late arrivals, or driver feedback. |
| **UI-07-04** | Complaint Detail | `/support/[id]` | Status timeline and resolution notes for submitted support tickets. |
| **UI-08-01** | Notification Inbox | `/notifications` | Chronological list of push alerts: Driver En Route, Cab Arrived, and Schedule Changes. |
| **UI-08-02** | Trip History | `/history` | Historical archive of all past completed, cancelled, or missed corporate rides. |
| **UI-08-03** | Employee Profile | `/profile` | Registered employee ID, corporate email, office branch, and emergency contacts. |
| **UI-08-04** | App Settings | `/settings` | Language selector (English, Hindi, Telugu), notification preferences, and privacy toggles. |

---

# 3. Core Interaction & Screen Mockups

### 3.1 Boarding OTP Screen (UI-06-01)
Displayed prominently when the vehicle approaches or arrives at the employee's pickup stop:

```text
┌──────────────────────────────────────────┐
│ ‹ Back          Active Commute       SOS │
├──────────────────────────────────────────┤
│                                          │
│   🟢 CAB HAS ARRIVED OUTSIDE             │
│   Vehicle: White Swift Dzire (TS 09 UB 4410)│
│   Driver: Ramesh Kumar ★ 4.9             │
│                                          │
│   ┌──────────────────────────────────┐   │
│   │     YOUR BOARDING OTP            │   │
│   │                                  │   │
│   │           8 4 9 2                │   │
│   │                                  │   │
│   │  Show this 4-digit code to your  │   │
│   │  driver to board the cab.        │   │
│   └──────────────────────────────────┘   │
│                                          │
│   ⏱️ STOP DWELL TIMER: 03:42 REMAINING   │
│   Please board promptly. Drivers depart  │
│   after 5 minutes to avoid shift delays. │
│                                          │
│   [ 📞 Call Driver (Masked) ]            │
└──────────────────────────────────────────┘
```

### 3.2 Real-Time Push Notification Engine
The app registers with Firebase Cloud Messaging (FCM) / Apple APNs to deliver mission-critical state updates:
1. **Driver Dispatched:**  
   `"Your cab for 08:00 AM shift has been assigned. Driver Ramesh (TS09UB4410) is en route."`
2. **Driver Approaching:**  
   `"Driver is 5 minutes away from your pickup point. Please get ready to board."`
3. **Cab Arrived:**  
   `"Your cab has arrived outside! Please board within 5 minutes. Your OTP is 8492."`
4. **Significant Delay:**  
   `"Traffic alert: Your cab is delayed by approximately 8 minutes. Revised pickup: 06:18 AM."`

---
*Refer to `09_DRIVER_MOBILE_APP_SPECIFICATION.md` for the driver mobile experience.*

