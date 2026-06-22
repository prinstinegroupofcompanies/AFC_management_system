#!/usr/bin/env bash
set -euo pipefail

resolve_database_url() {
  if [ -n "${DATABASE_URL:-}" ]; then
    printf '%s' "$DATABASE_URL"
    return 0
  fi

  for var in INTERNAL_DATABASE_URL POSTGRES_URL POSTGRES_CONNECTION_STRING RENDER_DATABASE_URL; do
    local value="${!var:-}"
    if [ -n "$value" ]; then
      export DATABASE_URL="$value"
      printf '%s' "$DATABASE_URL"
      return 0
    fi
  done

  return 1
}

if ! resolve_database_url >/dev/null; then
  echo ""
  echo "============================================================"
  echo " DEPLOY FAILED: No PostgreSQL connection string found"
  echo "============================================================"
  echo ""
  echo "Option A — Link your existing Render Postgres (recommended):"
  echo "  1. Render Dashboard -> your PostgreSQL database"
  echo "  2. Click Connect -> select afc-management-api"
  echo "  3. Save and redeploy"
  echo ""
  echo "Option B — Set DATABASE_URL manually:"
  echo "  1. Render Dashboard -> afc-management-api -> Environment"
  echo "  2. Add DATABASE_URL = Internal Database URL from Postgres"
  echo "  3. Save and redeploy"
  echo ""
  echo "Option C — Use free external Postgres (Neon):"
  echo "  https://neon.tech -> create project -> paste connection string as DATABASE_URL"
  echo ""
  exit 1
fi

cd "$(dirname "$0")/.."
npx prisma db push
exec npx tsx src/index.ts
