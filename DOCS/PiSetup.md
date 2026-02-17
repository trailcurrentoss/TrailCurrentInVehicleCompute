# Raspberry Pi Device Setup Guide

This guide covers the **one-time setup** required when deploying to a new Raspberry Pi or edge device. These steps are performed ONCE per device and the configuration persists across all subsequent application builds and updates.

---

## Overview

After following this guide, your device will have:
- ✅ Environment configuration (`.env`)
- ✅ SSL certificates for HTTPS/MQTTS
- ✅ Map tiles for the web UI
- ✅ Docker containers running

## Prerequisites

### Hardware
- Raspberry Pi 4 or 5 (8GB+ RAM recommended)
- microSD card (32GB+)
- Network connectivity (Ethernet or WiFi)
- Power adapter

### Base System
- Raspberry Pi OS Lite (latest, with Docker pre-installed)
  - *Note: Full Docker setup automation planned for future releases*
- SSH access to device
- Basic knowledge of Linux command line

### Software on Your Development Machine
- Git
- OpenSSL (for certificate generation)
- Text editor

---

## Step 1: Clone Repository

SSH to your Raspberry Pi and clone this repository:

```bash
git clone <REPO_URL>
cd TrailCurrentInVehicleCompute
```

Replace `<REPO_URL>` with your repository URL.

---

## Step 2: Environment Configuration (.env)

The `.env` file contains all device-specific configuration and credentials. It is created once and persists across all updates.

### Create .env File

```bash
cp .env.example .env
```

### Edit .env with Device-Specific Values

```bash
nano .env
```

**Required values to set:**

1. **Device Hostname** (for SSL certificates and network access)
   ```bash
   TLS_CERT_HOSTNAME=trailcurrent01.local
   ```
   - Replace `trailcurrent01` with your device's hostname
   - This is used in the device's SSL certificate
   - Must match the actual device hostname on your network

2. **MQTT Credentials**
   ```bash
   MQTT_USERNAME=mqtt_user
   MQTT_PASSWORD=your_secure_mqtt_password
   ```
   - Set secure, unique credentials
   - Used by all services communicating with the MQTT broker

3. **Admin Password**
   ```bash
   ADMIN_PASSWORD=your_secure_admin_password
   ```
   - Strong password for system admin access

4. **Generate Encryption Keys**

   Generate cryptographically secure random keys using OpenSSL:

   ```bash
   # ENCRYPTION_KEY (64 character hex string)
   openssl rand -hex 32
   # Copy output to ENCRYPTION_KEY in .env

   # NODE_RED_CREDENTIAL_SECRET (128 character hex string)
   openssl rand -hex 64
   # Copy output to NODE_RED_CREDENTIAL_SECRET in .env
   ```

5. **Optional: Node-RED Admin**
   ```bash
   NODE_RED_ADMIN_USER=admin
   NODE_RED_ADMIN_PASSWORD=your_secure_nodered_password
   ```
   - If using Node-RED web editor

### ⚠️ SECURITY NOTES

- **Never commit `.env` to git** - It contains sensitive credentials
- **`.env` is automatically gitignored** - Will never be committed
- **Unique per device** - Each device has its own `.env` file
- **Keep backups** - Save a copy in a secure location for device recovery

---

## Step 3: SSL Certificate Generation

SSL certificates are generated once per device and persist forever (or until expiration/hostname change).

### Generate Production Certificates

```bash
./scripts/generate-certs.sh 2
```

This command:
- Generates HTTPS certificates for the device
- Uses the `TLS_CERT_HOSTNAME` from your `.env` file
- Creates files in `data/keys/` directory
- ✅ **Persists across builds** - Never delete `data/keys/` directory

### For Non-Interactive Generation

If running in an automated script:

```bash
CERT_MODE=2 ./scripts/generate-certs.sh
```

Or:

```bash
./scripts/generate-certs.sh 2
```

### Certificate Details

**Generated Files:**
- `data/keys/server.crt` - Server certificate
- `data/keys/server.key` - Server private key
- `data/keys/ca.crt` - CA certificate (for browser installation)
- `data/keys/ca.pem` - CA certificate (PEM format)

**Certificate Validity:**
- 10-year validity period
- Common Name (CN): Your device hostname (e.g., `trailcurrent01.local`)
- Subject Alternative Names: Device hostname, localhost (127.0.0.1), and IPv6 localhost

### Installing CA Certificate in Browsers

When accessing the device from other machines on your network, browsers will show a certificate warning unless you install the CA certificate.

**To install the CA certificate:**

1. **Export CA certificate:**
   ```bash
   cat data/keys/ca.crt
   ```
   Copy the entire certificate (including `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----`)

2. **On each accessing device:**
   - **Chrome/Chromium**: Settings → Privacy → Security → Manage certificates → Import → Select the CA cert
   - **Firefox**: Preferences → Privacy → Certificates → View Certificates → Authorities → Import → Select the CA cert
   - **Safari/macOS**: Keychain Access → Import → Select the CA cert
   - **Windows**: Double-click CA cert → Install Certificate

---

## Step 4: Map Tiles Setup

The Tileserver container provides map tiles for the web UI. It requires a pre-generated mbtiles file.

### Obtain mbtiles File

**Option 1: Download Pre-Generated Tiles (Easiest)**
- Use `DOCS/UpdatingMapTiles.md` to download pre-generated tiles
- Or obtain from a tile provider

**Option 2: Generate from OpenStreetMap Data**
- See `DOCS/UpdatingMapTiles.md` for detailed instructions
- Requires tools like `tippecanoe` and `osmium`

### Place mbtiles File

```bash
mkdir -p data/tileserver
cp /path/to/your/tiles.mbtiles data/tileserver/map.mbtiles
```

**Requirements:**
- File must exist at: `data/tileserver/map.mbtiles`
- Application will not start without this file
- File size: Typically 50-500 MB depending on region/zoom levels

### ✅ Persistence

- Mbtiles file persists across all builds
- Only update when you need newer map data

---

## Step 5: Data Directory Overview

The `data/` directory contains all persistent application data and configuration.

```
data/
├── keys/                           # SSL certificates (persist)
│   ├── server.crt
│   ├── server.key
│   ├── ca.crt
│   └── ca.pem
├── tileserver/                     # Map tiles (persist)
│   └── map.mbtiles
├── node-red/                       # Node-RED flows (persist)
│   ├── flows.json
│   ├── flows_cred.json
│   └── settings.js
└── (other runtime data volumes)
```

### ⚠️ CRITICAL: Data Persistence

- **The entire `data/` directory persists across builds**
- **Never delete `data/` during updates**
- **Backup `data/` before major updates**

---

## Step 6: Initial Container Startup

Now that configuration is complete, start the application:

```bash
# Start all containers in the background
docker compose up -d

# Verify all containers are running
docker compose ps
```

**Expected output:**
- All containers should show `Up` status
- Some containers may show `(health: starting)` initially - give them 10-30 seconds

### Troubleshooting Startup Issues

**MongoDB won't start:**
```bash
docker compose logs mongodb
```

**Mosquitto won't start (usually certificate permission issue):**
```bash
docker compose logs mosquitto
# If permission denied on certificate:
chmod 644 data/keys/*.key data/keys/*.crt
docker compose restart mosquitto
```

**Backend connection errors:**
```bash
docker compose logs backend
# Check that MongoDB and Mosquitto are running
docker compose ps
```

---

## Step 7: Access the Application

### Local Device Access

If accessing from the Raspberry Pi itself:

```bash
https://127.0.0.1       # Web UI
https://localhost       # Web UI (alternative)
https://127.0.0.1:8883  # MQTT broker (TLS)
```

Accept the self-signed certificate warning (one-time).

### Network Access from Other Devices

Access from other machines on your network:

```
https://trailcurrent01.local    # Web UI (replace with your device hostname)
mqtts://trailcurrent01.local:8883  # MQTT broker
```

**Note:** You should have already installed the CA certificate in your browser (Step 3).

### Verify Services

**Check if web UI is responding:**
```bash
curl -k https://localhost/
```

**Check MQTT broker:**
```bash
docker compose logs mosquitto | tail -20
```

**Check backend API:**
```bash
curl -k https://localhost/api/health
```

---

## Verification Checklist

Complete these checks to ensure successful setup:

- [ ] `.env` file created with all required values set
- [ ] `openssl rand` commands executed and keys copied to `.env`
- [ ] SSL certificates generated (files exist in `data/keys/`)
- [ ] mbtiles file exists at `data/tileserver/map.mbtiles`
- [ ] `docker compose ps` shows all containers running
- [ ] Can access `https://<device-hostname>.local` from a browser
- [ ] Can access `https://127.0.0.1` from the device itself
- [ ] No SSL certificate errors (or only self-signed warning)
- [ ] Mosquitto MQTTS broker accessible on port 8883
- [ ] Node-RED web editor accessible on HTTPS
- [ ] Map tiles visible in web UI
- [ ] Backend API responds to health check

---

## What Persists Across Builds

When you update the application with new code, these items are **preserved**:

- ✅ `.env` - Device configuration
- ✅ `data/keys/` - SSL certificates
- ✅ `data/tileserver/map.mbtiles` - Map tiles
- ✅ `data/node-red/` - User-created flows
- ✅ All other data in `data/` directory

You **do NOT need to**:
- Regenerate certificates
- Reconfigure `.env`
- Re-download mbtiles

---

## Updating the Application

When you have new code to deploy (no new setup required):

```bash
# Pull latest code
git pull

# Rebuild containers with new code
docker compose build

# Restart with new containers
docker compose up -d

# Verify all containers running
docker compose ps
```

That's it! All configuration and data persists.

---

## One-Time vs Ongoing Tasks

| Task | Frequency | Documentation |
|------|-----------|---|
| Create `.env` | Once per device | This document |
| Generate SSL certificates | Once per device* | This document |
| Set up map tiles | Once per device, rarely update | `DOCS/UpdatingMapTiles.md` |
| Update application code | Frequently | `PI_DEPLOYMENT.md` |
| Restart containers | As needed | `PI_DEPLOYMENT.md` |
| Update map tiles | Yearly or as needed | `DOCS/UpdatingMapTiles.md` |

*Regenerate certificates only if: Expired (10 years), hostname changed, or security compromise

---

## Next Steps

- For **updating the application** with new code, see `PI_DEPLOYMENT.md`
- For **managing map tiles**, see `DOCS/UpdatingMapTiles.md`
- For **development on your local machine**, see main `README.md`

---

## Support

For troubleshooting or issues, check:
1. Container logs: `docker compose logs <service-name>`
2. SSH into device and check system resources: `free -h`, `df -h`, `ps aux`
3. Network connectivity: `ping 8.8.8.8`, `ping <gateway>`
4. DNS resolution: `nslookup <hostname>.local`
