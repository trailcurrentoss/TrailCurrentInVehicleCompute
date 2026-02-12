const express = require('express');
const router = express.Router();

module.exports = (db) => {
    const airquality = db.collection('airquality');

    // GET /api/airquality
    router.get('/', async (req, res) => {
        try {
            const data = await airquality.findOne({ _id: 'main' });
            res.json(data);
        } catch (error) {
            console.error('Error fetching air quality:', error);
            res.status(500).json({ error: 'Failed to fetch air quality data' });
        }
    });

    // PUT /api/airquality (for simulation/testing)
    router.put('/', async (req, res) => {
        try {
            const { iaq_index, co2_ppm } = req.body;

            const updates = {};

            if (iaq_index !== undefined) {
                if (iaq_index < 0 || iaq_index > 500) {
                    return res.status(400).json({ error: 'iaq_index must be between 0 and 500' });
                }
                updates.iaq_index = iaq_index;
            }

            if (co2_ppm !== undefined) {
                if (co2_ppm < 0 || co2_ppm > 10000) {
                    return res.status(400).json({ error: 'co2_ppm must be between 0 and 10000' });
                }
                updates.co2_ppm = co2_ppm;
            }

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ error: 'No valid fields to update' });
            }

            updates.updated_at = new Date();

            await airquality.updateOne(
                { _id: 'main' },
                { $set: updates }
            );

            const data = await airquality.findOne({ _id: 'main' });
            res.json(data);
        } catch (error) {
            console.error('Error updating air quality:', error);
            res.status(500).json({ error: 'Failed to update air quality' });
        }
    });

    return router;
};
