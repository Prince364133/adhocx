# AdhocX Employee Mobile App

**Corporate Employee Transportation & Daily Commuter Mobility Application**  
**Package:** `adhocx_employee`  
**Location:** `apps/employee_app`  
**Brand Architecture:** Primary Blue `#1167EE`, Secondary Orange `#FF5F09`, Warm Amber `#EE9811`, Dark Navy `#010D2D`

---

## 1. Batch 01 — Authentication & Onboarding

Batch 01 delivers the complete user entry, authentication, corporate eligibility verification, permissions, and initial walkthrough flow for enterprise employee commuters across Hyderabad and India.

### Implemented Screen Inventory (15 Screens)

| # | Screen Name | Route Path | Description |
|---|---|---|---|
| **01** | `SplashScreen` | `/` | Dark navy background (`#010D2D`), AdhocX logo with orange "X", auto-transition after 2.4s |
| **02** | `WelcomeScreen` | `/welcome` | Modern city & sedan car illustration, "Your Daily Office Commute, Simplified", "Get Started →" CTA |
| **03** | `LoginOptionsScreen` | `/login-options` | "Continue with Company SSO" and "Login with Mobile Number" cards, skyline silhouette |
| **04** | `MobileNumberScreen` | `/mobile-number` | `+91` selector, 10-digit number entry, custom in-app numeric dialpad, "Send OTP" CTA |
| **05** | `OtpVerificationScreen` | `/otp-verify` | 6-box OTP entry, 24-second resend countdown, input validation, "Verify & Continue" CTA |
| **06** | `CompanySsoScreen` | `/company-sso` | Corporate shield icon, work email entry (`you@company.com`), SSO authentication flow |
| **07** | `EmployeeVerificationScreen` | `/employee-verified` | Green checkmark badge, Employee ID (`EMP10294`), Organization, and Office card |
| **08** | `LocationPermissionScreen` | `/permission-location` | Circular location badge, pickup update explanation, "Allow Location" & "Not Now" |
| **09** | `NotificationPermissionScreen` | `/permission-notification` | Circular bell badge, arrival alert explanation, "Allow Notifications" & "Not Now" |
| **10** | `OnboardingScheduleScreen` | `/onboarding/schedule` | "1 of 3", calendar with clock badge, "View Your Schedule", next arrow button |
| **11** | `OnboardingTrackingScreen` | `/onboarding/tracking` | "2 of 3", GPS map route & pin, "Track Your Trip", next arrow button |
| **12** | `OnboardingSafetyScreen` | `/onboarding/safety` | "3 of 3", orange/amber "SOS" shield badge, "Stay Safe, Always", next arrow button |
| **13** | `OnboardingCompleteScreen` | `/onboarding/complete` | Celebratory green checkmark, "You're All Set!", "Go to Home" CTA |
| **14** | `InvalidOtpScreen` | `/error/invalid-otp` | 6 OTP boxes in red error state, "Invalid OTP. Please check and try again.", resend link |
| **15** | `TransportUnavailableScreen` | `/error/transport-unavailable` | Red cross badge, not eligible notice, "Contact HR" support sheet, "Back to Login" |

---

## 2. Supported User Flows

### Flow A: Mobile OTP Authentication
1. **Splash** (`/`) → Auto-navigates to **Welcome** (`/welcome`).
2. **Welcome** → Tap "Get Started →" to navigate to **Login Options** (`/login-options`).
3. **Login Options** → Tap "Login with Mobile Number" to navigate to **Mobile Number** (`/mobile-number`).
4. **Mobile Number** → Enter 10-digit phone number → Tap "Send OTP" to navigate to **Verify OTP** (`/otp-verify`).
5. **Verify OTP** → Enter 6-digit code:
   - Valid Code `528471` or `123456` → Navigates to **Account Verified** (`/employee-verified`).
   - Ineligible Code `888888` → Navigates to **Transport Unavailable** (`/error/transport-unavailable`).
   - Other Code → Triggers **Invalid OTP Error State** (Screen 14).
6. **Account Verified** → Review corporate details → Tap "Continue" to navigate to **Location Permission** (`/permission-location`).
7. **Location Permission** → Tap "Allow Location" or "Not Now" → Navigates to **Notification Permission** (`/permission-notification`).
8. **Notification Permission** → Tap "Allow Notifications" or "Not Now" → Navigates to **Onboarding 1/3** (`/onboarding/schedule`).
9. **Onboarding Walkthrough** (1/3 Schedule → 2/3 Tracking → 3/3 Safety SOS) → Navigates to **You're All Set!** (`/onboarding/complete`).
10. **You're All Set!** → Tap "Go to Home" to land on the Employee Home dashboard.

### Flow B: Corporate Single Sign-On (SSO)
1. **Login Options** → Tap "Continue with Company SSO" to navigate to **Company SSO** (`/company-sso`).
2. **Company SSO** → Enter work email (`arjun.sharma@company.com`) → Tap "Continue":
   - Valid email → Navigates to **Account Verified** (`/employee-verified`).
   - Email containing `ineligible` → Navigates to **Transport Unavailable** (`/error/transport-unavailable`).
3. Continues through Permissions and Onboarding sequence to Home.

---

## 3. Test Credentials & Edge Cases

| Test Case | Trigger Input | Expected Screen | Behavior |
|---|---|---|---|
| **Valid OTP (Mockup Match)** | Code `528471` | Screen 07 | Verifies `EMP10294` / Estemporaneo Tech Pvt. Ltd. |
| **Valid OTP (Dev Helper)** | Code `123456` | Screen 07 | Fast development verification |
| **Invalid OTP Code** | Any code (e.g. `111111`) | Screen 14 | Red input borders + "Invalid OTP. Please check and try again." |
| **Expired OTP Code** | Code `999999` | Screen 14 | Red input borders + "OTP has expired. Please request a new code." |
| **Ineligible Transport** | Code `888888` or phone `8888888888` | Screen 15 | "Transport Access Not Available" + Contact HR support modal |
| **Ineligible SSO Email** | Email with `ineligible@...` | Screen 15 | "Transport Access Not Available" + Contact HR support modal |

---

## 4. Architecture

```
apps/employee_app/
├── lib/
│   ├── main.dart                          # MultiProvider bootstrap & mock repo injection
│   ├── app.dart                           # Sizer + MaterialApp.router + AppTheme
│   ├── routes/
│   │   └── app_routes.dart                # GoRouter route declarations
│   ├── theme/
│   │   ├── app_colors.dart                # #1167EE, #FF5F09, #EE9811, #010D2D tokens
│   │   ├── app_typography.dart            # GoogleFonts.inter hierarchy
│   │   └── app_theme.dart                 # ThemeData with button, input, & bar styles
│   ├── models/
│   │   ├── employee_user.dart             # Employee profile model
│   │   └── auth_state.dart                # Auth state machine & status enums
│   ├── repositories/
│   │   ├── employee_auth_repository.dart  # Abstract contract
│   │   └── mock_employee_auth_repository.dart # Mock repository handling test cases
│   ├── state/
│   │   ├── employee_auth_provider.dart    # ChangeNotifier for OTP, SSO, timers
│   │   └── employee_permission_provider.dart # Permission handler state
│   ├── widgets/
│   │   ├── employee_brand_logo.dart       # AdhocX logo with orange "X"
│   │   ├── employee_primary_button.dart   # #1167EE full-width pill button
│   │   ├── employee_secondary_button.dart # Outlined pill button
│   │   ├── employee_otp_input.dart        # 6-box auto-focus OTP component
│   │   ├── employee_app_bar.dart          # Back arrow top bar
│   │   └── illustration_widgets.dart      # Custom vector illustrations
│   └── screens/
│       ├── splash_screen.dart             # Screen 01
│       ├── welcome_screen.dart            # Screen 02
│       ├── login_options_screen.dart      # Screen 03
│       ├── mobile_number_screen.dart      # Screen 04
│       ├── otp_verification_screen.dart   # Screen 05
│       ├── company_sso_screen.dart        # Screen 06
│       ├── employee_verification_screen.dart # Screen 07
│       ├── location_permission_screen.dart   # Screen 08
│       ├── notification_permission_screen.dart # Screen 09
│       ├── onboarding_schedule_screen.dart   # Screen 10 (1/3)
│       ├── onboarding_tracking_screen.dart   # Screen 11 (2/3)
│       ├── onboarding_safety_screen.dart     # Screen 12 (3/3)
│       ├── onboarding_complete_screen.dart   # Screen 13
│       ├── invalid_otp_screen.dart           # Screen 14
│       ├── transport_unavailable_screen.dart # Screen 15
│       └── home_screen_placeholder.dart      # Landing Dashboard
├── pubspec.yaml
├── analysis_options.yaml
└── README.md
```

