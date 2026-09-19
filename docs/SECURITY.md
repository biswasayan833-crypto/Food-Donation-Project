# Security & Hardening Architecture — FoodRescue

**FoodRescue** implements defense-in-depth security principles across all tiers: identity management, role-based authorization, rate limiting, data privacy, error masking, and HTTP transport security.

---

## 1. Threat Model & Security Posture

As a multi-tenant logistics platform connecting food donors, NGOs, volunteer drivers, and administrators, FoodRescue addresses four primary risk vectors:
1. **Privilege Escalation & IDOR**: Preventing unauthenticated or unauthorized users from tampering with donations, claims, driver routes, or administrative audit trails.
2. **Denial of Service & Brute Force**: Preventing automated credential stuffing, rapid API exhaustion, and storage abuse.
3. **Sensitive Data Exposure**: Preventing exposure of donor addresses, driver phone numbers, password hashes, and database internals.
4. **Data Integrity & Spoilage Fraud**: Enforcing non-repudiation and cryptographic validation on pickups and deliveries.

---

## 2. Authentication & Session Management

- **Framework**: NextAuth.js v4 using the `jwt` session strategy.
- **Password Hashing**: Passwords are hashed with `bcryptjs` using 10 salt rounds before storage in Neon PostgreSQL.
- **Session Lifespan**: Maximum session age configured to 30 days (`maxAge: 30 * 24 * 60 * 60`).
- **Cookie Security**:
  - `httpOnly: true` (prevents client-side script access via `document.cookie`).
  - `sameSite: 'lax'` (mitigates Cross-Site Request Forgery / CSRF).
  - `secure: true` in production (enforced over HTTPS).
- **JWT Payload**: Encodes essential identity claims (`id`, `role`, `name`, `email`, `location`, `phone`) without sensitive credentials or secrets.

---

## 3. Role-Based Access Control (RBAC)

The platform defines 4 distinct system roles (`UserRole`):
- `DONOR`: Commercial restaurants, grocery stores, catering companies.
- `RECEIVER`: Shelters, food banks, non-profit charitable organizations.
- `VOLUNTEER`: Couriers and volunteer delivery drivers.
- `ADMIN`: Platform operations, dispute adjudicators, compliance officers.

### RBAC Permissions Matrix

| Endpoint / Action | Operation | DONOR | RECEIVER | VOLUNTEER | ADMIN |
|---|---|:---:|:---:|:---:|:---:|
| `POST /api/listings` / `createListing` | Create surplus food donation | **Allowed** | Denied | Denied | **Allowed** |
| `PATCH /api/listings/[id]` | Edit own food donation | **Owner Only** | Denied | Denied | **Allowed** |
| `DELETE /api/listings/[id]` | Cancel food donation | **Owner Only** | Denied | Denied | **Allowed** |
| `POST /api/claims` / `claimListing` | Claim available food | Denied | **Allowed** | Denied | **Allowed** |
| `PATCH /api/claims` | Approve/Reject claim | **Donor Owner** | Denied | Denied | **Allowed** |
| `POST /app/actions/driverActions` | Accept delivery task | Denied | Denied | **Allowed** | **Allowed** |
| `POST /api/driver/location` | Send GPS coordinates | Denied | Denied | **Assigned Only** | **Allowed** |
| `verifyPickupQRCode` | Scan pickup/delivery QR | **Donor/Receiver** | **Receiver** | **Assigned Courier** | **Allowed** |
| `GET /api/audit` | View platform audit logs | Denied | Denied | Denied | **Allowed** |
| `updateUserRoleByAdmin` | Manage user roles & accounts | Denied | Denied | Denied | **Allowed** |
| `POST /api/incidents` | Report issue / dispute | **Involved Only** | **Involved Only** | **Involved Only** | **Allowed** |
| `PATCH /api/incidents/[id]` | Adjudicate incident | Denied | Denied | Denied | **Allowed** |

### Authorization Boundary Enforcement
Authorization checks are performed on every Server Action and API Route handler:
```typescript
const session = await getServerSession(authOptions);
if (!session || !session.user) {
  return { success: false, error: 'Unauthorized: Authentication required.' };
}

// Role gate
if (session.user.role !== 'DONOR' && session.user.role !== 'ADMIN') {
  return { success: false, error: 'Forbidden: Insufficient privileges.' };
}
```

---

## 4. Insecure Direct Object Reference (IDOR) Prevention

To prevent horizontal privilege escalation (e.g., User A accessing or updating User B's records by manipulating URL parameters):

1. **Donation Ownership**:
   - Updates and cancellations query the database matching `where: { id: listingId, donorId: session.user.id }`.
   - Non-matching queries reject the request with `403 Forbidden` or `404 Not Found`.
2. **Claim Privacy**:
   - Receivers can only view claims where `receiverId: session.user.id`.
   - Donors can only view claims on listings where `foodListing.donorId: session.user.id`.
3. **Delivery Routing**:
   - Couriers can only update delivery status or ingest telemetry for tasks where `driverId: session.user.id`.
4. **Private Analytics & Trust Profiles**:
   - Detailed user dispute records, personal audit trails, and internal trust deductions are restricted to the account owner or verified platform admins.

---

## 5. Distributed Atomic Rate Limiting

Rate limiting protects public and protected endpoints from credential stuffing, brute force, and denial of service.

- **Architecture**: Backed by the `RateLimit` table in **Neon PostgreSQL**, ensuring consistency across all distributed, autoscaling Vercel serverless instances (eliminating in-memory desynchronization).
- **Storage Model**:
  ```prisma
  model RateLimit {
    key       String   @id
    points    Int      @default(0)
    expireAt  DateTime
    createdAt DateTime @default(now())

    @@index([expireAt])
  }
  ```
- **Algorithm**: Sliding window counter with atomic `upsert` and increment.
- **Fail-Open Resilience**: If the database rate-limit query encounters transient network latency, the service logs a warning and fails open to avoid blocking legitimate user traffic.
- **Automated Garbage Collection**: Expired records are pruned probabilistically (5% execution sampling).

### Standard Limits
| Resource / Route | Keying Scheme | Window | Max Requests |
|---|---|---|---|
| Authentication (`/api/auth/*`) | `ip:auth` | 60 seconds | 5 attempts |
| Direct S3 Presigning (`/api/upload/presigned-url`) | `user:upload` | 60 seconds | 10 uploads |
| Donation Creation (`/api/listings`) | `user:listing` | 60 seconds | 10 creates |
| Delivery Telemetry (`/api/driver/location`) | `driver:telemetry` | 10 seconds | 15 pings |
| Dispute Submission (`/api/incidents`) | `user:incident` | 300 seconds | 3 submissions |

---

## 6. Input Validation & Data Sanitization

All incoming client data is sanitized and bounded prior to domain service execution (`lib/security.ts`):

1. **Null-Byte & Control Character Stripping**:
   - `sanitizeString(input, maxLength)` strips `\x00` null bytes and ASCII control characters (`\x00-\x08`, `\x0E-\x1F`, `\x7F`) to prevent binary protocol injection and display corruption.
2. **Email Formatting**:
   - Standard regex validation (`EMAIL_REGEX`) with lowercase normalization.
3. **Password Bounds**:
   - Minimum length: 8 characters.
   - Maximum length: 128 characters (prevents bcrypt denial-of-service via computationally expensive long strings).
4. **Geographic Coordinates**:
   - `validateCoordinates(lat, lng)` verifies latitude $[-90, 90]$ and longitude $[-180, 180]$.
5. **URL Sanitization**:
   - `sanitizeUrl(url)` allows relative paths (`/uploads/*`) and validates HTTP/HTTPS protocols, strictly rejecting `javascript:` or data execution schemes.

---

## 7. Data Privacy & Contact Information Redaction

1. **User Object Sanitization**:
   - `sanitizeUser(user)` strips `password` and password hash properties from database entities before serializing JSON payloads.
2. **Selective Contact Disclosure**:
   - Exact physical donor addresses and phone numbers are hidden from public browsing feeds.
   - Delivery addresses and contact phone numbers are only revealed to the assigned courier and verified receiver after a claim has transitioned to `DRIVER_ASSIGNED`.

---

## 8. Safe Error Masking

To prevent information disclosure regarding database schemas, table names, SQL constraints, or stack traces:

- **Central Masking Engine**: `getSafeErrorMessage(error, fallback)` in `lib/security.ts`.
- **Filtering Logic**:
  - Matches whitelisted user-safe business errors (e.g., `'Invalid credentials'`, `'Listing already claimed'`, `'Unauthorized'`).
  - Detects and strips Prisma or SQL keywords (`'Prisma'`, `'SQL'`, `'constraint'`, `'column'`).
  - Replaces internal database errors with a generic user message:
    > *"A database operation could not be completed. Please verify your input."*

---

## 9. HTTP Security Headers

Configured in `next.config.mjs` applied globally to all routes:

```javascript
headers: [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=*, geolocation=*, microphone=()' }
]
```

- **Content-Security-Policy (CSP)**: Enforces restrictive source allowances for scripts, styles, images (including S3 and OpenStreetMap tiles), and connects.
- **HSTS**: Enforces 1-year SSL/TLS duration with subdomains and preload flag.
- **X-Frame-Options**: Set to `DENY` to eliminate clickjacking vulnerabilities.
- **X-Powered-By**: Disabled (`poweredByHeader: false`) to avoid leaking Next.js runtime details.
