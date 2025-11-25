#!/bin/bash

# Complete deploy script - BUILD + DEPLOY
echo "🚀 Starting complete deployment process..."

# Load environment variables
if [ -f .env.deploy ]; then
  set -a
  source .env.deploy
  set +a
  echo "✅ Using .env.deploy for production deployment"
else
  echo "⚠️  Warning: .env.deploy file not found. Using default values."
fi

# Step 1: Build Docker image
echo "🔨 Building Docker image..."
docker build -t gcr.io/pure-sunlight-468021-r1/recharge-api:latest .

# Step 2: Push image to Container Registry
echo "📤 Pushing image to Container Registry..."
docker push gcr.io/pure-sunlight-468021-r1/recharge-api:latest

# Step 3: Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy recharge-api \
  --image gcr.io/pure-sunlight-468021-r1/recharge-api:latest \
  --allow-unauthenticated \
  --vpc-connector recharge-api-connector \
  --vpc-egress all-traffic \
  --set-env-vars DATABASE_URL="${DATABASE_URL}",NODE_ENV="${NODE_ENV}",JWT_SECRET="${JWT_SECRET}",RESEND_API_KEY="${RESEND_API_KEY}",RESEND_FROM_EMAIL="${RESEND_FROM_EMAIL}",BIGO_HOST_DOMAIN="${BIGO_HOST_DOMAIN}",BIGO_HOST_BACKUP_DOMAIN="${BIGO_HOST_BACKUP_DOMAIN}",BIGO_CLIENT_ID="${BIGO_CLIENT_ID}",BIGO_PRIVATE_KEY="${BIGO_PRIVATE_KEY}",BIGO_RESELLER_BIGOID="${BIGO_RESELLER_BIGOID}"

echo "✅ Complete deployment finished!"
