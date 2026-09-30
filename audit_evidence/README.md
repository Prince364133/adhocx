# AdhocX — Pre-Audit Evidence & Developer Handoff Package
**Target Audience:** Engineering Team, DevOps, Security Auditor (CERT-In Empanelled)  
**Standard:** CERT-In Cyber Security Directions (Sec 70B of IT Act, 2000) & OWASP ASVS / MASVS Level 2  
**Document Status:** Official Pre-Audit Specification & Evidence Repository  

---

## 1. Executive Summary & Purpose

Before presenting AdhocX to an external, CERT-In-empanelled cybersecurity auditor, the development and infrastructure teams must achieve full internal verification. 

A successful audit requires concrete, reproducible **evidence**, not merely self-declarations. This folder structure provides the standardized evidence package that bridges the developer handoff directly to the external auditor, minimizing remediation cycles, audit delays, and re-testing costs.

---

## 2. The 5 Mandatory Developer Deliverables

The development team must deliver the following **five mandatory deliverables** before the audit package is accepted for auditor submission:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   5 MANDATORY AUDIT DELIVERABLES                      │
├────┬───────────────────────────────────────────────────────────────────┤
│ 1  │ Completed 110-Item Sign-Off Sheet (PASS / FAIL / N/A + Evidence)  │
│    │ Located at: 01_pre_audit_signoff/DEVELOPER_PRE_AUDIT_SIGNOFF.md   │
├────┼───────────────────────────────────────────────────────────────────┤
│ 2  │ MobSF Static & Dynamic Analysis Report (Android Release APK)       │
│    │ Located at: 02_mobile_mobsf_reports/ (Zero High/Critical open)    │
├────┼───────────────────────────────────────────────────────────────────┤
│ 3  │ OWASP ZAP & DAST API Security Testing Report (Staging Env)        │
│    │ Located at: 03_api_dast_owasp_zap/ (BOLA, IDOR, Injection checks)│
├────┼───────────────────────────────────────────────────────────────────┤
│ 4  │ AWS / Cloud Infrastructure & IAM Security Evidence Pack          │
│    │ Located at: 04_aws_cloud_infrastructure/ (IAM, S3, RDS, SG, Bckp) │
├────┼───────────────────────────────────────────────────────────────────┤
│ 5  │ Vulnerability Remediation Tracker (Finding → Fix → Retest → PASS) │
│    │ Located at: 05_vulnerability_remediation_tracker/TRACKER.md       │
└────┴───────────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Zero Critical / Zero High Vulnerability Acceptance Gate:**
> No audit submission is approved if any Critical or High vulnerability remains unresolved. Every item marked `N/A` must carry an explicit architectural justification.

---

## 3. Evidence Folder Structure

```
audit_evidence/
├── README.md                                # Master Index & Auditor Navigation Guide
├── 01_pre_audit_signoff/
│   ├── DEVELOPER_PRE_AUDIT_SIGNOFF.md       # Signed 110-item pre-audit evaluation sheet
│   └── signoff_signatures.pdf               # Signed approval page (Lead Dev, Security, CTO)
├── 02_mobile_mobsf_reports/
│   ├── README.md                            # APK generation & MobSF testing methodology
│   ├── adhocx-driver-release-mobsf.pdf      # MobSF static analysis export (PDF/JSON)
│   ├── android_manifest_audit.md            # Permissions & exported components review
│   └── network_security_config.xml          # TLS & certificate pinning configuration
├── 03_api_dast_owasp_zap/
│   ├── README.md                            # ZAP & Newman DAST test procedures
│   ├── zap_api_scan_report.html             # OWASP ZAP full scan report
│   ├── postman_bola_idor_tests.json         # Newman execution report for BOLA/IDOR
│   └── swagger_sanitized.json               # Current production/staging API schema
├── 04_aws_cloud_infrastructure/
│   ├── README.md                            # Cloud verification procedures
│   ├── iam_credential_report.csv            # AWS IAM credential report
│   ├── s3_public_access_block_proof.png     # S3 & Cloudflare R2 bucket security proofs
│   ├── rds_kms_encryption_proof.png         # PostgreSQL RDS KMS encryption status
│   ├── security_groups_rules.json           # Security group ingress/egress export
│   └── backup_restore_test_log.md           # Verifiable test restore log in staging
├── 05_vulnerability_remediation_tracker/
│   ├── README.md                            # Tracker maintenance guide
│   └── FINDING_REMEDIATION_TRACKER.md       # Finding → Root Cause → Fix → Retest → PASS
├── 06_cert_in_compliance/
│   ├── README.md                            # Indian statutory compliance notes
│   ├── CERT_IN_INCIDENT_AND_LOGGING_SOP.md  # 6-Hour reporting & 180-day logging SOP
│   ├── ntp_clock_sync_proof.txt             # Chrony / NTP sync verification against NPL/ISRO
│   └── log_retention_lifecycle_policy.json  # CloudWatch / S3 Glacier 180-day retention rule
└── 07_data_privacy_inventory/
    ├── README.md                            # Privacy compliance overview
    ├── DATA_DICTIONARY_AND_PRIVACY_INVENTORY.md # PII mapping, lawful basis, encryption
    └── account_deletion_verification.md     # Flow verification of driver/user deletion
```

---

## 4. Strict Testing & Engagement Rules

### A. Non-Disruptive Testing Policy (Staging Only)
- **NO AGGRESSIVE / INTRUSIVE TESTING ON PRODUCTION.** 
- Automated DAST, OWASP ZAP fuzzing, sqlmap, brute-force simulations, and load testing must be run **exclusively against the staging environment** (`https://staging-api.adhocx.com`) populated with non-production test data.
- Production testing is strictly limited to non-intrusive configuration inspection (TLS certificates, HTTP security response headers, and IAM permission audits).

### B. Standardized Evaluation Statuses
- **`[PASS]`**: Verified with verifiable automated tool output, log proof, or code inspection. Link/command provided.
- **`[FAIL]`**: Gap detected. Must be recorded immediately in `05_vulnerability_remediation_tracker/FINDING_REMEDIATION_TRACKER.md` with an assigned engineer and SLA.
- **`[N/A]`**: Not Applicable. Must include formal technical justification explaining why the control is architecturally out of scope.

---

## 5. Indian Statutory & CERT-In Compliance Directives

Under the Cyber Security Directions issued under Section 70B(6) of the Information Technology Act, 2000:

1. **Mandatory 180-Day ICT Log Retention:**
   All system logs, firewall logs, database audit trails, API access logs, and application events must be securely retained for **not less than 180 consecutive days within the Indian jurisdiction** (e.g., AWS Region `ap-south-1` Mumbai / Hyderabad).
2. **Mandatory 6-Hour Cyber Incident Reporting:**
   Any cybersecurity incident of specified nature (unauthorized access, ransomware, data breach, DoS/DDoS, API compromise) must be reported to **CERT-In within six (6) hours** of noticing.
3. **Synchronized Clocks (NTP):**
   All servers, containers, databases, and network gateways must synchronize their system clocks with the National Physical Laboratory (NPL) or Indian Space Research Organisation (ISRO) NTP servers or standard AWS Time Sync Service.
