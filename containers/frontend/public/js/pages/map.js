// Map page - Location tracking and map display
import { MapDisplay } from '../components/map-display.js';

let mapDisplay = null;

export const mapPage = {
    render() {
        return `
            <section class="page-map">
                <h1 class="section-title">Location</h1>
                <div id="map-display-container">
                    <!-- Map will be rendered here -->
                </div>
            </section>
        `;
    },

    async init() {
        try {
            mapDisplay = new MapDisplay('map-display-container');
            document.getElementById('map-display-container').innerHTML = mapDisplay.render();
            await mapDisplay.init();
        } catch (error) {
            console.error('Failed to initialize map:', error);
            document.getElementById('map-display-container').innerHTML =
                '<p style="color: var(--danger); padding: 1rem;">Failed to load map</p>';
        }
    },

    cleanup() {
        if (mapDisplay) {
            mapDisplay.cleanup();
            mapDisplay = null;
        }
    }
};
