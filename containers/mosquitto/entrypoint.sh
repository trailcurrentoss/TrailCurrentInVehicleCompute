#!/bin/sh
set -e

if [ -z "$MQTT_USERNAME" ] || [ -z "$MQTT_PASSWORD" ]; then
    echo "Error: MQTT_USERNAME and MQTT_PASSWORD must be set"
    exit 1
fi

# Generate password file from environment variables
rm -f /mosquitto/config/passwd
mosquitto_passwd -b -c /mosquitto/config/passwd "$MQTT_USERNAME" "$MQTT_PASSWORD"
chown mosquitto:mosquitto /mosquitto/config/passwd

exec mosquitto "$@"
