#!/bin/bash

# Deploy script for para-app on Digital Ocean Droplet
# Usage: ./deploy.sh <droplet-ip-or-domain> [branch]

set -e

DROPLET_HOST="${1:?Error: Droplet IP/domain required. Usage: ./deploy.sh <host> [branch]}"
BRANCH="${2:-main}"
APP_PATH="/var/www/para-app"

echo "🚀 Deploying para-app to $DROPLET_HOST (branch: $BRANCH)"

# SSH into droplet and pull latest, rebuild, and restart
ssh -t root@$DROPLET_HOST << EOF
  set -e

  echo "📂 Navigating to app directory..."
  cd $APP_PATH

  echo "🔄 Pulling latest code..."
  git fetch origin
  git checkout $BRANCH
  git pull origin $BRANCH

  echo "🏗️  Building Docker image..."
  docker compose -f docker-compose.prod.yml build --no-cache

  echo "🗄️  Running migrations..."
  docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy

  echo "🔄 Restarting containers..."
  docker compose -f docker-compose.prod.yml down
  docker compose -f docker-compose.prod.yml up -d

  echo "✅ Deployment complete!"
  echo "📊 Current status:"
  docker compose -f docker-compose.prod.yml ps

  echo "📝 Recent logs:"
  docker compose -f docker-compose.prod.yml logs --tail=20 app
EOF

echo "✨ Deploy script finished!"
