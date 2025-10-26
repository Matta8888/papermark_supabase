#!/bin/bash

# Papermark Development Server Startup Script
# This ensures we always run from the correct directory

PROJECT_DIR="/Users/matt.shields@carwow.co.uk/Documents/Papermark/papermark"

echo "🚀 Starting Papermark Development Server"
echo "📁 Project Directory: $PROJECT_DIR"

# Navigate to project directory
cd "$PROJECT_DIR" || {
    echo "❌ Error: Cannot navigate to project directory: $PROJECT_DIR"
    exit 1
}

# Verify we're in the right place
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in current directory"
    echo "Current directory: $(pwd)"
    exit 1
fi

echo "✅ Found package.json in: $(pwd)"
echo "🔧 Starting Next.js development server..."

# Start the development server
npm run dev
