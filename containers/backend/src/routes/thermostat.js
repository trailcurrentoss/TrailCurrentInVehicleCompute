const express = require('express');
const router = express.Router();

module.exports = (db) => {
    const thermostat = db.collection('thermostat');

    // GET /api/thermostat
    router.get('/', async (req, res) => {
        try {
            const data = await thermostat.findOne({ _id: 'main' });
            res.json(data);
        } catch (error) {
            console.error('Error fetching thermostat:', error);
            res.status(500).json({ error: 'Failed to fetch thermostat data' });
        }
    });

    // PUT /api/thermostat
    router.put('/', async (req, res) => {
        try {
            const { target_temp, mode } = req.body;

            const updates = {};

            if (target_temp !== undefined) {
                if (target_temp < 50 || target_temp > 90) {
                    return res.status(400).json({ error: 'Temperature must be between 50 and 90°F' });
                }
                updates.target_temp = target_temp;
            }

            if (mode !== undefined) {
                if (!['heat', 'cool', 'auto', 'off'].includes(mode)) {
                    return res.status(400).json({ error: 'Invalid mode' });
                }
                updates.mode = mode;
            }

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ error: 'No valid fields to update' });
            }

            updates.updated_at = new Date();

            await thermostat.updateOne(
                { _id: 'main' },
                { $set: updates }
            );

            const data = await thermostat.findOne({ _id: 'main' });
            res.json(data);
        } catch (error) {
            console.error('Error updating thermostat:', error);
            res.status(500).json({ error: 'Failed to update thermostat' });
        }
    });

    return router;
};
