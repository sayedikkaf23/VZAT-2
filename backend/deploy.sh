#!/bin/bash
# Deployment script for VZAT backend

echo "🚀 Starting VZAT Backend Deployment..."

# Build and restart the backend service
echo "📦 Building backend..."
cd /path/to/your/backend

# Install dependencies
npm install

# Restart the service (adjust this based on your deployment method)
# For PM2:
# pm2 restart vzat-backend

# For systemctl:
# sudo systemctl restart vzat-backend

# For manual restart:
# pkill -f "node app.js"
# nohup node app.js > /var/log/vzat-backend.log 2>&1 &

echo "✅ Backend deployment completed!"

# Test the API endpoint
echo "🧪 Testing API endpoint..."
curl -X POST http://localhost:3000/api/cards/prepare-registration \
     -H "Content-Type: application/json" \
     -d '{"customerEmail":"test@example.com"}' \
     || echo "❌ API test failed"

echo "🎉 Deployment process finished!"
