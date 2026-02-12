// Trailer page - Level indicator
import { API } from '../api.js';
import { LevelIndicator } from '../components/level-indicator.js';
import { GnssDetails } from '../components/gnss-details.js';

let levelIndicator = null;
let gnssDetails = null;

export const trailerPage = {
    render() {
        return `
            <section class="page-trailer">
                <h1 class="section-title">Trailer Level</h1>
                <div class="card" id="level-card">
                    <!-- Level indicator will be rendered here -->
                </div>
                <p style="text-align: center; color: var(--text-muted); margin-top: 20px; font-size: 0.875rem;">
                    Green = Level | Yellow = Slight Tilt | Red = Needs Adjustment
                </p>

                <h1 class="section-title">GNSS Details</h1>
                <div class="card" id="gnss-card">
                    <!-- GNSS Data will be rendered here -->
                </div>
            </section>
        `;
    },

    async init() {
        try {
            const levelData = await API.getTrailerLevel();
            levelIndicator = new LevelIndicator('level-card');
            document.getElementById('level-card').innerHTML = levelIndicator.render();
            levelIndicator.init(levelData);
        } catch (error) {
            console.error('Failed to fetch level data:', error);
            document.getElementById('level-card').innerHTML = '<p style="color: var(--danger);">Failed to load level data</p>';
        }
        try {
            gnssDetails = new GnssDetails('gnss-card');
            document.getElementById('gnss-card').innerHTML = gnssDetails.render();
            gnssDetails.init({
                numberOfSatellites: 0,
                speedOverGround: 0,
                courseOverGround: 0,
                gnssMode: 0
            });
        } catch (error) {
            console.error('Failed to render elevation data:', error);
            document.getElementById('gnss-card').innerHTML = '<p style="color: var(--danger);">Failed to load elevation data</p>';
        }
    },

    cleanup() {
        if (levelIndicator) {
            levelIndicator.cleanup();
            levelIndicator = null;
        }
        if (gnssDetails) {
            gnssDetails.cleanup();
            gnssDetails = null;
        }
    }
};
