#!/bin/bash

# Complete deploy script with migrations - BUILD + MIGRATE + DEPLOY
# Use when:
#     - Making schema changes (new tables/fields)
#     - Want to preserve existing data
#     - Normal deploy with migrations

echo "🚀 Starting complete deployment with migrations..."

# Load environment variables
if [ -f .env.deploy ]; then
  export $(cat .env.deploy | grep -v '^#' | xargs)
  echo "✅ Using .env.deploy for production deployment"
else
  echo "⚠️  Warning: .env.deploy file not found. Using default values."
fi

# Set environment variables
export NODE_ENV=production

# Step 1: Build Docker image
echo "🔨 Building Docker image..."
docker build -t gcr.io/pure-sunlight-468021-r1/recharge-api:latest .

# Step 2: Push image to Container Registry
echo "📤 Pushing image to Container Registry..."
docker push gcr.io/pure-sunlight-468021-r1/recharge-api:latest

# Step 3: Run migrations (preserves existing data)
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Step 4: Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy recharge-api \
  --image gcr.io/pure-sunlight-468021-r1/recharge-api:latest \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="${DATABASE_URL}",NODE_ENV="${NODE_ENV}",JWT_SECRET="${JWT_SECRET}",SENDGRID_API_KEY="${SENDGRID_API_KEY}",SENDGRID_FROM_EMAIL="${SENDGRID_FROM_EMAIL}"

echo "✅ Complete deployment with migrations finished!"
