const express = require('express');
const router = express.Router();

module.exports = (db) => {
    const water = db.collection('water');

    // GET /api/water
    router.get('/', async (req, res) => {
        try {
            const data = await water.findOne({ _id: 'main' });
            res.json(data);
        } catch (error) {
            console.error('Error fetching water levels:', error);
            res.status(500).json({ error: 'Failed to fetch water levels' });
        }
    });

    // PUT /api/water
    router.put('/', async (req, res) => {
        try {
            const { fresh, grey, black } = req.body;

            const updates = {};

            if (fresh !== undefined) {
                if (fresh < 0 || fresh > 100) {
                    return res.status(400).json({ error: 'Fresh water level must be between 0 and 100' });
                }
                updates.fresh = fresh;
            }

            if (grey !== undefined) {
                if (grey < 0 || grey > 100) {
                    return res.status(400).json({ error: 'Grey water level must be between 0 and 100' });
                }
                updates.grey = grey;
            }

            if (black !== undefined) {
                if (black < 0 || black > 100) {
                    return res.status(400).json({ error: 'Black water level must be between 0 and 100' });
                }
                updates.black = black;
            }

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ error: 'No valid fields to update' });
            }

            updates.updated_at = new Date();

            await water.updateOne(
                { _id: 'main' },
                { $set: updates }
            );

            const data = await water.findOne({ _id: 'main' });
            res.json(data);
        } catch (error) {
            console.error('Error updating water levels:', error);
            res.status(500).json({ error: 'Failed to update water levels' });
        }
    });

    return router;
};
