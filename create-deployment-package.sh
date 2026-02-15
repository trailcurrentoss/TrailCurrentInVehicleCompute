#!/bin/bash
set -e

# TrailCurrent Deployment Package Creator
# Creates a self-contained zip for offline Raspberry Pi deployment
#
# Usage:
#   ./create-deployment-package.sh                    # No version injection
#   ./create-deployment-package.sh --version=1.0.0    # With version injection + firmware fetch
#
# Environment variables:
#   GITHUB_TOKEN  - GitHub token for private firmware repos (optional)

# Parse parameters
VERSION=""
for arg in "$@"; do
    if [[ $arg == --version=* ]]; then
        VERSION="${arg#--version=}"
    fi
done

# Validate version format if provided
if [ -n "$VERSION" ]; then
    if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "Error: Invalid version format. Please use --version=x.x.x"
        exit 1
    fi
fi

echo "=========================================="
echo "TrailCurrent Deployment Package Creator"
echo "=========================================="
if [ -n "$VERSION" ]; then
    echo "Version: $VERSION"
fi
echo ""

# Step 0.5: Inject version into source files if provided (before Docker build)
if [ -n "$VERSION" ]; then
    echo "Step 0.5: Injecting version into source files for Docker build..."

    # Use line-targeted sed to only replace the 3 intentional __GIT_SHA__ locations.
    # This prevents accidental replacement of SVG path data or other content.

    # manifest.json: "version": "__GIT_SHA__"
    sed -i '/"version":/s/__GIT_SHA__/'"$VERSION"'/' containers/frontend/public/manifest.json

    # service-worker.js: CACHE_NAME line
    sed -i '1s/__GIT_SHA__/'"$VERSION"'/' containers/frontend/public/service-worker.js

    # settings.js: "TrailCurrent System __GIT_SHA__" (the About section only)
    sed -i '/TrailCurrent System/s/__GIT_SHA__/'"$VERSION"'/' containers/frontend/public/js/pages/settings.js

    echo "  Version injected into source files"
fi

# Step 1: Build and save Docker images
echo ""
echo "Step 1: Building and saving Docker images..."
./build-and-save-images.sh

# Step 1.5: Restore source files if version was injected
if [ -n "$VERSION" ]; then
    echo "Step 1.5: Restoring source files to original state..."

    # Restore using the same line-targeted approach with fixed-string sed
    # Use escaped dots to prevent regex wildcard matching of version numbers
    ESCAPED_VERSION=$(printf '%s\n' "$VERSION" | sed 's/[.[\*^$()+?{|]/\\&/g')

    sed -i '/"version":/s/'"$ESCAPED_VERSION"'/__GIT_SHA__/' containers/frontend/public/manifest.json
    sed -i '1s/'"$ESCAPED_VERSION"'/__GIT_SHA__/' containers/frontend/public/service-worker.js
    sed -i '/TrailCurrent System/s/'"$ESCAPED_VERSION"'/__GIT_SHA__/' containers/frontend/public/js/pages/settings.js

    echo "  Source files restored"
fi

# Step 2: Fetch MCU firmware from GitHub releases (optional)
echo ""
echo "Step 2: Fetching MCU firmware from GitHub releases..."
if [ -n "$VERSION" ]; then
    FETCH_CMD="./fetch-firmware.sh --version=$VERSION"
    [ -n "$GITHUB_TOKEN" ] && FETCH_CMD="$FETCH_CMD --token=$GITHUB_TOKEN"
    $FETCH_CMD || echo "  (Firmware fetch skipped or no releases found)"
else
    echo "  Skipping firmware fetch (no --version provided)"
fi

# Step 3: Create staging directory
STAGING_DIR="trailcurrent-deployment-staging"
echo ""
echo "Step 3: Creating deployment package structure..."
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

# Step 4: Copy necessary files
echo "Step 4: Copying files to staging directory..."

# Docker images
echo "  - Copying Docker images..."
cp -r images "$STAGING_DIR/"

# Docker compose file (root level in current project)
echo "  - Copying docker-compose.yml..."
cp docker-compose.yml "$STAGING_DIR/"

# Config files
echo "  - Copying configuration files..."
cp -r config "$STAGING_DIR/"

# Python local code
echo "  - Copying Python local code..."
cp -r local_code "$STAGING_DIR/"

# MCU Firmware binaries
if [ -d "firmware" ]; then
    echo "  - Copying MCU firmware binaries..."
    cp -r firmware "$STAGING_DIR/"
fi

# SSL certificate generation scripts (improvement over old deployment)
echo "  - Copying certificate generation scripts..."
mkdir -p "$STAGING_DIR/scripts"
cp scripts/generate-certs.sh "$STAGING_DIR/scripts/"
cp scripts/openssl.cnf "$STAGING_DIR/scripts/"

# Environment template (improvement over old deployment)
echo "  - Copying .env.example..."
cp .env.example "$STAGING_DIR/"

# Deployment script and docs
echo "  - Copying deployment script and documentation..."
cp deploy.sh "$STAGING_DIR/"
cp PI_DEPLOYMENT.md "$STAGING_DIR/"

# Step 5: Create zip file
if [ -n "$VERSION" ]; then
    ZIP_NAME="trailcurrent-deployment-$VERSION.zip"
else
    ZIP_NAME="trailcurrent-deployment.zip"
fi

echo ""
echo "Step 5: Creating zip archive..."
rm -f "$ZIP_NAME"
cd "$STAGING_DIR"
zip -r "../$ZIP_NAME" . > /dev/null
cd ..

# Step 6: Clean up staging
echo "Step 6: Cleaning up..."
rm -rf "$STAGING_DIR"

# Step 7: Show summary
echo ""
echo "=========================================="
echo "Deployment Package Created!"
echo "=========================================="
echo ""
echo "Package: $ZIP_NAME"
ls -lh "$ZIP_NAME"
echo ""
echo "Package contents:"
echo "  images/*.tar           (7 pre-built Docker images including MongoDB)"
echo "  docker-compose.yml     (service orchestration)"
echo "  config/                (mosquitto & node-red configs)"
echo "  local_code/            (Python CAN-to-MQTT bridge & OTA helpers)"
if [ -d "firmware" ] && [ "$(find firmware -name '*.bin' 2>/dev/null)" ]; then
    echo "  firmware/wired/        (MCU firmware binaries)"
fi
echo "  scripts/               (SSL certificate generation)"
echo "  .env.example           (environment variable template)"
echo "  deploy.sh              (deployment orchestrator)"
echo "  PI_DEPLOYMENT.md       (deployment instructions)"
echo ""
echo "NOT included (must exist on Pi or be created during first deploy):"
echo "  .env                   (secrets - created from .env.example)"
echo "  data/keys/             (TLS certificates - generated by scripts/generate-certs.sh)"
echo "  data/tileserver/us-tiles.mbtiles (map data - transferred separately)"
echo ""
echo "Next steps:"
echo "  1. Transfer $ZIP_NAME to the Pi"
echo "  2. On Pi: unzip $ZIP_NAME -d /home/trailcurrent/trailcurrent"
echo "  3. On Pi: cd /home/trailcurrent/trailcurrent && ./deploy.sh"
echo ""
if [ -n "$VERSION" ]; then
    echo "Version $VERSION has been baked into the Docker images."
    echo "The service worker will clear old caches and update on deployment."
fi
echo ""
