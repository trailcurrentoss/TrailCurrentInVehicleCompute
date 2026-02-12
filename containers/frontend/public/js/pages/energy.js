// Energy page - Solar and battery monitoring
import { API } from '../api.js';
import { EnergyDisplay } from '../components/energy-display.js';

let energyDisplay = null;

export const energyPage = {
    render() {
        return `
            <section class="page-energy">
                <h1 class="section-title">Energy Monitor</h1>
                <div id="energy-container">
                    <!-- Energy display will be rendered here -->
                </div>
            </section>
        `;
    },

    async init() {
        try {
            const energyData = await API.getEnergy();
            energyDisplay = new EnergyDisplay('energy-container');
            document.getElementById('energy-container').innerHTML = energyDisplay.render();
            energyDisplay.init(energyData);
        } catch (error) {
            console.error('Failed to fetch energy data:', error);
            document.getElementById('energy-container').innerHTML = '<p style="color: var(--danger);">Failed to load energy data</p>';
        }
    },

    cleanup() {
        if (energyDisplay) {
            energyDisplay.cleanup();
            energyDisplay = null;
        }
    }
};
