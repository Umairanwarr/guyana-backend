#!/bin/bash
# Deploy script for guyana-backend
# Usage: ./deploy.sh

SERVER="root@185.197.194.139"
PASSWORD="P308TLFuFl8Z"
DEPLOY_DIR="/opt/guyana_center_backend"

echo "🚀 Deploying backend to server..."

# Backup .env
echo "📦 Backing up .env..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER "cp $DEPLOY_DIR/.env /tmp/backend-env-backup 2>/dev/null"

# Pull latest code
echo "📥 Pulling latest code..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER "
cd $DEPLOY_DIR
git config --global --add safe.directory $DEPLOY_DIR 2>/dev/null
git fetch origin main
git reset --hard origin/main
"

# Install dependencies
echo "📦 Installing dependencies..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER "
cd $DEPLOY_DIR
npm install --legacy-peer-deps 2>&1 | tail -5
"

# Restore .env
echo "🔐 Restoring .env..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER "cp /tmp/backend-env-backup $DEPLOY_DIR/.env 2>/dev/null"

# Build
echo "🔨 Building..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER "
cd $DEPLOY_DIR
npx prisma generate 2>&1 | tail -3
npx nest build 2>&1
"

# Restart
echo "🔄 Restarting server..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER "
cd $DEPLOY_DIR
pm2 restart guyana-center-backend --update-env 2>/dev/null || pm2 start dist/src/main.js --name guyana-center-backend
sleep 3
pm2 list
"

echo "✅ Deployment complete!"
