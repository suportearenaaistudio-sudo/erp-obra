#!/bin/bash

# Sync shared code from src/shared to supabase/functions/_shared
# This ensures Edge Functions have the latest shared infrastructure

set -e

echo "🔄 Syncing shared code to Edge Functions..."

# Source and destination directories
SOURCE_DIR="src/shared"
DEST_DIR="supabase/functions/_shared"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Source directory $SOURCE_DIR not found"
    exit 1
fi

# Create destination directory if it doesn't exist
mkdir -p "$DEST_DIR"

# Copy files
echo "📁 Copying from $SOURCE_DIR to $DEST_DIR..."
cp -r "$SOURCE_DIR/"* "$DEST_DIR/"

echo "✅ Shared code synced successfully!"
echo ""
echo "📝 Synced directories:"
echo "   - errors/"
echo "   - logging/"
echo "   - security/"
echo "   - features/"
echo "   - validation/"
echo "   - constants/"
echo "   - types/"
echo ""
echo "⚠️  Remember to re-deploy Edge Functions if they use updated code"
