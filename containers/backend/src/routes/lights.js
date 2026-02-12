const express = require('express');
const router = express.Router();
const mqttService = require('../mqtt');

module.exports = (db) => {
    const lights = db.collection('lights');

    // GET /api/lights
    router.get('/', async (req, res) => {
        try {
            const allLights = await lights.find().sort({ _id: 1 }).toArray();
            // Map _id to id for frontend compatibility
            const result = allLights.map(l => ({ id: l._id, ...l }));
            res.json(result);
        } catch (error) {
            console.error('Error fetching lights:', error);
            res.status(500).json({ error: 'Failed to fetch lights data' });
        }
    });

    // PUT /api/lights/:id - Publish command to MQTT
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { state, brightness } = req.body;

            const lightId = parseInt(id);
            if (isNaN(lightId) || lightId < 1 || lightId > 8) {
                return res.status(400).json({ error: 'Invalid light ID' });
            }

            if (state !== undefined && ![0, 1].includes(state)) {
                return res.status(400).json({ error: 'State must be 0 or 1' });
            }

            if (brightness !== undefined && (brightness < 0 || brightness > 255)) {
                return res.status(400).json({ error: 'Brightness must be between 0 and 255' });
            }

            // Publish command to MQTT - status update comes back via MQTT
            mqttService.publishLightCommand(lightId, state, brightness);

            // Return current state (will be updated via WebSocket when MQTT status arrives)
            const light = await lights.findOne({ _id: lightId });
            if (!light) {
                return res.status(404).json({ error: 'Light not found' });
            }

            res.json({ id: light._id, ...light });
        } catch (error) {
            console.error('Error updating light:', error);
            res.status(500).json({ error: 'Failed to update light' });
        }
    });

    // PUT /api/lights (bulk update) - Publish commands to MQTT
    router.put('/', async (req, res) => {
        try {
            const { lights: lightUpdates } = req.body;

            if (!Array.isArray(lightUpdates)) {
                return res.status(400).json({ error: 'lights must be an array' });
            }

            // Publish commands for each light
            for (const light of lightUpdates) {
                if (light.id && [0, 1].includes(light.state)) {
                    mqttService.publishLightCommand(light.id, light.state);
                }
            }

            const allLights = await lights.find().sort({ _id: 1 }).toArray();
            const result = allLights.map(l => ({ id: l._id, ...l }));
            res.json(result);
        } catch (error) {
            console.error('Error updating lights:', error);
            res.status(500).json({ error: 'Failed to update lights' });
        }
    });

    return router;
};
