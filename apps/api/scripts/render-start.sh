#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo ""
  echo "============================================================"
  echo " DEPLOY FAILED: DATABASE_URL is not set on Render"
  echo "============================================================"
  echo ""
  echo "1. Open Render Dashboard -> your PostgreSQL database"
  echo "2. Copy the Internal Database URL (or External if required)"
  echo "3. Open afc-management-api -> Environment"
  echo "4. Add DATABASE_URL and paste the connection string"
  echo "5. Save Changes and redeploy"
  echo ""
  echo "Free Render accounts can only have one Postgres database."
  echo "Reuse your existing database or use Neon (https://neon.tech)."
  echo ""
  exit 1
fi

cd "$(dirname "$0")/.."
npx prisma db push
exec npx tsx src/index.ts
