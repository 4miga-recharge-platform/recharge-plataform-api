#!/bin/bash

# Complete deploy script with migrations - BUILD + MIGRATE + DEPLOY
# Use when:
#     - Making schema changes (new tables/fields)
#     - Want to preserve existing data
#     - Normal deploy with migrations

echo "🚀 Starting complete deployment with migrations..."

# Load environment variables
if [ -f .env.deploy ]; then
  set -a
  source .env.deploy
  set +a
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
  --vpc-connector recharge-api-connector \
  --vpc-egress all-traffic \
  --set-env-vars DATABASE_URL="${DATABASE_URL}",NODE_ENV="${NODE_ENV}",JWT_SECRET="${JWT_SECRET}",RESEND_API_KEY="${RESEND_API_KEY}",RESEND_FROM_EMAIL="${RESEND_FROM_EMAIL}",RESEND_FROM_NAME="${RESEND_FROM_NAME}",BASE_URL="${BASE_URL}",ENCRYPTION_KEY="${ENCRYPTION_KEY}",BIGO_HOST_DOMAIN="${BIGO_HOST_DOMAIN}",BIGO_HOST_BACKUP_DOMAIN="${BIGO_HOST_BACKUP_DOMAIN}",BIGO_CLIENT_ID="${BIGO_CLIENT_ID}",BIGO_PRIVATE_KEY="${BIGO_PRIVATE_KEY}",BIGO_RESELLER_BIGOID="${BIGO_RESELLER_BIGOID}",BIGO_USD_TO_BRL_RATE="${BIGO_USD_TO_BRL_RATE:-5.5}",BIGO_DIAMONDS_PER_USD_AVERAGE="${BIGO_DIAMONDS_PER_USD_AVERAGE:-62.5}",GCP_PROJECT_ID="${GCP_PROJECT_ID}",GCP_BUCKET_NAME="${GCP_BUCKET_NAME}",GCP_CLIENT_EMAIL="${GCP_CLIENT_EMAIL}",GCP_PRIVATE_KEY="${GCP_PRIVATE_KEY}",STORE_WEBHOOKS="${STORE_WEBHOOKS}",REVALIDATE_TOKEN="${REVALIDATE_TOKEN}",BRAVIVE_BASE_URL="${BRAVIVE_BASE_URL}",BRAVIVE_API_TOKEN="${BRAVIVE_API_TOKEN}",BRAVIVE_WEBHOOK_SECRET="${BRAVIVE_WEBHOOK_SECRET}",ORDER_EXPIRATION_HOURS="${ORDER_EXPIRATION_HOURS:-24}"

echo "✅ Complete deployment with migrations finished!"
