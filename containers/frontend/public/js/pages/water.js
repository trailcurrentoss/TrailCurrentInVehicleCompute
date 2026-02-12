// Water page - Tank level monitoring
import { API } from '../api.js';
import { WaterTanks } from '../components/water-tanks.js';

let waterTanks = null;

export const waterPage = {
    render() {
        return `
            <section class="page-water">
                <h1 class="section-title">Water Tanks</h1>
                <div id="water-container">
                    <!-- Water tanks will be rendered here -->
                </div>
                <p class="water-legend">
                    <span class="legend-item"><span class="legend-dot fresh"></span> Fresh - refill when low</span>
                    <span class="legend-item"><span class="legend-dot grey"></span> Grey - empty when high</span>
                    <span class="legend-item"><span class="legend-dot black"></span> Black - empty when high</span>
                </p>
            </section>
        `;
    },

    async init() {
        try {
            const waterData = await API.getWater();
            waterTanks = new WaterTanks('water-container');
            document.getElementById('water-container').innerHTML = waterTanks.render();
            waterTanks.init(waterData);
        } catch (error) {
            console.error('Failed to fetch water data:', error);
            document.getElementById('water-container').innerHTML = '<p style="color: var(--danger);">Failed to load water data</p>';
        }
    },

    cleanup() {
        if (waterTanks) {
            waterTanks.cleanup();
            waterTanks = null;
        }
    }
};
