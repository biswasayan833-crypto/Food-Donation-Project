# System Architecture — FoodRescue

**FoodRescue** is a production-ready, intelligent food redistribution and volunteer logistics platform built on **Next.js 14 App Router**, **Neon PostgreSQL**, **Prisma ORM**, and **AWS S3**.

This document describes the end-to-end system architecture, data flow pipelines, domain service boundaries, database connection pooling strategies, client telemetry mechanisms, and cloud media storage.

---

## 1. High-Level System Architecture

```mermaid
graph TD
    subgraph ClientLayer ["Client Layer (Browser / Mobile Web)"]
        UI["Next.js 14 App Router (React 18, Tailwind CSS, Framer Motion)"]
        CamScanner["html5-qrcode Scanner & qrcode.react Modal"]
        S3Uploader["ImageUploader (Direct S3 PUT)"]
        PollEngine["Client Telemetry & Notification Poller (10-15s Intervals)"]
    end

    subgraph EdgeServerLayer ["Serverless Application Layer (Next.js / Vercel)"]
        NextAuth["NextAuth.js v4 (JWT Strategy, RBAC Guard)"]
        SecHeaders["Security Headers & Error Masking (lib/security.ts)"]
        
        subgraph ServerActions ["Server Actions (app/actions/)"]
            ActListing["listingActions.ts / donationActions.ts"]
            ActClaim["claimActions.ts / claimFoodActions.ts"]
            ActDriver["driverActions.ts"]
            ActVerify["verificationActions.ts"]
            ActAdmin["adminActions.ts"]
        end

        subgraph RouteHandlers ["API Route Handlers (app/api/)"]
            ApiUpload["/api/upload/presigned-url (S3 Presigner)"]
            ApiTelemetry["/api/driver/location"]
            ApiTracking["/api/listings/[id]/tracking"]
            ApiNotifs["/api/notifications"]
            ApiAnalytics["/api/analytics"]
            ApiAudit["/api/audit"]
            ApiIncidents["/api/incidents"]
            ApiTrust["/api/reputation/[userId]"]
        end

        subgraph DomainServices ["Domain Service Layer (services/)"]
            SvcMatching["donation-matching.service.ts"]
            SvcUrgency["food-urgency.service.ts"]
            SvcDriver["driver-assignment.service.ts"]
            SvcTracking["delivery-tracking.service.ts"]
            SvcIncident["incident.service.ts"]
            SvcReputation["reputation.service.ts"]
            SvcAudit["audit.service.ts"]
            SvcAnalytics["impact-analytics.service.ts"]
            SvcSurplus["surplus-prediction.service.ts"]
            SvcNotification["notification.service.ts"]
        end

        RateLimiter["Atomic Rate Limiter (lib/rate-limit.ts)"]
        PrismaClient["Prisma ORM Client 5.22 (lib/prisma.ts)"]
    end

    subgraph DataStorageLayer ["Cloud Data & Storage Layer"]
        subgraph NeonPostgres ["Neon Serverless PostgreSQL (AWS us-east-2)"]
            PgBouncer["PgBouncer Connection Pooler (Port 5432 / 6543)"]
            NeonDirect["Direct PostgreSQL Instance (DIRECT_URL)"]
            RelationalData[("Relational Data & Indexes\n(User, FoodListing, Claim, Notification,\nIncident, AuditLog, RateLimit)")]
        end
        S3Bucket[("AWS S3 Bucket: shareplate-food-donations\n(Presigned PUT Storage)")]
    end

    %% Flow connections
    UI --> NextAuth
    NextAuth --> SecHeaders
    SecHeaders --> ServerActions
    SecHeaders --> RouteHandlers
    RouteHandlers --> RateLimiter
    RateLimiter --> PrismaClient

    ServerActions --> DomainServices
    RouteHandlers --> DomainServices
    DomainServices --> PrismaClient

    S3Uploader -->|1. Request Presigned URL| ApiUpload
    S3Uploader -->|2. Direct Binary PUT| S3Bucket

    PollEngine -->|Periodic GET/POST| ApiTelemetry
    PollEngine -->|Periodic GET| ApiNotifs

    PrismaClient -->|DATABASE_URL (Pooled)| PgBouncer
    PgBouncer --> RelationalData
    NeonDirect -.->|DIRECT_URL (Migrations only)| RelationalData
```

---

## 2. End-to-End Data Flow Pipeline

The platform follows a unidirectional data flow with server-side authorization and atomic database operations:

```
[User Action in UI]
       │
       ▼
[Client Component (React 18 + Framer Motion)]
       │
       ▼
[Server Action / API Route Entrypoint]
       │
       ├──► 1. Session & Token Validation (NextAuth.js getServerSession)
       ├──► 2. RBAC Permission Check (requireRole / requireAdmin)
       ├──► 3. Atomic Rate Limiting Check (Neon RateLimit table upsert)
       ├──► 4. Input Sanitization & Bounds Checking (lib/security.ts)
       │
       ▼
[Domain Service Layer (services/*.service.ts)]
       │
       ├──► Evaluates business constraints & mathematical heuristics
       ├──► Validates state machine transitions (e.g., AVAILABLE -> CLAIMED -> PICKED_UP)
       ├──► Prepares audit log event payload
       │
       ▼
[Prisma ORM 5.22 (lib/prisma.ts)]
       │
       ├──► Parameterized SQL query generation (zero SQL injection vector)
       ├──► Interactive database transaction ($transaction) when multi-table atomicity is required
       │
       ▼
[Neon Serverless PostgreSQL (AWS us-east-2)]
       │
       ├──► PgBouncer connection pooler receives transaction
       ├──► Relational constraints, foreign keys, and compound indexes evaluated
       ├──► Data committed to durable storage
       │
       ▼
[Server Action / API Response]
       │
       ├──► Sensitive data redacted (passwords, hashes, donor coordinates if unassigned)
       ├──► Error masked via getSafeErrorMessage() (zero SQL/schema leaks)
       │
       ▼
[Client State Update & UI Transition]
```

---

## 3. Domain Services Architecture

All business logic, mathematical heuristics, and domain state mutations are encapsulated in modular TypeScript services within `services/`. Server actions and API routes act as transport controllers and delegate directly to these services:

### 1. `food-urgency.service.ts` (Dynamic Food Urgency Engine)
- **Responsibility**: Computes dynamic urgency scores ($0$ to $100$) and status levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) using a deterministic exponential half-life degradation formula based on category perishable decay rates and hours until expiration.
- **Key Functions**:
  - `calculateUrgency(listing)`: Evaluates time delta against perishable category thresholds (e.g., cooked meals decay faster than dry grains).
  - `getUrgencyMultiplier(category)`: Returns decay coefficients for 7 food categories.

### 2. `donation-matching.service.ts` (Smart Matching Engine)
- **Responsibility**: Matches active food listings to nearby receivers based on spherical geographic proximity (Haversine formula), capacity requirements, dietary preferences, and urgency.
- **Key Functions**:
  - `rankMatchesForReceiver(receiverId, filters)`: Evaluates available listings, computes distance in kilometers, scores compatibility ($0-100$), and sorts by match priority.
  - `haversineDistance(lat1, lon1, lat2, lon2)`: Computes great-circle distance between two geographic coordinate pairs.

### 3. `driver-assignment.service.ts` (Courier Dispatch & Routing Engine)
- **Responsibility**: Selects and ranks eligible volunteer drivers for unassigned delivery tasks using a deterministic scoring algorithm combining driver distance, vehicle capacity matching, driver rating, and current delivery workload.
- **Key Functions**:
  - `findOptimalCouriers(claimId)`: Ranks available drivers within dispatch radius.
  - `assignCourier(claimId, driverId)`: Executes an atomic update ensuring no courier double-booking.

### 4. `delivery-tracking.service.ts` (Courier Telemetry & Lifecycle Management)
- **Responsibility**: Manages the multi-stage delivery state machine (`UNASSIGNED` $\to$ `DRIVER_ASSIGNED` $\to$ `PICKED_UP` $\to$ `DELIVERED`), ingests courier GPS coordinates, and calculates remaining distance/ETA.
- **Key Functions**:
  - `updateCourierLocation(driverId, lat, lon)`: Updates driver telemetry record.
  - `getDeliveryTracking(claimId)`: Returns current courier location, route polyline coordinates, delivery phase, and ETA.

### 5. `reputation.service.ts` (Transparent Trust & Reputation Engine)
- **Responsibility**: Calculates multi-pillar reputation profiles ($0-100$) for platform actors across 4 weighted operational pillars:
  - **Fulfillment Reliability** ($35\%$)
  - **Punctuality & Speed** ($25\%$)
  - **Community Feedback** ($25\%$)
  - **Safety & Compliance** ($15\%$)
- **Key Functions**:
  - `getUserReputationProfile(userId)`: Computes pillar breakdown, assigned tier (`NEW_MEMBER`, `RELIABLE`, `TRUSTED`, `EXEMPLARY`), and dynamic merit badges (`EARLY_ADOPTER`, `RESCUE_HERO`, `SAFETY_CHAMPION`, `PERFECT_RECORD`).

### 6. `incident.service.ts` (Incident Reporting & Dispute Resolution)
- **Responsibility**: Manages dispute reporting, evidence collection, admin adjudication, and resolution status transitions (`OPEN`, `UNDER_REVIEW`, `RESOLVED`, `DISMISSED`).
- **Key Functions**:
  - `createIncident(...)`: Records safety, spoilage, or no-show complaints with evidence URLs.
  - `resolveIncident(incidentId, adminId, resolution, deduction)`: Adjudicates dispute and applies calibrated trust score deductions.

### 7. `audit.service.ts` (Append-Only Platform Audit Logging)
- **Responsibility**: Records append-only, tamper-evident audit log entries for all security, financial, and lifecycle state changes across the system.
- **Key Functions**:
  - `logAuditEvent(actorId, action, entityType, entityId, metadata)`: Inserts audit log records.
  - `getAuditLogs(query)`: Admin-only filtered query interface with pagination.

### 8. `impact-analytics.service.ts` (Operational Impact Analytics)
- **Responsibility**: Aggregates real operational metrics from Neon PostgreSQL: completed rescues, total weight salvaged (kg), meals rescued (calculated via the project's configured meal-to-weight conversion methodology), active donors, and partner NGOs.
- **Key Functions**:
  - `getPlatformImpactSummary()`: Returns verifiable database-backed platform totals.
  - `getUserImpactMetrics(userId)`: Returns user-specific operational footprint.

### 9. `surplus-prediction.service.ts` (Historical Surplus & Demand Forecasting)
- **Responsibility**: Computes day-of-week and seasonal surplus trend forecasts using historical donation frequency and quantity distributions per geographic cluster.
- **Key Functions**:
  - `getSurplusForecast(zipOrCity)`: Generates day-of-week surplus probability and recommended pickup windows.

### 10. `notification.service.ts` (In-App Notification Dispatcher)
- **Responsibility**: Creates and manages in-app notification records for all 4 user roles with type-safe metadata and read/unread state management.
- **Key Functions**:
  - `sendNotification(userId, title, message, type, link)`: Dispatches notification to database.
  - `getUserNotifications(userId, unreadOnly)`: Fetches paginated alerts for active user.

---

## 4. Telemetry & Client Polling Architecture

To ensure compatibility with serverless environments (Vercel) and avoid connection exhaustion on serverless database pools, **FoodRescue intentionally uses client-side adaptive polling** rather than persistent WebSockets.

### Why Adaptive Polling?
1. **Serverless Compatibility**: Next.js on Vercel runs ephemeral serverless lambda executions. Persistent WebSocket servers require dedicated compute instances (e.g., EC2, container sidecars), introducing unnecessary operational overhead and scaling complexity.
2. **Database Connection Preservation**: Long-lived server connections hold database sockets open. Short HTTP polling requests execute in milliseconds, release database connections back to the PgBouncer pool immediately, and exit.
3. **Resilience & Self-Healing**: Mobile couriers frequently traverse cellular dead zones. Polling automatically recovers when network connectivity resumes without complex socket reconnection handshakes or state re-synchronization.

### Polling Contracts & Intervals
| Feature | Endpoint | Method | Interval | Payload / Response |
|---|---|---|---|---|
| **Courier GPS Ingestion** | `/api/driver/location` | `POST` | 10–15 seconds | Ingests `{ driverId, lat, lon }` |
| **Active Delivery Tracking** | `/api/listings/[id]/tracking` | `GET` | 10–15 seconds | Returns courier coords, route status, ETA, verification state |
| **In-App Notifications** | `/api/notifications` | `GET` | 15 seconds | Returns unread notification count and latest 10 alerts |
| **Available Donations Feed** | `/api/listings` | `GET` | On-demand / 30s | Returns active listings with dynamic urgency scores |

---

## 5. Database Architecture: Neon PostgreSQL & Connection Pooling

FoodRescue utilizes a production **Neon Serverless PostgreSQL** cluster in AWS `us-east-2`. Neon separates compute from storage, dynamically autoscaling compute instances while maintaining persistent storage on NVMe SSDs.

### Dual-URL Strategy in Prisma (`schema.prisma`)
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

1. **`DATABASE_URL` (Pooled Connection — Port 5432 / 6543 via PgBouncer)**:
   - Utilized by the Next.js runtime (Server Actions, API Routes, Domain Services).
   - Routes queries through Neon's integrated PgBouncer pooler in **transaction pooling** mode.
   - Allows hundreds of concurrent Vercel serverless functions to execute without exceeding PostgreSQL's maximum connection limit (`max_connections`).

2. **`DIRECT_URL` (Direct Connection — Port 5432 to Primary PostgreSQL Engine)**:
   - Utilized exclusively by Prisma CLI tooling (`npx prisma migrate deploy`).
   - Direct TCP connection required for schema migrations, advisory locks (`pg_locks`), and DDL commands that cannot run over transaction-pooled PgBouncer connections.

### Relational Schema & Indexing Topology
The database schema (`prisma/schema.prisma`) defines 7 models with compound indexes optimized for production query access patterns:
- **`FoodListing`**: Indexed on `[status, expiryTime]`, `[donorId]`, `[category]`.
- **`Claim`**: Indexed on `[status, deliveryStatus]`, `[receiverId]`, `[driverId]`, `[foodListingId]`.
- **`Notification`**: Indexed on `[userId, isRead]`, `[createdAt]`.
- **`AuditLog`**: Indexed on `[entityType, entityId]`, `[actorId]`, `[createdAt]`.
- **`Incident`**: Indexed on `[status]`, `[claimId]`, `[reporterId]`.
- **`RateLimit`**: Primary key `[key]`, indexed on `[expiresAt]`.

---

## 6. Cloud Media Storage: AWS S3 Direct Presigned PUT

Image uploads (food listing photos, delivery verification photos) bypass the application server entirely via AWS S3 Presigned URLs:

```
[Browser Client]                    [Next.js Server]                   [AWS S3 Bucket]
       │                                   │                                  │
       ├──► 1. POST /api/upload ──────────►│                                  │
       │    { filename, contentType }      ├──► Authenticate session          │
       │                                   ├──► Validate MIME & Size          │
       │                                   ├──► Generate unique key           │
       │                                   ├──► Call PutObjectCommand         │
       │                                   │    via @aws-sdk/s3-request-presigner
       │◄── 2. Return { presignedUrl, ─────│                                  │
       │               publicUrl, key }    │                                  │
       │                                                                      │
       ├──► 3. PUT binary image stream directly to presignedUrl ─────────────►│
       │       Headers: { Content-Type: image/jpeg }                          ├──► Store binary
       │◄── 4. 200 OK (S3 direct response) ───────────────────────────────────│
       │
       ├──► 5. Submit Form with publicUrl stored in database
```

### Advantages:
- **Zero Server Memory Footprint**: Large binary files never pass through Next.js serverless functions, avoiding memory spikes, function timeouts, and payload size limits (Vercel 4.5MB request limit).
- **Security**: AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) remain strictly on the server and are never exposed to the browser.
- **S3 Bucket Security & CORS**: The S3 bucket blocks public PUTs and only accepts PUT requests authenticated by the presigned cryptographic signature. A permissive CORS rule allows authorized client origins to perform `PUT` operations.
- **Local / CI Fallback**: If AWS environment variables are not configured, the service seamlessly falls back to inline base64 data URLs for offline development and testing.
