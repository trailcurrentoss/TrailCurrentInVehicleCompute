#!/usr/bin/env python3
"""
TrailCurrent Deployment Watcher

Subscribes to the cloud MQTT broker for deployment notifications,
downloads deployment packages, verifies checksums, extracts them,
and runs deploy.sh.

Cloud configuration (URL, MQTT credentials, API key) is read from
MongoDB via docker exec into the backend container, matching the
pattern used by deploy.sh.
"""

import json
import os
import sys
import ssl
import re
import time
import hashlib
import zipfile
import subprocess
import signal
import shutil
import tempfile
import traceback
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

import paho.mqtt.client as mqtt

# Load .env file from script directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(SCRIPT_DIR, '.env')
if os.path.isfile(ENV_FILE):
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip().strip('\r')
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()
    print(f"Loaded env from {ENV_FILE}")
else:
    print(f"Warning: No .env file found at {ENV_FILE}")

# Local MQTT settings (for receiving config change notifications)
MQTT_BROKER_URL = os.environ.get('MQTT_BROKER_URL')
if not MQTT_BROKER_URL:
    print('ERROR: MQTT_BROKER_URL environment variable must be set', file=sys.stderr)
    sys.exit(1)

match = re.match(r'(mqtts?)://([^:]+):(\d+)', MQTT_BROKER_URL)
if not match:
    print(f'ERROR: Invalid MQTT_BROKER_URL format: {MQTT_BROKER_URL}', file=sys.stderr)
    sys.exit(1)

LOCAL_MQTT_PROTOCOL = match.group(1)
LOCAL_MQTT_BROKER = match.group(2)
LOCAL_MQTT_PORT = int(match.group(3))
LOCAL_MQTT_USE_TLS = (LOCAL_MQTT_PROTOCOL == 'mqtts')
LOCAL_MQTT_CA_CERT = os.path.join(SCRIPT_DIR, 'ca.pem')

MQTT_USERNAME = os.environ.get('MQTT_USERNAME')
if not MQTT_USERNAME:
    print('ERROR: MQTT_USERNAME environment variable must be set', file=sys.stderr)
    sys.exit(1)

MQTT_PASSWORD = os.environ.get('MQTT_PASSWORD')
if not MQTT_PASSWORD:
    print('ERROR: MQTT_PASSWORD environment variable must be set', file=sys.stderr)
    sys.exit(1)

# Topics
LOCAL_CONFIG_TOPIC = 'local/config/cloud_updated'
CLOUD_DEPLOYMENT_TOPIC = 'rv/deployment/available'
CLOUD_STATUS_TOPIC = 'rv/deployment/status'

# Paths
HOME_DIR = os.path.expanduser('~')
LAST_DEPLOYED_FILE = os.path.join(HOME_DIR, '.deployment-watcher-last')
PENDING_STATUS_FILE = os.path.join(HOME_DIR, '.deployment-watcher-pending')
LOCK_FILE = '/tmp/deployment-watcher.lock'

# State
cloud_config = None
cloud_mqtt_client = None
local_mqtt_client = None
shutting_down = False
failed_deployments = {}  # {deployment_id: attempt_count}
MAX_DEPLOY_ATTEMPTS = 3


def log(msg):
    """Print with timestamp prefix."""
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)


def report_status(deployment_id, status, version='unknown', progress=None):
    """Report deployment status via cloud MQTT.

    Publishes to rv/deployment/status with QoS 1. The cloud MQTT
    broker handles delivery guarantees and reconnection. Failures
    are logged but never block or abort the deployment.

    When status is 'downloading', progress (0-100) indicates the
    download percentage.
    """
    if not cloud_mqtt_client:
        log(f"Cannot report status '{status}' - cloud MQTT not connected")
        return

    try:
        msg = {
            'deploymentId': deployment_id,
            'status': status,
            'version': version,
            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }
        if progress is not None:
            msg['progress'] = progress

        cloud_mqtt_client.publish(CLOUD_STATUS_TOPIC, json.dumps(msg), qos=1)
        log(f"Reported status '{status}'{f' ({progress}%)' if progress is not None else ''} for deployment {deployment_id}")
    except Exception as e:
        log(f"Failed to report status '{status}' (non-fatal): {e}")


def get_backend_container():
    """Find the backend container name using docker compose."""
    try:
        result = subprocess.run(
            ['docker', 'compose', 'ps', '-q', 'backend'],
            capture_output=True, text=True, timeout=10,
            cwd=HOME_DIR
        )
        container_id = result.stdout.strip()
        if container_id:
            return container_id
    except Exception as e:
        log(f"Error finding backend container: {e}")
    return None


def read_cloud_config():
    """Read cloud configuration from MongoDB via docker exec into the backend container."""
    container = get_backend_container()
    if not container:
        log("Backend container not found, cannot read cloud config")
        return None

    node_script = '''
        const { MongoClient } = require("mongodb");
        const crypto = require("crypto");
        async function main() {
            const client = await MongoClient.connect("mongodb://mongodb:27017");
            const config = await client.db("trailcurrent").collection("system_config").findOne({_id: "main"});
            await client.close();
            if (!config) { process.exit(1); }
            function dec(enc, iv) {
                if (!enc || !iv) return "";
                const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
                const d = crypto.createDecipheriv("aes-256-cbc", key, Buffer.from(iv, "hex"));
                return d.update(enc, "hex", "utf8") + d.final("utf8");
            }
            const result = {
                cloud_enabled: config.cloud_enabled || false,
                cloud_url: config.cloud_url || "",
                cloud_mqtt_username: config.cloud_mqtt_username || "",
                cloud_mqtt_password: dec(config.cloud_mqtt_password_encrypted, config.cloud_mqtt_password_iv),
                cloud_api_key: dec(config.cloud_api_key_encrypted, config.cloud_api_key_iv)
            };
            console.log(JSON.stringify(result));
        }
        main().catch(() => process.exit(1));
    '''

    try:
        result = subprocess.run(
            ['docker', 'exec', container, 'node', '-e', node_script],
            capture_output=True, text=True, timeout=15
        )
        if result.returncode != 0:
            log(f"docker exec failed (exit {result.returncode}): {result.stderr.strip()}")
            return None
        config = json.loads(result.stdout.strip())
        return config
    except json.JSONDecodeError as e:
        log(f"Failed to parse cloud config JSON: {e}")
        return None
    except Exception as e:
        log(f"Error reading cloud config: {e}")
        return None


def extract_mqtt_host_from_url(cloud_url):
    """Extract hostname from cloud URL for MQTT connection."""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(cloud_url)
        return parsed.hostname
    except Exception:
        return None


def get_last_deployed_id():
    """Read the last deployed deployment ID from tracking file."""
    try:
        if os.path.isfile(LAST_DEPLOYED_FILE):
            with open(LAST_DEPLOYED_FILE, 'r') as f:
                return f.read().strip()
    except Exception:
        pass
    return None


def set_pending_deployment(deployment_id, version):
    """Write a pending deployment marker before starting deploy.sh.

    If the watcher process is killed during deploy.sh (e.g. by
    systemctl restart), the next instance uses this file to detect
    the deployment and report 'completed'.
    """
    try:
        with open(PENDING_STATUS_FILE, 'w') as f:
            f.write(f"{deployment_id}:{version}")
    except Exception as e:
        log(f"Warning: Could not write pending status file: {e}")


def get_pending_deployment():
    """Read the pending deployment marker, if any. Returns (id, version) or None."""
    try:
        if os.path.isfile(PENDING_STATUS_FILE):
            with open(PENDING_STATUS_FILE, 'r') as f:
                content = f.read().strip()
            if ':' in content:
                dep_id, version = content.split(':', 1)
                return dep_id, version
    except Exception:
        pass
    return None


def clear_pending_deployment():
    """Remove the pending deployment marker."""
    try:
        if os.path.isfile(PENDING_STATUS_FILE):
            os.remove(PENDING_STATUS_FILE)
    except Exception:
        pass


def set_last_deployed_id(deployment_id):
    """Write the deployed deployment ID to tracking file."""
    try:
        with open(LAST_DEPLOYED_FILE, 'w') as f:
            f.write(deployment_id)
    except Exception as e:
        log(f"Warning: Could not write deployment tracking file: {e}")


def acquire_lock():
    """Simple file-based lock to prevent concurrent deployments."""
    if os.path.isfile(LOCK_FILE):
        try:
            with open(LOCK_FILE, 'r') as f:
                pid = int(f.read().strip())
            # Check if the process is still running
            os.kill(pid, 0)
            return False  # Process still running
        except (ValueError, ProcessLookupError, PermissionError):
            # Stale lock file
            os.remove(LOCK_FILE)

    with open(LOCK_FILE, 'w') as f:
        f.write(str(os.getpid()))
    return True


def release_lock():
    """Release the deployment lock."""
    try:
        if os.path.isfile(LOCK_FILE):
            os.remove(LOCK_FILE)
    except Exception:
        pass


def download_and_verify(download_url, api_key, expected_sha256, deployment_id,
                        total_size=0, version='unknown'):
    """Download a zip file, verify its SHA256 checksum, return the temp file path."""
    temp_path = os.path.join(tempfile.gettempdir(), f'deployment-{deployment_id}.zip')

    log(f"Downloading deployment to {temp_path}...")
    req = Request(download_url)
    req.add_header('Authorization', api_key)

    sha256 = hashlib.sha256()
    downloaded = 0
    last_reported_pct = -1

    try:
        response = urlopen(req, timeout=300)
        # Use Content-Length from response if we don't have a size from the payload
        if not total_size:
            cl = response.headers.get('Content-Length')
            if cl:
                total_size = int(cl)
        with open(temp_path, 'wb') as f:
            while True:
                chunk = response.read(65536)
                if not chunk:
                    break
                f.write(chunk)
                sha256.update(chunk)
                downloaded += len(chunk)

                # Report download progress every 5%
                if total_size > 0:
                    pct = int(downloaded * 100 / total_size)
                    if pct >= last_reported_pct + 5:
                        last_reported_pct = pct
                        report_status(deployment_id, 'downloading', version,
                                      progress=min(pct, 100))

        computed_hash = sha256.hexdigest()
        log(f"Downloaded {downloaded} bytes, SHA256: {computed_hash}")

        if computed_hash != expected_sha256:
            log(f"CHECKSUM MISMATCH! Expected: {expected_sha256}, Got: {computed_hash}")
            log(f"  Expected size: {total_size}, Downloaded: {downloaded} bytes")
            os.remove(temp_path)
            return None

        log("Checksum verified OK")
        return temp_path

    except HTTPError as e:
        log(f"HTTP error downloading deployment: {e.code} {e.reason}")
        if os.path.isfile(temp_path):
            os.remove(temp_path)
        return None
    except URLError as e:
        log(f"URL error downloading deployment: {e.reason}")
        if os.path.isfile(temp_path):
            os.remove(temp_path)
        return None
    except Exception as e:
        log(f"Error downloading deployment: {e}")
        if os.path.isfile(temp_path):
            os.remove(temp_path)
        return None


def extract_and_deploy(zip_path):
    """Extract the zip to ~/ and run deploy.sh."""
    log(f"Extracting {zip_path} to {HOME_DIR}...")
    try:
        # Remove directories whose contents are release-specific before extracting.
        # extractall() overlays without removing old files, so stale artifacts
        # from a prior release would persist — causing unnecessary MCU OTA updates
        # (firmware/) or wasted time loading removed container images (images/).
        for stale_dir in ['firmware', 'images']:
            dirpath = os.path.join(HOME_DIR, stale_dir)
            if os.path.isdir(dirpath):
                shutil.rmtree(dirpath)
                log(f"Removed stale {stale_dir}/ directory from previous deployment")

        with zipfile.ZipFile(zip_path, 'r') as zf:
            zf.extractall(HOME_DIR)
        log("Extraction complete")
    except Exception as e:
        log(f"Error extracting zip: {e}")
        return False

    # Find deploy.sh — check common locations
    deploy_script = None
    for candidate in [
        os.path.join(HOME_DIR, 'deploy.sh'),
    ]:
        if os.path.isfile(candidate):
            deploy_script = candidate
            break

    # If not at root, search one level deep
    if not deploy_script:
        for entry in os.listdir(HOME_DIR):
            candidate = os.path.join(HOME_DIR, entry, 'deploy.sh')
            if os.path.isfile(candidate):
                deploy_script = candidate
                break

    if not deploy_script:
        log("ERROR: deploy.sh not found after extraction")
        return False

    log(f"Running {deploy_script}...")
    try:
        os.chmod(deploy_script, 0o755)
        proc = subprocess.Popen(
            ['bash', deploy_script],
            cwd=os.path.dirname(deploy_script),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )

        # Stream output
        for line in proc.stdout:
            log(f"  [deploy.sh] {line.rstrip()}")

        proc.wait()
        log(f"deploy.sh exited with code {proc.returncode}")
        return proc.returncode == 0
    except Exception as e:
        log(f"Error running deploy.sh: {e}")
        return False


def handle_deployment(payload):
    """Handle a deployment notification from the cloud MQTT broker."""
    global cloud_config

    try:
        data = json.loads(payload)
    except json.JSONDecodeError as e:
        log(f"Invalid deployment payload: {e}")
        return

    deployment_id = data.get('id')
    version = data.get('version', 'unknown')
    filename = data.get('filename', 'unknown')
    size = data.get('size', 0)
    sha256 = data.get('sha256')
    download_url_path = data.get('downloadUrl')
    timestamp = data.get('timestamp', '')

    if not deployment_id or not sha256 or not download_url_path:
        log("Deployment payload missing required fields (id, sha256, downloadUrl)")
        return

    log(f"Deployment available: id={deployment_id} version={version} file={filename} size={size}")

    # Check if already deployed
    last_deployed = get_last_deployed_id()
    if last_deployed == deployment_id:
        log(f"Deployment {deployment_id} already applied, skipping")
        return

    # Check if we've already failed too many times for this deployment
    attempts = failed_deployments.get(deployment_id, 0)
    if attempts >= MAX_DEPLOY_ATTEMPTS:
        log(f"Deployment {deployment_id} has failed {attempts} times, giving up")
        return

    # Verify we have cloud config
    if not cloud_config or not cloud_config.get('cloud_url') or not cloud_config.get('cloud_api_key'):
        log("Cloud config incomplete (missing URL or API key), cannot download")
        return

    # Acquire lock
    if not acquire_lock():
        log("Another deployment is in progress, skipping")
        return

    try:
        # Build full download URL from PWA-configured cloud server
        base_url = cloud_config['cloud_url'].rstrip('/')
        full_url = f"{base_url}{download_url_path}"
        api_key = cloud_config['cloud_api_key']

        log(f"Downloading from {full_url}")
        report_status(deployment_id, 'downloading', version)

        # Download and verify
        zip_path = download_and_verify(full_url, api_key, sha256, deployment_id,
                                       total_size=size, version=version)
        if not zip_path:
            failed_deployments[deployment_id] = failed_deployments.get(deployment_id, 0) + 1
            attempts = failed_deployments[deployment_id]
            log(f"Download or verification failed (attempt {attempts}/{MAX_DEPLOY_ATTEMPTS}), aborting deployment")
            report_status(deployment_id, 'failed', version)
            return

        report_status(deployment_id, 'downloaded', version)

        # Write pending marker so the new watcher instance (after deploy.sh
        # restarts this service) can report 'completed' on our behalf.
        set_pending_deployment(deployment_id, version)

        # Extract and deploy
        report_status(deployment_id, 'deploying', version)
        success = extract_and_deploy(zip_path)

        # Clean up zip
        if os.path.isfile(zip_path):
            os.remove(zip_path)

        # Note: deploy.sh restarts deployment-watcher at Step 6.1, so
        # the code below typically never runs. The new watcher instance
        # detects the pending file on startup and reports 'completed'.
        if success:
            failed_deployments.pop(deployment_id, None)
            set_last_deployed_id(deployment_id)
            clear_pending_deployment()
            log(f"Deployment {deployment_id} (v{version}) completed successfully")
            report_status(deployment_id, 'completed', version)
        else:
            failed_deployments[deployment_id] = failed_deployments.get(deployment_id, 0) + 1
            clear_pending_deployment()
            log(f"Deployment {deployment_id} (v{version}) failed during deploy.sh execution")
            report_status(deployment_id, 'failed', version)

    finally:
        release_lock()


# --- Cloud MQTT Client ---

def connect_cloud_mqtt(config):
    """Connect to the cloud MQTT broker and subscribe to deployment topic."""
    global cloud_mqtt_client

    cloud_host = extract_mqtt_host_from_url(config['cloud_url'])
    if not cloud_host:
        log(f"Cannot extract hostname from cloud URL: {config['cloud_url']}")
        return

    cloud_port = 8883
    cloud_username = config.get('cloud_mqtt_username', '')
    cloud_password = config.get('cloud_mqtt_password', '')

    log(f"Connecting to cloud MQTT broker at mqtts://{cloud_host}:{cloud_port}")

    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        protocol=mqtt.MQTTv311,
        client_id=f'deployment-watcher-{int(time.time())}'
    )

    if cloud_username:
        client.username_pw_set(cloud_username, cloud_password)

    # Use system CA store for proper TLS certs (cloud uses CA-signed certs)
    client.tls_set(cert_reqs=ssl.CERT_REQUIRED, tls_version=ssl.PROTOCOL_TLSv1_2)

    def on_connect(client, userdata, flags, reason_code, properties):
        if reason_code == 0:
            log("Connected to cloud MQTT broker")
            client.subscribe(CLOUD_DEPLOYMENT_TOPIC, qos=1)
            log(f"Subscribe request sent for {CLOUD_DEPLOYMENT_TOPIC}")
        else:
            log(f"Failed to connect to cloud MQTT: {reason_code}")

    def on_subscribe(client, userdata, mid, reason_codes, properties):
        for i, rc in enumerate(reason_codes):
            if rc.is_failure:
                log(f"Cloud MQTT subscription FAILED: {rc}")
            else:
                log(f"Cloud MQTT subscription confirmed (QoS granted: {rc})")

    def on_message(client, userdata, msg):
        log(f"Received message on {msg.topic} ({len(msg.payload)} bytes)")
        if msg.topic == CLOUD_DEPLOYMENT_TOPIC:
            handle_deployment(msg.payload.decode('utf-8'))

    def on_disconnect(client, userdata, flags, reason_code, properties):
        if not shutting_down:
            log(f"Disconnected from cloud MQTT (reason: {reason_code}), will reconnect...")

    client.on_connect = on_connect
    client.on_subscribe = on_subscribe
    client.on_message = on_message
    client.on_disconnect = on_disconnect

    try:
        client.connect(cloud_host, cloud_port, 60)
        client.loop_start()
        cloud_mqtt_client = client
    except Exception as e:
        log(f"Failed to connect to cloud MQTT: {e}")
        cloud_mqtt_client = None


def disconnect_cloud_mqtt():
    """Disconnect from the cloud MQTT broker."""
    global cloud_mqtt_client
    if cloud_mqtt_client:
        try:
            cloud_mqtt_client.loop_stop()
            cloud_mqtt_client.disconnect()
        except Exception:
            pass
        cloud_mqtt_client = None


def refresh_cloud_connection():
    """Re-read cloud config and reconnect if needed."""
    global cloud_config

    new_config = read_cloud_config()
    if not new_config:
        log("Could not read cloud config")
        return

    old_config = cloud_config
    cloud_config = new_config

    if not cloud_config.get('cloud_enabled'):
        log("Cloud is disabled, disconnecting from cloud MQTT")
        disconnect_cloud_mqtt()
        return

    # Check if config actually changed
    config_changed = (
        old_config is None or
        old_config.get('cloud_url') != cloud_config.get('cloud_url') or
        old_config.get('cloud_mqtt_username') != cloud_config.get('cloud_mqtt_username') or
        old_config.get('cloud_mqtt_password') != cloud_config.get('cloud_mqtt_password')
    )

    if config_changed:
        log("Cloud config changed, reconnecting...")
        disconnect_cloud_mqtt()
        if cloud_config.get('cloud_url') and cloud_config.get('cloud_mqtt_username'):
            connect_cloud_mqtt(cloud_config)
        else:
            log("Cloud config incomplete (missing URL or MQTT username), skipping connection")
    else:
        log("Cloud config unchanged")


# --- Local MQTT Client ---

def setup_local_mqtt():
    """Connect to the local MQTT broker for config change notifications."""
    global local_mqtt_client

    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        protocol=mqtt.MQTTv311,
        client_id=f'deployment-watcher-local-{int(time.time())}'
    )

    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

    if LOCAL_MQTT_USE_TLS:
        client.tls_set(
            ca_certs=LOCAL_MQTT_CA_CERT,
            certfile=None,
            keyfile=None,
            cert_reqs=ssl.CERT_REQUIRED,
            tls_version=ssl.PROTOCOL_TLSv1_2
        )

    def on_connect(client, userdata, flags, reason_code, properties):
        if reason_code == 0:
            log("Connected to local MQTT broker")
            client.subscribe(LOCAL_CONFIG_TOPIC, qos=1)
            log(f"Subscribed to {LOCAL_CONFIG_TOPIC}")
        else:
            log(f"Failed to connect to local MQTT: {reason_code}")

    def on_message(client, userdata, msg):
        if msg.topic == LOCAL_CONFIG_TOPIC:
            log("Cloud config changed notification received, refreshing...")
            refresh_cloud_connection()

    def on_disconnect(client, userdata, flags, reason_code, properties):
        if not shutting_down:
            log(f"Disconnected from local MQTT (reason: {reason_code}), will reconnect...")

    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect

    client.connect(LOCAL_MQTT_BROKER, LOCAL_MQTT_PORT, 60)
    client.loop_start()
    local_mqtt_client = client


def shutdown(signum=None, frame=None):
    """Graceful shutdown."""
    global shutting_down
    shutting_down = True
    log("Shutting down...")
    disconnect_cloud_mqtt()
    if local_mqtt_client:
        try:
            local_mqtt_client.loop_stop()
            local_mqtt_client.disconnect()
        except Exception:
            pass
    release_lock()
    sys.exit(0)


def main():
    global cloud_config

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    log("TrailCurrent Deployment Watcher starting...")

    # Step 1: Connect to local MQTT
    log("Connecting to local MQTT broker...")
    setup_local_mqtt()

    # Step 2: Read cloud config and connect to cloud MQTT
    log("Reading cloud configuration...")
    cloud_config = read_cloud_config()

    if cloud_config and cloud_config.get('cloud_enabled'):
        if cloud_config.get('cloud_url') and cloud_config.get('cloud_mqtt_username'):
            connect_cloud_mqtt(cloud_config)
        else:
            log("Cloud enabled but config incomplete, waiting for configuration...")
    else:
        log("Cloud not enabled or config not available, waiting for configuration...")

    # Step 3: Check for a deployment that completed while we were restarted.
    # deploy.sh restarts this service at Step 6.1, so the previous instance
    # never gets to report 'completed'. We detect this via the pending file.
    pending = get_pending_deployment()
    if pending:
        dep_id, dep_version = pending
        log(f"Found pending deployment {dep_id} (v{dep_version}) from before restart")
        # Give deploy.sh time to fully finish (Steps 6.5-7 run after our restart)
        time.sleep(15)
        set_last_deployed_id(dep_id)
        clear_pending_deployment()
        report_status(dep_id, 'completed', dep_version)
        log(f"Reported 'completed' for deployment {dep_id} (v{dep_version})")

    # Step 4: Main loop - keep alive
    log("Deployment watcher running. Waiting for deployment notifications...")
    while not shutting_down:
        time.sleep(1)


if __name__ == "__main__":
    retry_count = 0
    max_retries = 100
    while retry_count < max_retries:
        try:
            main()
            break
        except SystemExit:
            break
        except Exception as e:
            retry_count += 1
            log(f"Unexpected error: {e}")
            with open(os.path.join(SCRIPT_DIR, "deployment-watcher-crash.log"), "a") as f:
                f.write(f"\n---\nError: {e}\n")
                f.write(traceback.format_exc())
            if retry_count < max_retries:
                log(f"Restarting ({retry_count}/{max_retries})...")
                time.sleep(30)

    if retry_count >= max_retries:
        log(f"Failed after {max_retries} retries, exiting.")
        sys.exit(1)
