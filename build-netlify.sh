#!/bin/bash

set -e  # Exit on error

echo "======================================"
echo "Building for Netlify deployment..."
echo "======================================"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm ci

# Build frontend with Vite
echo ""
echo "📦 Building frontend with Vite..."
vite build

# Verify build output
if [ ! -d "dist/public" ]; then
  echo "❌ Error: Frontend build failed - dist/public directory not found"
  exit 1
fi

echo ""
echo "✅ Frontend build completed"

# Verify data files exist
echo ""
echo "📁 Verifying data files..."
if [ -d "server/data" ]; then
  echo "✅ Data directory found"
  ls -lh server/data/*.json 2>/dev/null || echo "⚠️  Warning: No JSON files in server/data"
else
  echo "⚠️  Warning: server/data directory not found"
fi

echo ""
echo "======================================"
echo "✅ Build completed successfully!"
echo "======================================"
echo ""
echo "📝 Note: Netlify will automatically bundle the serverless function"
echo "   from netlify/functions/api.ts and include server/data/** files"
