# Atlantic Group Business Management System (AGBMS)

Centralized multi-company ERP platform for Atlantic Group subsidiaries.

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + Framer Motion
- **Backend:** Node.js + Express + TypeScript
- **Database:** SQLite (dev) / PostgreSQL (prod) via Prisma ORM
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
# Push schema and seed demo data
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

## PostgreSQL (Production)

Update `apps/api/.env`:

```env
DATABASE_URL="postgresql://agbms:agbms123@localhost:5432/agbms"
```

Start PostgreSQL:

```bash
docker-compose up -d
```

Then run migrations against PostgreSQL.

## Project Structure

```
apps/
  web/          React frontend
  api/          Express backend
packages/
  shared/       Shared types, permissions, Zod schemas
```
