#!/bin/bash
set -e

# Firmware Fetcher for TrailCurrent MCU Projects
# Downloads firmware binaries from public GitHub releases using curl
#
# Usage:
#   ./fetch-firmware.sh --version=v0.0.17 [--org=trailcurrentoss]
#
# The version must match a release tag in GitHub (e.g., v0.0.17)
#
# Requirements:
#   - curl

GITHUB_ORG="trailcurrentoss"
FIRMWARE_DIR="firmware/wired"

# Parse parameters
VERSION=""
for arg in "$@"; do
    if [[ $arg == --version=* ]]; then
        VERSION="${arg#--version=}"
    elif [[ $arg == --org=* ]]; then
        GITHUB_ORG="${arg#--org=}"
    fi
done

# Require version parameter
if [ -z "$VERSION" ]; then
    echo "ERROR: --version parameter is required"
    echo "Usage: ./fetch-firmware.sh --version=v0.0.17 [--org=trailcurrentoss]"
    exit 1
fi

# Ensure version starts with 'v'
if [[ ! $VERSION == v* ]]; then
    VERSION="v$VERSION"
fi

# Device mappings: REPO_NAME|DEVICE_TYPE
DEVICES=(
    "TrailCurrentAirQualityModule|air_quality_module"
    "TrailCurrentCabinetAndDoorSensor|cabinet_and_door_sensor"
    "TrailCurrentCanEspNowGateway|can_esp_now_gateway"
    "TrailCurrentEightButtonPanel|eight_button_panel"
    "TrailCurrentElectricHeaterControl|electric_heater_control"
    "TrailCurrentGnssModule|gnss_module"
    "TrailCurrentMpptCanGateway|mppt_can_gateway"
    "TrailCurrentPowerDistributionModule|power_distribution_module"
    "TrailCurrentSevenPinTrailerMonitor|seven_pin_trailer_monitor"
    "TrailCurrentShuntGateway|shunt_gateway"
    "TrailCurrentVehicleLeveler|vehicle_leveler"
    "TrailCurrentWallMountedDisplay|wall_mounted_display"
)

echo "=========================================="
echo "Fetching MCU Firmware from GitHub"
echo "=========================================="
echo "Organization: $GITHUB_ORG"
echo "Target version: $VERSION"
echo ""

# Create firmware directory if it doesn't exist
mkdir -p "$FIRMWARE_DIR"

# Track what we found
FETCHED=0
SKIPPED=0
FAILED=0

for device_info in "${DEVICES[@]}"; do
    IFS='|' read -r repo_name device_type <<< "$device_info"

    device_dir="$FIRMWARE_DIR/$device_type"
    echo -n "Checking $repo_name ($VERSION)... "

    mkdir -p "$device_dir"
    temp_file=$(mktemp)

    download_url="https://github.com/$GITHUB_ORG/$repo_name/releases/download/$VERSION/firmware.bin"

    if curl -s -L -f -o "$temp_file" "$download_url" 2>/dev/null; then
        mv "$temp_file" "$device_dir/firmware.bin"
        file_size=$(du -h "$device_dir/firmware.bin" | cut -f1)
        echo "Downloaded ($file_size)"
        FETCHED=$((FETCHED + 1))
    else
        rm -f "$temp_file"
        rmdir "$device_dir" 2>/dev/null || true
        echo "Not found (skipping)"
        SKIPPED=$((SKIPPED + 1))
    fi
done

echo ""
echo "=========================================="
echo "Firmware Fetch Summary"
echo "=========================================="
echo "Version:    $VERSION"
echo "Downloaded: $FETCHED device(s)"
echo "Skipped:    $SKIPPED device(s) (no release at this version)"
echo "Failed:     $FAILED device(s)"
echo ""

if [ $FETCHED -gt 0 ]; then
    echo "Firmware structure:"
    find "$FIRMWARE_DIR" -type f 2>/dev/null | sort | sed 's/^/  /'
    echo ""
fi

if [ $FETCHED -eq 0 ]; then
    # Clean up empty firmware directory so it doesn't get packaged
    rm -rf "$FIRMWARE_DIR"
    rmdir firmware 2>/dev/null || true
    if [ $SKIPPED -eq ${#DEVICES[@]} ]; then
        echo "No firmware found for version $VERSION. This is normal if MCU repos"
        echo "haven't published a release at this version yet."
        echo ""
    fi
fi
