#!/usr/bin/env python3
"""
Publish OTA trigger message to MQTT
Sends CAN message to can/outbound topic to trigger device OTA mode
"""

import paho.mqtt.client as mqtt
import json
import sys
import os
from dotenv import load_dotenv
import re
import ssl

# Load .env file from local_code directory (same as can-to-mqtt.py)
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

# Get MQTT connection details from .env
MQTT_BROKER_URL = os.getenv('MQTT_BROKER_URL', 'mqtts://mosquitto:8883')
MQTT_USER = os.getenv('MQTT_USERNAME')
MQTT_PASS = os.getenv('MQTT_PASSWORD')

# Parse broker URL to extract host and port
# Format: mqtts://hostname:port or mqtt://hostname:port
match = re.match(r'(mqtts?)://([^:]+):(\d+)', MQTT_BROKER_URL)
if not match:
    print(f'ERROR: Invalid MQTT_BROKER_URL format: {MQTT_BROKER_URL}', file=sys.stderr)
    sys.exit(1)

protocol = match.group(1)  # 'mqtt' or 'mqtts'
MQTT_HOST = match.group(2)  # hostname
MQTT_PORT = int(match.group(3))  # port
USE_TLS = (protocol == 'mqtts')

# CA certificate path (same as can-to-mqtt.py)
MQTT_CA_CERT_PATH = os.path.join(os.path.dirname(__file__), '..', 'volumes', 'keys', 'ca.pem')


def byte_to_bit_array(byte):
    """Convert a byte (0-255) to an array of 8 bits (MSB first)"""
    bits = []
    for i in range(7, -1, -1):
        bits.append((byte >> i) & 1)
    return bits


def extract_mac_from_hostname(hostname):
    """Extract MAC bytes from esp32-XXXXXX hostname"""
    # hostname format: esp32-8F56D8 (last 6 hex chars are MAC bytes)
    mac_hex = hostname.replace('esp32-', '')
    if len(mac_hex) != 6:
        raise ValueError(f'Invalid hostname format: {hostname}')

    # Convert to 3 bytes
    mac_bytes = [
        int(mac_hex[0:2], 16),
        int(mac_hex[2:4], 16),
        int(mac_hex[4:6], 16)
    ]
    return mac_bytes


def publish_ota_trigger(hostname):
    """Publish CAN OTA trigger message to MQTT"""
    try:
        # Extract MAC bytes from hostname
        mac_bytes = extract_mac_from_hostname(hostname)

        # Create CAN data array: [MAC1, MAC2, MAC3, 0, 0, 0, 0, 0]
        can_data_bytes = mac_bytes + [0x00] * 5

        # Convert bytes to bit arrays (format expected by can-to-mqtt.py)
        bit_arrays = [byte_to_bit_array(byte) for byte in can_data_bytes]

        # Format message according to can-to-mqtt.py expectations
        message = {
            'identifier': '0x0',  # Hex string, not integer
            'data_length_code': len(can_data_bytes),
            'data': bit_arrays,
            'extd': 0,   # Standard CAN frame
            'rtr': 0,    # Not a remote transmission request
            'ss': 0,     # Single shot flag
            'self': 0    # Not echoed back
        }

        # Connect to MQTT (use same pattern as working can-to-mqtt.py)
        client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2, protocol=mqtt.MQTTv311)
        client.username_pw_set(MQTT_USER, MQTT_PASS)

        # Configure TLS with CA certificate (same as can-to-mqtt.py)
        if USE_TLS:
            client.tls_set(
                ca_certs=MQTT_CA_CERT_PATH,
                certfile=None,
                keyfile=None,
                cert_reqs=ssl.CERT_REQUIRED,
                tls_version=ssl.PROTOCOL_TLSv1_2
            )

        client.connect(MQTT_HOST, MQTT_PORT, 60)

        # Publish to can/outbound topic
        print(f'Publishing OTA trigger for {hostname}: {json.dumps(message, indent=2)}')
        client.publish('can/outbound', json.dumps(message))
        client.disconnect()

        print(f'OTA trigger sent to {hostname}')
        return 0

    except ValueError as e:
        print(f'Error: {e}', file=sys.stderr)
        return 1
    except Exception as e:
        print(f'Error: Failed to publish OTA trigger: {e}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Usage: trigger_ota_mqtt.py <hostname>', file=sys.stderr)
        sys.exit(1)

    exit_code = publish_ota_trigger(sys.argv[1])
    sys.exit(exit_code)
