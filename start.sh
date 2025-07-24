#!/bin/sh

# Execute database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "Starting application..."
node dist/main.js 