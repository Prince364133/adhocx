# AdhocX Broken Object Level Authorization (BOLA / IDOR) Test Matrix
**Standard:** OWASP API Top 10 API1:2023 / CERT-In Multi-Tenant Isolation Standard  
**Target Environment:** Staging API (`https://staging-api.adhocx.com/api/v1`)  
**Test Identities:**
- Driver A (`drv_alice_1111`) / User ID `usr_alice_1111` (Role: `DRIVER`)
- Driver B (`drv_bob_2222`) / User ID `usr_bob_2222` (Role: `DRIVER`)
- Vendor X (`ven_alpha_3333`) / User ID `usr_alpha_3333` (Role: `VENDOR`)
- Vendor Y (`ven_beta_4444`) / User ID `usr_beta_4444` (Role: `VENDOR`)
- Admin Support (`usr_support_5555`) (Role: `ADMIN`)
- Unauthenticated (No Authorization Bearer Header)

---

## 1. Cross-Tenant Authorization Matrix

| Endpoint | Attempting Actor | Target Resource Owner | Expected Response | Observed Response | Test Result |
| :--- | :--- | :--- | :---: | :---: | :---: |
| `GET /drivers/me` | Driver A | Driver A | `200 OK` (Self data) | `200 OK` | **PASS** |
| `GET /drivers/:id` | Driver A | Driver B (`drv_bob_2222`) | `403 Forbidden` / `404 Not Found` | `403 Forbidden` | **PASS** |
| `PATCH /drivers/:id` | Driver A | Driver B (`drv_bob_2222`) | `403 Forbidden` | `403 Forbidden` | **PASS** |
| `GET /trips/:tripId` | Driver A | Driver B's active trip | `403 Forbidden` / `404 Not Found` | `404 Not Found` | **PASS** |
| `POST /trips/:tripId/start` | Driver A | Driver B's active trip | `403 Forbidden` | `403 Forbidden` | **PASS** |
| `GET /settlements/me` | Driver A | Driver B's payouts | `200 OK` (Driver A only) | `200 OK` (Filtered) | **PASS** |
| `GET /requirements/:id` | Vendor X | Vendor Y's requirement | `403 Forbidden` / `404 Not Found` | `403 Forbidden` | **PASS** |
| `DELETE /requirements/:id` | Vendor X | Vendor Y's requirement | `403 Forbidden` | `403 Forbidden` | **PASS** |
| `POST /admin/drivers/:id/verify` | Driver A | Driver B (`drv_bob_2222`) | `403 Forbidden` (Role check) | `403 Forbidden` | **PASS** |
| `POST /admin/drivers/:id/verify` | Vendor X | Driver B (`drv_bob_2222`) | `403 Forbidden` (Role check) | `403 Forbidden` | **PASS** |
| `GET /admin/drivers/:id` | Admin Support | Driver B (KYC view) | `200 OK` (Masked PII) | `200 OK` (`XXXX-1234`) | **PASS** |
| `GET /admin/drivers/:id` | Unauthenticated | Any Driver | `401 Unauthorized` | `401 Unauthorized` | **PASS** |
| `GET /trips` | Unauthenticated | Any Trip | `401 Unauthorized` | `401 Unauthorized` | **PASS** |

---

## 2. Authorization Implementation Verification
- **User Ownership Guard:** Enforced via `JwtAuthGuard`, `RolesGuard`, and Prisma database queries where conditions always include `userId: user.id` or `vendorId: user.vendor.id`.
- **Administrative Endpoints:** Strictly guarded with `@Roles(UserRole.ADMIN)` preventing role escalation from driver or vendor JWT tokens.
- **PII Protection:** UIDAI Aadhaar masking (`XXXX-XXXX-1234`) and bank account masking (`XXXXXXXX1234`) active for support administrators.
