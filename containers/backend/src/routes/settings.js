const express = require('express');
const router = express.Router();

const VALID_TIMEZONES = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Phoenix',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu',
    'UTC'
];

module.exports = (db) => {
    const settings = db.collection('settings');

    // GET /api/settings
    router.get('/', async (req, res) => {
        try {
            const data = await settings.findOne({ _id: 'main' });
            res.json({
                ...data,
                available_timezones: VALID_TIMEZONES
            });
        } catch (error) {
            console.error('Error fetching settings:', error);
            res.status(500).json({ error: 'Failed to fetch settings' });
        }
    });

    // PUT /api/settings
    router.put('/', async (req, res) => {
        try {
            const { theme, timezone, clock_format } = req.body;

            const updates = {};

            if (theme !== undefined) {
                if (!['dark', 'light'].includes(theme)) {
                    return res.status(400).json({ error: 'Theme must be dark or light' });
                }
                updates.theme = theme;
            }

            if (timezone !== undefined) {
                if (!VALID_TIMEZONES.includes(timezone)) {
                    return res.status(400).json({ error: 'Invalid timezone' });
                }
                updates.timezone = timezone;
            }

            if (clock_format !== undefined) {
                if (!['12h', '24h'].includes(clock_format)) {
                    return res.status(400).json({ error: 'Clock format must be 12h or 24h' });
                }
                updates.clock_format = clock_format;
            }

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ error: 'No valid fields to update' });
            }

            updates.updated_at = new Date();

            await settings.updateOne(
                { _id: 'main' },
                { $set: updates }
            );

            const data = await settings.findOne({ _id: 'main' });
            res.json({
                ...data,
                available_timezones: VALID_TIMEZONES
            });
        } catch (error) {
            console.error('Error updating settings:', error);
            res.status(500).json({ error: 'Failed to update settings' });
        }
    });

    return router;
};
