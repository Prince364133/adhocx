# AdhocX — CERT-In Cyber Security Compliance & Incident Response SOP

**Standard:** Directions under Section 70B(6) of the Information Technology Act, 2000 (No. 20(3)/2022-CERT-In)  
**Scope:** All AdhocX Production Systems, Infrastructure, Databases, and Applications  
**Compliance Mandates Covered:** 
1. Mandatory 180-Day ICT System Log Retention within India Jurisdiction
2. Mandatory Clock Synchronization via NTP (NPL / ISRO / AWS Time Sync)
3. Mandatory 6-Hour Cyber Incident Reporting to CERT-In

---

## 1. 180-Day ICT Log Retention Policy & Implementation

### A. Statutory Requirement
CERT-In Direction 2(v) mandates that all service providers, intermediaries, data centres, and bodies corporate shall enable and maintain logs for all ICT systems securely for a rolling duration of **180 consecutive days within the Indian jurisdiction**.

### B. AdhocX Technical Implementation

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LOGGING ARCHITECTURE                            │
│                                                                        │
│  [Apps / Mobile / API] ──> [CloudWatch Logs / Loki (ap-south-1)]       │
│                                           │ (After 30 days)            │
│                                           ▼                            │
│                         [S3 Glacier Flexible Archive (ap-south-1)]     │
│                                (Retained for 180 days)                 │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Storage Region:** AWS Region `ap-south-1` (Mumbai / Hyderabad, India). No overseas replication of ICT audit logs.
2. **Log Sources Captured:**
   - API Gateway & ALB access logs (source IP, method, URI, response code, latency).
   - Application authentication events (successful/failed logins, OTP events, token revocations).
   - Administrative and privileged actions (admin portal actions, KYC approvals, fare changes).
   - PostgreSQL RDS database audit logs (DML/DDL modifications, connection logs).
   - AWS CloudTrail management events and VPC Flow Logs.
3. **Retention Configuration:**
   - CloudWatch Log Groups: Set retention to 30 days active stream.
   - S3 Lifecycle Rule: Transition to S3 Glacier Instant Retrieval / Glacier Flexible Retrieval at Day 31.
   - Total Retention: Minimum 180 days before expiration.
4. **Log Sanitization & Data Masking:**
   - Under no circumstances are passwords, OTPs, full credit card numbers, or cryptographic secret keys recorded in logs.
   - PII (phone numbers, email) is masked with only last 4 digits visible in debug outputs.

---

## 2. System Clock Synchronization (NTP) Verification

### A. Statutory Requirement
CERT-In Direction 2(i) requires all service providers and bodies corporate to synchronize their ICT system clocks to the Network Time Protocol (NTP) Server of the National Physical Laboratory (NPL) or the Indian Space Research Organisation (ISRO), or servers traceable to them.

### B. AdhocX Server Configuration (Chrony / AWS Time Sync)
All EC2 instances, containers, and database hosts must run `chrony` configured with AWS Time Sync Service (which references atomic clocks traceable to UTC and NPL):

```bash
# Verify NTP clock synchronization status on EC2 instance:
chronyc tracking

# Expected output criteria:
# Reference ID    : 169.254.169.123 (AWS Time Sync)
# Stratum         : 3
# System time     : 0.000002 seconds slow of NTP time
# Offset          : < 100 microseconds (well within CERT-In tolerance)
```

---

## 3. Mandatory 6-Hour Cyber Incident Reporting Procedure

### A. Statutory Reporting Requirement
Under CERT-In Direction 2(ii), any service provider or intermediary must report cyber incidents of specified severity to CERT-In **within six (6) hours of noticing or being brought to notice**.

### B. Reportable Cyber Security Incidents (Annexure I)
1. Targeted scanning/probing of critical networks/systems.
2. Compromise of critical systems/information.
3. Unauthorized access of IT systems/data (e.g. database breach, API credential leak).
4. Defacement of website or intrusion into a website.
5. Malicious code attacks such as Ransomware / Trojan / Virus.
6. Attack on servers such as Database, Mail and DNS and network devices.
7. Identity theft, spoofing, and phishing attacks.
8. Denial of Service (DoS) and Distributed Denial of Service (DDoS) attacks.
9. Attacks on critical infrastructure / supply chains.
10. Unauthorized access to payment or user KYC databases.

### C. 6-Hour Incident Escalation Flowchart

```
[Hour 0:00] Detection / Alert Triggered (Sentry, CloudWatch, User Report)
    │
    ▼
[Hour 0:15] Security Incident Response Team (SIRT) Activated
    │ ├── Lead Backend Eng: Isolates affected containers/tokens
    │ └── DevOps: Captures forensic memory & network snapshots
    │
    ▼
[Hour 1:00] Initial Incident Classification & Impact Assessment
    │
    ├── Is it a Reportable CERT-In Category?
    │   ├── NO  ──> Internal containment, post-mortem, and fix.
    │   └── YES ──> Trigger Mandatory CERT-In Reporting Path:
    │
    ▼
[Hour 2:00 - 4:00] Prepare Incident Report Incident Draft
    │
    ▼
[Hour 4:30] CTO & Legal Review and Sign-Off
    │
    ▼
[Hour 5:00] Formal Submission to CERT-In (Within 6-Hour Deadline)
    │
    ├── Email: incident@cert-in.org.in
    ├── Hotline: 1800-11-4949 / +91-11-24667777
    └── Website Portal: https://www.cert-in.org.in
```

### D. CERT-In Incident Reporting Template

```text
To: incident@cert-in.org.in
Subject: CYBER INCIDENT REPORT - AdhocX Technologies Pvt Ltd - [INCIDENT-ID]

1. Name of the Organisation: AdhocX Technologies Private Limited
2. Date & Time of Incident Detection: [YYYY-MM-DD HH:MM:SS IST]
3. Point of Contact (Incident Lead): [Name, Designation, Phone, Email]
4. Nature / Type of Incident: [e.g., Unauthorized API Access / Ransomware / BOLA Data Leak]
5. Affected Systems / Infrastructure: [e.g., API Gateway / Database Cluster / Staging]
6. IP Addresses / Domains Involved: [Source IPs, Target Domains]
7. Preliminary Impact: [Number of affected records, downtime duration]
8. Containment Measures Taken: [Tokens revoked, IPs blocked at WAF, instances isolated]
9. Forensic Data Preserved: [Log dumps, memory snapshots, CloudTrail IDs]
10. Current Status: [CONTAINED / ERADICATED / RECOVERED]
```

### E. Security Incident Response Team (SIRT) Contacts

| Role | Primary Name | Phone (24x7) | Email | PGP Key ID |
| :--- | :--- | :--- | :--- | :--- |
| **Incident Commander** | Lead Security Eng | +91-98XXXXXXXX | security@adhocx.com | `0x4A1F9C8B` |
| **Technical Lead** | Lead Backend Eng | +91-98XXXXXXXX | backend@adhocx.com | `0x2B8E5D3A` |
| **Infrastructure Lead** | DevOps Architect | +91-98XXXXXXXX | devops@adhocx.com | `0x7C3A1F9E` |
| **Executive Escalation** | CTO | +91-98XXXXXXXX | cto@adhocx.com | `0x9D2E4A7F` |
| **Grievance / Legal** | Legal Counsel | +91-98XXXXXXXX | legal@adhocx.com | `0x1F8B2C4D` |
