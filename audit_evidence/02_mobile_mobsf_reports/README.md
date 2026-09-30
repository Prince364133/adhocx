# 02 — Mobile App Security (MobSF) Evidence Drop-Zone

**Target Component:** AdhocX Driver Android Application (`apps/mobile`)  
**Standard:** OWASP Mobile ASVS L2 / CERT-In Mobile Application Guidelines  

---

## 1. Required Files in this Folder

The mobile engineering team must place the following artifacts here:

1. `adhocx-driver-release.apk`: The exact release APK submitted for audit (or reference to GHCR/CI release artifact).
2. `adhocx-driver-mobsf-report.pdf` (or `.json`): The official MobSF Static & Dynamic analysis report generated against the release APK.
3. `apk_sha256_hash.txt`: The SHA-256 fingerprint of the release build:
   ```powershell
   certutil -hashfile build\app\outputs\flutter-apk\app-release.apk SHA256 > audit_evidence\02_mobile_mobsf_reports\apk_sha256_hash.txt
   ```
4. `android_manifest_audit.md`: Extraction of all exported components, intents, and permissions with risk justification.

---

## 2. Instructions for Running MobSF Analysis

Developers can run MobSF locally via Docker:

```bash
# 1. Pull and run MobSF container
docker pull opensecurity/mobsf:latest
docker run -it --rm -p 8000:8000 opensecurity/mobsf:latest

# 2. Access Web UI at http://localhost:8000
# 3. Upload app-release.apk (built with `flutter build apk --release --obfuscate --split-debug-info=...`)
# 4. Export PDF / JSON Report and save into this directory
```

---

## 3. Mandatory Acceptance Criteria for Mobile Sign-Off

- **Zero Critical / Zero High CVSS Findings** in MobSF report.
- `android:debuggable` is strictly `false`.
- `android:allowBackup` is `false` (prevents ADB backup extraction of tokens/KYC).
- `usesCleartextTraffic` is strictly `false`.
- Network Security Config mandates HTTPS / TLS 1.3 / 1.2 and blocks user-installed CA certs.
- Sensitive storage uses Android Keystore backed `flutter_secure_storage` (no plaintext tokens in shared preferences).
