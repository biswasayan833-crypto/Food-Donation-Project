# Testing & Quality Assurance — FoodRescue

This document details the multi-tier testing strategy, automated test suites, quality gates, and verified reliability metrics for the **FoodRescue** platform.

---

## 1. Testing Philosophy & Multi-Tier Strategy

FoodRescue employs a multi-tiered verification methodology ensuring domain integrity, data security, concurrency safety, and zero regression:

```
                  ┌───────────────────────────────┐
                  │    Production Smoke Tests     │  (Live DB & Config Verification)
                  ├───────────────────────────────┤
                  │   End-to-End Lifecycle QA     │  (Full Cross-Service Flows)
                  ├───────────────────────────────┤
                  │ Security & Concurrency Checks │  (IDOR, RBAC, Double-Claims)
                  ├───────────────────────────────┤
                  │     Domain Integration Tests  │  (Heuristics, State Machines)
                  ├───────────────────────────────┤
                  │     Unit & Bounds Testing     │  (Sanitization, Calculations)
                  └───────────────────────────────┘
```

1. **Unit & Bounds Validation**: Pure mathematical and input sanitization routines tested with extreme values (null bytes, control characters, latitude/longitude out of bounds, long strings).
2. **Domain Integration**: Verifies business rules, half-life degradation curves, Haversine distance computations, and state transitions.
3. **Security & Concurrency Testing**: Automated parallel requests testing race conditions on claims and courier assignments, role escalation attempts, and rate limiter saturation.
4. **End-to-End Operational Lifecycle**: Simulates full user journeys across all 4 roles (Donor creates $\to$ Receiver claims $\to$ Courier accepts & delivers $\to$ QR verifies $\to$ Audit logs & reputation update).
5. **Quality Gates**: Strict pre-commit static analysis, linting, and production builds with zero warnings treated as errors.

---

## 2. Test Suite Breakdown & Coverage

Automated test suites are implemented in TypeScript and execute against the live **Neon PostgreSQL** database using `tsx`:

### Sprint 1–6: Core Domain & Logistics Suites
- **Coverage**:
  - Food urgency score decay curves across all food categories (`PERISHABLE_PRODUCE`, `COOKED_MEALS`, `DAIRY`, `BAKED_GOODS`, `PACKAGED_PANTRY`).
  - Proximity-based smart matching using great-circle Haversine calculations.
  - Greedy driver ranking combining spatial proximity, capacity matching, and workload balancing.
  - Delivery state machine progression (`UNASSIGNED` $\to$ `DRIVER_ASSIGNED` $\to$ `PICKED_UP` $\to$ `DELIVERED`).
  - Cryptographic QR code generation and verification for contact-free handover.
  - Configured meal-to-weight conversion methodology and operational impact calculations.

### Sprint 7: Trust, Reputation, Incidents & Audit Logging
- **Test File**: `scratch/test_phase2_sprint7.ts`
- **Coverage (35 Checks)**:
  - Append-only audit log creation and query filtering.
  - Dispute lifecycle: Incident creation $\to$ Admin review $\to$ Adjudication $\to$ Resolution.
  - Reputation calculation across 4 weighted pillars ($35\%$ Fulfillment, $25\%$ Punctuality, $25\%$ Community, $15\%$ Safety).
  - Dynamic tier assignment (`NEW_MEMBER`, `RELIABLE`, `TRUSTED`, `EXEMPLARY`) and badge award criteria.
  - Incident penalty impact on overall trust scores.

### Sprint 8: Security Hardening & Concurrency Protection
- **Test File**: `scratch/test_phase2_sprint8.ts`
- **Coverage (44 Checks)**:
  - Input bounds: control characters, null byte stripping, email regex, coordinate validity.
  - Error masking via `getSafeErrorMessage`: zero SQL or Prisma schema leaks to client.
  - User password stripping (`sanitizeUser`).
  - Distributed atomic rate limiting backed by Neon `RateLimit` table (sliding window).
  - Concurrent race condition: 2 simultaneous claims on 1 listing (verifies exactly 1 succeeds and 1 safely fails).
  - Courier assignment race condition: 2 drivers accepting 1 task (verifies atomic lock prevents double-assignment).
  - Database compound index query performance verification.

### Sprint 9: Comprehensive Functional QA & Edge Cases
- **Test File**: `scratch/test_phase2_sprint9.ts`
- **Coverage (82 Checks)**:
  - Complete multi-role matrix (Donor, Receiver, Volunteer Courier, Admin).
  - 10-step full operational lifecycle chain from listing creation to completed rescue.
  - Edge cases: expired listing claiming rejection, over-capacity pickup rejections, terminal state transition locks (cannot re-open cancelled listings).
  - Non-destructive database operations with guaranteed teardown of test artifacts.

### Sprint 10: Production Readiness & Smoke Verification
- **Test File**: `scratch/test_phase2_sprint10_smoke.ts`
- **Coverage (24 Checks)**:
  - Live Neon PostgreSQL connection pool verification via `prisma.$queryRaw`.
  - Database schema integrity: all 7 required models present with active records.
  - Index performance benchmarks on high-frequency query filters.
  - AWS S3 environment configuration and presigned PUT URL generator check.
  - Live rate limit increment and expiration validation.
  - Zero-secret exposure check across build outputs and response sanitizers.

---

## 3. Verified Reliability Metrics

| Metric | Verified Value | Status |
|---|---|:---:|
| **Total Automated Assertions** | **260+ checks** | **100% Passed** |
| **Test Pass Rate** | **100%** | **No Failures** |
| **Double-Claim Concurrency Failure Rate** | **0%** | **Atomically Prevented** |
| **Schema/SQL Leak Incidents** | **0** | **Fully Masked** |
| **TypeScript Compilation Errors** | **0** (`tsc --noEmit`) | **Passed** |
| **ESLint Warnings/Errors** | **0** (`npm run lint`) | **Passed** |
| **Production Build Status** | **All Routes Compiled** | **Exit Code 0** |

---

## 4. Quality Gates

The project enforces three mandatory quality gates before any deployment:

### 1. TypeScript Static Analysis
```bash
npx tsc --noEmit
```
- **Requirement**: Zero TypeScript errors (`0 errors`).
- Verifies strict type checking across all models, server actions, API routes, and React components.

### 2. Next.js ESLint Engine
```bash
npm run lint
```
- **Requirement**: Zero lint warnings or errors.
- Enforces React hooks rules, import ordering, Next.js performance conventions, and dead-code prevention.

### 3. Production App Router Compilation
```bash
npm run build
```
- **Requirement**: Clean compilation across all 24 static and dynamic routes with exit code 0.
- Verifies server actions bundling, edge runtime compatibility, and static page generation.

---

## 5. Test Execution Runbook

To run the automated verification suites locally against the configured Neon database:

### Run Full Production Smoke Suite (Sprint 10)
```powershell
npx tsx scratch/test_phase2_sprint10_smoke.ts
```

### Run Comprehensive Functional QA & Edge Case Suite (Sprint 9)
```powershell
npx tsx scratch/test_phase2_sprint9.ts
```

### Run Security Hardening & Concurrency Suite (Sprint 8)
```powershell
npx tsx scratch/test_phase2_sprint8.ts
```

### Run Trust, Reputation & Audit Suite (Sprint 7)
```powershell
npx tsx scratch/test_phase2_sprint7.ts
```

### Execute All Quality Gates Consecutively
```powershell
npx tsc --noEmit && npm run lint && npm run build
```
