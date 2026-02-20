import can
import json
import paho.mqtt.client as mqtt
import time
import sys
import os
import ssl
import traceback
import re

MAX_RETRIES = 100

# Load .env file from script directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(SCRIPT_DIR, '.env')
if os.path.isfile(ENV_FILE):
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip().strip('\r')
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip()
                os.environ[key] = value
    print(f"Loaded env from {ENV_FILE}")
else:
    print(f"Warning: No .env file found at {ENV_FILE}")

# MQTT settings
# Require these to be set via environment variables
MQTT_BROKER_URL = os.environ.get('MQTT_BROKER_URL')
if not MQTT_BROKER_URL:
    print('ERROR: MQTT_BROKER_URL environment variable must be set', file=sys.stderr)
    sys.exit(1)

match = re.match(r'(mqtts?)://([^:]+):(\d+)', MQTT_BROKER_URL)
if not match:
    print(f'ERROR: Invalid MQTT_BROKER_URL format: {MQTT_BROKER_URL}', file=sys.stderr)
    sys.exit(1)

protocol = match.group(1)  # 'mqtt' or 'mqtts'
MQTT_BROKER = match.group(2)  # hostname
MQTT_PORT = int(match.group(3))  # port
USE_TLS = (protocol == 'mqtts')

MQTT_INBOUND_TOPIC = 'can/inbound'
MQTT_OUTBOUND_TOPIC = 'can/outbound'
MQTT_CA_CERT_PATH = os.path.join(SCRIPT_DIR, 'ca.pem')

MQTT_USERNAME = os.environ.get('MQTT_USERNAME')
if not MQTT_USERNAME:
    print('ERROR: MQTT_USERNAME environment variable must be set', file=sys.stderr)
    sys.exit(1)

MQTT_PASSWORD = os.environ.get('MQTT_PASSWORD')
if not MQTT_PASSWORD:
    print('ERROR: MQTT_PASSWORD environment variable must be set', file=sys.stderr)
    sys.exit(1)

# Define the bus interface and bitrate
bus = can.interface.Bus(interface='socketcan', channel='can0', bitrate=500000)
def on_subscribe(client, userdata, mid, reason_code_list, properties):
    print(f"Subscribed with message ID: {mid}")

def on_message(client, userdata, msg):
    try:
        # Conver the MQTT data into JSON
        m_decode = msg.payload.decode('utf-8')
        received_data = json.loads(m_decode)
        # Check to ensure we have what is needed before attempting to send
        if (received_data):
            current_timestamp = time.time()
            if ('identifier' in received_data) and \
            ('data_length_code' in received_data) and \
            ('data' in received_data) and \
            ('extd' in received_data) and \
            ('rtr' in received_data) and \
            ('ss' in received_data) and \
            ('self' in received_data):
                # Create a datetime object for the timestamp
                msgObject = can.Message()
                msgObject.timestamp = current_timestamp
                msgObject.arbitration_id = int(received_data['identifier'],16)
                msgObject.is_extended_id = (received_data['extd'] == 1)
                msgObject.is_remote_frame = (received_data['rtr'] == 1)
                msgObject.is_error_frame = False
                msgObject.channel = None
                msgObject.dlc = received_data['data_length_code']
                # Convert bit arrays to bytes
                # Each inner array represents 8 bits that form one byte
                data_bytes = []
                for bit_array in received_data['data']:
                    # Convert array of bits to a byte value
                    # bit_array[0] is MSB (bit 7), bit_array[7] is LSB (bit 0)
                    byte_value = 0
                    for i, bit in enumerate(bit_array):
                        byte_value |= (bit << (7 - i))
                    data_bytes.append(byte_value)
                # Use data_length_code to determine how many bytes to send (0-8)
                dlc = received_data['data_length_code']
                dlc = min(dlc, 8)  # Ensure DLC doesn't exceed 8 for standard CAN
                # Extract only the number of bytes specified by DLC
                actual_data = data_bytes[:dlc]
                msgObject.data = actual_data
                msgObject.is_fd = False # Will need to be dynamic in the future
                msgObject.is_rx = False # Fixed value since this is in the send method
                msgObject.bitrate_switch = False # Will need to be dynamic in the future
                msgObject.error_state_indicator = False # Will need to be dyamic in the future
                try:
                    bus.send(msgObject)
                except Exception as e:
                    print("Message not sent")
    except Exception as e:
        print(f"Error: {e}")

def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print("Connected successfully")
        client.subscribe(MQTT_OUTBOUND_TOPIC)
    else:
        print(f"Failed to connect: {reason_code}")

def int_to_bit_array(n):
    if isinstance(n, int):
        return [int(b) for b in format(n, 'b').zfill(8)]

def main():
    try:
        client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2, protocol=mqtt.MQTTv311)
        client.on_connect = on_connect
        client.on_subscribe = on_subscribe
        client.on_message = on_message
        # Set username/password authentication
        client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

        # Configure TLS with CA certificate verification
        client.tls_set(
            ca_certs=MQTT_CA_CERT_PATH,
            certfile=None,
            keyfile=None,
            cert_reqs=ssl.CERT_REQUIRED,
            tls_version=ssl.PROTOCOL_TLSv1_2
        )
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
        while True:
            message = bus.recv()
            if message is not None:
                frame_id = message.arbitration_id
                data = message.data
                data_length_code = message.dlc  
                timestamp = message.timestamp

                # Convert the CAN ID to hexadecimal for easier reading
                hex_id = "0x" + format(frame_id, '03x')

                # Create MQTT message
                mqtt_message = {
                    "identifier": hex_id,
                    "data_length_code": data_length_code,
                    "data": [int_to_bit_array(x) for x in data],
                    "timestamp": timestamp
                }
                json_payload = json.dumps(mqtt_message)
                client.publish(MQTT_INBOUND_TOPIC, json_payload)
    except Exception as e:
        print(f"Error: {e}")
    except KeyboardInterrupt:
        client.loop_stop()
        client.disconnect()
        bus.shutdown()

if __name__ == "__main__":
    retry_count = 0
    while retry_count < MAX_RETRIES:
        try:
            main()
            retry_count = 0 #Reset onc success
            time.sleep(30)
        except Exception as e:
            retry_count += 1
            print(f"Failed to connect to MQTT. Retrying ({retry_count}/{MAX_RETRIES})...")
            with open("crash.log","a") as f:
                f.write(f"\n---\nError: {e}\n")
                f.write(traceback.format_exc())
            time.sleep(30) # Wait before retrying
    if retry_count == MAX_RETRIES:
        print(f"Failed to connect to MQTT after {MAX_RETRIES} retries.")
        sys.exit(1)