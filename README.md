# SharePlate — Modern Full-Stack Food Donation Platform

A modern, full-stack food rescue web application built with **Next.js (App Router)**, **Prisma ORM (SQLite)**, **NextAuth.js**, and **Tailwind CSS**. SharePlate connects commercial food businesses (restaurants, bakeries, corporate cafeterias, supermarkets) with local food banks, shelters, and charities to rescue surplus food and eradicate hunger.

> 📋 **Technical Audit Report**: For a comprehensive architectural audit, security review, and Phase 2 roadmap, see [docs/PROJECT_AUDIT.md](docs/PROJECT_AUDIT.md).

---

## 🚀 Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Lucide React icons
- **Backend**: Next.js Server Actions & API Route Handlers (`/api/listings`, `/api/claims`, `/api/auth`)
- **Database**: Prisma ORM with SQLite (`prisma/dev.db`)
- **Authentication**: NextAuth.js (Auth.js) with bcryptjs credentials provider & JWT role-based sessions
- **Typography & Styling**: Modern responsive UI with Tailwind emerald/slate palette, badges, and status timeline

---

## 🔑 Quick-Start Demo Credentials

For instant evaluation, you can use the **1-Click Demo Login** buttons on `/auth/signin`:

| Role | Email | Password | Organization |
| :--- | :--- | :--- | :--- |
| **Donor** | `donor@freshbites.com` | `password123` | FreshBites Artisan Bakery & Bistro |
| **NGO Receiver** | `ngo@feedhope.org` | `password123` | FeedHope Community Kitchen |
| **Admin** | `admin@foodrescue.org` | `password123` | SharePlate Global Operations |

---

## 📦 Project Structure

```
├── app/
│   ├── layout.tsx                     # Root layout with responsive Navbar and Footer
│   ├── page.tsx                       # Homepage with Hero, Live Impact Counters, Featured Surplus
│   ├── globals.css                    # Tailwind directives and custom theme styles
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts# NextAuth credentials handler
│   │   ├── auth/register/route.ts     # User registration endpoint with password hashing
│   │   ├── listings/route.ts          # GET (search & filter) & POST (create food listing)
│   │   └── claims/route.ts            # POST (claim food) & PATCH (update status / verify OTP)
│   ├── listings/
│   │   ├── page.tsx                   # Browse all listings with search, category & status filters
│   │   └── [id]/page.tsx              # Detailed listing view with claim workflow & OTP verification
│   ├── donate/
│   │   └── page.tsx                   # Food surplus donation form with quick templates
│   ├── dashboard/
│   │   └── page.tsx                   # Partner dashboard for Donors, NGOs, and Admins
│   ├── auth/
│   │   ├── signin/page.tsx            # Login with 1-click demo account switcher
│   │   └── register/page.tsx          # Multi-role user registration
│   └── actions/
│       ├── listingActions.ts          # Server Actions for creating listings
│       └── claimActions.ts            # Server Actions for status updates
├── components/
│   ├── Navbar.tsx                     # Responsive navigation bar with mobile drawer
│   ├── Footer.tsx                     # Mission, safety standards, and 24/7 rescue helpline
│   ├── FoodCard.tsx                   # Listing card with countdown timer and urgency pills
│   ├── CategoryBadge.tsx              # Color-coded badges for Cooked, Produce, Bakery, etc.
│   ├── ClaimModal.tsx                 # Modal for NGOs to reserve food with pickup notes
│   ├── Providers.tsx                  # NextAuth SessionProvider wrapper
│   └── StatusTimeline.tsx             # 4-stage visual progress stepper
├── lib/
│   ├── prisma.ts                      # Prisma client singleton instance
│   └── auth.ts                        # NextAuth options and JWT/Session callbacks
├── prisma/
│   ├── schema.prisma                  # SQLite schema (User, FoodListing, Claim, ActivityLog)
│   └── seed.ts                        # Seed script with realistic surplus listings and users
├── types/
│   └── next-auth.d.ts                 # NextAuth role & session type extensions
├── package.json
└── tailwind.config.js
```

---

## 🛠️ How to Run

### 1. Install Dependencies (already done)
```bash
npm install
```

### 2. Prepare Database & Seed
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Production Build & Start
```bash
npm run build
npm run start
```
