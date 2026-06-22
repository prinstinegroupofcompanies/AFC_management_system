# Atlantic Group Business Management System (AGBMS)

Centralized multi-company ERP platform for Atlantic Group subsidiaries.

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + Framer Motion
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL via Prisma ORM (Docker locally, Render Postgres in production)
- **Real-time:** Socket.io
- **Auth:** JWT + Role-Based Access Control

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Database Setup

```bash
# Start PostgreSQL (requires Docker)
docker compose up -d

# Copy env and push schema + seed demo data
cp apps/api/.env.example apps/api/.env
npm run db:push -w @agbms/api
npm run db:seed -w @agbms/api
```

### Development

```bash
# Start both API and web app
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:3001

### Demo Accounts

| Email | Role | Password |
|-------|------|----------|
| admin@atlanticgroup.com | Super Admin | password123 |
| station@atlanticgroup.com | Accountant (Station) | password123 |
| guest@atlanticgroup.com | Guest Manager (Air BNB) | password123 |
| manager@atlanticgroup.com | Manager | password123 |
| sales@atlanticgroup.com | Sales Agent | password123 |
| inventory@atlanticgroup.com | Inventory Officer | password123 |
| accountant@atlanticgroup.com | Accountant | password123 |

## Subsidiaries

### Phase 1 — Atlantic Food Center (Active)
- Daily sales entry & approval
- Inventory management (stock in/out)
- Expense tracking with receipt upload
- Vendor management & payments
- Real-time attendance (mobile/QR check-in)
- P&L reports with PDF/Excel export
- Asset tracking
- Staff management

### Phase 2 — Atlantic Station (Active)
- Chart of Accounts with 11 default GL accounts
- Double-entry journal entries (debits must equal credits)
- Accounts Receivable (customers, invoices, payments)
- Financial reports: Trial Balance, Balance Sheet, P&L, Cash Flow, General Ledger
- Bank account tracking

### Phase 3 — Atlantic Air BNB (Active)
- Room management with visual status grid
- Guest records and booking management
- Check-in / check-out workflow with auto-housekeeping
- Housekeeping task tracking
- Room inventory (furniture, electronics, toiletries)
- Occupancy and revenue reports

## Deployment

### Backend — Render

> **Important:** The deploy will fail until `DATABASE_URL` is set in the Render dashboard.

1. Push this repo to GitHub and connect it on [Render](https://render.com).
3. **Connect PostgreSQL** (pick one — required before the API will start):
   - **Option A (recommended):** Render Dashboard → your **PostgreSQL** → **Connect** → select **afc-management-api** → Save. Render injects `DATABASE_URL` automatically.
   - **Option B:** Copy the **Internal Database URL** from Postgres → **afc-management-api** → **Environment** → add `DATABASE_URL` manually.
   - **Option C:** Use [Neon](https://neon.tech) free Postgres and paste its connection string as `DATABASE_URL`.
4. **Set `CORS_ORIGIN`** on `afc-management-api` to your Vercel URL (e.g. `https://your-app.vercel.app`).
5. Deploy with **Blueprint** (`render.yaml`) or create a **Web Service** manually:
   - **Build command:** `npm install && npm run build:api:deploy`
   - **Start command:** `npm run start -w @agbms/api`
   - **Health check path:** `/api/health`
6. After the service is **live**, open **Render Shell** and seed demo data:
   ```bash
   npm run db:seed -w @agbms/api
   ```

### Frontend — Vercel

1. Import the GitHub repo on [Vercel](https://vercel.com).
2. Configure the project (pick **one** setup):

   **Option A — Root Directory = `apps/web` (recommended)**
   - Root Directory: `apps/web`
   - Framework Preset: Other (or leave as Vite)
   - Build Command: `cd ../.. && npm run build -w @agbms/shared && npm run build -w @agbms/web`
   - Output Directory: `dist`
   - Install Command: `cd ../.. && npm install`

   **Option B — Root Directory = repo root**
   - Root Directory: leave empty (`.`)
   - Uses root `vercel.json` automatically
   - Output Directory: `apps/web/dist`

3. Add environment variable:
   - `VITE_API_URL` — your Render API URL without a trailing slash (e.g. `https://afc-management-api.onrender.com`)
4. Deploy and open the site root URL (`/`). The app handles client-side routes via SPA rewrites.

> If you see `404: NOT_FOUND`, the Output Directory is wrong. Use `dist` when Root Directory is `apps/web`, or `apps/web/dist` when Root Directory is the repo root.

### Local production-like testing

```bash
# API
cp apps/api/.env.example apps/api/.env
npm run build:api:deploy

# Web (point at local API)
echo 'VITE_API_URL=http://localhost:3001' > apps/web/.env
npm run build -w @agbms/web
npm run preview -w @agbms/web
```

## PostgreSQL (Local)

Update `apps/api/.env`:

```env
DATABASE_URL="postgresql://agbms:agbms123@localhost:5432/agbms"
```

Start PostgreSQL:

```bash
docker compose up -d
```

Then run `npm run db:push -w @agbms/api` and seed.

## Project Structure

```
apps/
  web/          React frontend
  api/          Express backend
packages/
  shared/       Shared types, permissions, Zod schemas
```
