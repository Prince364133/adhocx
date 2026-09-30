# AdhocX — Data Dictionary & Privacy Inventory
**Standard:** Digital Personal Data Protection Act (DPDP Act, India) & CERT-In Guidelines  
**Classification:** Confidential — System Data Map  

---

## 1. Personal Data Inventory & Purpose Specification

| Field Name | Entity (User / Driver / Vendor) | Category | Lawful / Operational Purpose | Storage Location | Encryption at Rest | Retention Window | Deletion Eligibility |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- | :---: |
| `phone_number` | Driver, Vendor, Passenger | Identity / Contact | Primary login identifier via OTP; ride updates and dispatch. | PostgreSQL (`users.phone`) | AES-256 (KMS) | Active + 3 yrs post-closure | Upon verified account deletion |
| `full_name` | Driver, Vendor, Passenger | Identity | KYC verification, passenger trust, and billing invoices. | PostgreSQL (`users.name`) | AES-256 (KMS) | Active + 3 yrs post-closure | Upon verified account deletion |
| `email` | Vendor, Admin, Driver | Contact | Invoices, dispute notifications, and password/MFA recovery. | PostgreSQL (`users.email`) | AES-256 (KMS) | Active + 3 yrs post-closure | Upon verified account deletion |
| `aadhaar_number` / `aadhaar_image` | Driver | Sensitive KYC | Regulatory verification under Motor Vehicle Aggregator Guidelines. | Encrypted S3 Bucket (`/kyc/aadhaar/`) | SSE-KMS (AES-256) | Active + 5 yrs (Statutory requirement) | Anonymized per MVA statutory rules |
| `driving_license_no` / `dl_image` | Driver | Sensitive KYC | Verification of valid driving authority and legal eligibility. | Encrypted S3 Bucket (`/kyc/dl/`) | SSE-KMS (AES-256) | Active + 5 yrs (Statutory requirement) | Anonymized per MVA statutory rules |
| `vehicle_rc_number` / `rc_image` | Driver / Vehicle | Vehicle Compliance | Verification of roadworthiness, commercial fitness, and insurance. | Encrypted S3 Bucket (`/kyc/rc/`) | SSE-KMS (AES-256) | Active + 5 yrs (Statutory requirement) | Retained per transport regulation |
| `live_location_coordinates` | Driver | Real-time Telemetry | Geospatial matching, live passenger route tracking, and SOS safety. | Redis (Ephemera) & Postgres (Trip logs) | In-transit (TLS 1.3) + KMS | Active trip + 180 days for audit | Scrubbed after 180 days |
| `bank_account_number` / `ifsc_code` | Driver | Financial PII | Disbursing earnings and weekly payouts via Razorpay Payouts API. | PostgreSQL (`driver_bank_details`) | AES-256 (KMS) | Active + 7 yrs (Tax / IT Act compliance) | Encrypted archive upon deletion |
| `device_id` / `fcm_token` | Driver, Vendor | Technical Telemetry | Push notifications for new trip requests and dispatch alerts. | PostgreSQL (`user_devices`) | Standard KMS | Active session only | Deleted upon logout or app uninstall |

---

## 2. Protection Controls

1. **Storage Access Isolation:**
   KYC documents (DL, Aadhaar, RC) are stored in private Cloudflare R2 / S3 buckets with all public read access blocked. Direct URL access is prohibited. Pre-signed URLs with a 15-minute maximum TTL are generated only upon server-side authenticated Admin or Driver requests.
2. **Phone Number Masking:**
   In driver-passenger communications, phone numbers are masked using a VoIP/IVR proxy bridge so that the driver never sees the customer's personal telephone number.
3. **Password Security:**
   All web passwords (for Admin and Vendor portal users) are hashed using `bcrypt` (cost factor: 12) with unique cryptographic salts. Passwords are never stored in plaintext or logged in any format.

---

## 3. Account Deletion Workflow (Item 95 Verification)

AdhocX provides a self-service account deletion workflow:
1. User or Driver requests deletion via `https://adhocx.com/delete-account.html` or mobile app settings (`Profile -> Delete Account`).
2. Two-factor OTP challenge confirms identity.
3. System verifies there are no pending unsettled ride payments or ongoing active trips.
4. PII is scrubbed:
   - Phone and email are replaced with anonymized hash (`deleted_user_UUID`).
   - Push tokens and session tokens are immediately revoked in Redis.
   - Regulatory ride history is retained in anonymized format in accordance with Section 70B and motor vehicle aggregator laws.
