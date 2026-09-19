# Resume & Portfolio Showcase — FoodRescue

**Candidate**: Ayan Biswas  
**Degree**: Bachelor of Engineering (B.E.) in Computer Science & Engineering  
**Project**: FoodRescue — Intelligent Food Redistribution & Logistics Platform  
**Tech Stack**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion, Prisma ORM, Neon PostgreSQL, AWS S3, NextAuth.js  

---

## 1. Professional Resume Bullets (Engineering Impact)

Use these quantified, action-driven bullet points for software engineering resumes:

```markdown
• Architected FoodRescue, a production-ready food redistribution platform on Next.js 14 App Router, Neon Serverless PostgreSQL, and AWS S3, routing surplus meals between commercial donors, shelters, and volunteer couriers across application routes.
• Engineered a cloud media pipeline using AWS S3 Presigned PUT URLs, offloading binary image upload traffic directly from client browsers to cloud object storage with client CORS authorization and fallback handling.
• Designed deterministic logistics algorithms including an exponential half-life food urgency decay model, spherical Haversine spatial matching, and a multi-factor greedy courier dispatch engine balancing distance, capacity, and active driver workload.
• Hardened full-stack platform security with NextAuth.js JWT RBAC across 4 user roles, IDOR ownership guards, database-backed atomic sliding-window rate limiting on Neon PostgreSQL, and safe database error masking preventing schema leaks.
• Established automated end-to-end quality assurance with a 260+ assertion test suite covering race-condition concurrency locks (zero double-claims), terminal state transitions, and compound database query index optimizations.
```

---

## 2. Concise One-Paragraph Project Summary

```text
FoodRescue is a production-ready food redistribution and volunteer logistics platform built with Next.js 14, TypeScript, Neon Serverless PostgreSQL, Prisma ORM, and AWS S3. Designed to bridge the gap between commercial surplus food donors and recipient shelters, the system features an exponential half-life food urgency engine, spherical Haversine spatial matching, multi-criteria greedy courier assignment, and cryptographic QR code pickup/delivery verification. The architecture incorporates distributed atomic rate limiting, zero-server-overhead presigned S3 media uploads, and comprehensive RBAC across four distinct roles, validated by an automated 260+ assertion test suite.
```

---

## 3. Key Technical Competencies Demonstrated

| Competency Area | Technologies & Implementations |
|---|---|
| **Full-Stack Web Architecture** | Next.js 14 App Router, React 18 Server/Client Components, Tailwind CSS, Framer Motion |
| **Cloud & Distributed Databases** | Neon Serverless PostgreSQL, PgBouncer Connection Pooling (`DATABASE_URL` vs `DIRECT_URL`), Prisma ORM 5.22 |
| **Cloud Storage & File Pipelines** | AWS S3 Presigned PUT architecture (`@aws-sdk/s3-request-presigner`), zero-memory server bypass, CORS rules |
| **Applied Algorithms** | Exponential half-life decay, Great-circle Haversine distance, Greedy vehicle assignment, sliding-window rate limiting |
| **Security & Authorization** | NextAuth.js JWT session strategy, 4-tier RBAC (`DONOR`, `RECEIVER`, `VOLUNTEER`, `ADMIN`), IDOR mitigations, Error masking |
| **Quality Engineering** | 260+ automated test checks, race condition locking, zero-regression CI quality gates (`tsc`, `eslint`, `next build`) |

---

## 4. LinkedIn Project Description

```text
🚀 Excited to showcase FoodRescue: An Intelligent Food Redistribution & Logistics Platform!

I engineered FoodRescue to solve the logistical challenge of commercial surplus food recovery by connecting food donors, charitable shelters, and volunteer couriers in real time.

Key Engineering Highlights:
🔹 Distributed Architecture: Built with Next.js 14 App Router, Neon Serverless PostgreSQL (utilizing PgBouncer transaction pooling), and AWS S3 direct presigned uploads.
🔹 Algorithmic Logistics: Implemented deterministic food urgency degradation curves, Haversine proximity-based donation matching, and automated greedy courier routing.
🔹 Production Hardening: Integrated 4-role RBAC, IDOR ownership guards, atomic sliding-window rate limiting directly in PostgreSQL, and safe error masking.
🔹 Handover Verification: Designed contact-free, cryptographic QR code verification for safe and auditable donor-to-courier and courier-to-receiver handoffs.
🔹 Quality & Reliability: Backed by 260+ automated test assertions verifying zero race-condition double-claims and clean build compilation across all application routes.

Built with: Next.js, React, TypeScript, Prisma, Neon PostgreSQL, AWS S3, Tailwind CSS, Framer Motion.
```
