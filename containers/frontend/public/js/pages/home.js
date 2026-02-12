// Home page - Thermostat and Lights
import { API } from '../api.js';
import { Thermostat } from '../components/thermostat.js';
import { LightsGrid } from '../components/light-button.js';

let thermostat = null;
let lightsGrid = null;

export const homePage = {
    render() {
        return `
            <section class="page-home">
                <div class="home-grid">
                    <div class="home-panel thermostat-panel">
                        <h1 class="section-title">Climate Control</h1>
                        <div class="card" id="thermostat-card">
                            <!-- Thermostat will be rendered here -->
                        </div>
                    </div>

                    <div class="home-panel lights-panel">
                        <h2 class="section-title">Lighting</h2>
                        <div class="card" id="lights-card">
                            <!-- Lights will be rendered here -->
                        </div>
                    </div>
                </div>
            </section>
        `;
    },

    async init() {
        // Initialize thermostat
        thermostat = new Thermostat('thermostat-card');
        document.getElementById('thermostat-card').innerHTML = thermostat.render();
        await thermostat.init();

        // Initialize lights
        try {
            const lights = await API.getLights();
            lightsGrid = new LightsGrid('lights-card');
            document.getElementById('lights-card').innerHTML = lightsGrid.render(lights);
            await lightsGrid.init(lights);
        } catch (error) {
            console.error('Failed to fetch lights:', error);
            document.getElementById('lights-card').innerHTML = '<p style="color: var(--danger);">Failed to load lights</p>';
        }
    },

    cleanup() {
        if (thermostat) {
            thermostat.cleanup();
            thermostat = null;
        }
        if (lightsGrid) {
            lightsGrid.cleanup();
            lightsGrid = null;
        }
    }
};
