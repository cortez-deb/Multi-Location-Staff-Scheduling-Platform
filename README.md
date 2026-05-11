# ShiftSync 
### Intelligent Multi-Location Staff Scheduling Platform

ShiftSync is a high-performance scheduling and labor management platform designed for complex restaurant environments. It features an **8-step automated constraint engine** that enforces labor laws, certifications, and fairness across multiple locations and timezones.

---

##  Key Features

### 1. Intelligent Constraint Engine
Every shift assignment is validated against 8 distinct rules including:
- **Hard Blocks:** No double-booking, location certification checks, and required skill matching.
- **Regulatory Compliance:** 10-hour mandatory rest gaps, 12-hour daily caps, and 7th-day consecutive work blocks.
- **Fairness & Budget:** Weekly overtime warnings (40h threshold) and desired hours variance tracking.

### 2. Timezone-Aware Scheduling
Designed for multi-state operations, ShiftSync handles availability and shift timing using a **Location-First Timezone Strategy**. Whether staff work in EST or PST, the system automatically normalizes UTC timestamps to the local "biological" time of the venue.

### 3. Real-Time Operations (SSE & WebSockets)
Built with **Socket.io**, the platform provides instant updates for:
- Shift assignments and schedule publishing.
- Swap/Drop request notifications.
- Manager approval alerts.
- Live "Conflict Detected" toasts during the scheduling process.

### 4. Advanced Analytics & Fairness
- **Fairness Index:** Track "Premium Shift" (Fri/Sat nights) distribution across staff.
- **Labor Budgeting:** Real-time visibility into projected overtime costs before the schedule is published.

---

## 🛠 Tech Stack

### Frontend (Next.js 16)
- **Framework:** Next.js (App Router + Turbopack)
- **UI System:** [Mantine v9](https://mantine.dev/) (Fully themed Light/Dark modes)
- **State Management:** React Hooks + Server Actions
- **Icons:** Heroicons

### Backend (Node.js)
- **Framework:** Express.js
- **Database:** PostgreSQL with Sequelize ORM
- **Real-time:** Socket.io
- **Auth:** JWT-based sessions with HTTP-only cookies

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL instance

### 1. Backend Setup
```bash
cd backend
npm install
# Configure your .env (DB_URL, JWT_SECRET, etc.)
npm run db:reset    # This wipes, migrates, and seeds demo data
npm run dev
```

### 2. Frontend Setup
```bash
# From the root directory
npm install
# Configure your .env (NEXT_PUBLIC_BACKEND_URL)
npm run dev
```

---


## 🛡 Security & Audit
- **Audit Logging:** Every critical change (overrides, manual assignments, swap approvals) is logged with the performing user's ID and a timestamp.
- **Security:** JWT-based auth with middleware-level protection and validation.
