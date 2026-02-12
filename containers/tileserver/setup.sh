#!/bin/bash
# Setup script for tileserver-gl container build
# Ensures fonts are available for Docker image build

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FONTS_DIR="$SCRIPT_DIR/fonts"
PRODUCT_FONTS="/media/dave/extstorage/TrailCurrent/Product/TrailCurrentPiCanToMqttAndDocker/containers/tileserver/fonts"

echo "🔧 TileServer Setup Script"
echo "========================="
echo ""

# Check if fonts already exist
if [ -d "$FONTS_DIR" ]; then
    SIZE=$(du -sh "$FONTS_DIR" | cut -f1)
    COUNT=$(find "$FONTS_DIR" -type d | wc -l)
    echo "✅ Fonts directory already exists ($SIZE, $COUNT directories)"
    echo "   Location: $FONTS_DIR"
    echo ""
    exit 0
fi

# Check if Product directory is available
if [ ! -d "$PRODUCT_FONTS" ]; then
    echo "❌ ERROR: Cannot find Product fonts directory"
    echo "   Expected: $PRODUCT_FONTS"
    echo ""
    echo "Please ensure the Product directory is mounted/available:"
    echo "  /media/dave/extstorage/TrailCurrent/Product/"
    echo ""
    exit 1
fi

# Copy fonts from Product
echo "📋 Copying fonts from Product directory..."
echo "   Source: $PRODUCT_FONTS"
echo "   Target: $FONTS_DIR"
echo ""

cp -r "$PRODUCT_FONTS" "$FONTS_DIR"

# Verify
SIZE=$(du -sh "$FONTS_DIR" | cut -f1)
COUNT=$(find "$FONTS_DIR" -type d | wc -l)
PBFCOUNT=$(find "$FONTS_DIR" -name "*.pbf" | wc -l)

echo ""
echo "✅ Setup Complete!"
echo "   - Size: $SIZE"
echo "   - Font families: $((COUNT - 1))"
echo "   - Glyph files (.pbf): $PBFCOUNT"
echo ""
echo "Ready to build Docker image:"
echo "  cd $(dirname "$SCRIPT_DIR")"
echo "  docker build -t trailcurrent/trailcurrent-tile-server:latest containers/tileserver/"
echo ""
