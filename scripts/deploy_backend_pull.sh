#!/bin/bash

# ShadowSky Backend Deployment Script (Private Server)
# Usage: ./scripts/deploy_backend_pull.sh

# 0. Navigate to Project Directory
TARGET_DIR="/www/wwwroot/47.118.28.27"
if [ -d "$TARGET_DIR" ]; then
    cd "$TARGET_DIR"
    echo "📂 Navigated to $TARGET_DIR"
else
    echo "⚠️  Directory $TARGET_DIR not found, assuming current directory."
fi

# 1. Pull latest changes
echo "⬇️ Pulling latest code from GitHub..."
git pull origin main

# 2. Update dependencies (if any)
# echo "📦 Updating Composer dependencies..."
# composer install --no-dev

# 3. Set Permissions (Critical for PHP/Data)
echo "🔒 Fixing permissions..."
chmod -R 755 api/
chmod -R 777 data/ # Ensure JSON files are writable

# 4. Restart Admin Server (if running via PM2)
# echo "🔄 Restarting Admin Server..."
# pm2 restart shadowsky-admin

echo "✅ Backend Deployment Complete!"
