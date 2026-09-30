# AdhocX Mobile Application — AndroidManifest Security Audit
**Target Component:** Driver Android App (`apps/mobile/android/app/src/main/AndroidManifest.xml`)  
**Package:** `com.adhocx.driver`  
**Audit Standard:** OWASP Mobile ASVS L2 / CERT-In Mobile Security Guidelines  
**Audited Release APK SHA-256:** `2388858f02dad24f97b932b196d1979b0c0103d589b72726e9133902f5166543`  
**Status:** ALL CHECKS PASSED (Zero High/Critical Findings)

---

## 1. Application-Level Security Flags

| Attribute | Configured Value | Security Requirement | Status | Justification / Impact |
| :--- | :--- | :--- | :---: | :--- |
| `android:debuggable` | `false` (in release) | Must be `false` | **PASS** | Prevents JDWP debugging, memory inspection, and runtime breakpoints via ADB. |
| `android:allowBackup` | `false` | Must be `false` | **PASS** | Prevents ADB backup extraction (`adb backup`) of sensitive data, tokens, and local cache. |
| `android:usesCleartextTraffic` | `false` | Must be `false` | **PASS** | Disallows cleartext HTTP traffic across all components. |
| `android:networkSecurityConfig` | `@xml/network_security_config` | Enforce TLS config | **PASS** | Binds strict network policy disallowing cleartext and untrusted user CA certificates. |

---

## 2. Network Security Configuration (`res/xml/network_security_config.xml`)

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">adhocx.com</domain>
        <domain includeSubdomains="true">api.adhocx.com</domain>
        <domain includeSubdomains="true">staging-api.adhocx.com</domain>
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </domain-config>
</network-security-config>
```

**Security Analysis:**
- `<base-config cleartextTrafficPermitted="false">`: Blocks all unencrypted HTTP traffic across the entire app.
- `<certificates src="system" />`: Trusts only trusted OS system CA certificates. User-installed CA certificates (used in proxy interception tools like Burp Suite or Charles Proxy on untrusted devices) are ignored by default.

---

## 3. Requested Android Permissions Audit

| Permission | Category | Business Justification | Minimization Principle |
| :--- | :--- | :--- | :---: |
| `android.permission.INTERNET` | Normal | Core API and WebSocket communication with dispatch gateway. | Strictly Required |
| `android.permission.ACCESS_FINE_LOCATION` | Dangerous | High-precision GPS tracking during active trip execution and nearby offer dispatch. | Strictly Required |
| `android.permission.ACCESS_COARSE_LOCATION` | Dangerous | Fallback cell-tower/Wi-Fi positioning when GPS lock is slow. | Strictly Required |
| `android.permission.ACCESS_BACKGROUND_LOCATION` | Dangerous | Location broadcast while app is running in background during an active customer ride. | Required for Trips |
| `android.permission.CAMERA` | Dangerous | Driver KYC document scanning (DL, RC, Aadhaar front/back, vehicle photo). | Optional at Runtime |
| `android.permission.POST_NOTIFICATIONS` | Dangerous | Urgent trip offers, dispatch alerts, and critical account security notices. | Requested at Prompt |
| `android.permission.WAKE_LOCK` | Normal | Prevents CPU sleep during turn-by-turn navigation on active trips. | Strictly Required |

**Permission Minimization Compliance:**
- No dangerous unneeded permissions requested (`READ_CONTACTS`, `READ_SMS`, `RECORD_AUDIO`, `READ_EXTERNAL_STORAGE` on API 33+ are excluded).
- Camera and Location permissions are requested just-in-time when the driver initiates the respective workflow, not on initial app splash screen.

---

## 4. Exported Components and IPC Attack Surface

| Component | Type | Exported | Intent Filter | Risk Evaluation |
| :--- | :--- | :---: | :--- | :--- |
| `.MainActivity` | Activity | `true` | `MAIN` / `LAUNCHER` | Standard app entry point. Protected by standard Android launch restrictions. |
| Firebase Cloud Messaging Receiver | BroadcastReceiver | `false` | System push notification handler | Protected by Google Play Services signatures. |
| Local Notification Receiver | BroadcastReceiver | `false` | Scheduled dispatch alarm alarms | Internal app process only (`android:exported="false"`). |

**Attack Surface Summary:**
- Zero exported Content Providers.
- Zero exported Broadcast Receivers with open intents.
- Zero exported background Services accessible by third-party applications.
- Complete defense-in-depth verified.
