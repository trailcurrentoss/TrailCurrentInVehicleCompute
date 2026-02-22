# MCU Firmware Integration Guide

This document explains how to set up and maintain firmware releases for MCU modules in the TrailCurrent deployment system.

## Overview

The deployment package system automatically fetches the latest firmware binaries from GitHub releases for each MCU module. This allows:

- **Versioned firmware**: Each release is tagged and tracked in git history
- **Selective deployment**: Only devices with releases get firmware included
- **Decoupled updates**: Update MCU firmware independently from Pi deployment
- **Single storage**: No firmware duplication despite multiple devices of same type

## Current Integration

The following MCU modules are configured for automatic firmware fetching:

### Wired Modules (OTA via CAN bus notification)

| Repository | Device Type | Directory |
|---|---|---|
| `TrailCurrentEightButtonPanel` | `eight_button_panel` | `firmware/wired/eight_button_panel/` |
| `TrailCurrentPowerControlModule` | `power_control_module` | `firmware/wired/power_control_module/` |
| `TrailCurrentGnssModule` | `gnss_module` | `firmware/wired/gnss_module/` |
| `TrailCurrentAirQualityModule` | `air_quality_module` | `firmware/wired/air_quality_module/` |

### Wireless Modules (Coming Soon - OTA via WebSocket)

Configured but not yet implemented:

- `TrailCurrentEspNowRemoteControl`
- `TrailCurrentBtGateway`
- (Others as needed)

## How to Create a Firmware Release

When you're ready to deploy a new firmware version for a module:

### 1. Build the Firmware Locally

These MCU projects are designed to be opened in **VSCode with PlatformIO IDE extension** installed.

**Option A: Build in VSCode (Recommended)**
1. Open the MCU project folder in VSCode
2. Install `pioarduino.pioarduino-ide` and `platformio.platformio-ide` extensions
3. Click the PlatformIO build button (checkmark icon in the bottom toolbar)
4. Or use the VSCode terminal (Ctrl+`) where `platformio` will be available:
   ```bash
   platformio run
   ```

**Option B: Build from Command Line**
If PlatformIO is installed globally (via `pip install platformio`):
```bash
cd TrailCurrentAirQualityModule  # (example)
platformio run
```

The firmware binary is created at:
```
.pio/build/<environment>/firmware.bin
```

**Note:** pioarduino projects use the custom ESP32 platform from `https://github.com/pioarduino/platform-espressif32/`, and each project has its own VSCode configuration to ensure correct tools are loaded.

### 2. Rename the Firmware (Optional)

If your project has a `rename_firmware.py` script (as configured in `platformio.ini`), it will automatically rename the firmware during build. For example:

```python
# rename_firmware.py
Import("env")
env.Replace(PROGNAME="tcairqlty")  # Results in tcairqlty.bin
```

### 3. Create a GitHub Release

Navigate to your GitHub repository or use the `gh` CLI:

**Via GitHub Web UI:**
1. Go to your repository on GitHub (e.g., `github.com/TrailCurrent/TrailCurrentAirQualityModule`)
2. Navigate to **Releases** → **Create a new release**
3. Enter a version tag: `v1.2.3` (must follow semver format)
4. Add the firmware binary as an attachment (name it `firmware.bin`)
5. Add a changelog/description
6. Click **Publish release**

**Via gh CLI:**

```bash
# Step 1: Commit your firmware changes (source code only)
git add src/ lib/ platformio.ini  # Don't add .pio/build/
git commit -m "Feature: Add new sensor support"

# Step 2: Build the firmware
platformio run
# Output: .pio/build/esp32-c6-devkitm-1/firmware.bin

# Step 3: Create a git tag
git tag -a v1.2.3 -m "Firmware release v1.2.3"
git push origin v1.2.3

# Step 4: Create GitHub release with firmware attached
gh release create v1.2.3 \
  .pio/build/esp32-c6-devkitm-1/firmware.bin \
  --repo TrailCurrent/TrailCurrentAirQualityModule \
  --title "v1.2.3" \
  --notes "Firmware release v1.2.3"
```

**Important:** The firmware binary is **not committed to git** (it's in `.gitignore`). Instead:
- The git tag marks the **source code version**
- The GitHub release stores the **compiled firmware binary** as an asset
- This keeps the repo clean while maintaining reproducible builds

### 4. Verify the Release

Check that the firmware asset appears in the release:

```bash
gh release view v1.2.3 --repo TrailCurrent/TrailCurrentAirQualityModule
```

You should see `firmware.bin` listed as an asset.

## Firmware Fetching During Deployment

When you run `create-deployment-package.sh`:

```bash
./create-deployment-package.sh --version=1.0.0
```

The script automatically:

1. **Calls `fetch-firmware.sh`** (Step 2)
   - Passes the version number to firmware fetcher
   - Queries GitHub for **matching release tag** (e.g., `v1.0.0`)
   - Downloads `firmware.bin` if the release exists
   - Organizes them into `firmware/wired/{device_type}/firmware.bin`
   - Skips modules that don't have that specific version (no error)

2. **Includes firmware in deployment** (Step 4)
   - Copies `firmware/` directory into staging
   - Firmware becomes part of the deployment ZIP

3. **Displays summary**
   - Shows which firmware versions were fetched
   - Reports any skips

## Example Output

When running `./create-deployment-package.sh --version=1.0.0`:

```
Step 2: Fetching MCU firmware from GitHub releases...
==========================================
Fetching MCU Firmware from GitHub
==========================================
Organization: TrailCurrent
Target version: v1.0.0

Checking TrailCurrentEightButtonPanel (v1.0.0)... Downloaded (245K)
Checking TrailCurrentPowerControlModule (v1.0.0)... Downloaded (312K)
Checking TrailCurrentGnssModule (v1.0.0)... Not found (skipping)
Checking TrailCurrentAirQualityModule (v1.0.0)... Downloaded (268K)

==========================================
Firmware Fetch Summary
==========================================
Version:    v1.0.0
Downloaded: 3 device(s)
Skipped:    1 device(s) (no release at this version)
Failed:     0 device(s)

Firmware structure:
  firmware/wired/eight_button_panel/firmware.bin
  firmware/wired/power_control_module/firmware.bin
  firmware/wired/air_quality_module/firmware.bin
```

**Notes:**
- All fetched firmware is from the **same version tag** as the deployment
- If an MCU module hasn't been updated to that version, it's skipped (no error)

## Adding New Modules

To integrate a new MCU module:

1. **Edit `fetch-firmware.sh`**

   Add to the `DEVICES` array:

   ```bash
   DEVICES=(
       # ... existing entries ...
       "TrailCurrentNewModule|new_module"
   )
   ```

2. **Choose OTA Category**

   - For wired (CAN bus OTA): Use `firmware/wired/device_name/`
   - For wireless (WebSocket OTA): Use `firmware/wireless/device_name/` (future)

3. **Document in this file**

   Add the module to the table above.

4. **Create initial release**

   Build, tag, and release the first version in the MCU repository on GitHub.

## Troubleshooting

### "No release found" for a module

This is normal and not an error. The module simply won't be included in the deployment package until you create a release with a `firmware.bin` asset.

**To fix:**
1. Build the firmware in the MCU project
2. Create a GitHub release with `firmware.bin` attached

### "Failed to download asset"

**Check:**
- Network access to GitHub
- The firmware asset exists in the release and is named `firmware.bin`

### Firmware not appearing in deployment ZIP

**Check:**
1. Run `fetch-firmware.sh` manually to see if firmware downloads
2. Verify `firmware/` directory exists after fetch
3. Ensure the GitHub release has `firmware.bin` attached (not just the source code tag)
4. Review the `create-deployment-package.sh` output

### "I built firmware but it's not in git - is that wrong?"

**No, that's correct!** The firmware binary is in `.gitignore` intentionally:
- The **source code** is versioned in git (via `git tag`)
- The **compiled binary** is stored in GitHub as a release asset
- This keeps the repo lean while maintaining reproducible builds

**Workflow:**
1. Modify source code, commit, and tag
2. Build firmware locally
3. Upload the `.bin` file to GitHub as a release asset for that tag
4. The deployment system fetches the binary from the release

## Authentication

All firmware repositories are public. The `fetch-firmware.sh` script downloads release assets via unauthenticated HTTPS from GitHub — no tokens or credentials are needed.

```bash
./fetch-firmware.sh --version=v1.0.0
```
