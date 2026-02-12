# Raspberry Pi Deployment Guide

> **Status**: This guide is under development. For initial device setup, see [DOCS/PiSetup.md](DOCS/PiSetup.md). This document will be fully implemented when automated deployment is ready.

---

## Overview

This document describes the deployment process for Raspberry Pi edge devices. Future versions will include:

- Pre-built Docker image deployment (offline-capable)
- Automated deployment scripts
- CI/CD pipeline integration
- Update and rollback procedures
- Firmware integration

For now, manual deployment follows the steps below.

---

## Current Manual Deployment Process

### Prerequisites

- Device has been set up following [DOCS/PiSetup.md](DOCS/PiSetup.md)
- SSH access to the device
- Git repository cloned on the device

### Deploying New Code

When you have new code to deploy to an already-configured device:

```bash
# SSH to device
ssh pi@trailcurrent01.local

# Navigate to project directory
cd TrailCurrentInVehicleCompute

# Pull latest code
git pull

# Rebuild Docker images with new code
docker compose build

# Start updated containers
docker compose up -d

# Verify all containers running
docker compose ps

# Check for errors in logs
docker compose logs
```

---

## What Persists Across Builds

When updating the application, these items are **PRESERVED** and never deleted:

### Application Configuration
- ✅ `.env` - Device-specific environment configuration
  - MQTT credentials
  - Admin password
  - Encryption keys
  - Device hostname

### Security
- ✅ `data/keys/` - SSL certificates
  - Server certificate and key
  - CA certificate (for browser installation)
  - 10-year validity - no need to regenerate on updates

### Data
- ✅ `data/tileserver/us-tiles.mbtiles` - Map tile database
  - Once set up, persists across all updates
  - Only update if map data needs refreshing

- ✅ `data/node-red/` - User-created Node-RED flows
  - All custom flows preserved
  - Settings and credentials persist

- ✅ `data/` (entire directory) - All application runtime data

### Important

**⚠️ CRITICAL: Never delete `data/` directory during updates!**

```bash
# WRONG - This deletes all persistent data
rm -rf data/

# RIGHT - Safe to run during updates
docker compose pull
docker compose build
docker compose up -d
```

---

## What Changes During Updates

These items are updated with new code/configuration:

- Docker container images
- Application code (backend, frontend, etc.)
- Container configurations

These items are NOT affected:
- Certificates
- Environment variables (.env)
- Persistent data

---

## Verification After Deployment

After deploying new code, verify:

```bash
# All containers running
docker compose ps

# No errors in logs
docker compose logs

# API responding
curl -k https://localhost/api/health

# Web UI accessible
curl -k https://localhost/

# MQTT broker accessible
docker compose logs mosquitto | tail -5
```

---

## Troubleshooting

### Containers fail to start

```bash
# Check logs for specific service
docker compose logs <service-name>

# Common services: backend, frontend, mosquitto, mongodb, node-red

# Restart containers
docker compose down
docker compose up -d
```

### Out of disk space

```bash
# Check disk usage
df -h

# Clean Docker system
docker system prune -f

# Note: This removes unused images/containers but preserves `data/` directory
```

### Network issues

```bash
# Check device hostname resolution
nslookup trailcurrent01.local

# Check network connectivity
ping 8.8.8.8

# Restart network
sudo systemctl restart networking
```

---

## Future Automation

Planned deployment automation (similar to [TrailCurrentPiCanToMqttAndDocker project](https://github.com/TumorAI/TrailCurrentPiCanToMqttAndDocker)):

### Development-Time Scripts
1. **`build-and-save-images.sh`**
   - Build Docker images for ARM64 (Raspberry Pi)
   - Save as `.tar` files for offline transport
   - NOT run on device

2. **`create-deployment-package.sh`**
   - Bundle pre-built images into deployment ZIP
   - Include device-specific config templates
   - Version tracking
   - NOT run on device

### Runtime Script
3. **`deploy.sh`** (on device)
   - Single idempotent deployment script
   - Works for both initial setup AND updates
   - Loads Docker images
   - Starts services
   - Applies updates
   - Seamlessly handles both scenarios

### Integrated Features
- OTA (Over-The-Air) updates
- Firmware integration
- Rollback capabilities
- Offline deployment support

---

## Manual Setup Until Automation Ready

Until automation scripts are available, follow this manual process:

1. **Initial Device Setup (One-Time)**
   - Follow [DOCS/PiSetup.md](DOCS/PiSetup.md)
   - Set up `.env`, certificates, and mbtiles

2. **Subsequent Updates**
   ```bash
   git pull
   docker compose build
   docker compose up -d
   ```

3. **Verify**
   ```bash
   docker compose ps
   docker compose logs
   ```

---

## Questions?

For issues or questions:

1. Check container logs: `docker compose logs <service>`
2. Verify device setup: See [DOCS/PiSetup.md](DOCS/PiSetup.md)
3. Review development docs: See `README.md`
4. Check map tiles setup: See `DOCS/UpdatingMapTiles.md`

---

## Reference

- **Initial Setup**: [DOCS/PiSetup.md](DOCS/PiSetup.md)
- **Development**: [README.md](README.md)
- **Map Tiles**: [DOCS/UpdatingMapTiles.md](DOCS/UpdatingMapTiles.md)
- **Reference Project**: [TrailCurrentPiCanToMqttAndDocker](https://github.com/TumorAI/TrailCurrentPiCanToMqttAndDocker) - Shows planned automation
