import csv
import os

tasks = [
    # =========================================================================
    # 1. GRAPHIC DESIGNER WORKSTREAM (15 TASKS)
    # =========================================================================
    {
        "Task_ID": "TSK-GDES-001",
        "Workstream": "Design System & Branding",
        "Subsystem": "Brand Identity & Vehicle Assets",
        "Role": "Graphic Designer",
        "Task_Title": "Design Enterprise Vehicle Category Vector Badges & 3D Isometric Models",
        "Detailed_Scope_and_Deliverables": "Create SVG and PNG asset pack for 5 corporate vehicle tiers: Sedan (4-seater), Compact SUV (4-seater), Executive SUV (6-seater), Mini-bus/Traveller (12-seater), and Electric Fleet (EV badge). Needs both 2D top-down map pin markers and 3D isometric cards for mobile/web apps.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 1 (Beginner)",
        "Prerequisite_Concepts_To_Teach": "Vector grid alignment (24px and 48px), export densities (@1x, @2x, @3x), SVG viewBox standardization, primary brand color #1E3A8A guidelines.",
        "Estimated_Hours": "12",
        "Acceptance_Criteria_DoD": "SVGs cleanly grouped without raster embedded data; transparent backgrounds; tested on both dark (#0F172A) and light (#FFFFFF) surfaces.",
        "Related_Files_Codebase_Pointers": "apps/marketing/public/images/vehicles/, apps/mobile/assets/images/, docs/04_DESIGN_SYSTEM.md"
    },
    {
        "Task_ID": "TSK-GDES-002",
        "Workstream": "Design System & Branding",
        "Subsystem": "Safety & Compliance Assets",
        "Role": "Graphic Designer",
        "Task_Title": "Create Zero-Trust Commute Safety Badges and Escort Protocol Graphics",
        "Detailed_Scope_and_Deliverables": "Design visual iconography and infographic badges for safety features: Female Safe-Drop Escort Verified, Verified Driver Police Background Check, SOS Emergency Sentinel, Real-time GPS Breadcrumb Tracking, and 5-Minute Dwell Buffer.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 1 (Beginner)",
        "Prerequisite_Concepts_To_Teach": "Visual hierarchy, safety color psychology (emerald green #16A34A for verified, crimson #DC2626 for SOS, amber #D97706 for caution), export to Flutter asset bundle.",
        "Estimated_Hours": "10",
        "Acceptance_Criteria_DoD": "Consistent line weights (2px stroke), export in SVG and webp, integrated in Employee and Corporate portal headers.",
        "Related_Files_Codebase_Pointers": "apps/employee_app/lib/shared/illustrations/safety_illustrations.dart, apps/corporate/src/app/safety/page.tsx"
    },
    {
        "Task_ID": "TSK-GDES-003",
        "Workstream": "Design System & Branding",
        "Subsystem": "Mobile App Store Assets",
        "Role": "Graphic Designer",
        "Task_Title": "Produce Google Play & Apple App Store Promotional Feature Graphics",
        "Detailed_Scope_and_Deliverables": "Design Google Play Store feature graphic (1024x500px), app icon (512x512px with squircle mask), and 6 high-conversion mockup screenshots for both AdhocX Driver App and AdhocX Commuter App showcasing: Live OTP Boarding, Route Corridor Navigation, Safe Reach Confirmation, and SOS Panic Button.",
        "Status": "PENDING_ASSIGNMENT",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Google Play Store / Apple App Store asset guidelines, device mockup frames (iPhone 15 Pro, Pixel 8 Pro), typography rendering for localized store listings.",
        "Estimated_Hours": "20",
        "Acceptance_Criteria_DoD": "Figma export slices ready for submission in both 1080x1920 (Android) and 1290x2796 (iOS) formats; compliant with Google Play metadata policies.",
        "Related_Files_Codebase_Pointers": "docs/04_DESIGN_SYSTEM.md, scripts/generate_app_icons.js"
    },
    {
        "Task_ID": "TSK-GDES-004",
        "Workstream": "Design System & Branding",
        "Subsystem": "Empty State & Error Illustrations",
        "Role": "Graphic Designer",
        "Task_Title": "Illustrate System Empty States & Feedback Graphics for Web & Mobile",
        "Detailed_Scope_and_Deliverables": "Illustrate 8 narrative empty state scenes: 'No Active Shift Trips Today', 'Roster Upload Success', 'GPS Signal Temporarily Lost', 'Driver Searching Nearby', 'Safe Arrival Acknowledged', 'Emergency Ticket Opened', 'Rate Card Not Found', and 'No Internet Connectivity'.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 1 (Beginner)",
        "Prerequisite_Concepts_To_Teach": "AdhocX brand illustration character style (clean geometric flat illustration, minimal gradients, primary blue and teal accents), Flutter CustomPainter or SvgPicture loading.",
        "Estimated_Hours": "16",
        "Acceptance_Criteria_DoD": "SVGs under 45KB each, clean semantic layer naming, responsive scaling without clipping.",
        "Related_Files_Codebase_Pointers": "apps/employee_app/lib/shared/illustrations/, apps/corporate/src/components/common/"
    },
    {
        "Task_ID": "TSK-GDES-005",
        "Workstream": "Design System & Branding",
        "Subsystem": "Marketing Collateral & B2B Decks",
        "Role": "Graphic Designer",
        "Task_Title": "Design Enterprise ETS Pitch Deck Templates & ROI Infographics",
        "Detailed_Scope_and_Deliverables": "Create 15-slide master sales presentation template in Figma/Google Slides for enterprise HR & Facilities heads: Fleet Cost Optimization, SLA Compliance Matrix, Female Safety Protocols, Dynamic Routing Algorithms, and Dual Financial Ledgers.",
        "Status": "PENDING_ASSIGNMENT",
        "Intern_Friendly_Level": "Intern - Level 1 (Beginner)",
        "Prerequisite_Concepts_To_Teach": "Enterprise presentation layout, 16:9 widescreen grids, font licensing, converting technical metrics (dead-km, dwell times, SLA %) into easily digestible business charts.",
        "Estimated_Hours": "18",
        "Acceptance_Criteria_DoD": "Slide deck template with reusable component library, editable charts, master slide masters, and exported PDF brochure.",
        "Related_Files_Codebase_Pointers": "apps/marketing/CAMPAIGNS_AND_COPY.md, docs/corporate-ets/00_MASTER_PLAN_CORPORATE_ETS.md"
    },
    {
        "Task_ID": "TSK-GDES-006",
        "Workstream": "Design System & Branding",
        "Subsystem": "Driver Fleet Onboarding",
        "Role": "Graphic Designer",
        "Task_Title": "Design Driver Training Guidebook & Mobile UI Cheat Sheets",
        "Detailed_Scope_and_Deliverables": "Design a 4-page visual field manual for commercial cab drivers: Step 1 Route Duty Acceptance, Step 2 Geofenced Pickup Arrival & 5-Min Timer, Step 3 Commuter OTP Verification & Anti-False Boarding, Step 4 Destination Drop-off & Female Sight-of-Entry Escort.",
        "Status": "PENDING_ASSIGNMENT",
        "Intern_Friendly_Level": "Intern - Level 1 (Beginner)",
        "Prerequisite_Concepts_To_Teach": "Visual instruction design for non-tech audiences, iconography for semi-literate usability, bilingual layout support (English + Hindi/Telugu).",
        "Estimated_Hours": "14",
        "Acceptance_Criteria_DoD": "Print-ready CMYK A4 PDF with 3mm bleed margins + mobile-optimized vertical scroll PDF for WhatsApp onboarding.",
        "Related_Files_Codebase_Pointers": "docs/corporate-ets/09_DRIVER_MOBILE_APP_SPECIFICATION.md, apps/marketing/CAMPAIGNS_AND_COPY.md"
    },

    # =========================================================================
    # 2. UI/UX DESIGNER WORKSTREAM (15 TASKS)
    # =========================================================================
    {
        "Task_ID": "TSK-UXD-001",
        "Workstream": "UI/UX Design",
        "Subsystem": "Corporate Client Portal",
        "Role": "UI/UX Designer",
        "Task_Title": "Figma User Flow & Wireframe: Bulk Employee Roster Upload & Conflict Resolution",
        "Detailed_Scope_and_Deliverables": "Design complete user journey for Corporate Admin uploading weekly Excel/CSV rosters (5,000+ employees). Wireframe: Drag-and-drop zone, column mapping modal, error preview table (unmapped addresses, invalid shifts, duplicate entries), and inline bulk correction interface.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Data density in enterprise web applications, bulk tabular error states, inline table editing interactions, Figma Auto-Layout v4.",
        "Estimated_Hours": "16",
        "Acceptance_Criteria_DoD": "Figma interactive prototype covering happy path, 3 error states (invalid shift format, unknown gate/pickup, geocoding failure), and final approval confirmation.",
        "Related_Files_Codebase_Pointers": "apps/corporate/src/app/rosters/page.tsx, docs/corporate-ets/02_ROSTER_INGESTION_AND_EXCEL_IMPORT_ENGINE.md"
    },
    {
        "Task_ID": "TSK-UXD-002",
        "Workstream": "UI/UX Design",
        "Subsystem": "Operations Portal",
        "Role": "UI/UX Designer",
        "Task_Title": "Design Command-Center Live Trip Monitoring & SOS Incident Triage Interface",
        "Detailed_Scope_and_Deliverables": "Design high-density split-screen Ops view: Left pane showing at-risk routes, telemetry loss queue (>180s stale), and active SOS alarms; Right pane showing interactive MapLibre map with vehicle corridor breadcrumbs, driver contact popup, and multi-level escalation controls.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Emergency UI/UX design, visual contrast ratios for dark mode operational rooms, cognitive load minimization under high-stress incident triage.",
        "Estimated_Hours": "18",
        "Acceptance_Criteria_DoD": "Figma layout adhering to 8px grid; includes P0/P1/P2 alarm notification banners, audio alert trigger indicators, and supervisor action modals.",
        "Related_Files_Codebase_Pointers": "apps/ops/src/app/safety/page.tsx, apps/ops/src/app/board/page.tsx, docs/corporate-ets/11_SAFETY_SOS_AND_COMMAND_CENTRE_OPERATIONS.md"
    },
    {
        "Task_ID": "TSK-UXD-003",
        "Workstream": "UI/UX Design",
        "Subsystem": "Driver Mobile Application",
        "Role": "UI/UX Designer",
        "Task_Title": "Design High-Contrast Day/Night In-Cab Navigation & Stop Execution Screens",
        "Detailed_Scope_and_Deliverables": "Design mobile screens for driver while operating a moving vehicle: High-contrast map display, giant touch targets (minimum 56px height), 5-minute dwell timer countdown ring, 4-digit OTP numeric keypad, and one-tap 'Confirm Safe Escort' button.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Automotive UI safety standards (glanceability, minimal taps, high contrast outdoors), thumb-zone ergonomics for single-hand mobile operations.",
        "Estimated_Hours": "16",
        "Acceptance_Criteria_DoD": "Day mode (pure white + deep slate) and Night mode (pure black #000000 + neon emerald/amber) Figma screens matching DRV-09/10 specs.",
        "Related_Files_Codebase_Pointers": "apps/mobile/lib/presentation/corporate_ets/corporate_active_route_screen.dart, docs/corporate-ets/09_DRIVER_MOBILE_APP_SPECIFICATION.md"
    },
    {
        "Task_ID": "TSK-UXD-004",
        "Workstream": "UI/UX Design",
        "Subsystem": "Employee Commuter App",
        "Role": "UI/UX Designer",
        "Task_Title": "Design Commuter Safety Hub, Dynamic Boarding Pass & Safe Reach Experience",
        "Detailed_Scope_and_Deliverables": "Design mobile flow for employee: Rotating QR code + 4-digit OTP boarding pass, live cab tracking card with driver vehicle details, one-tap 'Share Trip with Family' link, emergency SOS drawer with 5s cancel countdown, and post-drop 'Did You Reach Safely?' sheet.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "User emotional security in transport apps, micro-interactions for reassuring verification, WCAG 2.1 AA tap target and accessibility guidelines.",
        "Estimated_Hours": "16",
        "Acceptance_Criteria_DoD": "Figma screens for onboarding, weekly schedule, live trip card, boarding pass modal, and safe reach sheet with clear states.",
        "Related_Files_Codebase_Pointers": "apps/employee_app/lib/features/boarding/completion/safe_reach_confirmation_screen.dart, docs/corporate-ets/08_EMPLOYEE_MOBILE_APP_SPECIFICATION.md"
    },
    {
        "Task_ID": "TSK-UXD-005",
        "Workstream": "UI/UX Design",
        "Subsystem": "Corporate Billing & Ledger",
        "Role": "UI/UX Designer",
        "Task_Title": "Design Dual Financial Ledger & Disputed Trip Reconciliation UX",
        "Detailed_Scope_and_Deliverables": "Design corporate portal billing section: Monthly consolidated invoice overview, per-trip breakdown table with toll/night-surcharge itemization, dispute submission modal (flagging driver route deviation or false dwell time), and credit memo ledger.",
        "Status": "PENDING_ASSIGNMENT",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Enterprise accounting workflows, dispute audit trails, financial data pagination and column-sorting interactions.",
        "Estimated_Hours": "14",
        "Acceptance_Criteria_DoD": "Complete Figma prototype showing invoice PDF preview, dispute filing drawer, approved credit note state, and ledger export dialog.",
        "Related_Files_Codebase_Pointers": "apps/corporate/src/app/billing/page.tsx, docs/corporate-ets/13_DUAL_FINANCIAL_LEDGERS_BILLING_AND_PAYOUTS.md"
    },
    {
        "Task_ID": "TSK-UXD-006",
        "Workstream": "UI/UX Design",
        "Subsystem": "Design System Tokenization",
        "Role": "UI/UX Designer",
        "Task_Title": "Build Figma Master Component Library & Semantic Token Variables",
        "Detailed_Scope_and_Deliverables": "Create unified Figma design library utilizing Figma Variables: Color tokens (primary, surface, border, success, error, warning), Typography styles (Display, H1-H4, Body, Caption, Micro), Spacing scale (4, 8, 12, 16, 24, 32, 48px), and standard component set (Buttons, Badges, Inputs, Modals, Cards).",
        "Status": "PENDING_ASSIGNMENT",
        "Intern_Friendly_Level": "Intern - Level 1 (Beginner)",
        "Prerequisite_Concepts_To_Teach": "Figma Variables, Design Token taxonomy (Global -> Semantic -> Component-level), auto-layout component variants.",
        "Estimated_Hours": "20",
        "Acceptance_Criteria_DoD": "Master Figma component file published with 100% component variants mapped to CSS variables in apps/corporate/src/styles/globals.css.",
        "Related_Files_Codebase_Pointers": "docs/04_DESIGN_SYSTEM.md, apps/corporate/src/app/globals.css"
    },

    # =========================================================================
    # 3. UI/UX DEVELOPER WORKSTREAM (15 TASKS)
    # =========================================================================
    {
        "Task_ID": "TSK-UXDEV-001",
        "Workstream": "Frontend & UI Engineering",
        "Subsystem": "Design Tokens & Shared Styles",
        "Role": "UI/UX Developer",
        "Task_Title": "Implement Global CSS Variables & Tailwind Semantic Theme Sync",
        "Detailed_Scope_and_Deliverables": "Synchronize Tailwind configuration in apps/corporate, apps/ops, and apps/admin with the master design system tokens: Configure exact color hexes, typography scales (Inter + Outfit), border-radii, elevation shadows, and transition easings.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 1 (Beginner)",
        "Prerequisite_Concepts_To_Teach": "Tailwind CSS v3 theming, CSS custom properties (--var), modern color formats (HSL / hex), ensuring zero layout shift across responsive breakpoints.",
        "Estimated_Hours": "10",
        "Acceptance_Criteria_DoD": "Zero hardcoded hex values in component CSS; corporate and ops applications render unified visual style identical to docs/04_DESIGN_SYSTEM.md.",
        "Related_Files_Codebase_Pointers": "apps/corporate/tailwind.config.js, apps/corporate/src/app/globals.css, docs/04_DESIGN_SYSTEM.md"
    },
    {
        "Task_ID": "TSK-UXDEV-002",
        "Workstream": "Frontend & UI Engineering",
        "Subsystem": "Flutter Design System Components",
        "Role": "UI/UX Developer",
        "Task_Title": "Develop Reusable Mobile Widget Kit (Buttons, Badges, Cards, BottomSheets)",
        "Detailed_Scope_and_Deliverables": "Build modular, reusable Flutter widgets for both apps/mobile and apps/employee_app: AppPrimaryButton, AppSecondaryButton, AppBadge (neutral, success, warning, error, info variants), AppCard, and CorporateModalBottomSheet with smooth gesture dismiss.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Flutter StatelessWidget vs StatefulWidget, BuildContext theme inheritance, GestureDetector semantics, MediaQuery responsiveness.",
        "Estimated_Hours": "14",
        "Acceptance_Criteria_DoD": "All widgets support light and dark theme contexts, adhere to minimum 48x48 tap target sizes, and contain zero deprecated theme methods.",
        "Related_Files_Codebase_Pointers": "apps/mobile/lib/presentation/corporate_ets/widgets/, apps/employee_app/lib/widgets/employee_primary_button.dart"
    },
    {
        "Task_ID": "TSK-UXDEV-003",
        "Workstream": "Frontend & UI Engineering",
        "Subsystem": "Interactive Micro-Interactions",
        "Role": "UI/UX Developer",
        "Task_Title": "Implement 5-Minute Boarding Dwell Circular Countdown Timer in Flutter",
        "Detailed_Scope_and_Deliverables": "Create smooth 60fps circular progress countdown widget in Flutter for the driver app stop screen: Visual 300-second animated sweep, color transition from Emerald Green (>120s) to Amber Caution (60-120s) to Crimson Red (<60s), with haptic feedback on completion.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Flutter AnimationController, CustomPainter canvas drawing, TickerProviderStateMixin, HapticFeedback system triggers.",
        "Estimated_Hours": "12",
        "Acceptance_Criteria_DoD": "Timer calculates exact elapsed time against server actualArrivalTime; survives app backgrounding/resuming without drift.",
        "Related_Files_Codebase_Pointers": "apps/mobile/lib/presentation/corporate_ets/widgets/stop_boarding_panel.dart, apps/mobile/lib/presentation/corporate_ets/logic/corporate_timers.dart"
    },
    {
        "Task_ID": "TSK-UXDEV-004",
        "Workstream": "Frontend & UI Engineering",
        "Subsystem": "Web Component Library",
        "Role": "UI/UX Developer",
        "Task_Title": "Build Enterprise Data Table with Virtualized Scrolling & Column Filtering",
        "Detailed_Scope_and_Deliverables": "Implement high-performance reusable React table component for Next.js portals: Sticky headers, column sorting, search debounce filter, multi-row selection, CSV export trigger, and virtualized row rendering for 1,000+ roster rows.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "React Virtual (TanStack Table / react-window), DOM node recycling, useMemo/useCallback optimization for large array manipulations.",
        "Estimated_Hours": "16",
        "Acceptance_Criteria_DoD": "Smooth 60fps scrolling on tables with 2,000 rows; responsive horizontal overflow scroll with sticky left checkbox column.",
        "Related_Files_Codebase_Pointers": "apps/corporate/src/components/common/DataTable.tsx, apps/corporate/src/app/rosters/page.tsx"
    },
    {
        "Task_ID": "TSK-UXDEV-005",
        "Workstream": "Frontend & UI Engineering",
        "Subsystem": "Dynamic Animated Assets",
        "Role": "UI/UX Developer",
        "Task_Title": "Integrate Lottie Animations for SOS Dispatch, Success & Safe Arrival",
        "Detailed_Scope_and_Deliverables": "Incorporate optimized lightweight Lottie (JSON) animations for critical user feedback: Pulsing SOS Beacon (during active panic alert), Shield Checkmark (safe arrival confirmation), and Confetti Celebration (trip completed).",
        "Status": "PENDING_ASSIGNMENT",
        "Intern_Friendly_Level": "Intern - Level 1 (Beginner)",
        "Prerequisite_Concepts_To_Teach": "lottie_flutter and lottie-web integration, memory disposal on widget unmount, asset caching strategies.",
        "Estimated_Hours": "8",
        "Acceptance_Criteria_DoD": "Lottie animations stay under 60KB, render at 60fps without frame drops on low-end Android devices (Snapdragon 680 tier).",
        "Related_Files_Codebase_Pointers": "apps/employee_app/pubspec.yaml, apps/mobile/pubspec.yaml, apps/employee_app/lib/widgets/"
    },

    # =========================================================================
    # 4. FRONTEND DEVELOPER WORKSTREAM (20 TASKS)
    # =========================================================================
    {
        "Task_ID": "TSK-FED-001",
        "Workstream": "Web Frontend Development",
        "Subsystem": "Corporate Portal Authentication",
        "Role": "Frontend Developer",
        "Task_Title": "Implement SMS Phone OTP Login & Role Guarded Sessions in Next.js",
        "Detailed_Scope_and_Deliverables": "Build corporate portal auth screen: 10-digit Indian phone number input (+91), MSG91 OTP dispatch trigger with 60s resend timer, 6-digit numeric OTP input with auto-focus, JWT session persistence in httpOnly cookies, and RBAC redirect logic.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Next.js App Router (app/login/page.tsx), React Hook Form, cookie security, client vs server components, handling 401/403 API responses.",
        "Estimated_Hours": "14",
        "Acceptance_Criteria_DoD": "User can sign in via verified phone OTP; token automatically attached via Axios/fetch interceptor; unauthenticated requests bounce to /login.",
        "Related_Files_Codebase_Pointers": "apps/corporate/src/app/login/page.tsx, apps/corporate/src/lib/api/corporate.ts"
    },
    {
        "Task_ID": "TSK-FED-002",
        "Workstream": "Web Frontend Development",
        "Subsystem": "Corporate Portal Roster Management",
        "Role": "Frontend Developer",
        "Task_Title": "Build Excel/CSV Roster Upload, Progress Stepper & Inline Error Resolution UI",
        "Detailed_Scope_and_Deliverables": "Build 3-step Roster Upload wizard: Step 1 File upload with sheet preview, Step 2 Background validation progress bar (geocoding, shift matching), Step 3 Review table with badge filters ('Ready', 'Needs Review', 'Duplicate') and one-click 'Publish Roster' action.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Multipart/form-data upload, WebSocket / polling progress tracking, handling backend validation DTO schemas in TypeScript.",
        "Estimated_Hours": "18",
        "Acceptance_Criteria_DoD": "Seamless upload of sample 500-row XLSX file; invalid rows clearly highlighted with tooltip explanation; successfully dispatches to POST /corporate/rosters/bulk.",
        "Related_Files_Codebase_Pointers": "apps/corporate/src/app/rosters/page.tsx, apps/corporate/src/lib/api/corporate.ts"
    },
    {
        "Task_ID": "TSK-FED-003",
        "Workstream": "Web Frontend Development",
        "Subsystem": "Corporate Live Fleet Map",
        "Role": "Frontend Developer",
        "Task_Title": "Integrate MapLibre GL Interactive Real-time Cab Tracking Map",
        "Detailed_Scope_and_Deliverables": "Develop live operational map in Next.js: Display active corporate routes with colored polylines, real-time vehicle GPS markers with bearing rotation, hover cards showing driver name, passenger count, speed, and status badge ('LIVE', 'STALE', 'OFFLINE').",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 3 (Advanced/Pair with Architect)",
        "Prerequisite_Concepts_To_Teach": "MapLibre GL JS / Mapbox GL JS lifecycle, GeoJSON source updates without full map re-render, WebSocket message subscription for coordinate streams.",
        "Estimated_Hours": "22",
        "Acceptance_Criteria_DoD": "Smooth vehicle marker animation on new coordinates; clicking a cab focuses camera and displays stop sequence timeline.",
        "Related_Files_Codebase_Pointers": "apps/corporate/src/app/live/page.tsx, apps/corporate/src/lib/api/corporate.ts"
    },
    {
        "Task_ID": "TSK-FED-004",
        "Workstream": "Mobile Frontend Development",
        "Subsystem": "Driver App Route Execution",
        "Role": "Frontend Developer",
        "Task_Title": "Implement Driver Active Route Screen with Stop Actions & Dwell Timers",
        "Detailed_Scope_and_Deliverables": "Implement Flutter screen for active corporate duties: Current assigned stop card, 'Navigate' button launching Google Maps / Waze intent, 'Arrived' button triggering 150m geofence verification, StopBoardingPanel for OTP verification, and Passenger Drop confirmation.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Flutter state management, url_launcher for map navigation intents, handling asynchronous HTTP requests with AppToast notifications.",
        "Estimated_Hours": "20",
        "Acceptance_Criteria_DoD": "Complies with UI-05-01/02/04; stops update sequentially; route completion is locked until all pickups and drop-offs are verified.",
        "Related_Files_Codebase_Pointers": "apps/mobile/lib/presentation/corporate_ets/corporate_active_route_screen.dart, apps/mobile/lib/presentation/corporate_ets/data/corporate_ets_api.dart"
    },
    {
        "Task_ID": "TSK-FED-005",
        "Workstream": "Mobile Frontend Development",
        "Subsystem": "Employee App Commuter Experience",
        "Role": "Frontend Developer",
        "Task_Title": "Build Employee Live Trip Tracking, Rotating QR Code & Safe Reach Confirmation",
        "Detailed_Scope_and_Deliverables": "Build employee Flutter interface: Live map showing assigned cab approach, dynamic 30-second rotating QR token for boarding, 4-digit OTP display, real-time driver ETA, and automated modal sheet asking 'Did you reach safely?' with 'Yes I'm Safe' / 'I Need Help'.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "QR code generation with qr_flutter, periodic timer updates, integration with GoRouter, handling background push notifications via FCM.",
        "Estimated_Hours": "18",
        "Acceptance_Criteria_DoD": "Employee sees real-time cab movement; safe-reach acknowledgment dispatches immediately to backend and transitions to rating feedback.",
        "Related_Files_Codebase_Pointers": "apps/employee_app/lib/features/boarding/completion/safe_reach_confirmation_screen.dart, apps/employee_app/lib/routes/app_routes.dart"
    },
    {
        "Task_ID": "TSK-FED-006",
        "Workstream": "Web Frontend Development",
        "Subsystem": "Corporate Safety & SOS Dashboard",
        "Role": "Frontend Developer",
        "Task_Title": "Build Incident Management & Multi-Level Escalation Board in Corporate Portal",
        "Detailed_Scope_and_Deliverables": "Build safety incident management board: Filter incidents by severity (P0 Critical, P1 High, P2 Medium, P3 Low), view incident timeline, acknowledge alert, input resolution notes, and trigger emergency contacts or replacement cab dispatch.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Real-time UI state updates, alert sound playback via Web Audio API, form validation with Zod in React.",
        "Estimated_Hours": "16",
        "Acceptance_Criteria_DoD": "Unacknowledged P0 alarms display pulsing crimson banner with countdown SLA; resolution requires mandatory resolution note.",
        "Related_Files_Codebase_Pointers": "apps/corporate/src/app/safety/page.tsx, apps/corporate/src/lib/api/corporate.ts"
    },
    {
        "Task_ID": "TSK-FED-007",
        "Workstream": "Web Frontend Development",
        "Subsystem": "Corporate Billing & Rate Cards",
        "Role": "Frontend Developer",
        "Task_Title": "Build Rate Card Configurator & Invoice Reconciliation Views",
        "Detailed_Scope_and_Deliverables": "Build UI for viewing and managing corporate rate cards: Base fare, slab pricing per kilometer, toll inclusions, driver waiting fees, night shift surcharges, and monthly billing reconciliation statements.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Financial table presentation, currency formatting (INR ₹), CSV export functionality in React.",
        "Estimated_Hours": "14",
        "Acceptance_Criteria_DoD": "Displays rate cards with active validity dates; allows downloading detailed trip audit trail as Excel/CSV.",
        "Related_Files_Codebase_Pointers": "apps/corporate/src/app/billing/page.tsx, apps/corporate/src/lib/api/corporate.ts"
    },

    # =========================================================================
    # 5. BACKEND DEVELOPER WORKSTREAM (25 TASKS)
    # =========================================================================
    {
        "Task_ID": "TSK-BED-001",
        "Workstream": "Backend Core Engineering",
        "Subsystem": "Authentication & Session Security",
        "Role": "Backend Developer",
        "Task_Title": "Implement MSG91 Live SMS Phone OTP Authentication & Rate Limiting",
        "Detailed_Scope_and_Deliverables": "Build SMS OTP auth endpoint in NestJS: Verify 10-digit Indian mobile format (+91), integrate MSG91 SendOTP API with fallback provider, rate limit to maximum 3 OTP requests per 10 minutes per IP/phone in Redis, and issue signed JWT access/refresh tokens.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "NestJS Controllers & Services, Redis key expiry (SETEX), crypto-secure random number generation, JWT payload signing.",
        "Estimated_Hours": "14",
        "Acceptance_Criteria_DoD": "Live OTP successfully delivered via MSG91; rate limit lockout triggers 429 Too Many Requests; automated Jest tests pass.",
        "Related_Files_Codebase_Pointers": "apps/api/src/domains/identity/, scripts/send_live_otp.js, scripts/verify_live_otp.js"
    },
    {
        "Task_ID": "TSK-BED-002",
        "Workstream": "Backend Core Engineering",
        "Subsystem": "Roster Ingestion Engine",
        "Role": "Backend Developer",
        "Task_Title": "Build XLSX/CSV Multi-Sheet Roster Parser & Shift Demand Generator",
        "Detailed_Scope_and_Deliverables": "Implement robust Excel roster parser in NestJS: Handle multiple date sheets, sanitize employee phone/name/gate coordinates, validate against active employee directory, and generate normalized CorporateTransportRequest records with PENDING status.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Stream parsing of large Excel files with exceljs, Prisma createMany in batched chunks (500 rows), database transaction rollbacks.",
        "Estimated_Hours": "18",
        "Acceptance_Criteria_DoD": "Parses 5,000-row XLSX file in under 3.5 seconds; invalid rows returned with specific cell error coordinates without aborting valid rows.",
        "Related_Files_Codebase_Pointers": "apps/api/src/domains/corporate/rosters/corporate-roster.service.ts, apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts"
    },
    {
        "Task_ID": "TSK-BED-003",
        "Workstream": "Backend Core Engineering",
        "Subsystem": "Route Optimization Solver",
        "Role": "Backend Developer",
        "Task_Title": "Develop Heuristic Clustering, Corridor Routing & Vehicle Capacity Solver",
        "Detailed_Scope_and_Deliverables": "Build route planning engine: Cluster employee pickup requests by geographic proximity using Haversine distance, sort into optimized corridor order (LOGIN: furthest pickup first -> office drop; LOGOUT: office pickup -> nearest drop first), and enforce vehicle seat capacity (max 4, 6, 12).",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 3 (Advanced/Pair with Architect)",
        "Prerequisite_Concepts_To_Teach": "Traveling Salesperson Problem (TSP) heuristics, geographic corridor clustering, vehicle capacity routing constraints, benchmarking computation times.",
        "Estimated_Hours": "24",
        "Acceptance_Criteria_DoD": "Optimizes 100 employee requests into valid routes with zero unserved requests in under 5 seconds; adheres to maximum 90-minute commute time limit.",
        "Related_Files_Codebase_Pointers": "apps/api/src/domains/corporate/routing/corporate-routing.service.ts, docs/corporate-ets/03_ROUTE_OPTIMIZATION_AND_CAPACITY_SOLVER.md"
    },
    {
        "Task_ID": "TSK-BED-004",
        "Workstream": "Backend Core Engineering",
        "Subsystem": "Supply & Driver Eligibility",
        "Role": "Backend Developer",
        "Task_Title": "Implement Driver & Vehicle Verification, Fitness & Duty Hour Rule Engine",
        "Detailed_Scope_and_Deliverables": "Implement strict supply eligibility filter: Driver must be VERIFIED and not suspended; assigned vehicle must be VERIFIED with valid commercial permit and insuranceExpiry > route end; vehicle seats >= route capacity. Enforce maximum 12-hour duty limit per 24 hours.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Prisma relational filtering, SQL date comparisons in UTC, business rule validation guards.",
        "Estimated_Hours": "16",
        "Acceptance_Criteria_DoD": "Unverified drivers or expired insurance cabs are 100% rejected from duty allocation; comprehensive unit test matrix passes.",
        "Related_Files_Codebase_Pointers": "apps/api/src/domains/corporate/supply/driver-eligibility.service.ts, apps/api/test/corporate-safety.spec.ts"
    },
    {
        "Task_ID": "TSK-BED-005",
        "Workstream": "Backend Core Engineering",
        "Subsystem": "Autonomous Dispatch Engine",
        "Role": "Backend Developer",
        "Task_Title": "Build Autonomous Driver Offer FSM with 45s Redis TTL & Fallback Escalation",
        "Detailed_Scope_and_Deliverables": "Build dispatch pipeline: Rank eligible drivers by proximity and acceptance score, persist CorporateDriverOffer, store 45s countdown key in Redis, and emit real-time push. If rejected or expired, immediately cascade to next ranked driver. If unassigned at 30 mins before pickup, flag route atRisk.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 3 (Advanced/Pair with Architect)",
        "Prerequisite_Concepts_To_Teach": "Finite State Machines (FSM), Redis TTL keyspace notifications, concurrent accept race-condition locking with Redlock.",
        "Estimated_Hours": "20",
        "Acceptance_Criteria_DoD": "Multi-driver race condition test verifies only 1 driver can accept; expired offers transition to EXPIRED; unaccepted duties trigger atRisk ops event.",
        "Related_Files_Codebase_Pointers": "apps/api/src/domains/corporate/dispatch/corporate-dispatch.service.ts, docs/corporate-ets/04_AUTONOMOUS_DISPATCH_AND_H3_ROUTING_ENGINE.md"
    },
    {
        "Task_ID": "TSK-BED-006",
        "Workstream": "Backend Core Engineering",
        "Subsystem": "Trip Execution Lifecycle",
        "Role": "Backend Developer",
        "Task_Title": "Implement Immutable 5-Minute Dwell Timer & OTP Rate-Limited Verification",
        "Detailed_Scope_and_Deliverables": "Implement trip execution endpoints: POST arriveAtStop verifies <150m GPS geofence and starts 300-second immutable Redis timer; POST verifyOtp checks commuter 4-digit code with 5-attempt rate-limit lockout; POST markNoShow requires 300s timer expiration.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Haversine distance calculation, Redis counter increment with TTL, HTTP exception hierarchies in NestJS.",
        "Estimated_Hours": "16",
        "Acceptance_Criteria_DoD": "Arrival outside 150m throws 400 Bad Request; 6th invalid OTP attempt locks stop; no-show attempt before 300s throws 400 Bad Request.",
        "Related_Files_Codebase_Pointers": "apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts, apps/api/test/corporate-trip-execution.spec.ts"
    },
    {
        "Task_ID": "TSK-BED-007",
        "Workstream": "Backend Core Engineering",
        "Subsystem": "Safety & Incident Management",
        "Role": "Backend Developer",
        "Task_Title": "Build Telemetry Loss Sentinel (>180s) & 120s Unacknowledged SOS Escalation Loop",
        "Detailed_Scope_and_Deliverables": "Develop background safety daemon: Runs every 15 seconds with distributed lock, identifies routes in IN_TRANSIT with no GPS fix for >180s and creates P0_CRITICAL / P1_HIGH alerts, and auto-escalates unacknowledged SOS alerts to supervisor after 120 seconds.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "NestJS Schedulers (@Interval), distributed locking via Redis, logging standards, WebSocket push broadcast.",
        "Estimated_Hours": "16",
        "Acceptance_Criteria_DoD": "Automated scheduler tests confirm stale GPS triggers alert; unacknowledged SOS increments escalationLevel with audit trail.",
        "Related_Files_Codebase_Pointers": "apps/api/src/domains/corporate/safety/corporate-sos-escalation.scheduler.ts, apps/api/src/domains/corporate/safety/corporate-safety.service.ts"
    },
    {
        "Task_ID": "TSK-BED-008",
        "Workstream": "Backend Core Engineering",
        "Subsystem": "Safety Checkpoints & Escort Protocol",
        "Role": "Backend Developer",
        "Task_Title": "Implement Passenger Drop Geofence (<150m) & Night Female Safe-Drop Escort Engine",
        "Detailed_Scope_and_Deliverables": "Implement POST dropPassenger and confirmSafeDrop endpoints: Require driver GPS within 150m of authorized destination; detect night shift (20:00-06:00) or female commuter; activate 10-minute safe entry countdown in Redis; emit push notification to commuter app.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Postgres enum handling, Redis Set storage for active dropped stops, event-driven notification dispatch.",
        "Estimated_Hours": "16",
        "Acceptance_Criteria_DoD": "Driver drop sets actualDepartureTime in DB; commuter app receives safe-check prompt; unconfirmed safe-drops escalate after 10 minutes.",
        "Related_Files_Codebase_Pointers": "apps/api/src/domains/corporate/safety/corporate-safety.service.ts, apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts"
    },
    {
        "Task_ID": "TSK-BED-009",
        "Workstream": "Backend Core Engineering",
        "Subsystem": "Supervisor Emergency Overrides",
        "Role": "Backend Developer",
        "Task_Title": "Develop Audited Supervisor Boarding Override Fallback Endpoint",
        "Detailed_Scope_and_Deliverables": "Create emergency fallback endpoint POST emergency-boarding-override: Allows authorized corporate dispatcher to manually board a passenger when phone battery dies or cellular network fails, requiring mandatory reason, creating security ticket (SEC-*), and logging actor ID.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 1 (Beginner)",
        "Prerequisite_Concepts_To_Teach": "Security audit logging, RBAC permission decorator (@Roles), creating linked support ticket records in Prisma.",
        "Estimated_Hours": "10",
        "Acceptance_Criteria_DoD": "Driver alone cannot trigger override; only ADMIN/OPS role permitted; creates audit record and moves stop to BOARDED.",
        "Related_Files_Codebase_Pointers": "apps/api/src/domains/corporate/safety/corporate-safety.controller.ts, apps/api/test/corporate-safety.spec.ts"
    },
    {
        "Task_ID": "TSK-BED-010",
        "Workstream": "Backend Core Engineering",
        "Subsystem": "In-Transit Telemetry Sentinels",
        "Role": "Backend Developer",
        "Task_Title": "Develop Real-time Speeding (>80km/h) & Corridor Breach (>500m) Evaluators",
        "Detailed_Scope_and_Deliverables": "Build telemetry safety sentinel: On every telemetry fix, evaluate vehicle speed against 80 km/h ceiling and calculate perpendicular distance from planned route corridor polyline. Trigger OVERSPEEDING_ALERT and ROUTE_DEVIATION_ALERT if thresholds breached.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Polyline distance algorithms, non-blocking asynchronous execution, event-driven audit recording.",
        "Estimated_Hours": "14",
        "Acceptance_Criteria_DoD": "Vehicle exceeding 80 km/h generates warning event; deviation >500m flags route in command center; does not delay GPS ingestion latency.",
        "Related_Files_Codebase_Pointers": "apps/api/src/domains/corporate/safety/corporate-safety.service.ts, apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts"
    },
    {
        "Task_ID": "TSK-BED-011",
        "Workstream": "Backend Core Engineering",
        "Subsystem": "Dual Financial Ledgers & Billing",
        "Role": "Backend Developer",
        "Task_Title": "Implement Corporate Invoice Generation & Driver Payout Ledger Calculation",
        "Detailed_Scope_and_Deliverables": "Develop dual ledger billing engine: Calculate corporate billing line items (slab pricing, dead-km cap, toll fees, wait-time penalties) and calculate driver payout credits in BigInt paise. Generate monthly consolidated draft invoices with immutable hash.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 3 (Advanced/Pair with Architect)",
        "Prerequisite_Concepts_To_Teach": "Double-entry accounting principles, BigInt integer arithmetic for financial currencies (paise), PDF generation via Puppeteer/PDFKit.",
        "Estimated_Hours": "22",
        "Acceptance_Criteria_DoD": "Debit and credit entries balance perfectly to 0 paise; corporate invoice totals match individual route ledger entries; idempotent batch runs.",
        "Related_Files_Codebase_Pointers": "apps/api/src/domains/corporate/billing/corporate-billing.service.ts, docs/corporate-ets/13_DUAL_FINANCIAL_LEDGERS_BILLING_AND_PAYOUTS.md"
    },
    {
        "Task_ID": "TSK-BED-012",
        "Workstream": "Backend Core Engineering",
        "Subsystem": "Replanning & Modification Policy",
        "Role": "Backend Developer",
        "Task_Title": "Enforce 9-Hour Modification/Cancellation Cutoff Rule for Shift Bookings",
        "Detailed_Scope_and_Deliverables": "Implement strict shift modification cutoff engine: Commuters can modify or cancel scheduled rides up to exactly 9 hours before shift time. After cutoff, system rejects modifications unless overridden by authorized corporate manager with reason.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 1 (Beginner)",
        "Prerequisite_Concepts_To_Teach": "Timezone conversion (Asia/Kolkata vs UTC), date-fns arithmetic, exception handling in NestJS.",
        "Estimated_Hours": "12",
        "Acceptance_Criteria_DoD": "Modification attempt at 8 hours before shift throws 400 Cutoff Breached; manager override logs justification in audit log.",
        "Related_Files_Codebase_Pointers": "apps/api/src/domains/corporate/replanning/cutoff-policy.ts, apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts"
    },

    # =========================================================================
    # 6. FULL STACK DEVELOPER WORKSTREAM (20 TASKS)
    # =========================================================================
    {
        "Task_ID": "TSK-FSD-001",
        "Workstream": "Full Stack Feature Delivery",
        "Subsystem": "Live GPS Telemetry Ingestion Pipeline",
        "Role": "Full Stack Developer",
        "Task_Title": "Connect Driver Flutter Background GPS Stream to Redis Stream & Web Map",
        "Detailed_Scope_and_Deliverables": "Build end-to-end GPS telemetry pipeline: Configure Flutter background service in apps/mobile transmitting 15s fixes; ingest via POST /corporate/trips/routes/:id/telemetry into Redis Stream; broadcast via Socket.IO WebSocket; render real-time marker on MapLibre in apps/corporate.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 3 (Advanced/Pair with Architect)",
        "Prerequisite_Concepts_To_Teach": "Flutter background execution permissions, WebSocket gateway in NestJS (@WebSocketGateway), Redis Streams (XADD/XREAD), GeoJSON updates on web maps.",
        "Estimated_Hours": "24",
        "Acceptance_Criteria_DoD": "Driving vehicle updates location smoothly on web dashboard within 1.5s latency; handles device offline/reconnect cleanly.",
        "Related_Files_Codebase_Pointers": "apps/mobile/lib/presentation/corporate_ets/logic/corporate_telemetry_scheduler.dart, apps/api/src/domains/corporate/tracking/corporate-gps-ingest.service.ts, apps/corporate/src/app/live/page.tsx"
    },
    {
        "Task_ID": "TSK-FSD-002",
        "Workstream": "Full Stack Feature Delivery",
        "Subsystem": "Ad-hoc Booking & Request Workflow",
        "Role": "Full Stack Developer",
        "Task_Title": "End-to-End Ad-hoc Shift Ride Request & Manager Approval Flow",
        "Detailed_Scope_and_Deliverables": "Build complete ad-hoc booking feature: Employee requests unscheduled cab in apps/employee_app; backend validates tenant ad-hoc policy and sends notification to corporate manager; manager approves in apps/corporate; backend dispatches route and updates employee calendar.",
        "Status": "PENDING_ASSIGNMENT",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Full stack request-response flow, database relation modeling in Prisma, Flutter API integration, Next.js action hooks.",
        "Estimated_Hours": "20",
        "Acceptance_Criteria_DoD": "Complete flow from employee app request -> manager approval notification -> routing insertion -> confirmed trip card in employee app.",
        "Related_Files_Codebase_Pointers": "apps/employee_app/lib/features/schedule/, apps/api/src/domains/corporate/scheduling/, apps/corporate/src/app/bookings/"
    },
    {
        "Task_ID": "TSK-FSD-003",
        "Workstream": "Full Stack Feature Delivery",
        "Subsystem": "Post-Trip Ratings & Dispute Ticket Flow",
        "Role": "Full Stack Developer",
        "Task_Title": "End-to-End Commuter Feedback Submission & Corporate Support Ticket Sync",
        "Detailed_Scope_and_Deliverables": "Implement ride feedback workflow: Employee submits 1-5 star rating with tags in apps/employee_app; if rating <= 2 stars, backend automatically generates support ticket in CorporateSupportTicket table; ticket appears instantly in apps/corporate/support with audio alert.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Relational data persistence, REST API contract integration in Dart, real-time dashboard notification trigger.",
        "Estimated_Hours": "16",
        "Acceptance_Criteria_DoD": "Low ratings immediately create support ticket with employee details, driver ID, and route link; corporate admin can view and resolve ticket.",
        "Related_Files_Codebase_Pointers": "apps/employee_app/lib/repositories/http_employee_rider_repository.dart, apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts, apps/corporate/src/app/support/page.tsx"
    },
    {
        "Task_ID": "TSK-FSD-004",
        "Workstream": "Full Stack Feature Delivery",
        "Subsystem": "Driver Duty Earnings & Payout Summary",
        "Role": "Full Stack Developer",
        "Task_Title": "End-to-End Driver Route Duty Earnings View & Bank Withdrawal Request",
        "Detailed_Scope_and_Deliverables": "Build driver earnings pipeline: Backend calculates per-route compensation upon route completion; Flutter Driver App displays daily/weekly earnings card with route breakdown; driver can tap 'Request Payout' to trigger payout batch entry.",
        "Status": "PENDING_ASSIGNMENT",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Financial ledger read queries, building earnings list widgets in Flutter, idempotency keys for withdrawal requests.",
        "Estimated_Hours": "18",
        "Acceptance_Criteria_DoD": "Driver sees exact earnings matching backend ledger; withdrawal request verifies minimum balance threshold and creates payout record.",
        "Related_Files_Codebase_Pointers": "apps/mobile/lib/services/driver_service.dart, apps/api/src/domains/corporate/billing/corporate-billing.service.ts"
    },
    {
        "Task_ID": "TSK-FSD-005",
        "Workstream": "Full Stack Feature Delivery",
        "Subsystem": "Driver & Vehicle Onboarding KYC",
        "Role": "Full Stack Developer",
        "Task_Title": "Build Driver KYC Document Upload & Admin Approval Flow",
        "Detailed_Scope_and_Deliverables": "Build KYC flow: Driver captures photo of Driving License, Vehicle RC, and Police Verification in apps/mobile; uploads to S3/local storage; Admin reviews in apps/admin/verifications with zoom viewer and clicks 'Approve' or 'Reject' with reason; updates driver verification status.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "File uploads in Flutter (image_picker + dio/http), secure S3 pre-signed URLs or NestJS Multer storage, building document approval tables in React.",
        "Estimated_Hours": "20",
        "Acceptance_Criteria_DoD": "Driver cannot receive route offers until Admin approves all 3 KYC documents; status transitions from SUBMITTED to VERIFIED.",
        "Related_Files_Codebase_Pointers": "apps/mobile/lib/presentation/kyc/, apps/api/src/domains/fleet/, apps/admin/src/app/verifications/"
    },

    # =========================================================================
    # 7. SOFTWARE ARCHITECT / LEAD DEVELOPER WORKSTREAM (15 TASKS)
    # =========================================================================
    {
        "Task_ID": "TSK-ARCH-001",
        "Workstream": "Platform Architecture & DevOps",
        "Subsystem": "Database Architecture & Partitioning",
        "Role": "Software Architect",
        "Task_Title": "Design & Implement TimescaleDB/PostgreSQL Daily Partitioning for GPS Telemetry",
        "Detailed_Scope_and_Deliverables": "Architect high-throughput table corporate_vehicle_positions: Implement SQL daily partitioning by recorded_at, composite indexes on (route_id, recorded_at DESC), automated retention job dropping partitions older than 90 days, and batch createMany writer.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 3 (Advanced/Pair with Architect)",
        "Prerequisite_Concepts_To_Teach": "PostgreSQL declarative table partitioning, BRIN indexes for time-series data, high-concurrency database connection pooling with PgBouncer.",
        "Estimated_Hours": "20",
        "Acceptance_Criteria_DoD": "Table handles 1,000 writes/sec without lock contention; partition pruning verified via EXPLAIN ANALYZE on date-range queries.",
        "Related_Files_Codebase_Pointers": "apps/api/prisma/schema.prisma, docs/corporate-ets/14_DATABASE_SCHEMA_POSTGIS_AND_DATA_CONTRACTS.md"
    },
    {
        "Task_ID": "TSK-ARCH-002",
        "Workstream": "Platform Architecture & DevOps",
        "Subsystem": "CI/CD & Monorepo Tooling",
        "Role": "Software Architect",
        "Task_Title": "Setup GitHub Actions Continuous Integration (CI) Pipeline with Turborepo",
        "Detailed_Scope_and_Deliverables": "Build GitHub Actions workflow: Trigger on pull requests to staging and main; run turbo run lint, turbo run typecheck, and npx jest in parallel across apps/api, apps/corporate, apps/ops, and packages/contracts; cache node_modules.",
        "Status": "PENDING_ASSIGNMENT",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "GitHub Actions YAML syntax, Turborepo remote caching, matrix builds, protecting branches with required status checks.",
        "Estimated_Hours": "16",
        "Acceptance_Criteria_DoD": "PRs automatically blocked if any TypeScript type error or unit test fails; total pipeline execution completes in under 6 minutes.",
        "Related_Files_Codebase_Pointers": ".github/workflows/, turbo.json, package.json"
    },
    {
        "Task_ID": "TSK-ARCH-003",
        "Workstream": "Platform Architecture & DevOps",
        "Subsystem": "Redis High Availability & Locking",
        "Role": "Software Architect",
        "Task_Title": "Implement Redlock Distributed Concurrency Locking for Dispatch & Boarding",
        "Detailed_Scope_and_Deliverables": "Implement enterprise Redlock pattern: Prevent double-assignment when two drivers tap 'Accept Offer' within milliseconds; prevent concurrent boarding verification race conditions on same stop; graceful Redis disconnection fallbacks.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 3 (Advanced/Pair with Architect)",
        "Prerequisite_Concepts_To_Teach": "Distributed system consensus, Redis Redlock algorithm, TTL auto-release to prevent deadlocks, mutex synchronization.",
        "Estimated_Hours": "16",
        "Acceptance_Criteria_DoD": "Concurrent simulation with 50 simultaneous driver accepts proves exactly 1 winner with 0 race condition anomalies.",
        "Related_Files_Codebase_Pointers": "apps/api/src/redis/redis.service.ts, apps/api/src/domains/corporate/dispatch/corporate-dispatch.service.ts"
    },
    {
        "Task_ID": "TSK-ARCH-004",
        "Workstream": "Platform Architecture & DevOps",
        "Subsystem": "API Gateway & Security Hardening",
        "Role": "Software Architect",
        "Task_Title": "Configure Helmet, CORS, Global Rate Limiting & Pre-Audit Security Signoff",
        "Detailed_Scope_and_Deliverables": "Harden API gateway: Configure Helmet security headers, strict CORS whitelist for corporate/ops/admin domains, NestJS ThrottlerGuard rate limiting (100 req/min per IP), input sanitization against SQL injection/XSS, and pre-audit signoff review.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "OWASP Top 10 vulnerabilities, HTTP security headers (CSP, HSTS, X-Frame-Options), API rate-limiting strategies.",
        "Estimated_Hours": "14",
        "Acceptance_Criteria_DoD": "Passes OWASP ZAP security scan with zero high or critical vulnerabilities; pre-audit checklist signed off in docs.",
        "Related_Files_Codebase_Pointers": "apps/api/src/main.ts, docs/21_DEVELOPER_PRE_AUDIT_SIGNOFF.md"
    },
    {
        "Task_ID": "TSK-ARCH-005",
        "Workstream": "Platform Architecture & DevOps",
        "Subsystem": "Observability & Sentry Error Tracking",
        "Role": "Software Architect",
        "Task_Title": "Integrate Sentry Error Reporting & OpenTelemetry Distributed Tracing",
        "Detailed_Scope_and_Deliverables": "Integrate Sentry SDK across NestJS API, Next.js web portals, and Flutter mobile apps: Capture uncaught exceptions with breadcrumbs (API endpoint, user ID, tenant ID); set up Slack alert integration for P0 uncaught backend 500 errors.",
        "Status": "PENDING_ASSIGNMENT",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Error tracking telemetry, sourcemap uploads in CI/CD, contextual metadata injection, alerting thresholds.",
        "Estimated_Hours": "16",
        "Acceptance_Criteria_DoD": "Errors in staging automatically report to Sentry with complete stack trace, user role, and session context; zero performance overhead.",
        "Related_Files_Codebase_Pointers": "apps/api/src/main.ts, apps/corporate/next.config.js, apps/mobile/lib/main.dart"
    },

    # =========================================================================
    # 8. DATA ANALYST / BI ENGINEER WORKSTREAM (15 TASKS)
    # =========================================================================
    {
        "Task_ID": "TSK-DA-001",
        "Workstream": "Data Analytics & BI",
        "Subsystem": "Punctuality & SLA Metrics",
        "Role": "Data Analyst",
        "Task_Title": "Build Roster Punctuality, Pickup Delay & Dwell Time Analysis Views",
        "Detailed_Scope_and_Deliverables": "Author high-efficiency PostgreSQL analytical queries & views: Calculate On-Time Arrival % (planned_eta vs actual_arrival_time), average dwell buffer utilization at pickup gates, and driver delay frequency segmented by shift and corporate tenant.",
        "Status": "COMPLETED",
        "Intern_Friendly_Level": "Intern - Level 1 (Beginner)",
        "Prerequisite_Concepts_To_Teach": "SQL Window Functions (ROW_NUMBER, LAG, LEAD), DATE_PART, statistical aggregation (median, 95th percentile dwell), creating database views.",
        "Estimated_Hours": "14",
        "Acceptance_Criteria_DoD": "SQL query runs in under 450ms across 250,000 trip stops; accurately computes punctuality percentage matching corporate dashboard SLA.",
        "Related_Files_Codebase_Pointers": "apps/api/src/domains/corporate/analytics/corporate-analytics.service.ts, docs/corporate-ets/07_CORPORATE_CLIENT_PORTAL_SPECIFICATION.md"
    },
    {
        "Task_ID": "TSK-DA-002",
        "Workstream": "Data Analytics & BI",
        "Subsystem": "Fleet Efficiency & Dead Mileage",
        "Role": "Data Analyst",
        "Task_Title": "Analyze Dead Mileage (Dry Run) & Seat Occupancy Utilization",
        "Detailed_Scope_and_Deliverables": "Develop analytics pipeline calculating fleet efficiency: Compare total vehicle GPS distance traversed vs revenue passenger trip distance to determine 'Dead-KM' percentage. Calculate vehicle seat occupancy rates across 4, 6, and 12-seater categories.",
        "Status": "PENDING_ASSIGNMENT",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "PostGIS ST_Length spatial queries, dead-heading logistics definitions, calculating fleet capacity utilization indices.",
        "Estimated_Hours": "16",
        "Acceptance_Criteria_DoD": "Delivers SQL view and automated CSV report calculating dead-km ratio per route and identifying routes with <50% seat occupancy.",
        "Related_Files_Codebase_Pointers": "docs/corporate-ets/03_ROUTE_OPTIMIZATION_AND_CAPACITY_SOLVER.md, apps/api/src/domains/corporate/analytics/"
    },
    {
        "Task_ID": "TSK-DA-003",
        "Workstream": "Data Analytics & BI",
        "Subsystem": "Safety Audit & Violation Reports",
        "Role": "Data Analyst",
        "Task_Title": "Create Driver Safety Scorecard & Speeding/Deviation Violation Aggregation",
        "Detailed_Scope_and_Deliverables": "Build automated driver safety scoring model: Aggregate overspeeding alerts (>80 km/h), route deviations (>500m), female safe-drop compliance rate (%), and commuter rating scores into a 1-100 Driver Trust & Safety Index.",
        "Status": "PENDING_ASSIGNMENT",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Weighted scoring algorithms, normalizing disparate metrics, identifying statistical outliers in driver behavior.",
        "Estimated_Hours": "16",
        "Acceptance_Criteria_DoD": "Produces weekly driver safety ranking; drivers scoring <75 automatically flagged for ops counseling or suspension review.",
        "Related_Files_Codebase_Pointers": "apps/api/src/domains/corporate/safety/corporate-safety.service.ts, apps/admin/src/app/reports/page.tsx"
    },
    {
        "Task_ID": "TSK-DA-004",
        "Workstream": "Data Analytics & BI",
        "Subsystem": "Financial Margin Analysis",
        "Role": "Data Analyst",
        "Task_Title": "Build Route Profitability & Gross Margin Reconciliation Model",
        "Detailed_Scope_and_Deliverables": "Develop financial model comparing Corporate Billed Revenue vs Driver Payout Cost per route: Calculate Gross Contribution Margin (%), identify negative margin routes caused by traffic delays/toll overflows, and suggest pricing slab adjustments.",
        "Status": "PENDING_ASSIGNMENT",
        "Intern_Friendly_Level": "Intern - Level 2 (Intermediate)",
        "Prerequisite_Concepts_To_Teach": "Logistics unit economics, contribution margin calculation, financial variance analysis between estimated vs actual trip costs.",
        "Estimated_Hours": "18",
        "Acceptance_Criteria_DoD": "Automated report highlighting routes with <15% gross margin; generates actionable recommendations for corporate client rate renewals.",
        "Related_Files_Codebase_Pointers": "apps/api/src/domains/corporate/billing/corporate-billing.service.ts, docs/corporate-ets/13_DUAL_FINANCIAL_LEDGERS_BILLING_AND_PAYOUTS.md"
    },
    {
        "Task_ID": "TSK-DA-005",
        "Workstream": "Data Analytics & BI",
        "Subsystem": "Executive Metabase / Superset Dashboard",
        "Role": "Data Analyst",
        "Task_Title": "Design & Configure Business Intelligence KPI Dashboards for Executive Leadership",
        "Detailed_Scope_and_Deliverables": "Build executive BI dashboard in Metabase/Apache Superset: Daily Active Corporate Riders, Total Trips Executed, SLA Punctuality Rate, Safe-Drop Escort Compliance %, Average Cost per Commuter-KM, and Monthly B2B Recurring Revenue.",
        "Status": "PENDING_ASSIGNMENT",
        "Intern_Friendly_Level": "Intern - Level 1 (Beginner)",
        "Prerequisite_Concepts_To_Teach": "BI dashboard design, metric card layouts, choosing appropriate chart types (time-series, donut, bar chart), establishing read-only replica database connections.",
        "Estimated_Hours": "14",
        "Acceptance_Criteria_DoD": "Interactive dashboard with date-range picker, tenant filter dropdown, and automated daily email digest to executive stakeholders.",
        "Related_Files_Codebase_Pointers": "apps/admin/src/app/dashboard/page.tsx, docs/01_PRD.md"
    }
]

# We will expand this dynamically to ensure comprehensive coverage across all 8 roles and subsystems
# Generate additional granular tasks to fulfill user's explicit request for a massive, exhaustive task catalog
subsystems_extended = [
    # Corporate Portal
    ("Corporate Portal", "Department Management", "Frontend Developer", "Build Department CRUD & Shift Policy Association UI in Corporate Portal", "COMPLETED", "Intern - Level 1 (Beginner)", "Next.js forms, modal state, Axios API calls", "8", "CRUD operations work; input validation prevents empty names", "apps/corporate/src/app/employees/"),
    ("Corporate Portal", "Office Gate Setup", "Frontend Developer", "Build Multi-Office Location & Geofenced Pickup Gate Management UI", "COMPLETED", "Intern - Level 1 (Beginner)", "Leaflet / Google Maps pin selection, latitude/longitude input validation", "10", "Allows creating office landmarks with custom gate radii", "apps/corporate/src/app/offices/"),
    ("Corporate Portal", "Ad-hoc Booking Approval", "Frontend Developer", "Build Manager Ad-hoc Booking Approval Drawer with Cost Center Impact", "PENDING_ASSIGNMENT", "Intern - Level 2 (Intermediate)", "Next.js modal drawers, optimistic UI updates", "12", "Manager can approve/reject request with instant visual feedback", "apps/corporate/src/app/bookings/"),
    ("Corporate Portal", "Employee CSV Export", "Frontend Developer", "Implement Employee Transport Roster Export to Excel with Filters", "PENDING_ASSIGNMENT", "Intern - Level 1 (Beginner)", "sheetjs / xlsx export in browser, blob download", "8", "Exports clean formatted Excel with current table filters applied", "apps/corporate/src/app/employees/"),
    ("Corporate Portal", "Dark Mode Refinement", "UI/UX Developer", "Refine Dark Mode Theme Styling Across Corporate Portal Tables & Headers", "PENDING_ASSIGNMENT", "Intern - Level 1 (Beginner)", "Tailwind dark: classes, checking contrast ratio WCAG 4.5:1", "10", "Zero white flashes on reload; seamless theme transition", "apps/corporate/src/app/"),

    # Ops Portal
    ("Operations Portal", "Manual Reassignment", "Frontend Developer", "Build Emergency Cab Reassignment Modal for Broken Down Vehicles", "COMPLETED", "Intern - Level 2 (Intermediate)", "React modal forms, driver search dropdown, replacement event dispatch", "14", "Reassigns entire route to standby driver with passenger notification", "apps/ops/src/app/planner/"),
    ("Operations Portal", "Route Corridor Deviation", "Frontend Developer", "Build Live Corridor Deviation Alarm Feed with Audio Chime", "COMPLETED", "Intern - Level 2 (Intermediate)", "Web Audio API, real-time list animations", "12", "Deviation >500m pops to top of feed with audible alert", "apps/ops/src/app/deviations/"),
    ("Operations Portal", "Driver Suspension Action", "Frontend Developer", "Build Immediate Driver Suspension Action with Reason Modal", "COMPLETED", "Intern - Level 1 (Beginner)", "Form validation, API error handling", "8", "Suspended driver instantly blocked from active route duty", "apps/ops/src/app/board/"),
    ("Operations Portal", "Map Clustering", "UI/UX Developer", "Optimize MapLibre High-Density Cab Marker Clustering for 500+ Vehicles", "PENDING_ASSIGNMENT", "Intern - Level 3 (Advanced/Pair with Architect)", "MapLibre cluster configuration, supercluster library", "16", "Map smoothly zooms and unclusters at zoom level 14 without frame drops", "apps/ops/src/app/map/"),

    # Mobile Driver App
    ("Driver Mobile App", "No-Show Execution", "Frontend Developer", "Implement 5-Minute No-Show Photo Capture & Fee Assertion", "COMPLETED", "Intern - Level 2 (Intermediate)", "Flutter camera plugin, image compression, API multipart post", "14", "No-show locked until 300s timer expires; uploads photo evidence", "apps/mobile/lib/presentation/corporate_ets/widgets/stop_boarding_panel.dart"),
    ("Driver Mobile App", "Turn-by-Turn Intent", "Frontend Developer", "Build Multi-Stop Google Maps & Waze Deep Linking Intent Launcher", "COMPLETED", "Intern - Level 1 (Beginner)", "Android Intents / iOS URL schemes, url_launcher package", "8", "Launches Google Maps with waypoints pre-loaded", "apps/mobile/lib/presentation/corporate_ets/corporate_navigation.dart"),
    ("Driver Mobile App", "Dynamic QR Scanner", "Frontend Developer", "Build Mobile QR Code Camera Scanner for Commuter Boarding", "COMPLETED", "Intern - Level 2 (Intermediate)", "mobile_scanner package, camera permissions, token verification", "12", "Scans rotating QR token and verifies boarding in <500ms", "apps/mobile/lib/presentation/corporate_ets/widgets/stop_boarding_panel.dart"),
    ("Driver Mobile App", "Offline SQLite Queue", "Full Stack Developer", "Implement Local SQLite Storage for Telemetry Fixes During Network Loss", "PENDING_ASSIGNMENT", "Intern - Level 3 (Advanced/Pair with Architect)", "sqflite package, connectivity_plus, FIFO queue drain", "18", "GPS fixes stored locally when offline and synced upon reconnection", "apps/mobile/lib/presentation/corporate_ets/logic/corporate_telemetry_scheduler.dart"),
    ("Driver Mobile App", "Night Mode Layout", "UI/UX Developer", "Build OLED Pure Black High-Contrast Night Theme for Driver App", "PENDING_ASSIGNMENT", "Intern - Level 1 (Beginner)", "Flutter ThemeData, high contrast colors for night driving", "10", "Reduces driver eye strain; tested in low-light environments", "apps/mobile/lib/theme/app_theme.dart"),

    # Mobile Employee App
    ("Employee Mobile App", "Shift Booking Requests", "Frontend Developer", "Build Weekly Shift Calendar Selection & Roster Opt-In Screen", "COMPLETED", "Intern - Level 1 (Beginner)", "table_calendar Flutter package, state toggle, REST API post", "12", "Commuter can toggle Login/Logout requirements for upcoming week", "apps/employee_app/lib/features/schedule/"),
    ("Employee Mobile App", "Driver Profile Card", "Frontend Developer", "Build Driver Information Card with Contact Masking & Vehicle Badge", "COMPLETED", "Intern - Level 1 (Beginner)", "Flutter Container styling, virtual phone dialer intent", "8", "Displays driver name, rating, vehicle plate, and masked call button", "apps/employee_app/lib/features/tracking/"),
    ("Employee Mobile App", "Emergency SOS Button", "Frontend Developer", "Build 5-Second Cancel Countdown SOS Panic Button with Haptic Pulse", "COMPLETED", "Intern - Level 2 (Intermediate)", "AnimatedBuilder, Timer.periodic, vibration package", "12", "Prevents accidental trigger; sends coordinates upon countdown finish", "apps/employee_app/lib/features/safety/emergency/emergency_sos_screen.dart"),
    ("Employee Mobile App", "Share Ride Tracking", "Frontend Developer", "Build WhatsApp Live Trip Tracking Web Link Share Feature", "PENDING_ASSIGNMENT", "Intern - Level 1 (Beginner)", "share_plus package, deep-linking URL generation", "8", "Generates public web tracking link with 2-hour expiration token", "apps/employee_app/lib/features/tracking/"),
    ("Employee Mobile App", "Push Notifications", "Frontend Developer", "Implement Firebase Cloud Messaging (FCM) Foreground & Background Alerts", "PENDING_ASSIGNMENT", "Intern - Level 2 (Intermediate)", "firebase_messaging, flutter_local_notifications, payload routing", "14", "Tapping notification navigates directly to live tracking or safe reach", "apps/employee_app/lib/services/"),

    # Backend Core API
    ("Backend Core", "Roster CSV Validation", "Backend Developer", "Implement Strict CSV Column Header & Date Format Sanitizer", "COMPLETED", "Intern - Level 1 (Beginner)", "String regex matching, date-fns parsing, error collecting", "10", "Identifies invalid dates or missing employee IDs with exact line number", "apps/api/src/domains/corporate/rosters/"),
    ("Backend Core", "H3 Hex Indexing", "Backend Developer", "Implement Uber H3 Spatial Indexing for Driver Proximity Dispatch", "COMPLETED", "Intern - Level 3 (Advanced/Pair with Architect)", "h3-js / h3-node library, spatial indexing resolution 7/8", "18", "Finds nearby available drivers in sub-millisecond lookup times", "apps/api/src/domains/corporate/dispatch/"),
    ("Backend Core", "Driver Auto-Rejection", "Backend Developer", "Implement 45-Second Dispatch Timeout Cascade to Standby Supply", "COMPLETED", "Intern - Level 2 (Intermediate)", "Redis keyspace notifications / setTimeout event loop", "14", "Automatically marks offer EXPIRED and notifies next ranked driver", "apps/api/src/domains/corporate/dispatch/"),
    ("Backend Core", "Toll Calculation Service", "Backend Developer", "Integrate Toll Fare Calculation Based on Highway Corridor Waypoints", "PENDING_ASSIGNMENT", "Intern - Level 2 (Intermediate)", "Toll API integration or static toll plaza geofence lookup", "14", "Calculates toll plaza fees and appends to route invoice ledger", "apps/api/src/domains/corporate/billing/"),
    ("Backend Core", "Audit Trail Interceptor", "Software Architect", "Implement NestJS Global Audit Log Interceptor for All Corporate Mutations", "COMPLETED", "Intern - Level 2 (Intermediate)", "NestJS Interceptors, execution context, extracting actor IP/userId", "12", "Automatically records every state change in CorporateAuditLog table", "apps/api/src/modules/audit/"),

    # Data Analytics
    ("Data Analytics & BI", "Driver Payout Audit", "Data Analyst", "Develop Daily Automated Payout Reconciliation Query & Slack Summary", "PENDING_ASSIGNMENT", "Intern - Level 1 (Beginner)", "PostgreSQL CTEs, Slack Webhook API via Python/Bash", "10", "Posts daily summary of total route payouts, toll totals, and pending balances", "scripts/"),
    ("Data Analytics & BI", "Roster Forecasting", "Data Analyst", "Analyze 30-Day Historical Roster Demand Patterns to Predict Fleet Needs", "PENDING_ASSIGNMENT", "Intern - Level 2 (Intermediate)", "Pandas / SQL time-series moving averages, demand forecasting", "16", "Predicts required cabs for Monday morning logins vs Friday evening logouts", "scripts/"),
    ("Data Analytics & BI", "Carbon Emission Savings", "Data Analyst", "Calculate Enterprise ESG Carbon Offset Metrics for Shared Commute", "PENDING_ASSIGNMENT", "Intern - Level 1 (Beginner)", "Calculating CO2 grams per km saved by carpooling vs solo transit", "10", "Generates monthly corporate ESG certificate data with CO2 offset kg", "apps/api/src/domains/corporate/analytics/"),

    # Design & Assets
    ("Design System & Branding", "Social Media Templates", "Graphic Designer", "Design LinkedIn & Twitter Enterprise B2B Launch Graphic Templates", "PENDING_ASSIGNMENT", "Intern - Level 1 (Beginner)", "Figma social post presets (1200x628, 1080x1080), brand typography", "10", "Pack of 8 editable announcement templates for client acquisition", "apps/marketing/"),
    ("Design System & Branding", "Driver Onboarding Video", "Graphic Designer", "Create 60-Second Animated 2D Explainer Video for Driver Mobile App", "PENDING_ASSIGNMENT", "Intern - Level 2 (Intermediate)", "Adobe After Effects / Premiere Pro / Figma Animate", "24", "Visual guide on accepting duties, OTP entry, and female escort safety", "apps/marketing/"),
    ("UI/UX Design", "Driver Payout Details", "UI/UX Designer", "Design Mobile Driver Payout Ledger & Daily Incentive Breakdown Screens", "PENDING_ASSIGNMENT", "Intern - Level 2 (Intermediate)", "Mobile financial layout, earnings cards, date filter chips", "12", "Clear itemized view of completed trips, tolls, and net payout", "apps/mobile/lib/presentation/"),
    ("UI/UX Design", "Employee Profile & Preferences", "UI/UX Designer", "Design Employee Shift Preferences, Emergency Contacts & Home Gate UX", "PENDING_ASSIGNMENT", "Intern - Level 1 (Beginner)", "Mobile form layout, location pin picker interaction", "10", "Intuitive profile editing flow with location confirmation", "apps/employee_app/lib/features/profile/"),

    # Platform & DevOps
    ("Platform Architecture & DevOps", "Docker Production Build", "Software Architect", "Optimize Multi-Stage Dockerfiles for API & Web Apps with Lean Alpine Images", "COMPLETED", "Intern - Level 2 (Intermediate)", "Docker multi-stage builds, Alpine node images, reducing image sizes", "14", "Docker images reduced from 1.2GB to under 180MB for fast deployment", "infrastructure/docker/"),
    ("Platform Architecture & DevOps", "PostgreSQL Backup Script", "Software Architect", "Configure Automated Daily S3 PostgreSQL Dump & Disaster Recovery Script", "PENDING_ASSIGNMENT", "Intern - Level 2 (Intermediate)", "pg_dump, AWS CLI / MinIO upload, cron scheduling, encryption", "12", "Automated midnight database backup with 30-day retention policy", "infrastructure/"),
    ("Platform Architecture & DevOps", "Load Testing Simulation", "Software Architect", "Execute 1,000 Concurrent Driver Dispatch & Telemetry Load Test Script", "COMPLETED", "Intern - Level 3 (Advanced/Pair with Architect)", "k6 / autocannon / custom node stress script, measuring p95/p99 latency", "18", "Proves system maintains <250ms API response time under 1,000 concurrent cabs", "scripts/stress_test_1000_concurrent_dispatch.mjs")
]

# Append extended tasks into master list
base_id = len(tasks) + 1
for item in subsystems_extended:
    task_id = f"TSK-WBS-{base_id:03d}"
    base_id += 1
    tasks.append({
        "Task_ID": task_id,
        "Workstream": item[0],
        "Subsystem": item[1],
        "Role": item[2],
        "Task_Title": item[3],
        "Detailed_Scope_and_Deliverables": f"Implement {item[3]} adhering to AdhocX architectural guidelines and monorepo standards.",
        "Status": item[4],
        "Intern_Friendly_Level": item[5],
        "Prerequisite_Concepts_To_Teach": item[6],
        "Estimated_Hours": item[7],
        "Acceptance_Criteria_DoD": item[8],
        "Related_Files_Codebase_Pointers": item[9]
    })

# Add another batch of granular tasks across all 8 roles to reach 80-100+ highly detailed tasks
extra_granular_tasks = [
    ("Backend Core", "Billing Validation", "Backend Developer", "Implement Duplicate Invoice Prevention & Idempotency Key Validation", "COMPLETED", "Intern - Level 2 (Intermediate)", "Prisma unique constraint handling, HTTP 409 Conflict", "8", "Prevents duplicate invoice generation for same tenant and billing cycle", "apps/api/src/domains/corporate/billing/"),
    ("Backend Core", "Driver Suspension", "Backend Developer", "Implement Instant Driver Suspension & Auto-Reassignment Trigger", "COMPLETED", "Intern - Level 2 (Intermediate)", "Prisma transaction, dispatch trigger, audit logging", "12", "Suspended driver automatically removed from upcoming assigned duties", "apps/api/src/domains/corporate/supply/"),
    ("Backend Core", "Office Scope Guard", "Backend Developer", "Implement Multi-Office Scoped Role Guard for Corporate Managers", "COMPLETED", "Intern - Level 2 (Intermediate)", "NestJS Custom Decorators, ExecutionContext user office IDs", "10", "Manager can only view and modify rosters belonging to their assigned office", "apps/api/src/domains/corporate/tenants/"),
    ("Backend Core", "WebSocket Heartbeat", "Backend Developer", "Implement WebSocket Heartbeat Ping-Pong to Detect Dropped Sockets", "COMPLETED", "Intern - Level 2 (Intermediate)", "Socket.IO server options, connection timeout handling", "8", "Dead client sockets disconnected within 20s to preserve server RAM", "apps/api/src/modules/notifications/"),
    ("Web Frontend Development", "Reports Filtering", "Frontend Developer", "Build Date-Range & Cost Center Filter Controls in Corporate Reports Page", "COMPLETED", "Intern - Level 1 (Beginner)", "React datepicker, URL query param syncing", "10", "Filters report metrics seamlessly and retains state on page refresh", "apps/corporate/src/app/reports/"),
    ("Web Frontend Development", "Roster History Table", "Frontend Developer", "Build Versioned Roster History Table with Downloadable Original File", "COMPLETED", "Intern - Level 1 (Beginner)", "React table, presigned S3 download link trigger", "8", "Displays past published rosters with creator name and timestamp", "apps/corporate/src/app/rosters/"),
    ("Web Frontend Development", "Office Setup Wizard", "Frontend Developer", "Build Step-by-Step Corporate Office Onboarding Wizard", "COMPLETED", "Intern - Level 1 (Beginner)", "Multi-step form wizard, form validation with Zod", "12", "Allows adding office address, shift timings, and geofence radius", "apps/corporate/src/app/offices/"),
    ("Web Frontend Development", "Dispute Resolution Drawer", "Frontend Developer", "Build Dispute Resolution Action Drawer for Billing Disputes", "PENDING_ASSIGNMENT", "Intern - Level 2 (Intermediate)", "Side drawer component, form text area, file attachment upload", "10", "Admin can review dispute evidence, input refund amount, and approve/reject", "apps/corporate/src/app/billing/"),
    ("Mobile Frontend Development", "Driver Navigation Launcher", "Frontend Developer", "Implement Automatic Route Polyline Re-centering on Navigation Screen", "COMPLETED", "Intern - Level 2 (Intermediate)", "Google Maps controller, LatLngBounds camera animation", "10", "Map automatically re-centers on current vehicle fix and upcoming stop", "apps/mobile/lib/presentation/corporate_ets/"),
    ("Mobile Frontend Development", "SOS Cancel Timer", "Frontend Developer", "Build 5-Second Cancel Countdown Ring for Driver SOS Trigger", "COMPLETED", "Intern - Level 1 (Beginner)", "Flutter AnimationController, haptic feedback triggers", "8", "Driver can cancel accidental tap within 5 seconds before dispatch", "apps/mobile/lib/presentation/corporate_ets/widgets/corporate_sos_sheet.dart"),
    ("Mobile Frontend Development", "Duty List Screen", "Frontend Developer", "Build Driver Upcoming Duty Schedule List with Shift Badges", "COMPLETED", "Intern - Level 1 (Beginner)", "Flutter ListView.builder, date formatting with intl", "10", "Displays upcoming committed login and logout routes chronologically", "apps/mobile/lib/presentation/corporate_ets/"),
    ("Mobile Frontend Development", "Employee Push Handler", "Frontend Developer", "Build In-App Push Notification Notification Banner in Employee App", "PENDING_ASSIGNMENT", "Intern - Level 1 (Beginner)", "flutter_local_notifications, overlay entries", "10", "Shows non-intrusive top banner when cab is arriving or delay occurs", "apps/employee_app/lib/widgets/"),
    ("UI/UX Design", "Corporate Dashboard V2", "UI/UX Designer", "Design Executive Dashboard V2 with Shift Punctuality Heatmap", "PENDING_ASSIGNMENT", "Intern - Level 2 (Intermediate)", "Figma heatmap component, visual hierarchy, dark/light variations", "14", "Visualizes hourly on-time arrival performance across corporate campuses", "apps/corporate/src/app/dashboard/"),
    ("UI/UX Design", "Driver Offline Notice", "UI/UX Designer", "Design Driver Offline State Banner & Sync Indicator", "PENDING_ASSIGNMENT", "Intern - Level 1 (Beginner)", "Mobile banner layout, clear status messaging, reconnect icon", "6", "Informs driver that location is being saved locally until network returns", "apps/mobile/lib/presentation/"),
    ("UI/UX Developer", "Tailwind Typography Scale", "UI/UX Developer", "Standardize Tailwind Typography Classes Across Admin & Ops Web Apps", "COMPLETED", "Intern - Level 1 (Beginner)", "Tailwind typography plugin, font-display, letter-spacing", "8", "Eliminates mismatched font sizes across admin and ops portal screens", "apps/admin/tailwind.config.js, apps/ops/tailwind.config.js"),
    ("UI/UX Developer", "Mobile Button Shimmer", "UI/UX Developer", "Implement Loading Shimmer Skeleton Animations for Mobile List Cards", "PENDING_ASSIGNMENT", "Intern - Level 1 (Beginner)", "shimmer Flutter package, gradient skeleton containers", "8", "Replaces circular loading spinners with modern card shimmers", "apps/employee_app/lib/widgets/, apps/mobile/lib/presentation/"),
    ("Data Analytics & BI", "Driver Turnaround Time", "Data Analyst", "Analyze Driver Shift Turnaround Times & Rest Interval Compliance", "PENDING_ASSIGNMENT", "Intern - Level 2 (Intermediate)", "SQL window functions calculating rest time between consecutive duties", "12", "Flags any driver assigned duties with less than 8 hours mandatory rest", "scripts/"),
    ("Data Analytics & BI", "Roster Shift Trends", "Data Analyst", "Build Shift Timing Bell Curve Analysis to Optimize Fleet Staging", "PENDING_ASSIGNMENT", "Intern - Level 1 (Beginner)", "Data grouping by hour of day, histogram generation in Python", "10", "Reveals peak login/logout demand hours across corporate clients", "docs/corporate-ets/"),
    ("Platform Architecture & DevOps", "Redis Sentinel Test", "Software Architect", "Automate Redis Failover & Recovery Scenario Testing in Jest", "COMPLETED", "Intern - Level 3 (Advanced/Pair with Architect)", "Jest mock injection, simulating connection drop and fallback", "14", "Validates that API gracefully serves local cache when Redis blips", "apps/api/test/corporate-trip-execution.spec.ts"),
    ("Platform Architecture & DevOps", "Prisma Query Engine Lock", "Software Architect", "Document Windows File-Lock Workaround for Prisma Client Generation", "COMPLETED", "Intern - Level 1 (Beginner)", "Process termination scripts, node-gyp native DLL locks", "6", "Provides developer guide for resolving query_engine.dll locks during builds", "docs/16_ENGINEERING_STANDARDS.md"),
    ("Design System & Branding", "App Launch Splash", "Graphic Designer", "Design Animated Splash Screen Artwork for Driver & Commuter Apps", "PENDING_ASSIGNMENT", "Intern - Level 1 (Beginner)", "Lottie / vector splash assets, Android 12 splash screen specs", "10", "Polished native splash screen conforming to Android and iOS standards", "apps/mobile/assets/, apps/employee_app/assets/")
]

for item in extra_granular_tasks:
    task_id = f"TSK-WBS-{base_id:03d}"
    base_id += 1
    tasks.append({
        "Task_ID": task_id,
        "Workstream": item[0],
        "Subsystem": item[1],
        "Role": item[2],
        "Task_Title": item[3],
        "Detailed_Scope_and_Deliverables": f"Execute {item[3]} in accordance with production DoD standards.",
        "Status": item[4],
        "Intern_Friendly_Level": item[5],
        "Prerequisite_Concepts_To_Teach": item[6],
        "Estimated_Hours": item[7],
        "Acceptance_Criteria_DoD": item[8],
        "Related_Files_Codebase_Pointers": item[9]
    })

# Output file path
csv_file_path = "adhocx_master_project_wbs.csv"

# Write out CSV with full escaping
headers = [
    "Task_ID",
    "Workstream",
    "Subsystem",
    "Role",
    "Task_Title",
    "Detailed_Scope_and_Deliverables",
    "Status",
    "Intern_Friendly_Level",
    "Prerequisite_Concepts_To_Teach",
    "Estimated_Hours",
    "Acceptance_Criteria_DoD",
    "Related_Files_Codebase_Pointers"
]

with open(csv_file_path, mode="w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=headers)
    writer.writeheader()
    for task in tasks:
        writer.writerow(task)

print(f"Successfully generated master WBS spreadsheet: {csv_file_path} with {len(tasks)} granular tasks.")
