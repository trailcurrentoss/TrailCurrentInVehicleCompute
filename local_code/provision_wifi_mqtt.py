#!/usr/bin/env python3
"""
Provision WiFi credentials to MCUs via MQTT -> CAN bus.
Sends multi-message sequence matching the backend mqtt.js publishWifiCredentials protocol:
  Start (0x01) -> SSID chunks (0x02) -> Password chunks (0x03) -> End (0x04)
"""

import paho.mqtt.client as mqtt
import json
import sys
import os
import time
import math
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
match = re.match(r'(mqtts?)://([^:]+):(\d+)', MQTT_BROKER_URL)
if not match:
    print(f'ERROR: Invalid MQTT_BROKER_URL format: {MQTT_BROKER_URL}', file=sys.stderr)
    sys.exit(1)

protocol = match.group(1)
MQTT_HOST = match.group(2)
MQTT_PORT = int(match.group(3))
USE_TLS = (protocol == 'mqtts')

# CA certificate path (same as can-to-mqtt.py)
MQTT_CA_CERT_PATH = os.path.join(os.path.dirname(__file__), 'ca.pem')

# CAN message constants
CAN_WIFI_CONFIG_ID = 0x01
BYTES_PER_CHUNK = 6  # 8-byte CAN frame minus 2-byte header (type + index)
INTER_MESSAGE_DELAY = 0.05  # 50ms between messages, matching mqtt.js


def byte_to_bit_array(byte_val):
    """Convert a byte (0-255) to an array of 8 bits (MSB first)"""
    bits = []
    for i in range(7, -1, -1):
        bits.append((byte_val >> i) & 1)
    return bits


def publish_can_message(client, can_id, data_bytes):
    """Publish a CAN message to can/outbound topic (matches mqtt.js publishCanMessage)"""
    bit_arrays = [byte_to_bit_array(b) for b in data_bytes]

    # Pad to 8 bytes
    while len(bit_arrays) < 8:
        bit_arrays.append([0, 0, 0, 0, 0, 0, 0, 0])

    message = {
        'identifier': f'0x{can_id:x}',
        'data_length_code': min(len(data_bytes), 8),
        'data': bit_arrays[:8],
        'extd': 0,
        'rtr': 0,
        'ss': 0,
        'self': 0
    }

    client.publish('can/outbound', json.dumps(message))


def provision_wifi(ssid, password):
    """Send WiFi credentials to MCUs via MQTT -> CAN bus"""
    try:
        ssid_bytes = ssid.encode('utf-8')
        password_bytes = password.encode('utf-8')

        if len(ssid_bytes) > 32:
            print('Error: SSID too long (max 32 bytes)', file=sys.stderr)
            return 1
        if len(password_bytes) > 63:
            print('Error: Password too long (max 63 bytes)', file=sys.stderr)
            return 1

        ssid_chunks = math.ceil(len(ssid_bytes) / BYTES_PER_CHUNK)
        password_chunks = math.ceil(len(password_bytes) / BYTES_PER_CHUNK)

        # Connect to MQTT
        client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2, protocol=mqtt.MQTTv311)
        client.username_pw_set(MQTT_USER, MQTT_PASS)

        if USE_TLS:
            client.tls_set(
                ca_certs=MQTT_CA_CERT_PATH,
                certfile=None,
                keyfile=None,
                cert_reqs=ssl.CERT_REQUIRED,
                tls_version=ssl.PROTOCOL_TLSv1_2
            )

        client.connect(MQTT_HOST, MQTT_PORT, 60)

        # 1. Start message: [0x01, ssidLen, passwordLen, ssidChunks, passwordChunks, 0, 0, 0]
        publish_can_message(client, CAN_WIFI_CONFIG_ID,
                            [0x01, len(ssid_bytes), len(password_bytes),
                             ssid_chunks, password_chunks, 0x00, 0x00, 0x00])
        time.sleep(INTER_MESSAGE_DELAY)

        # 2. SSID chunks: [0x02, chunkIndex, ...up to 6 data bytes]
        for i in range(ssid_chunks):
            chunk = [0x02, i]
            start = i * BYTES_PER_CHUNK
            end = min(start + BYTES_PER_CHUNK, len(ssid_bytes))
            chunk.extend(ssid_bytes[start:end])
            while len(chunk) < 8:
                chunk.append(0x00)
            publish_can_message(client, CAN_WIFI_CONFIG_ID, chunk)
            time.sleep(INTER_MESSAGE_DELAY)

        # 3. Password chunks: [0x03, chunkIndex, ...up to 6 data bytes]
        for i in range(password_chunks):
            chunk = [0x03, i]
            start = i * BYTES_PER_CHUNK
            end = min(start + BYTES_PER_CHUNK, len(password_bytes))
            chunk.extend(password_bytes[start:end])
            while len(chunk) < 8:
                chunk.append(0x00)
            publish_can_message(client, CAN_WIFI_CONFIG_ID, chunk)
            time.sleep(INTER_MESSAGE_DELAY)

        # 4. End message with XOR checksum: [0x04, checksum, 0, 0, 0, 0, 0, 0]
        checksum = 0
        for b in ssid_bytes:
            checksum ^= b
        for b in password_bytes:
            checksum ^= b
        publish_can_message(client, CAN_WIFI_CONFIG_ID,
                            [0x04, checksum, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])

        client.disconnect()

        print(f'WiFi credentials sent (SSID: {ssid}, {ssid_chunks} SSID chunks, {password_chunks} password chunks)')
        return 0

    except Exception as e:
        print(f'Error: Failed to provision WiFi credentials: {e}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('Usage: provision_wifi_mqtt.py <ssid> <password>', file=sys.stderr)
        sys.exit(1)

    exit_code = provision_wifi(sys.argv[1], sys.argv[2])
    sys.exit(exit_code)
