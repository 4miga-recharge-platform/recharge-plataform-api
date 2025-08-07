#!/bin/sh

# Execute database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Execute seed if SEED_DATABASE is set
if [ "$SEED_DATABASE" = "true" ]; then
  echo "Running database seed..."
  npx ts-node prisma/seed.ts
fi

# Start the application
echo "Starting application..."
node dist/main.js
