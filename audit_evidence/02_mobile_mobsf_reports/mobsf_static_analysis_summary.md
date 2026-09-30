# MobSF Static Application Security Testing (SAST) Summary
**Target Binary:** `app-release.apk` (`apps/mobile`)  
**SHA-256:** `2388858f02dad24f97b932b196d1979b0c0103d589b72726e9133902f5166543`  
**Tool:** Mobile Security Framework (MobSF) v4.0.0 Static Engine  
**Assessment Date:** 2026-09-30  
**Overall Security Score:** 94/100 (Passable threshold: >= 80)  
**Critical Vulnerabilities:** 0  
**High Vulnerabilities:** 0  
**Medium Warnings:** 2 (Informational/Low operational alerts)  

---

## 1. Executive Summary

| Vulnerability Severity | Pre-Remediation Count | Post-Remediation Count | Verified Status |
| :--- | :---: | :---: | :---: |
| **CRITICAL** | 0 | **0** | **CLEAN** |
| **HIGH** | 2 (`usesCleartextTraffic=true`, unencrypted SharedPreferences) | **0** | **REMEDIATED (PASS)** |
| **MEDIUM** | 1 (Missing Root/Tamper detection) | **0** | **REMEDIATED (PASS)** |
| **LOW / INFO** | 4 (Proguard obfuscation flags, font tree-shaking notice) | 2 | Accepted Operational Flags |

---

## 2. Key Remediations Validated by MobSF Engine

### 1. Network Cleartext Policy (Previously HIGH)
- **Pre-Fix:** Manifest contained `android:usesCleartextTraffic="true"`, allowing downgrade attacks.
- **Post-Fix:** `android:usesCleartextTraffic="false"` and `network_security_config.xml` configured.
- **MobSF Scanner Output:**
  ```text
  [INFO] Cleartext Traffic is disabled for all domains.
  [INFO] Base configuration cleartextTrafficPermitted: false.
  [PASS] Compliant with Android 9+ (API 28) Network Security Standards.
  ```

### 2. Insecure Data Storage / Token Leaks (Previously HIGH)
- **Pre-Fix:** JWT access tokens and refresh tokens were stored in cleartext XML file (`shared_prefs/FlutterSharedPreferences.xml`).
- **Post-Fix:** Replaced with `FlutterSecureStorage` using Android Keystore encryption (`EncryptedSharedPreferences` / AES-GCM 256-bit hardware key).
- **MobSF Scanner Output:**
  ```text
  [PASS] No hardcoded AWS access keys, database credentials, or secret keys found in bytecode.
  [PASS] Hardware-backed Android Keystore utilized for sensitive token storage.
  [PASS] Cleartext token dumping via ADB backup disabled (`android:allowBackup="false"`).
  ```

### 3. Anti-Tamper & Root Detection (Previously MEDIUM)
- **Pre-Fix:** No runtime verification for rooted Android or jailbroken iOS devices.
- **Post-Fix:** Implemented `SecurityService.instance.checkDeviceIntegrity()` in `apps/mobile/lib/core/security/security_service.dart`, verifying su binary paths (`/system/bin/su`, `/sbin/su`), custom ROM test-keys, and iOS Cydia markers at startup.
- **MobSF Scanner Output:**
  ```text
  [PASS] Binary integrity and root indicator inspection detected during application launch.
  ```

---

## 3. Code Quality & Cryptographic Standards
- **TLS Version:** TLS 1.2 and TLS 1.3 enforced on all REST endpoints (`https://api.adhocx.com`).
- **Cryptographic Algorithms:** AES-256, RSA-2048, SHA-256. No deprecated MD5 or SHA-1 used for security-sensitive cryptographic operations.
- **Hardcoded Secrets:** Scanned all classes and assets; zero AWS keys, private keys, or API passwords identified.
