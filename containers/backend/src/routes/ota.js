const express = require('express');
const mqttService = require('../mqtt');

module.exports = (db) => {
    const router = express.Router();

    // POST /api/ota/trigger - Trigger OTA update for a device
    router.post('/trigger', (req, res) => {
        try {
            const { hostname } = req.body;

            // Validate hostname format: esp32-XXXXXX where X are hex digits
            const hostnameRegex = /^esp32-([0-9A-Fa-f]{6})$/;
            const match = hostname.match(hostnameRegex);

            if (!match) {
                return res.status(400).json({
                    error: 'Invalid hostname format. Expected format: esp32-XXYYZZ (where XX, YY, ZZ are hex digits)'
                });
            }

            // Extract the MAC address bytes (last 6 hex characters)
            const macHex = match[1];
            const macBytes = [];
            for (let i = 0; i < 6; i += 2) {
                const hexByte = macHex.substring(i, i + 2);
                macBytes.push(parseInt(hexByte, 16));
            }

            // Create CAN data: [MAC_byte1, MAC_byte2, MAC_byte3, 0x00, 0x00, 0x00, 0x00, 0x00]
            const canData = [macBytes[0], macBytes[1], macBytes[2], 0x00, 0x00, 0x00, 0x00, 0x00];

            // Publish OTA trigger message (CAN ID 0x0)
            const success = mqttService.publishCanMessage(0x0, canData);

            if (!success) {
                return res.status(503).json({
                    error: 'MQTT service not connected. Please try again later.'
                });
            }

            res.json({
                success: true,
                message: 'OTA trigger sent',
                hostname: hostname,
                macBytes: macBytes.map(b => `0x${b.toString(16).toUpperCase().padStart(2, '0')}`)
            });
        } catch (error) {
            console.error('Error triggering OTA:', error);
            res.status(500).json({
                error: 'Failed to trigger OTA update'
            });
        }
    });

    return router;
};
