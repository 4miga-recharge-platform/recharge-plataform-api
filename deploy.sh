#!/bin/bash

# Simple deploy script - APPLICATION DEPLOYMENT ONLY
echo "🚀 Deploying application..."

# Load environment variables
if [ -f .env.deploy ]; then
  export $(cat .env.deploy | grep -v '^#' | xargs)
  echo "✅ Using .env.deploy for production deployment"
else
  echo "⚠️  Warning: .env.deploy file not found. Using default values."
fi

# Deploy application
gcloud run deploy recharge-api \
  --image gcr.io/vibrant-crawler-462520-f8/recharge-api:latest \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="${DATABASE_URL}",NODE_ENV="${NODE_ENV}",JWT_SECRET="${JWT_SECRET}",RESEND_API_KEY="${RESEND_API_KEY}",RESEND_FROM_EMAIL="${RESEND_FROM_EMAIL}"

echo "✅ Deploy completed!"
