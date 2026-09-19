# Production Deployment Runbook — FoodRescue

This runbook details the end-to-end production deployment configuration for **FoodRescue**, targeting **Vercel** with a serverless **Neon PostgreSQL** database and **AWS S3** object storage.

---

## 1. Production Topology

```
                  ┌───────────────────────────────┐
                  │    GitHub Repository (Git)    │
                  └───────────────┬───────────────┘
                                  │ Push to main
                                  ▼
                  ┌───────────────────────────────┐
                  │   Vercel CI/CD & Hosting      │
                  │  (Next.js 14 Serverless Edge) │
                  └───────┬───────────────┬───────┘
                          │               │
            DATABASE_URL  │               │ Presigned PUT
            (PgBouncer)   ▼               ▼
        ┌───────────────────────┐   ┌───────────────────────────┐
        │ Neon PostgreSQL       │   │ AWS S3 Bucket             │
        │ (Serverless us-east-2)│   │ (shareplate-food-donations│
        └───────────────────────┘   └───────────────────────────┘
```

---

## 2. Prerequisites

1. GitHub account with repository push access.
2. Vercel account linked to GitHub.
3. Neon account with an active PostgreSQL project (hosted in AWS region `us-east-2` recommended).
4. AWS IAM user with programmatic access credentials and an S3 bucket configured.

---

## 3. Step 1: Neon Database Configuration

### 1. Connection Strings
Neon provides two connection strings in the dashboard console:
- **Pooled Connection String (`DATABASE_URL`)**: Contains `-pooler` in the host domain. Connects via PgBouncer on port `5432` in transaction pooling mode.
- **Direct Connection String (`DIRECT_URL`)**: Connects directly to the PostgreSQL primary engine without pooling.

### 2. Apply Migrations Safely
To deploy database migrations non-destructively:
```bash
# Execute safe forward migrations against direct connection URL
npx prisma migrate deploy
```
> [!IMPORTANT]
> **NEVER** run `prisma migrate reset`, `prisma db push --force-reset`, or any destructive commands in production. `prisma migrate deploy` only executes pending, versioned SQL migration scripts without dropping existing tables or data.

---

## 4. Step 2: AWS S3 Bucket & CORS Configuration

### 1. S3 Bucket Creation
- **Bucket Name**: `shareplate-food-donations` (or custom name)
- **Region**: Matching `AWS_REGION` (e.g., `us-east-1` or `us-east-2`)
- **Public Access**: Keep "Block all public access" configured to protect unauthorized listing modifications; uploads use signed authorization headers.

### 2. S3 Bucket CORS Policy
Navigate to **AWS S3 Console** $\to$ **Bucket** $\to$ **Permissions** $\to$ **Cross-origin resource sharing (CORS)** and paste:

```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "PUT",
      "GET",
      "HEAD"
    ],
    "AllowedOrigins": [
      "https://*.vercel.app",
      "https://yourcustomdomain.com",
      "http://localhost:3000"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

### 3. IAM Policy (Least Privilege)
Attach an inline policy to your IAM programmatic user:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::shareplate-food-donations/*"
    }
  ]
]
```

---

## 5. Step 3: Vercel Project Setup

1. **Import Project**: In the Vercel Dashboard, click **Add New...** $\to$ **Project** and select your GitHub repository.
2. **Framework Preset**: Select **Next.js**.
3. **Root Directory**: `./`
4. **Build & Output Settings**:
   - **Build Command**: Leave default (`npm run build`). This automatically executes `prisma generate && next build`.
   - **Install Command**: Leave default (`npm install`). The `package.json` includes `"postinstall": "prisma generate"`, ensuring the Prisma engine binary matches Vercel's Amazon Linux runtime.
5. **Environment Variables**:
   Add the following required keys in **Project Settings** $\to$ **Environment Variables**:

| Variable Name | Environment | Description |
|---|---|---|
| `DATABASE_URL` | Production, Preview, Dev | Neon pooled connection string (with `-pooler`) |
| `DIRECT_URL` | Production, Preview, Dev | Neon direct connection string (unpooled) |
| `NEXTAUTH_SECRET` | Production, Preview, Dev | 32+ character random secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Production, Preview | Canonical deployment URL (e.g. `https://foodrescue.vercel.app`) |
| `AWS_REGION` | Production, Preview, Dev | AWS S3 bucket region (e.g. `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | Production, Preview, Dev | AWS IAM programmatic access key |
| `AWS_SECRET_ACCESS_KEY`| Production, Preview, Dev | AWS IAM programmatic secret key |
| `AWS_S3_BUCKET_NAME` | Production, Preview, Dev | AWS S3 bucket name |

> [!WARNING]
> Never commit actual values to Git. Always inject secrets directly through the Vercel management interface.

6. Click **Deploy**.

---

## 6. Step 4: Post-Deployment Smoke Verification

Once the deployment finishes with a green checkmark, verify all critical production functions:

1. **Root & Public Pages**: Load the landing page and verify cinematic animations, impact stats, and the dynamic listings feed.
2. **Authentication Flow**:
   - Register a new test account (`DONOR` or `RECEIVER`).
   - Log in and verify session persistence.
3. **Listing Creation & S3 Upload**:
   - Create a food listing with a photo.
   - Confirm browser performs direct PUT to S3 and image renders in the UI.
4. **Claim & Matching Lifecycle**:
   - Log in as `RECEIVER` and claim the listing.
   - Verify donor receives claim notification.
5. **Driver Assignment & Telemetry**:
   - Log in as `VOLUNTEER`, view unassigned deliveries, and accept.
   - Verify simulated GPS telemetry pings `/api/driver/location`.
6. **QR Verification**:
   - Test QR scanner modal on mobile web or browser camera.
7. **Admin Dashboard**:
   - Log in as `ADMIN` and verify the Audit Log (`/api/audit`) records recent operations.

---

## 7. Production Maintenance & Resilience

### 1. Neon Database Branching for Safe Schema Updates
Before testing major database schema modifications:
1. Create a branch of your Neon database in one click: `neon branches create --name staging-test`.
2. Connect your local environment to the branch connection string.
3. Run and test new migrations without risking production data.

### 2. Point-in-Time Recovery (PITR)
Neon automatically records transaction logs allowing instant point-in-time recovery to any second in the past 7 to 30 days. In the event of accidental operational error, restore the database to an exact timestamp via the Neon console.

### 3. Vercel Instant Rollbacks
If a newly pushed commit causes an unexpected runtime regression:
1. Open the Vercel Dashboard $\to$ **Deployments**.
2. Locate the previous healthy deployment.
3. Click the menu icon and select **Instant Rollback**. Traffic will immediately route to the previous build without rebuilding.
