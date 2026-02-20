# Raspberry Pi Deployment Guide

## Overview

This document describes how to deploy TrailCurrent to a Raspberry Pi using the offline deployment package. The system uses pre-built Docker images bundled into a zip file — no internet access is required on the Pi after initial OS setup.

For initial device setup (OS, Docker, CAN bus), see [DOCS/PiSetup.md](DOCS/PiSetup.md).

---

## Deployment Package

The deployment zip is created on your development machine using:

```bash
./create-deployment-package.sh --version=1.0.0
```

This produces `trailcurrent-deployment-1.0.0.zip` containing:
- `images/*.tar` — 7 pre-built ARM64 Docker images (including MongoDB)
- `docker-compose.yml` — Service orchestration
- `config/` — Mosquitto and Node-RED configuration
- `local_code/` — Python CAN-to-MQTT bridge and OTA helpers
- `firmware/wired/` — MCU firmware binaries (if available)
- `scripts/` — SSL certificate generation
- `.env.example` — Environment variable template
- `deploy.sh` — Deployment orchestrator
- `PI_DEPLOYMENT.md` — This file

---

## First-Time Deployment

### Prerequisites

- Raspberry Pi with Docker installed (see [DOCS/PiSetup.md](DOCS/PiSetup.md))
- SSH access to the Pi
- `jq` installed (`sudo apt install jq`) — needed for OTA firmware deployment
- Map tiles file (`map.mbtiles`) transferred separately (~25GB)

### Steps

1. **Transfer the deployment package to the Pi:**
   ```bash
   scp trailcurrent-deployment-1.0.0.zip trailcurrent@trailcurrent01.local:~
   ```

2. **SSH to the Pi and extract:**
   ```bash
   ssh trailcurrent@trailcurrent01.local
   unzip trailcurrent-deployment-1.0.0.zip
   ```

3. **Run the deployment script:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

   On first run, `deploy.sh` will:
   - Create `.env` from `.env.example` and ask you to edit it (then re-run)
   - Generate TLS certificates automatically using `scripts/generate-certs.sh`
   - Load all Docker images from tar files
   - Start all services
   - Set up the CAN-to-MQTT bridge
   - Deploy MCU firmware via OTA (if firmware is included)

4. **Edit `.env` with your credentials** (first run only):
   ```bash
   nano .env
   # Set these values:
   #   MQTT_USERNAME / MQTT_PASSWORD
   #   ADMIN_PASSWORD
   #   TLS_CERT_HOSTNAME=trailcurrent01.local
   #   ENCRYPTION_KEY=$(openssl rand -hex 32)
   #   NODE_RED_CREDENTIAL_SECRET=$(openssl rand -hex 64)
   ```
   Then re-run `./deploy.sh`.

5. **Place the map tiles file** (first time or when updating maps):
   ```bash
   mkdir -p data/tileserver
   # Transfer map.mbtiles to data/tileserver/
   ```

6. **Access the application:**
   ```
   https://trailcurrent01.local
   ```

---

## Subsequent Updates

When deploying a new version:

1. **Transfer new zip to Pi:**
   ```bash
   scp trailcurrent-deployment-1.1.0.zip trailcurrent@trailcurrent01.local:~
   ```

2. **SSH in, extract, and deploy:**
   ```bash
   ssh trailcurrent@trailcurrent01.local
   unzip -o trailcurrent-deployment-1.1.0.zip
   ./deploy.sh
   ```

   On updates, `deploy.sh` will:
   - Stop existing services
   - Load updated Docker images
   - Preserve your `.env`, certificates, map tiles, and Node-RED flows
   - Restart all services
   - Update MCU firmware if new firmware is included

---

## What Persists Across Updates

These items are **PRESERVED** and never deleted by `deploy.sh`:

### Application Configuration
- `.env` — Device-specific secrets and settings
  - MQTT credentials, admin password, encryption keys, hostname

### Security
- `data/keys/` — TLS certificates
  - Server certificate and key, CA certificate
  - 10-year validity — no need to regenerate on updates

### Data
- `data/tileserver/map.mbtiles` — Map tile database (~25GB)
- `data/node-red/` — User-created Node-RED flows and credentials
- MongoDB data volume — All application state

**CRITICAL: Never delete `data/` directory during updates!**

---

## What Changes During Updates

- Docker container images (loaded from new tar files)
- Application code (backend, frontend, etc.)
- Container configurations (`config/`)
- Python local code (`local_code/`)
- MCU firmware (if included in package)

---

## Verification After Deployment

```bash
# All containers running
docker compose ps

# No errors in logs
docker compose logs --tail=20

# CAN-to-MQTT bridge running
sudo systemctl status cantomqtt.service

# API responding
curl -k https://localhost/api/health

# Web UI accessible
curl -k -o /dev/null -s -w "%{http_code}" https://localhost/
```

---

## Troubleshooting

### Containers fail to start
```bash
# Check logs for specific service
docker compose logs <service-name>
# Services: backend, frontend, mosquitto, mongodb, node-red, noderedproxy, tileserver

# Restart all containers
docker compose down && docker compose up -d --no-build
```

### CAN-to-MQTT bridge not working
```bash
# Check service status
sudo systemctl status cantomqtt.service
sudo journalctl -u cantomqtt.service -f

# Verify CAN bus interface
ip link show can0

# Check local_code .env has correct external hostname
grep MQTT_BROKER_URL ~/local_code/.env
```

### Out of disk space
```bash
df -h
docker system prune -f  # Removes unused images, preserves data/
```

### Network issues
```bash
nslookup trailcurrent01.local
ping trailcurrent01.local
```

---

## Reference

- **Initial Pi Setup**: [DOCS/PiSetup.md](DOCS/PiSetup.md)
- **Firmware Integration**: [FIRMWARE_SETUP.md](FIRMWARE_SETUP.md)
- **OTA System Details**: [OTA_DEPLOYMENT_IMPLEMENTATION.md](OTA_DEPLOYMENT_IMPLEMENTATION.md)
- **Development**: [README.md](README.md)
- **Map Tiles**: [DOCS/UpdatingMapTiles.md](DOCS/UpdatingMapTiles.md)
