#!/bin/bash
set -e

# Build and Save ARM64 Docker Images Script
# Builds each service for ARM64 and saves as tar files for offline deployment
#
# Usage: ./build-and-save-images.sh
#
# Image tags match docker-compose.yml exactly so deploy.sh can use them
# with `docker compose up -d --no-build` after loading.

echo "=========================================="
echo "Building ARM64 Docker Images & Saving Tars"
echo "=========================================="
echo ""

# Verify Docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    exit 1
fi

# Verify docker buildx is available
if ! docker buildx version &> /dev/null; then
    echo "Error: Docker buildx is not available"
    echo "Install Docker Desktop or enable buildx: docker buildx create --use"
    exit 1
fi

# Clean up any existing tar files from previous builds
if [ -d "images" ] && [ "$(ls -A images/*.tar 2>/dev/null)" ]; then
    echo "Removing old tar files from previous build..."
    rm -f images/*.tar
    echo "  Cleaned up old tar files"
fi

# Create images directory
mkdir -p images

# Services to build locally
# Format: BUILD_DIR|IMAGE_TAG
# IMAGE_TAG must match docker-compose.yml image: directive exactly
SERVICES=(
    "containers/frontend|trailcurrent-in-vehicle-frontend"
    "containers/backend|trailcurrent-in-vehicle-backend"
    "containers/mosquitto|trailcurrent-in-vehicle-mosquitto"
    "containers/node-red|trailcurrent-in-vehicle-node-red"
    "containers/noderedproxy|trailcurrent-in-vehicle-noderedproxy"
    "containers/tileserver|trailcurrent/trailcurrent-tile-server"
)

# Build and save each service
for service_info in "${SERVICES[@]}"; do
    IFS='|' read -r build_dir image_tag <<< "$service_info"

    # Derive a short name for the tar file from the build directory
    tar_name=$(basename "$build_dir")
    tar_file="images/${tar_name}.tar"

    echo "=========================================="
    echo "Building $image_tag (linux/arm64)..."
    echo "  Context: $build_dir"
    echo "=========================================="

    # Build for ARM64
    if docker buildx build --platform linux/arm64 \
        -t "$image_tag:latest" \
        --output type=docker \
        "$build_dir/" > /tmp/build.log 2>&1; then
        echo "  Built $image_tag"
    else
        echo "  Failed to build $image_tag"
        cat /tmp/build.log
        exit 1
    fi

    # Save to tar file
    if docker save "$image_tag:latest" -o "$tar_file"; then
        SIZE=$(du -h "$tar_file" | cut -f1)
        echo "  Saved to $tar_file ($SIZE)"
    else
        echo "  Failed to save $image_tag to tar"
        exit 1
    fi

    echo ""
done

# Pull and save MongoDB for truly offline deployment
echo "=========================================="
echo "Pulling mongo:7 (linux/arm64)..."
echo "=========================================="

if docker pull --platform linux/arm64 mongo:7 > /tmp/build.log 2>&1; then
    echo "  Pulled mongo:7"
else
    echo "  Failed to pull mongo:7"
    cat /tmp/build.log
    exit 1
fi

if docker save mongo:7 -o "images/mongodb.tar"; then
    SIZE=$(du -h "images/mongodb.tar" | cut -f1)
    echo "  Saved to images/mongodb.tar ($SIZE)"
else
    echo "  Failed to save mongo:7 to tar"
    exit 1
fi

echo ""
echo "=========================================="
echo "Build Complete!"
echo "=========================================="
echo ""
echo "Created tar files:"
ls -lh images/*.tar
echo ""
echo "Next step: Run ./create-deployment-package.sh to create the deployment zip"
echo ""
