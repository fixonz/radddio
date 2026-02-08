#!/bin/bash

echo "🎵 Radddio - Vercel Deployment Script"
echo "======================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null
then
    echo "📦 Vercel CLI not found. Installing..."
    npm install -g vercel
else
    echo "✅ Vercel CLI is installed"
fi

echo ""
echo "🚀 Starting deployment..."
echo ""

# Deploy to Vercel
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🎉 Your Radddio platform is now live!"
echo "📝 Check the Vercel dashboard for your deployment URL"
echo ""
