#!/bin/sh
set -e

echo "Waiting for database to be ready..."
# Wait for database to be ready (max 60 seconds)
for i in $(seq 1 60); do
  if npm run db:schema 2>/dev/null; then
    echo "Database is ready!"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "Database connection timeout after 60 seconds"
    exit 1
  fi
  echo "Waiting for database... ($i/60)"
  sleep 1
done

echo "Running database migrations..."
npm run db:seed

echo "Generating TypeScript types..."
npm run db:generate-types

echo "Starting Next.js application..."
exec npm run start
