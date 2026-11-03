# AdhocX Corporate Employee Transportation System (ETS) Documentation Suite

**Product:** AdhocX Direct Corporate Managed Transport (ETS)  
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

## Documentation Index

| Index | Document Title & Path | Description |
| :---: | :--- | :--- |
| **00** | [00_MASTER_PLAN_CORPORATE_ETS.md](file:///c:/Users/saavi/Desktop/adhocx/docs/corporate-ets/00_MASTER_PLAN_CORPORATE_ETS.md) | Strategic master plan, PRD reconciliation, mathematical timing formulas, and high-level workflow architecture. |
| **01** | [01_TECHNICAL_ARCHITECTURE_AND_SYSTEM_DESIGN.md](file:///c:/Users/saavi/Desktop/adhocx/docs/corporate-ets/01_TECHNICAL_ARCHITECTURE_AND_SYSTEM_DESIGN.md) | High-level system architecture, NestJS backend, Flutter apps, Next.js web applications, PostGIS, and message bus. |
| **02** | [02_ROSTER_INGESTION_AND_EXCEL_IMPORT_ENGINE.md](file:///c:/Users/saavi/Desktop/adhocx/docs/corporate-ets/02_ROSTER_INGESTION_AND_EXCEL_IMPORT_ENGINE.md) | Excel/CSV template standard, streaming validation, geocoding, deduplication, and idempotent demand generation. |
| **03** | [03_ROUTE_OPTIMIZATION_AND_CAPACITY_SOLVER.md](file:///c:/Users/saavi/Desktop/adhocx/docs/corporate-ets/03_ROUTE_OPTIMIZATION_AND_CAPACITY_SOLVER.md) | Google OR-Tools CVRPTW solver, Sedan (4-seat) / SUV (6-seat) capacity, stop dwell buffers (5 min), and maximum ride time. |
| **04** | [04_AUTONOMOUS_DISPATCH_AND_H3_ROUTING_ENGINE.md](file:///c:/Users/saavi/Desktop/adhocx/docs/corporate-ets/04_AUTONOMOUS_DISPATCH_AND_H3_ROUTING_ENGINE.md) | 1-hour lead time dispatch, Uber H3 spatial indexing (5km -> 10km radius), dynamic traffic advancer, and atomic driver offers. |
| **05** | [05_TRIP_EXECUTION_OTP_AND_5MIN_NO_SHOW_LIFECYCLE.md](file:///c:/Users/saavi/Desktop/adhocx/docs/corporate-ets/05_TRIP_EXECUTION_OTP_AND_5MIN_NO_SHOW_LIFECYCLE.md) | Live trip execution, geofenced arrival, 5-minute stop dwell countdown timer, OTP/QR boarding, and audited no-show procedure. |
| **06** | [06_RESCHEDULE_AND_CANCELLATION_ENGINE.md](file:///c:/Users/saavi/Desktop/adhocx/docs/corporate-ets/06_RESCHEDULE_AND_CANCELLATION_ENGINE.md) | 9-hour cutoff policy, shift rescheduling, automated route rebalancing, passenger de-allocation, and route pruning. |
| **07** | [07_CORPORATE_CLIENT_PORTAL_SPECIFICATION.md](file:///c:/Users/saavi/Desktop/adhocx/docs/corporate-ets/07_CORPORATE_CLIENT_PORTAL_SPECIFICATION.md) | Next.js 14 corporate portal (22 screens), real-time attendance / no-show tracking, route live maps, invoices, and RBAC. |
| **08** | [08_EMPLOYEE_MOBILE_APP_SPECIFICATION.md](file:///c:/Users/saavi/Desktop/adhocx/docs/corporate-ets/08_EMPLOYEE_MOBILE_APP_SPECIFICATION.md) | Flutter employee app (23 screens), shift calendar, live tracking, driver credentials, boarding OTP, push notifications, and SOS. |
| **09** | [09_DRIVER_MOBILE_APP_SPECIFICATION.md](file:///c:/Users/saavi/Desktop/adhocx/docs/corporate-ets/09_DRIVER_MOBILE_APP_SPECIFICATION.md) | Flutter driver app (23 screens), direct onboarding without vendor intermediary, atomic route offers, turn-by-turn nav, and earnings. |
| **10** | [10_SUPER_ADMIN_AND_TRIPS_RIDE_MANAGEMENT_PANEL.md](file:///c:/Users/saavi/Desktop/adhocx/docs/corporate-ets/10_SUPER_ADMIN_AND_TRIPS_RIDE_MANAGEMENT_PANEL.md) | Super admin portal (24 screens), compliance review desk, Trips and Ride Management Panel, and manual dispatch override ("Start" action). |
| **11** | [11_SAFETY_SOS_AND_COMMAND_CENTRE_OPERATIONS.md](file:///c:/Users/saavi/Desktop/adhocx/docs/corporate-ets/11_SAFETY_SOS_AND_COMMAND_CENTRE_OPERATIONS.md) | 24x7 command centre, P0 SOS alerts, route deviation detection, overspeed alerts, stale GPS handling, and emergency runbooks. |
| **12** | [12_REALTIME_GPS_TRACKING_AND_NOTIFICATIONS.md](file:///c:/Users/saavi/Desktop/adhocx/docs/corporate-ets/12_REALTIME_GPS_TRACKING_AND_NOTIFICATIONS.md) | WebSocket & Redis pub/sub telemetry, 15-30s GPS throttling, battery efficiency, stale GPS rules, and FCM/SMS notifications. |
| **13** | [13_DUAL_FINANCIAL_LEDGERS_BILLING_AND_PAYOUTS.md](file:///c:/Users/saavi/Desktop/adhocx/docs/corporate-ets/13_DUAL_FINANCIAL_LEDGERS_BILLING_AND_PAYOUTS.md) | Dual ledger isolation (Corporate Receivables vs Driver Payables), integer paise math, rate cards, payout batches, and bank reconciliation. |
| **14** | [14_DATABASE_SCHEMA_POSTGIS_AND_DATA_CONTRACTS.md](file:///c:/Users/saavi/Desktop/adhocx/docs/corporate-ets/14_DATABASE_SCHEMA_POSTGIS_AND_DATA_CONTRACTS.md) | PostgreSQL 16 + PostGIS DDL, spatial indexes, partitioned tracking tables, and multi-tenant Row-Level Security (RLS) policies. |
| **15** | [15_API_INVENTORY_EVENT_CONTRACTS_AND_STATE_MACHINES.md](file:///c:/Users/saavi/Desktop/adhocx/docs/corporate-ets/15_API_INVENTORY_EVENT_CONTRACTS_AND_STATE_MACHINES.md) | Exhaustive REST API endpoints (v1), WebSocket message schemas, and finite state machines for requests, offers, trips, and stops. |

