// Air Quality page - Indoor air quality monitoring
import { API } from '../api.js';
import { AirQualityDisplay } from '../components/airquality-display.js';

let airqualityDisplay = null;

export const airqualityPage = {
    render() {
        return `
            <section class="page-airquality">
                <h1 class="section-title">Air Quality</h1>
                <div id="airquality-container">
                    <!-- Air quality display will be rendered here -->
                </div>
            </section>
        `;
    },

    async init() {
        try {
            const airqualityData = await API.getAirQuality();
            airqualityDisplay = new AirQualityDisplay('airquality-container');
            document.getElementById('airquality-container').innerHTML = airqualityDisplay.render();
            airqualityDisplay.init(airqualityData);
        } catch (error) {
            console.error('Failed to fetch air quality data:', error);
            document.getElementById('airquality-container').innerHTML = '<p style="color: var(--danger);">Failed to load air quality data</p>';
        }
    },

    cleanup() {
        if (airqualityDisplay) {
            airqualityDisplay.cleanup();
            airqualityDisplay = null;
        }
    }
};
