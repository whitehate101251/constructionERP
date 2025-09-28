#!/bin/bash

echo "🚀 ERP Migration Deployment Script"
echo "=================================="

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables"
    echo "   You can get these from your Supabase project settings"
    exit 1
fi

echo "✅ Environment variables check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

echo "✅ Build completed successfully!"
echo ""
echo "Next steps:"
echo "1. 🗄️  Setup your Supabase database using the SQL in MIGRATION_GUIDE.md"
echo "2. 🚀 Deploy backend to Render (connect your GitHub repo)"
echo "3. 🌐 Deploy frontend to Vercel (connect your GitHub repo)"
echo "4. 📊 Migrate your existing data from MongoDB to Supabase"
echo ""
echo "📖 See MIGRATION_GUIDE.md for detailed instructions"