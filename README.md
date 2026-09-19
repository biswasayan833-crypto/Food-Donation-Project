# FoodRescue — Intelligent Food Redistribution & Logistics Platform

A production-ready, full-stack logistics and surplus food redistribution platform engineered with **Next.js 14 (App Router)**, **TypeScript**, **Prisma ORM**, **Neon PostgreSQL**, **Tailwind CSS**, **Framer Motion**, and **AWS S3**.

FoodRescue connects commercial food donors, charitable receivers/NGOs, volunteer dispatch drivers, and system administrators into an intelligent, accountable operational network that rescues surplus food before it spoils.

---

## 📌 Problem Statement

Surplus food redistribution presents critical operational and logistics challenges:
- **Perishability & Time Sensitivity**: Cooked and fresh food degrades rapidly within strict food-safety windows. Without real-time prioritization, edible meals spoil before reaching beneficiaries.
- **Recipient Compatibility & Capacity**: Shelters and food banks vary in intake capacities, dietary restrictions, and refrigeration capabilities. Mismatches lead to waste or refusal at dropoff.
- **Volunteer Driver Coordination**: Volunteer courier availability, geographic proximity, and vehicle capacities are unpredictable, making manual dispatching slow and error-prone.
- **Logistics Visibility & Dropoff Verification**: Donors and charities lack real-time visibility into pickup and dropoff states. Handover accountability requires verifiable verification without physical paper trails.
- **Operational Oversight**: Platform administrators require transparent insight into turnaround times, supply forecasts, dispute resolutions, and append-only audit logs.

FoodRescue solves these challenges through deterministic heuristic matching, food urgency scoring, smart driver assignment, and live operational tracking.

---

## 🚀 Core Implemented Features

### 1. Multi-Role Authentication & Access Control
- **4 Dedicated Roles**: Food Donors, NGO/Charity Receivers, Volunteer Couriers, and Platform Administrators.
- **Server-Authoritative RBAC**: NextAuth.js JWT session strategy with server-side role validation on every API route and Server Action.
- **Privilege Escalation Protection**: Prevents self-registration or unauthorized elevation to Admin status.

### 2. Donor Workflows
- **Food Listing Management**: Post surplus food with quantities, dietary categories (`VEG`, `NON_VEG`, `RAW`, `COOKED`), and storage temperatures (`ROOM_TEMP`, `REFRIGERATED`, `FROZEN`).
- **Mandatory Food Safety Checklist**: Pre-publish compliance confirmation preventing hazardous or spoiled food from entering the redistribution stream.
- **Direct AWS S3 Presigned Uploads**: Drag-and-drop food photo uploads streaming directly from the browser to Amazon S3.
- **Donor Command Center**: Live donation tracking, smart receiver recommendation previews, and trust score metrics.

### 3. Receiver / NGO Workflows
- **Real-Time Surplus Discovery**: Filterable discovery catalog with dietary filtering, urgency countdown badges, and distance calculations.
- **Atomic One-Click Claiming**: Database-level conditional updates eliminating double-claiming race conditions.
- **Dropoff QR Code Secret Generation**: Unique cryptographic handover tokens generated for every claim.
- **Beneficiary Command Center**: Manage active claims, incoming courier telemetry, and organization intake capacity.

### 4. Volunteer Courier Workflows
- **Unassigned Deliveries Feed**: Available delivery feed with redacted contact phone numbers to safeguard donor and receiver privacy prior to courier assignment.
- **Atomic Task Acceptance**: Prevents driver assignment collisions under concurrent acceptance.
- **Driver Workspace**: Manage assigned pickup and delivery runs, update real-time GPS coordinates, and transition delivery states.
- **In-App QR Scanner**: Integrated HTML5 camera QR scanner (`html5-qrcode`) for contactless dropoff verification.

### 5. Administrator Control Center
- **System Impact Analytics**: Real-time platform metrics (rescue success rate, average turnaround times, active couriers, rescued quantity).
- **Predictive Surplus Forecasting**: 7-day volume projections, day-of-week seasonality, and capacity risk levels.
- **Dispute & Incident Moderation**: Formal dispute resolution system with status updating (`OPEN`, `UNDER_REVIEW`, `RESOLVED`, `DISMISSED`).
- **System Audit Trail**: Searchable, append-only audit log viewer with actor, action, and entity filters.
- **User & Listing Moderation**: Role reassignment and status overrides.

### 6. Intelligent Logistics & Scoring Engines
- **Smart Donation Matching**: Multi-factor ranking scoring receivers based on geographic distance (Haversine formula), category compatibility, daily capacity, and active workload.
- **Food Urgency Engine**: Dynamic 0–100 urgency score calculated from expiry countdowns, perishable food category weights, temperature controls, and preparation timestamps.
- **Smart Driver Assignment**: 7-factor courier ranking incorporating proximity, availability, active job capacity (capped at 3 concurrent deliveries), and calculated travel ETA.
- **Predictive Food Surplus Engine**: Blended 7-day and 30-day Simple Moving Averages, day-of-week seasonality coefficients, trend velocity, and community capacity risk assessment.
- **Trust & Reputation Engine**: 0–100 merit-based trust scores evaluated dynamically from Neon PostgreSQL transaction history across 5 role-specific pillars and verifiable merit badges.

### 7. Delivery Tracking & Real-Time Communications
- **5-Stage Delivery State Machine**: Server-authoritative transitions (`UNASSIGNED` $\to$ `DRIVER_ASSIGNED` $\to$ `PICKUP_STARTED` $\to$ `PICKED_UP` $\to$ `IN_TRANSIT` $\to$ `DELIVERED`).
- **Near-Real-Time GPS Telemetry**: Driver location tracking with client polling and ETA calculation.
- **Multi-Party In-App Notifications**: Automated notification dispatch for assignment, pickup, transit, and delivery events with a 15-second deduplication guard.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | Next.js 14.2 (App Router), React 18, TypeScript 5.7 |
| **Styling & UI** | Tailwind CSS 3.4, Lucide React icons, Radix UI primitives |
| **Cinematic Motion** | Framer Motion 13.2 (respects `prefers-reduced-motion`) |
| **Backend & APIs** | Next.js Route Handlers, Next.js Server Actions |
| **Database & ORM** | Neon Serverless PostgreSQL, Prisma ORM 5.22 |
| **Authentication** | NextAuth.js v4 (JWT Session Strategy), bcryptjs |
| **Cloud Storage** | AWS S3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) |
| **Hardware / QR** | `html5-qrcode` (Camera Scanner), `qrcode.react` (Token Display) |
| **Hosting & Target Deployment** | Vercel (Frontend & Serverless Edge), Neon (Database), AWS (Storage) |

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Client ["Client Layer (Browser)"]
        UI["Next.js App Router (React 18 + Tailwind CSS + Framer Motion)"]
        QR_Scan["HTML5 QR Camera Scanner & Display Modal"]
        S3_Up["ImageUploader (Client-Direct S3 Presigned PUT)"]
    end

    subgraph Edge ["Next.js Server Layer (Vercel)"]
        Auth["NextAuth.js v4 (Credentials Provider, JWT Session Strategy)"]
        RL["Rate Limiter (Neon PostgreSQL Atomic Counter)"]
        SA["Server Actions (Donation, Claim, Driver, Verification, Admin)"]
        API["Route Handlers (/api/listings, /api/claims, /api/driver, /api/analytics, etc.)"]
    end

    subgraph Services ["Business Service Layer"]
        Matching["donation-matching.service.ts"]
        Urgency["food-urgency.service.ts"]
        Dispatch["driver-assignment.service.ts"]
        Tracking["delivery-tracking.service.ts"]
        Analytics["impact-analytics.service.ts"]
        Forecast["surplus-prediction.service.ts"]
        Reputation["reputation.service.ts"]
        Audit["audit.service.ts"]
        Notify["notification.service.ts"]
        Incidents["incident.service.ts"]
    end

    subgraph Data ["Data & Storage Layer"]
        Prisma["Prisma ORM 5.22 (Client Singleton & Connection Pooling)"]
        Neon[(Neon Serverless PostgreSQL)]
        S3[(AWS S3 Bucket: shareplate-food-donations)]
    end

    UI --> Auth
    UI --> RL
    RL --> SA
    RL --> API
    S3_Up -->|1. Request Presigned URL| API
    S3_Up -->|2. Direct Upload PUT| S3
    SA --> Services
    API --> Services
    Services --> Prisma
    Prisma -->|Pooled Queries & Direct Migrations| Neon
```

---

## 🧠 Intelligent Heuristic Systems

All intelligent systems in FoodRescue are **deterministic, server-authoritative heuristic engines** grounded in mathematical formulas and database state (no unpredictable black-box models).

### 1. Smart Donation Matching (`services/donation-matching.service.ts`)
Evaluates candidate charities for a specific food donation using a 0–100 composite ranking:
- **Proximity Score (35%)**: Calculated via the Haversine distance formula between donor coordinates and receiver address. Receivers outside their configured `serviceRadiusKm` receive 0 points.
- **Dietary Compatibility (25%)**: Strict verification against receiver's `acceptedCategories` (`VEG`, `NON_VEG`, `RAW`, `COOKED`). Incompatible categories are excluded.
- **Capacity Fit (20%)**: Compares donation servings against receiver's `dailyCapacity`.
- **Active Workload (10%)**: Penalizes receivers with high concurrent pending pickups to prevent intake bottlenecks.
- **Operational Availability (10%)**: Verification of `isAvailable` operational status.

### 2. Food Urgency & Freshness Engine (`services/food-urgency.service.ts`)
Determines operational dispatch priority on a 0–100 scale:
- **Expiry Window**: Time remaining until food reaches cutoff date/time.
- **Perishability Weight**: Cooked meals degrade faster than raw ingredients, which degrade faster than shelf-stable goods.
- **Temperature Control Multiplier**: `ROOM_TEMP` (1.3x urgency) > `REFRIGERATED` (1.0x baseline) > `FROZEN` (0.8x buffered).
- **Preparation Decay**: Incorporates elapsed hours since initial food preparation timestamp.
- **Categorization**: Bounded into 4 operational levels: `LOW` (0–39), `MEDIUM` (40–69), `HIGH` (70–84), `CRITICAL` (85–100).
- *Disclaimer: This engine calculates operational scheduling priority and does NOT certify microbiological food safety.*

### 3. Volunteer Driver Assignment (`services/driver-assignment.service.ts`)
Ranks available volunteer couriers for an active delivery:
- **Proximity**: Driver distance from pickup location.
- **Travel ETA**: Deterministic travel estimation:
  $$\text{ETA (minutes)} = \left(\frac{\text{Distance (km)}}{25\text{ km/h}} \times 60\right) + 3\text{ min fixed buffer}$$
- **Workload Balancing**: Couriers with $\ge 3$ active deliveries are capped and excluded to maintain delivery punctuality.
- **Service Area**: Verifies pickup and dropoff fall within driver's active service radius.
- **Urgency Escalation**: Applies urgency multipliers to prioritize swift dispatch for critical donations.

### 4. Impact Analytics & Transparent Scoring (`services/impact-analytics.service.ts`)
- **Operational Metrics**: Total donations, rescue success rate, total quantity rescued, and turnaround times (Donation $\to$ Claim, Claim $\to$ Pickup, Pickup $\to$ Delivery, and Total Rescue Duration).
- **Transparent Impact Score (0–100)**: Evaluated across 5 measurable pillars: Rescue Success Rate (30%), Delivery Reliability (25%), Response Velocity (20%), Volunteer Engagement (15%), and Urgent Rescue Rate (10%).

### 5. Predictive Food Surplus Engine (`services/surplus-prediction.service.ts`)
- **Moving Averages**: Blends 7-day Simple Moving Average (70% weight) and 30-day SMA (30% weight) from historical Neon PostgreSQL donation entries.
- **Day-of-Week Seasonality**: Multiplier coefficients relative to 60-day baseline mean.
- **Trend Velocity**: Percentage change and directional velocity (`INCREASING`, `STABLE`, `DECREASING`).
- **Community Capacity Risk**: Evaluates projected surplus servings against active receiver capacity and volunteer fleet bandwidth, categorizing risk as `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.
- *Disclaimer: Surplus predictions represent statistical operational forecasts and are not guarantees.*

### 6. Trust, Reputation & Badges (`services/reputation.service.ts`)
- **Dynamic 0–100 Rating**: Evaluated on-the-fly from live PostgreSQL history with zero client tampering allowed.
- **Role-Specific Pillars**:
  - *Donor*: Rescue Volume, Listing Completion Rate, Safety Checklist Compliance, Dispute Cleanliness, Platform Longevity.
  - *Receiver*: Intake Reliability, Acceptance Speed, Low Incident Rate, Beneficiary Longevity.
  - *Volunteer Driver*: Completed Runs, Delivery Punctuality, Task Integrity, Active Standing.
- **Verifiable Badges**: `VERIFIED_MEMBER`, `RELIABLE_DONOR`, `COMMITTED_RECEIVER`, `TOP_COURIER`, `ZERO_INCIDENTS`, `IMPACT_CHAMPION`.

---

## 🔄 Delivery Lifecycle State Machine

Delivery progression is enforced by a **server-authoritative finite state machine** in [`services/delivery-tracking.service.ts`](services/delivery-tracking.service.ts):

```
[ UNASSIGNED ]
      │
      ▼ (Courier accepts task / Donor assigns courier)
[ DRIVER_ASSIGNED ]
      │
      ▼ (Courier begins transit to donor location)
[ PICKUP_STARTED ]
      │
      ▼ (Courier arrives at donor and receives food)
[ PICKED_UP ]
      │
      ▼ (Courier departs donor location en route to charity)
[ IN_TRANSIT ]
      │
      ▼ (Courier scans receiver QR Code Secret at dropoff)
[ DELIVERED ] ──► (Claim automatically marks COMPLETED; Listing marks COMPLETED)
```

- **Atomic Status Validation**: Invalid transitions (e.g. `DRIVER_ASSIGNED` directly to `DELIVERED`) are rejected with `400 Bad Request`.
- **Terminal State Protection**: Once marked `DELIVERED`, claims reach a final terminal state and cannot transition backward.
- **Concurrent Update Elimination**: Conditional queries (`where: { id, deliveryStatus: currentStatus }`) prevent race conditions.
- **Dropoff Handover Verification**: Final completion requires scanning the receiver's cryptographic `qrCodeSecret` via camera scanner or verified verification action.

---

## 🛡️ Production Security Architecture

- **Session Authentication & RBAC**: NextAuth JWT session strategy with server-side identity resolution via `getServerSession(authOptions)`. Role and ownership are verified on every protected action.
- **IDOR / Object Reference Protection**: Users cannot modify, claim, or cancel donations, claims, or disputes belonging to other users. Third-party mutations return `403 Forbidden`.
- **Concurrency Hardening**: Atomic conditional updates (`updateMany` with precondition checks) prevent double-claiming and driver assignment collisions.
- **Serverless Distributed Rate Limiting**: Backed by Neon PostgreSQL `RateLimit` table:
  - Auth routes: 5 attempts/min per IP.
  - Claiming: 10 claims/min per user.
  - File upload presigning: 15 requests/min per user.
  - Incident filing: 5 reports/min per user.
  - Driver GPS telemetry: 60 pings/min per courier.
- **Contact Number Privacy**: Donor and recipient phone numbers are redacted (`null`) in unassigned delivery feeds until a volunteer courier is officially assigned to the task.
- **Safe Error Masking**: `getSafeErrorMessage()` intercepts database exceptions, preventing internal SQL statements, table structures, or Prisma metadata from leaking to clients.
- **Sensitive Data Exclusion**: Password hashes are stripped from user queries via `sanitizeUser()` and explicit Prisma projections.
- **HTTP Security Headers**: Configured in `next.config.mjs`:
  - `X-Frame-Options: DENY` (Clickjacking prevention)
  - `X-Content-Type-Options: nosniff` (MIME-sniffing prevention)
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `Content-Security-Policy`: Restricts scripts, styles, OpenStreetMap map tiles, and S3 remote storage.
  - `Permissions-Policy`: Whitelists `camera=(self)` for QR scanning and `geolocation=(self)` for driver GPS telemetry.

---

## 🧪 Testing & Quality Assurance

FoodRescue has undergone comprehensive functional, regression, integration, and security test passes across 10 completed sprints:

| Suite | Scope | Verified Checks | Result |
| :--- | :--- | :--- | :--- |
| **Sprint 10 Suite** | Production Readiness, DB Integrity, S3 Presigning, Security | 35 / 35 Checks | **100% PASSED** |
| **Sprint 9 Suite** | 4 User Roles, 13-Step Operational Chain, Security QA, Index Latency | 48 / 48 Checks | **100% PASSED** |
| **Sprint 8 Suite** | Security Hardening, Rate Limiting, Race Conditions, IDOR Protection | 31 / 31 Checks | **100% PASSED** |
| **Sprint 7 Suite** | Trust Score Engine, Merit Badges, Disputes, Append-Only Audit Trail | 36 / 36 Checks | **100% PASSED** |
| **Sprint 6 Suite** | Impact KPIs, Turnaround Analytics, Surplus Forecasting Models | 47 / 47 Checks | **100% PASSED** |
| **Sprint 5 Suite** | 5-Stage Delivery State Machine, GPS Telemetry, In-App Notifications, QR | 28 / 28 Checks | **100% PASSED** |
| **Sprint 4 Suite** | 7-Factor Driver Dispatch Ranking & Workload Balancer | 21 / 21 Checks | **100% PASSED** |
| **Sprint 3 Suite** | Food Urgency & Freshness Degradation Engine | 13 / 13 Checks | **100% PASSED** |
| **Sprint 2 Suite** | Smart Donation Recommendation & Receiver Matching | All Checks | **100% PASSED** |
| **Sprint 1 Suite** | RBAC Session Scoping & Security Enforcement | All Checks | **100% PASSED** |
| **Total Automated Tests** | **Comprehensive Multi-Sprint Coverage** | **260+ Checks** | **100% PASSED** |

### Quality Gates
- **TypeScript (`npx tsc --noEmit`)**: **0 errors (Exit code 0)**
- **ESLint (`npm run lint`)**: **0 errors (Exit code 0)**
- **Next.js Production Build (`npm run build`)**: **Exit code 0** (All application routes compiled and optimized)

---

## 🚢 Production Deployment

The platform is prepared for production deployment using **Vercel** connected to **Neon Serverless PostgreSQL** and **Amazon S3**:

```
GitHub (main branch) ──► Vercel (Auto-Build & Edge Hosting) ──► Neon PostgreSQL (neondb)
                                        │
                                        └──► Amazon Web Services (S3 Bucket)
```

### Environment Variables Configuration
Configure the following variable names in **Vercel Project Settings $\to$ Environment Variables**:

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://username:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://username:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require"
DATABASE_URL_POOLED="postgresql://username:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Authentication (NextAuth.js)
NEXTAUTH_SECRET="generate-a-strong-random-secret-at-least-32-chars"
NEXTAUTH_URL="https://your-production-app.vercel.app"

# Storage (AWS S3)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
AWS_S3_BUCKET_NAME="shareplate-food-donations"
```

---

## 📁 Project Structure

```
├── app/
│   ├── actions/                   # Server Actions (donation, claim, driver, verification, admin)
│   ├── admin/page.tsx             # Platform Admin workspace & moderation center
│   ├── api/                       # REST API route handlers (claims, listings, driver, incidents, etc.)
│   ├── auth/                      # Authentication pages (signin, register, signup)
│   ├── dashboard/                 # Role-specific workspaces (donor, receiver, driver)
│   ├── donations/                 # Donation discovery, creation, details, and QR verification
│   ├── layout.tsx                 # Root layout with responsive Navbar and Footer
│   └── page.tsx                   # Cinematic landing page with live operational metrics
├── components/                    # 21 modular UI components (Cards, Badges, Modals, Charts, Uploader)
├── docs/                          # Specialized technical documentation
│   ├── ARCHITECTURE.md            # System architecture and data flow specifications
│   ├── SECURITY.md                # Security protections, RBAC, and rate limiting details
│   ├── TESTING.md                 # Test engineering documentation and regression results
│   ├── DEPLOYMENT.md              # Production deployment runbook and checklist
│   └── RESUME.md                  # Concise resume and portfolio description
├── lib/                           # Core utilities (auth, geo, motion, prisma, rate-limit, s3, security)
├── prisma/
│   ├── migrations/                # Version-controlled PostgreSQL SQL migrations
│   ├── schema.prisma              # Production database schema (7 models with compound indexes)
│   └── seed.ts                    # Database seed script for development and evaluation
├── scratch/                       # Automated regression and smoke test suites (Sprints 7–10)
├── services/                      # 10 domain services (matching, urgency, dispatch, tracking, etc.)
├── types/                         # TypeScript interface declarations
├── next.config.mjs                # Next.js configuration with security headers & remote image patterns
└── package.json                   # Project dependencies and build scripts
```

---

## 🔮 Future Improvements

1. **Native Push Notifications**: Integration with Web Push / Service Workers for mobile background delivery alerts.
2. **Automated SMS Dispatch**: Twilio integration for emergency driver dispatch alerts during critical surplus spikes.
3. **Multi-Stop Route Optimization**: Multi-dropoff routing algorithms for volunteer drivers handling multiple pickups on a single journey.
4. **Internationalization (i18n)**: Multi-language support to expand food rescue access across diverse multilingual communities.

---

## 👨‍💻 Author

**Ayan Biswas**  
*B.E. Computer Science & Engineering*
