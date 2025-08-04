#!/bin/bash

# Deploy script with migrations - WITHOUT seed
# Use when:
#     - Making schema changes (new tables/fields)
#     - Want to preserve existing data
#     - Normal deploy with migrations

echo "🚀 Deploying with migrations..."

# Load environment variables
if [ -f .env.deploy ]; then
  export $(cat .env.deploy | grep -v '^#' | xargs)
  echo "✅ Using .env.deploy for production deployment"
else
  echo "⚠️  Warning: .env.deploy file not found. Using default values."
fi

# Set environment variables
export NODE_ENV=production

# Run migrations (preserves existing data)
echo "Running migrations..."
npx prisma migrate deploy

# Deploy application
echo "Deploying..."
gcloud run deploy recharge-api \
  --image gcr.io/vibrant-crawler-462520-f8/recharge-api:latest \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="${DATABASE_URL}",NODE_ENV="${NODE_ENV}",JWT_SECRET="${JWT_SECRET}",SENDGRID_API_KEY="${SENDGRID_API_KEY}",SENDGRID_FROM_EMAIL="${SENDGRID_FROM_EMAIL}"

echo "✅ Deploy with migrations completed!"
