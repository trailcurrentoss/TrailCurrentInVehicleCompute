const express = require('express');
const router = express.Router();

module.exports = (db) => {
    const trailerLevel = db.collection('trailer_level');

    // GET /api/trailer/level
    router.get('/level', async (req, res) => {
        try {
            const level = await trailerLevel.findOne({ _id: 'main' });
            res.json(level);
        } catch (error) {
            console.error('Error fetching trailer level:', error);
            res.status(500).json({ error: 'Failed to fetch trailer level data' });
        }
    });

    // PUT /api/trailer/level (for simulation/testing)
    router.put('/level', async (req, res) => {
        try {
            const { front_back, side_to_side } = req.body;

            const updates = {};

            if (front_back !== undefined) {
                if (front_back < -15 || front_back > 15) {
                    return res.status(400).json({ error: 'front_back must be between -15 and 15 degrees' });
                }
                updates.front_back = front_back;
            }

            if (side_to_side !== undefined) {
                if (side_to_side < -15 || side_to_side > 15) {
                    return res.status(400).json({ error: 'side_to_side must be between -15 and 15 degrees' });
                }
                updates.side_to_side = side_to_side;
            }

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ error: 'No valid fields to update' });
            }

            updates.updated_at = new Date();

            await trailerLevel.updateOne(
                { _id: 'main' },
                { $set: updates }
            );

            const level = await trailerLevel.findOne({ _id: 'main' });
            res.json(level);
        } catch (error) {
            console.error('Error updating trailer level:', error);
            res.status(500).json({ error: 'Failed to update trailer level' });
        }
    });

    return router;
};
