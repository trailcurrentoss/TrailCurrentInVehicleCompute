#!/bin/bash
set -e

# TrailCurrent Deployment Script
# Deploys the TrailCurrent system on a Raspberry Pi from a deployment package
#
# This script:
#   1. Stops existing services
#   2. Loads Docker images from tar files
#   3. Sets up environment files
#   4. Starts Docker services
#   5. Installs Python dependencies
#   6. Restarts the CAN-to-MQTT service
#   7. Deploys MCU firmware via OTA (if firmware is included)
#
# Usage: ./deploy.sh
# Must be run from the deployment package directory.

# Venv path for the cantomqtt systemd service (matches can-to-mqtt.service)
VENV_PATH="$HOME/local_code/cantomqtt"
LOCAL_CODE_DEST="$HOME/local_code"

# Function to deploy firmware to a device via OTA
deploy_firmware() {
    local hostname=$1
    local firmware_path=$2
    local device_name=$3

    # Step 1: Trigger OTA mode via MQTT
    echo "  Triggering OTA mode for $device_name ($hostname)..."
    "$VENV_PATH/bin/python3" local_code/trigger_ota_mqtt.py "$hostname"

    if [ $? -ne 0 ]; then
        echo "  Failed to send OTA trigger to $hostname"
        return 1
    fi

    # Step 2: Wait for device to enter OTA mode (8-10 seconds)
    echo "  Waiting for $hostname to enter OTA mode..."
    sleep 8

    # Step 3: Use bundled espota.py
    ESPOTA="local_code/espota.py"
    if [ ! -f "$ESPOTA" ]; then
        echo "  espota.py not found at $ESPOTA"
        return 1
    fi

    # Step 4: Determine the Pi's IP address for OTA upload
    UPLOAD_IP=$(python3 -c "
import socket
try:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(('8.8.8.8', 80))
    ip = s.getsockname()[0]
    s.close()
    print(ip)
except:
    try:
        print(socket.gethostbyname(socket.gethostname()))
    except:
        print('127.0.0.1')
" 2>/dev/null)

    if [ -z "$UPLOAD_IP" ] || [ "$UPLOAD_IP" = "127.0.0.1" ]; then
        echo "  Warning: Could not determine Pi IP, using hostname: $TLS_HOSTNAME"
        UPLOAD_IP="$TLS_HOSTNAME"
    fi

    # Step 5: Push firmware using espota.py
    echo "  Uploading firmware to $hostname (using $UPLOAD_IP as upload server)..."
    python3 "$ESPOTA" -i "$hostname" -I "$UPLOAD_IP" -f "$firmware_path" -d

    # Step 6: Verify (check exit code)
    if [ $? -eq 0 ]; then
        echo "  Successfully deployed firmware to $device_name"
        return 0
    else
        echo "  Failed to deploy firmware to $device_name"
        return 1
    fi
}

echo "=========================================="
echo "TrailCurrent Deployment Script"
echo "=========================================="

# Check if Docker is installed
if ! [ -x "$(command -v docker)" ] && ! [ -f /usr/bin/docker ]; then
    echo "ERROR: Docker is not installed. Please install Docker first."
    exit 1
fi

cd "$(dirname "$0")"

# Step 0: Check for .env file, offer to create from template
echo "Step 0: Checking prerequisites..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo ""
        echo "  No .env file found. Creating from .env.example..."
        echo "  IMPORTANT: You must edit .env and set your own passwords/secrets before continuing."
        echo ""
        cp .env.example .env
        echo "  Created .env from template."
        echo "  Please edit .env now, then re-run ./deploy.sh"
        echo ""
        echo "  Quick setup commands:"
        echo "    nano .env"
        echo "    # Set MQTT_PASSWORD, ADMIN_PASSWORD, etc."
        echo "    # Generate secrets:"
        echo "    #   ENCRYPTION_KEY: openssl rand -hex 32"
        echo "    #   NODE_RED_CREDENTIAL_SECRET: openssl rand -hex 64"
        echo ""
        exit 1
    else
        echo "ERROR: .env file not found and no .env.example template available."
        echo "Please create a .env file before running this script."
        exit 1
    fi
fi

# Check for TLS certificates
if [ ! -d "data/keys" ] || [ ! -f "data/keys/server.crt" ]; then
    echo ""
    echo "  TLS certificates not found at data/keys/"
    if [ -f "scripts/generate-certs.sh" ]; then
        echo "  Generating certificates..."
        chmod +x scripts/generate-certs.sh
        ./scripts/generate-certs.sh 2
        echo "  Certificates generated."
    else
        echo "  ERROR: No certificate generation script found."
        echo "  Please generate TLS certificates manually and place them in data/keys/"
        exit 1
    fi
fi

echo "  Prerequisites OK"

# Load starter Node-RED flow on first-time setup (won't overwrite existing flows)
if [ ! -f "data/node-red/flows.json" ] && [ -f "config/node-red/starter-flow.json" ]; then
    echo "  Loading starter Node-RED flow..."
    mkdir -p data/node-red
    cp config/node-red/starter-flow.json data/node-red/flows.json
    echo "  Starter flow loaded. After startup, open Node-RED and configure MQTT credentials."
fi

# Step 1: Stop existing services
echo ""
echo "Step 1: Stopping existing services..."

# Stop Docker services (docker-compose.yml is at the root level)
docker compose down 2>/dev/null || true

# Stop systemd service for Python code
if systemctl is-active --quiet cantomqtt.service; then
    echo "  Stopping cantomqtt.service..."
    sudo systemctl stop cantomqtt.service
fi

# Step 2: Load Docker images from tar files
echo ""
echo "Step 2: Loading Docker images..."
images_loaded=0
for image_file in images/*.tar; do
    if [ -f "$image_file" ]; then
        echo "  Loading $image_file..."
        if docker load -i "$image_file"; then
            images_loaded=$((images_loaded+1))
        else
            echo "  Warning: Failed to load $image_file"
        fi
    fi
done
echo "  Loaded $images_loaded image(s)"

# Step 3: Set up environment files
echo ""
echo "Step 3: Setting up environment files..."

TLS_HOSTNAME=$(grep "^TLS_CERT_HOSTNAME=" .env | cut -d'=' -f2)

# Create local_code .env with external hostname for host scripts
cp .env local_code/.env
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|mqtts://mosquitto:|mqtts://${TLS_HOSTNAME}:|g" local_code/.env
else
    sed -i "s|mqtts://mosquitto:|mqtts://${TLS_HOSTNAME}:|g" local_code/.env
fi

echo "  Root .env: MQTT_BROKER_URL=mqtts://mosquitto:8883 (for Docker)"
echo "  local_code/.env: MQTT_BROKER_URL=mqtts://${TLS_HOSTNAME}:8883 (for host scripts)"

# Step 4: Start Docker services
echo ""
echo "Step 4: Starting Docker services..."
# --no-build: use pre-loaded images, don't try to build from source
docker compose up -d --no-build

# Step 5: Ensure local_code is deployed to the user's home directory
echo ""
echo "Step 5: Deploying local_code to $LOCAL_CODE_DEST..."
SRC_LOCAL_CODE="$(cd local_code && pwd)"
DEST_LOCAL_CODE="$(cd "$LOCAL_CODE_DEST" 2>/dev/null && pwd || echo "$LOCAL_CODE_DEST")"
if [ "$SRC_LOCAL_CODE" = "$DEST_LOCAL_CODE" ]; then
    echo "  local_code already in place, skipping copy"
else
    if [ -d "$LOCAL_CODE_DEST" ]; then
        # Preserve existing .env if it exists
        if [ -f "$LOCAL_CODE_DEST/.env" ]; then
            cp "$LOCAL_CODE_DEST/.env" /tmp/cantomqtt_env_backup
        fi
    fi
    mkdir -p "$LOCAL_CODE_DEST"
    cp -r local_code/* "$LOCAL_CODE_DEST/"

    # Restore or deploy the local_code .env
    if [ -f /tmp/cantomqtt_env_backup ]; then
        # Keep existing env (may have manual customizations)
        mv /tmp/cantomqtt_env_backup "$LOCAL_CODE_DEST/.env"
    else
        cp local_code/.env "$LOCAL_CODE_DEST/.env"
    fi
fi

# Copy CA certificate for host-side scripts (separate from Docker volume mounts)
if [ -f "data/keys/ca.pem" ]; then
    cp data/keys/ca.pem "$LOCAL_CODE_DEST/ca.pem"
fi

# Step 5.5: Install Python dependencies
echo ""
echo "Step 5.5: Installing Python dependencies..."
if [ -f "local_code/requirements.txt" ]; then
    if [ -d "$VENV_PATH" ]; then
        "$VENV_PATH/bin/pip" install -q -r local_code/requirements.txt
        echo "  Python dependencies installed"
    else
        echo "  Virtual environment not found at $VENV_PATH"
        echo "  Creating virtual environment..."
        python3 -m venv "$VENV_PATH"
        "$VENV_PATH/bin/pip" install -q -r local_code/requirements.txt
        echo "  Virtual environment created and dependencies installed"
    fi
else
    echo "  local_code/requirements.txt not found"
fi

# Step 6: Restart Python service (cantomqtt)
echo ""
echo "Step 6: Restarting Python service (cantomqtt)..."
if sudo systemctl is-active --quiet cantomqtt.service 2>/dev/null || sudo systemctl is-enabled --quiet cantomqtt.service 2>/dev/null; then
    sudo systemctl restart cantomqtt.service
    echo "  cantomqtt.service restarted"
else
    echo "  cantomqtt.service not installed, installing..."
    if [ -f "local_code/can-to-mqtt.service" ]; then
        sudo cp local_code/can-to-mqtt.service /etc/systemd/system/cantomqtt.service
        sudo systemctl daemon-reload
        sudo systemctl enable --now cantomqtt.service
        echo "  cantomqtt.service installed and started"
    else
        echo "  ERROR: local_code/can-to-mqtt.service not found"
    fi
fi

# Wait for cantomqtt to initialize (connect to MQTT broker and CAN bus)
echo "  Waiting for CAN-to-MQTT bridge to initialize..."
sleep 5

# Step 6.1: Install/restart deployment watcher service
echo ""
echo "Step 6.1: Setting up deployment watcher service..."
if sudo systemctl is-active --quiet deployment-watcher.service 2>/dev/null || sudo systemctl is-enabled --quiet deployment-watcher.service 2>/dev/null; then
    sudo systemctl restart deployment-watcher.service
    echo "  deployment-watcher.service restarted"
else
    echo "  deployment-watcher.service not installed, installing..."
    if [ -f "local_code/deployment-watcher.service" ]; then
        sudo cp local_code/deployment-watcher.service /etc/systemd/system/deployment-watcher.service
        sudo systemctl daemon-reload
        sudo systemctl enable --now deployment-watcher.service
        echo "  deployment-watcher.service installed and started"
    else
        echo "  local_code/deployment-watcher.service not found, skipping"
    fi
fi

# Step 6.5: Provision WiFi credentials to MCUs (needed for OTA)
echo ""
echo "Step 6.5: Provisioning WiFi credentials to MCUs..."
if [ -f "local_code/provision_wifi_mqtt.py" ]; then
    BACKEND_CONTAINER=$(docker compose ps -q backend 2>/dev/null)
    if [ -n "$BACKEND_CONTAINER" ]; then
        # Query MongoDB and decrypt WiFi password inside the backend container
        # (it has Node.js crypto, ENCRYPTION_KEY env var, and mongodb driver)
        WIFI_CREDS=$(docker exec "$BACKEND_CONTAINER" node -e '
            const { MongoClient } = require("mongodb");
            const crypto = require("crypto");
            async function main() {
                const client = await MongoClient.connect("mongodb://mongodb:27017");
                const config = await client.db("trailcurrent").collection("system_config").findOne({_id: "main"});
                await client.close();
                if (!config || !config.wifi_ssid || !config.wifi_password_encrypted || !config.wifi_password_iv) {
                    process.exit(1);
                }
                const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
                const iv = Buffer.from(config.wifi_password_iv, "hex");
                const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
                let password = decipher.update(config.wifi_password_encrypted, "hex", "utf8");
                password += decipher.final("utf8");
                console.log(config.wifi_ssid);
                console.log(password);
            }
            main().catch(() => process.exit(1));
        ' 2>/dev/null)

        if [ $? -eq 0 ] && [ -n "$WIFI_CREDS" ]; then
            WIFI_SSID=$(echo "$WIFI_CREDS" | head -n 1)
            WIFI_PASSWORD=$(echo "$WIFI_CREDS" | tail -n 1)

            if [ -n "$WIFI_SSID" ] && [ -n "$WIFI_PASSWORD" ]; then
                echo "  Sending WiFi credentials to MCUs (SSID: $WIFI_SSID)..."
                "$VENV_PATH/bin/python3" local_code/provision_wifi_mqtt.py "$WIFI_SSID" "$WIFI_PASSWORD"
                if [ $? -eq 0 ]; then
                    echo "  WiFi credentials provisioned successfully"
                    # Brief wait for MCUs to store credentials in NVS
                    sleep 2
                else
                    echo "  Warning: Failed to provision WiFi credentials"
                fi
            else
                echo "  Warning: Could not parse WiFi credentials"
            fi
        else
            echo "  No WiFi credentials configured, skipping (configure via Settings > Wireless)"
        fi
    else
        echo "  Backend container not running, skipping WiFi provisioning"
    fi
else
    echo "  provision_wifi_mqtt.py not found, skipping WiFi provisioning"
fi

# Step 7: Deploy MCU firmware (if included in this deployment package)
echo ""
echo "Step 7: Deploying MCU firmware (if present)..."
# Check the .firmware-included flag written by create-deployment-package.sh.
# This flag is always in the zip, so unzip overwrites it even when firmware/
# binaries from a previous deployment are left behind (unzip overlays, it
# never deletes old files).
FIRMWARE_INCLUDED=$(cat .firmware-included 2>/dev/null)
if [ "$FIRMWARE_INCLUDED" = "yes" ] && [ -f "local_code/trigger_ota_mqtt.py" ]; then
    echo "  Firmware directory found, querying enabled devices..."

    # Query MongoDB for enabled modules via Docker (MongoDB is not exposed to host)
    MONGODB_CONTAINER=$(docker compose ps -q mongodb 2>/dev/null)
    if [ -z "$MONGODB_CONTAINER" ]; then
        echo "  MongoDB container not running, skipping OTA deployment"
        MODULES="[]"
    else
        MODULES=$(docker exec "$MONGODB_CONTAINER" mongosh --quiet --eval '
            const config = db.getSiblingDB("trailcurrent").system_config.findOne({_id: "main"});
            const modules = (config && config.mcu_modules) || [];
            const enabled = modules.filter(m => m.enabled === true).map(m => ({hostname: m.hostname, type: m.type, name: m.name}));
            JSON.stringify(enabled);
        ' 2>/dev/null || echo "[]")
    fi

    if [ "$MODULES" = "[]" ]; then
        echo "  No enabled modules found in database, skipping OTA deployment"
    else
        echo "  Deploying firmware to enabled modules..."

        if command -v jq &> /dev/null; then
            echo "$MODULES" | jq -c '.[]' | while read -r module; do
                HOSTNAME=$(echo "$module" | jq -r '.hostname')
                TYPE=$(echo "$module" | jq -r '.type')
                NAME=$(echo "$module" | jq -r '.name')
                FIRMWARE_PATH="firmware/wired/${TYPE}/firmware.bin"

                if [ -f "$FIRMWARE_PATH" ]; then
                    echo "  Deploying firmware to $NAME ($HOSTNAME)..."
                    deploy_firmware "$HOSTNAME" "$FIRMWARE_PATH" "$NAME" || true
                else
                    echo "  No firmware found for $NAME (type: $TYPE), skipping..."
                fi
            done
            echo "  Firmware deployment complete"
        else
            echo "  jq not found, skipping firmware deployment (install jq to enable OTA updates)"
        fi
    fi
else
    echo "  No firmware included in this deployment package, skipping OTA deployment"
fi

echo ""
echo "=========================================="
echo "Deployment complete!"
echo "=========================================="
echo ""
echo "Docker services status:"
docker compose ps
echo ""
echo "Python service status:"
sudo systemctl status cantomqtt.service --no-pager 2>/dev/null || echo "  (not installed or not enabled)"
echo ""
echo "Access the application at:"
if [ -n "$TLS_HOSTNAME" ]; then
    echo "  https://$TLS_HOSTNAME"
else
    echo "  https://$(hostname).local"
fi
echo ""
echo "Useful commands:"
echo "  View Docker logs:  docker compose logs -f"
echo "  View Python logs:  sudo journalctl -u cantomqtt.service -f"
echo "  Restart services:  docker compose restart"
echo "  Stop services:     docker compose down"
echo ""
