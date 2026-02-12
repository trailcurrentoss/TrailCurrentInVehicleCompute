## Deployment

### For Initial Device Setup (One-Time)
See **[DOCS/PiSetup.md](DOCS/PiSetup.md)** for one-time setup tasks on a new Raspberry Pi or edge device:
- Environment configuration (`.env`)
- SSL certificate generation
- Map tiles setup
- Initial container startup

These tasks are performed ONCE per device and persist across all subsequent application updates.

### For Deploying Updates to Devices
See **[PI_DEPLOYMENT.md](PI_DEPLOYMENT.md)** for updating code on already-configured devices. This approach supports offline deployment (no internet required after setup).

### For Development
This README covers the development setup and local testing. Use `docker-compose.dev.yml` for development work on your local machine.

---

## Environment Setup (Development)

This section covers local development setup. **For production deployment on a Raspberry Pi, see [DOCS/PiSetup.md](DOCS/PiSetup.md).**

Before running the application locally, you must set up the environment configuration file. All configuration comes from a single `.env` file, and containers automatically generate derived values (password hashes, password files) at startup.

### Quick Setup (4 Steps)

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Generate secure random values for encryption:**
   ```bash
   # Generate ENCRYPTION_KEY (64 character hex string)
   openssl rand -hex 32

   # Generate NODE_RED_CREDENTIAL_SECRET (128 character hex string)
   openssl rand -hex 64
   ```
   Copy these values into the corresponding fields in `.env`.

3. **Edit `.env`** and set your own values:
   - `NODE_RED_ADMIN_USER` - Your Node-RED admin username
   - `NODE_RED_ADMIN_PASSWORD` - Your desired admin password (plain text - auto-hashed at startup)
   - `ENCRYPTION_KEY` - Paste the value from step 2
   - `NODE_RED_CREDENTIAL_SECRET` - Paste the value from step 2
   - `ADMIN_PASSWORD` - Strong password for system admin access
   - `MQTT_USERNAME` - Username for MQTT broker
   - `MQTT_PASSWORD` - Password for MQTT broker (plain text - auto-added to broker at startup)
   - `TLS_CERT_HOSTNAME` - Your device's hostname (e.g., `trailcurrent01.local`)

4. **Generate SSL certificates** (see "SSL Certificate Generation" section below):
   ```bash
   ./scripts/generate-certs.sh
   # Select option 1 for Development or option 2 for Production
   ```

5. **Set up map tiles for Tileserver** (REQUIRED - see "Map Tile Setup" section below):
   ```bash
   # Place your map tiles file at: data/tileserver/us-tiles.mbtiles
   # The Tileserver container will not start without this file
   # See DOCS/UpdatingMapTiles.md for instructions on generating tile data
   ```

6. **Start the application:**
   ```bash
   docker-compose up -d
   ```
   Containers will automatically:
   - Generate the bcrypt hash for Node-RED from your plain password
   - Create the mosquitto password file from your credentials
   - Initialize all services with consistent credentials
   - Mount the SSL certificates for HTTPS/MQTTS communication
   - Load map tiles from the mbtiles file

### Security Notes

⚠️ **CRITICAL:** Never commit `.env` to version control. The `.gitignore` file already excludes it.

- `.env` is in `.gitignore` - will never be committed
- Use strong, randomly generated passwords for all credentials
- Never use weak passwords like "admin123" or "password123"
- For production deployments, use a secrets management system (e.g., Docker Secrets, Vault)
- Keep your encryption keys secure and never share them
- All values in `.env.example` are placeholders only

### Auto-Generation at Startup

The unified configuration approach means:
- **Node-RED admin password** - Converted from plain text to bcrypt hash automatically when container starts
- **MQTT credentials** - Automatically added to mosquitto's password file when container starts
- **All services** - Read the same plain-text credentials from `.env`, ensuring they always match

This eliminates the need for manual password generation commands and ensures consistency across your system.

---

## SSL Certificate Generation

The application uses TLS/SSL for secure communication. Certificates must be generated before running `docker-compose up`. The `scripts/generate-certs.sh` script supports two modes:

### Quick Reference

```bash
# Interactive mode (prompts for selection)
./scripts/generate-certs.sh

# Non-interactive mode (development)
./scripts/generate-certs.sh 1

# Non-interactive mode (production)
./scripts/generate-certs.sh 2

# Using environment variable
CERT_MODE=2 ./scripts/generate-certs.sh

# Show help
./scripts/generate-certs.sh --help
```

### Development Certificates (Local Testing)

For local development with `localhost` or `127.0.0.1`:

```bash
# Interactive mode
./scripts/generate-certs.sh
# Select option 1 (Development)

# Or non-interactive
./scripts/generate-certs.sh 1
```

**Development certificates include:**
- DNS names: `localhost`, plus your `TLS_CERT_HOSTNAME` from `.env`
- IP addresses: `127.0.0.1`, `::1` (IPv6 localhost)
- No `/etc/hosts` modifications needed

**Access locally:**
```
https://localhost           - Frontend (HTTPS)
https://localhost:8443      - Node-RED (HTTPS)
https://127.0.0.1           - Frontend via IP
https://127.0.0.1:8443      - Node-RED via IP
```

Accept the self-signed certificate warning in your browser (one-time).

### Production Certificates (Deployment)

For deployed devices accessed from other machines on the network:

1. **Set your device's hostname:**
   ```bash
   # Edit .env and set TLS_CERT_HOSTNAME to your device's hostname
   TLS_CERT_HOSTNAME=trailcurrent01.local
   ```

2. **Generate production certificates:**
   ```bash
   # Interactive mode
   ./scripts/generate-certs.sh
   # Select option 2 (Production)

   # Or non-interactive (no prompts)
   ./scripts/generate-certs.sh 2
   ```

3. **Install the CA certificate** on devices that will access the web UI:
   - Export: `data/keys/ca.crt`
   - Install in your browser's certificate store

4. **Access from the network:**
   ```
   https://trailcurrent01.local       - Web UI
   mqtts://trailcurrent01.local:8883  - MQTT broker
   ```

### Regenerating Certificates

Run the script anytime to regenerate:
```bash
./scripts/generate-certs.sh
```

The script will:
- Prompt before overwriting existing certificates
- Backup existing certificates with timestamp
- Create fresh certificates in the selected mode

After regeneration, restart the containers:
```bash
docker-compose restart
```

### Security Notes

⚠️ **CRITICAL: Certificates are automatically protected by `.gitignore`**

- All certificate files (`.key`, `.crt`, `.pem`) are ignored by git
- The entire `data/` directory is ignored
- **Never commit generated certificates to version control**
- Each deployment should have its own unique certificates
- Different certificates for development vs. production environments

---

## Map Tile Setup

The Tileserver container provides map tiles for the web UI. It requires a pre-generated mbtiles file.

### Required File

**Location:** `data/tileserver/us-tiles.mbtiles`

The Tileserver container **will not start** without this file. This is a map tile database file that contains tile data for your region.

### Quick Start Options

#### Option 1: Use Pre-existing Tiles
If you have an existing mbtiles file:
```bash
mkdir -p data/tileserver
cp /path/to/your/tiles.mbtiles data/tileserver/us-tiles.mbtiles
```

#### Option 2: Generate Tiles from OpenStreetMap
See **[DOCS/UpdatingMapTiles.md](DOCS/UpdatingMapTiles.md)** for detailed instructions on:
- Generating mbtiles from OpenStreetMap data
- Using tools like `mbutil` and `tippecanoe`
- Updating tiles with your region-specific data

#### Option 3: Download Pre-generated Tiles
You can download pre-generated mbtiles from:
- OpenStreetMap community tile servers
- Mapbox Studio
- Other tile hosting services

### File Structure
```
data/tileserver/
├── us-tiles.mbtiles    # Your map tile database (required)
└── (any other assets if needed)
```

### Testing Tileserver
Once tiles are in place, start Docker and verify Tileserver is working:
```bash
docker-compose up -d tileserver
curl http://localhost:8080/
```

Should return the TileServer interface. The web UI will display your map tiles.

---

## Overview
This project serves as a bridge between CAN (Controller Area Network) bus and MQTT (Message Queuing Telemetry Transport) protocol. It enables bidirectional communication between CAN devices and MQTT-based systems, allowing for real-time data exchange in IoT and embedded systems environments.

## Key Features
- **CAN to MQTT**: Converts CAN bus data into MQTT messages for transmission over the network.
- **MQTT to CAN**: Receives MQTT messages and converts them back into CAN frames for sending over the CAN bus.
- **Secure Communication**: Supports TLS/SSL for secure MQTT connections.
- **Reliable Retries**: Implements retry logic for MQTT connection failures.
- **Extensible Architecture**: Easily extendable for additional CAN interfaces or MQTT topics.

## Codebase Structure
- `can-to-mqtt.py`: The main script that handles CAN to MQTT and MQTT to CAN communication.
  - **CAN Interface**: Uses the `can` library to interact with the CAN bus.
  - **MQTT Client**: Utilizes the `paho-mqtt` library for MQTT communication.
  - **TLS Configuration**: Supports secure MQTT connections using TLS/SSL.
  - **Retry Logic**: Implements a retry mechanism for MQTT connection failures.
  - **Data Conversion**: Converts CAN frames to MQTT messages and vice versa.

## Dependencies
- `can`: Python library for CAN bus communication.
- `paho-mqtt`: MQTT client library for Python.
- `json`: JSON library for data serialization.
- `time`: Time library for handling timestamps.
- `sys`: System-specific functions.
- `os`: Operating system functions.
- `ssl`: SSL/TLS library for secure communication.

## Docker Containers
The project uses Docker to run the following containers:

### 1. Mosquitto MQTT Broker
- **Container Name**: `mosquitto`
- **Description**: MQTT broker that handles message routing between devices.
- **Configuration**:
  - Runs on port `1883`
  - Supports TLS/SSL for secure communication.

### 2. CAN to MQTT Bridge
- **Container Name**: `can-to-mqtt`
- **Description**: Converts CAN bus data into MQTT messages.
- **Configuration**:
  - Uses the `can` library to interact with the CAN bus.
  - Publishes data to the MQTT broker on port `1883`.
  - Supports TLS/SSL for secure communication.

### 3. MQTT to CAN Bridge
- **Container Name**: `mqtt-to-can`
- **Description**: Receives MQTT messages and converts them back into CAN frames.
- **Configuration**:
  - Subscribes to the MQTT broker on port `1883`.
  - Uses the `can` library to send data to the CAN bus.
  - Supports TLS/SSL for secure communication.

### 4. Web Interface (Optional)
- **Container Name**: `web-interface`
- **Description**: Provides a web interface for monitoring and controlling the system.
- **Configuration**:
  - Runs on port `80`
  - Uses Flask for the web framework.

## Usage
1. Create virtual environment named cantomqtt inside the `local_code` folder
   ```bash
   python3 -m venv cantomqtt
   ```
2. **Install Dependencies**:
   ```bash
   pip3 install -r requirements.txt
   ```
3. **Setup the Script as a service**:
   ```bash
   sudo nano /etc/systemd/system/cantomqtt.service
   ```
   Place the following content into the file:
   ```bash
    [Unit]
      Description=CAN Bus to MQTT Service
      After=docker.service
      Requires=docker.service

      [Service]
      Type=simple
      User=trailcurrent
      WorkingDirectory=/home/trailcurrent/local_code
      EnvironmentFile=/home/trailcurrent/local_code/.env
      ExecStart=/home/trailcurrent/local_code/cantomqtt/bin/python /home/trailcurrent/local_code/can-to-mqtt.py
      Restart=always

      [Install]
      WantedBy=multi-user.target
   ```

3. **Configuration**:
   - MQTT broker address and port are configured in the script.
   - TLS/SSL settings can be adjusted for secure connections.
   - CAN bus interface and channel are configured in the script.

## Docker

### Project Structure
The Docker setup has been reorganized for clarity:
- **`containers/`** - Contains all Dockerfile definitions for each service
- **`config/`** - Version-controlled configuration files (mosquitto.conf, settings.js)
- **`data/`** - Runtime and persistent data volumes (gitignored)
- **`docker-compose.yml`** - Main orchestration file at project root
- **`docker-compose.dev.yml`** - Development mode overrides

### Pre-Flight: Tileserver Setup

The tileserver requires fonts to be available for building. If rebuilding the tileserver image locally, run the setup script first:

```sh
cd containers/tileserver
./setup.sh
```

This script will:
- Check if fonts are available
- Copy fonts from the Product directory if needed
- Verify the setup is complete

**Note:** The pre-built Docker Hub image already has everything needed. Setup is only required if rebuilding the image locally.

### Running Containers

To start the services:
```sh
docker compose up -d
```

To run in development mode:
```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

#### Important: Docker Networking

**MongoDB Access:**
- Services communicate via Docker's internal network: `mongodb:27017`
- MongoDB is NOT exposed to localhost (127.0.0.1)
- To access MongoDB from your host, use: `docker compose exec mongodb mongosh`
- The backend container connects via: `mongodb://mongodb:27017/trailcurrent`

**Why?** Docker containers use service names for inter-container communication. Binding to `127.0.0.1` causes networking issues and is unnecessary.

#### Data Persistence

The `data/` directory contains all persistent application data and configuration:

**Persistent Data:**
- **SSL certificates** (`data/keys/`) - Generated once, persist forever
  - Server certificate and key
  - CA certificate for browser installation
  - Valid for 10 years - no need to regenerate on updates

- **Map tiles** (`data/tileserver/us-tiles.mbtiles`) - Set up once, rarely updated
  - Downloaded or generated once during initial setup
  - Persists across all application updates

- **Node-RED flows** (`data/node-red/`) - User-created flows and settings
  - Custom flows and configurations
  - Persists across application updates

- **Runtime data** - Various application data and databases
  - Persists across container rebuilds

**⚠️ IMPORTANT:**
- The entire `data/` directory is gitignored and persists across container rebuilds
- **Never delete `data/` during updates** unless performing a complete reset
- Backup `data/` before major updates

**Updating the Application (No Data Loss):**
```bash
# Pull latest code
git pull

# Rebuild containers with new code
docker compose build

# Restart with new containers
docker compose up -d

# All data in data/ persists - no need to:
# - Regenerate certificates
# - Reconfigure .env
# - Re-download map tiles
```

---

### MQTT Password Generation
To generate a new password use this command and copy the output.
```
docker run --rm eclipse-mosquitto sh -c "mosquitto_passwd -b -c /tmp/passwd rvmqtt mqttpass123 && cat /tmp/passwd"
```

### NodeRed Password Generation
```
docker exec $(docker ps -qf name=node-red) node -e "require('bcryptjs').hash('yourdesiredpassword', 8, (e,h) => console.log(h))"
```

---

## Debugging

### VSCode Node.js Debugger

The backend Node.js server can be debugged using VSCode's built-in debugger. The setup uses `--inspect-brk` to pause the application at startup, waiting for the debugger to attach before continuing execution.

#### Quick Start

1. **Open the project in VSCode** (if not already open)

2. **Start debugging:**
   - Open the Debug panel (Ctrl+Shift+D / Cmd+Shift+D)
   - Select "Backend Debug" from the dropdown
   - Click the green "Start Debugging" button (or press F5)

3. **What happens automatically:**
   - Docker containers start in development mode (`docker-compose -f docker-compose.yml -f docker-compose.dev.yml up`)
   - Backend container starts with `--inspect-brk=0.0.0.0:9229` (pauses at startup)
   - VSCode automatically attaches the debugger to port 9229
   - Application resumes and you can now set breakpoints

4. **Stop debugging:**
   - Press Shift+F5 or click the stop button in the debug panel
   - Docker containers are automatically stopped (`docker-compose down`)

#### Manual Debugging (Without VSCode Integration)

If you prefer to manage containers manually:

```bash
# Start containers in development mode
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# In VSCode, attach manually:
# - Open Debug panel (Ctrl+Shift+D)
# - Select "Backend Debug"
# - Click "Start Debugging" (F5)
```

#### Debugging Features

**Breakpoints:**
- Click on the line number in the editor to set/remove breakpoints
- Breakpoints are highlighted in red
- When execution hits a breakpoint, the debugger pauses and shows the call stack

**Watch Variables:**
- In the Debug panel, open the "Watch" tab
- Click "+" to add expressions to monitor
- Variables update as you step through code

**Step Through Code:**
- **Step Over (F10)**: Execute current line, skip into function calls
- **Step Into (F11)**: Execute current line, step into function calls
- **Step Out (Shift+F11)**: Execute remaining lines of current function
- **Continue (F5)**: Resume execution until next breakpoint

**Call Stack:**
- Shows the chain of function calls leading to current execution point
- Click on stack frames to view variables in that scope

**Debug Console:**
- Execute JavaScript expressions in the context of the paused application
- Type expressions and press Enter to see results
- Useful for inspecting variable values

#### Debugging Configuration

The debugging setup is configured in `.vscode/launch.json`:

```json
{
  "name": "Backend Debug",
  "type": "node",
  "request": "attach",
  "port": 9229,
  "address": "localhost",
  "restart": true,
  "skipFiles": ["<node_internals>/**"],
  "outFiles": ["${workspaceFolder}/containers/backend/src/**/*.js"]
}
```

**Key settings:**
- `port: 9229` - Connects to backend's debug port
- `restart: true` - Automatically reconnects if debugger disconnects
- `skipFiles` - Skips Node.js internal files when stepping
- `outFiles` - Maps source files for better step-through experience

#### Troubleshooting

**"Connection refused" error:**
- Ensure containers are running: `docker compose ps`
- Check backend container logs: `docker compose logs backend`
- Verify port 9229 is exposed: `docker compose port backend 9229`
- Try restarting: Stop debugger (Shift+F5) and start again (F5)

**Breakpoints not being hit:**
- Verify the file path matches exactly (case-sensitive on Linux)
- Check that the backend container is using development mode: `docker compose config | grep "NODE_ENV"`
- Ensure the code hasn't been cached - try restarting the debugger

**Backend container exits immediately:**
- Check logs for MongoDB connection errors: `docker compose logs backend`
- Ensure `.env` file is set up correctly with all required values
- Verify MongoDB container is running: `docker compose logs mongodb`

**Cannot set breakpoints in the editor:**
- Make sure you're in a `.js` file under `containers/backend/src/`
- The file must be part of the running application
- Try clicking directly on the line number

**Mosquitto or other containers failing to start:**
- Check container logs: `docker compose logs mosquitto`
- Common issue: Certificate files have incorrect permissions
- Fix: `chmod 644 data/keys/*.key data/keys/*.crt data/keys/*.pem`
- The `generate-certs.sh` script creates files with correct permissions by default

**Port conflicts (e.g., "address already in use"):**
- Clean up old Docker resources: `docker system prune -f --volumes`
- Verify no containers are running: `docker ps -a`
- If issues persist, restart Docker daemon: `sudo systemctl restart docker`

#### Environment Notes

- **Development mode** (`NODE_ENV=development`): Backend runs with `--inspect-brk` for debugging
- **Production mode** (`NODE_ENV=production`): Debug port not exposed, `--inspect` flag not used
- **Docker Compose files used:**
  - `docker-compose.yml` - Base services (backend, frontend, MongoDB, etc.)
  - `docker-compose.dev.yml` - Development overrides (debug port, inspector flags, etc.)

#### Tips for Effective Debugging

1. **Breakpoint in startServer()**: Set a breakpoint at the beginning of `startServer()` in `src/index.js` to debug initialization

2. **Route breakpoints**: Set breakpoints in route handlers (e.g., `src/routes/thermostat.js`) to debug API requests

3. **MQTT debugging**: Set breakpoints in `src/mqtt.js` to debug MQTT message handling

4. **Database debugging**: Set breakpoints in `src/db/init.js` to debug MongoDB operations

5. **Conditional breakpoints**: Right-click a breakpoint → "Edit Breakpoint" to set conditions (e.g., only break when a variable equals a specific value)

6. **Logpoints**: Right-click line number → "Add Logpoint" to log values without pausing execution

#### Example Debugging Workflow

1. **Debug an authentication issue:**
   - Set a breakpoint in `src/routes/auth.js` at the login handler
   - Start debugging (F5)
   - Make a login request from the frontend
   - Debugger pauses at the breakpoint
   - Inspect request body and response in the Debug Console
   - Step through authentication logic

2. **Debug API response:**
   - Set a breakpoint in the route handler before the response is sent
   - Hover over variables to see their values
   - Use the Debug Console to log JSON for complex objects

---