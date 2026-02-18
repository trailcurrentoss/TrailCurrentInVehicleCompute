#!/bin/bash
# Verify tileserver font glyphs are present
#
# Fonts are committed to the repository and should be available after clone.
# This script verifies the expected font families exist and reports status.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FONTS_DIR="$SCRIPT_DIR/fonts"

# Font families required by the project's map styles
REQUIRED_FONTS=(
    "Noto Sans Regular"
    "Noto Sans Bold"
    "Noto Sans Italic"
    "Metropolis Regular"
    "Metropolis Light"
    "Metropolis Light Italic"
    "Metropolis Medium Italic"
    "Roboto Regular"
    "Roboto Medium"
    "Roboto Condensed Italic"
)

echo "Tileserver Font Verification"
echo "============================"
echo ""

if [ ! -d "$FONTS_DIR" ]; then
    echo "ERROR: Fonts directory not found: $FONTS_DIR"
    echo ""
    echo "Fonts are committed to the repository. If they are missing:"
    echo "  1. Ensure you cloned the full repository (not a shallow clone)"
    echo "  2. Run: git checkout -- containers/tileserver/fonts/"
    echo ""
    exit 1
fi

# Check each required font family
MISSING=0
for font in "${REQUIRED_FONTS[@]}"; do
    if [ -d "$FONTS_DIR/$font" ]; then
        PBF_COUNT=$(find "$FONTS_DIR/$font" -name "*.pbf" | wc -l)
        echo "  OK: $font ($PBF_COUNT glyph ranges)"
    else
        echo "  MISSING: $font"
        MISSING=$((MISSING + 1))
    fi
done

echo ""

if [ "$MISSING" -gt 0 ]; then
    echo "ERROR: $MISSING required font families are missing."
    echo ""
    echo "Fonts are committed to the repository. Try:"
    echo "  git checkout -- containers/tileserver/fonts/"
    echo ""
    exit 1
fi

SIZE=$(du -sh "$FONTS_DIR" | cut -f1)
TOTAL_DIRS=$(find "$FONTS_DIR" -maxdepth 1 -type d | wc -l)
TOTAL_DIRS=$((TOTAL_DIRS - 1))

echo "All ${#REQUIRED_FONTS[@]} required font families present."
echo "Total: $TOTAL_DIRS font families, $SIZE"
echo ""
echo "Tileserver is ready to build:"
echo "  docker build -t trailcurrent/trailcurrent-tile-server:latest containers/tileserver/"
echo ""
