#!/bin/sh
# Applies any pending database migrations, then starts the app.
#
# `migrate deploy` only ever plays forward the migrations committed in
# prisma/migrations - it never resets, drops, or re-seeds a database, so a
# deploy cannot destroy production data. If it fails (unreachable database,
# a migration error), we exit non-zero rather than starting a server that would
# serve errors on every request.
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "docker-entrypoint: DATABASE_URL is not set; refusing to start." >&2
  exit 1
fi

echo "docker-entrypoint: applying database migrations..."
npx prisma migrate deploy

echo "docker-entrypoint: starting $*"
exec "$@"
