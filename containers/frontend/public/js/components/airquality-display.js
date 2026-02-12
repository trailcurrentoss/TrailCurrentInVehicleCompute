// Air quality display component
import { wsClient } from '../api.js';

export class AirQualityDisplay {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.data = {
            iaq_index: 85,
            co2_ppm: 650
        };
        this.wsHandler = null;

        this.dataTempAndHumidity = {
            tempInC: 0,
            tempInF: 0,
            humidity: 0
        }
        this.wsTempAndHumidityHandler = null;
    }

    render() {
        return `
            <div class="airquality-container">
                <!-- Temperature -->
                <div class="card airquality-card">
                    <svg class="airquality-icon temp" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
                    </svg>
                    <div class="airquality-info">
                        <span class="airquality-value" id="temp-value">${Math.round(this.dataTempAndHumidity.tempInF)}<span class="airquality-unit">°F</span></span>
                        <span class="airquality-label">Temperature</span>
                    </div>
                </div>

                <!-- Humidity -->
                <div class="card airquality-card">
                    <svg class="airquality-icon humidity" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
                    </svg>
                    <div class="airquality-info">
                        <span class="airquality-value" id="humidity-value">${Math.round(this.dataTempAndHumidity.humidity)}<span class="airquality-unit">%</span></span>
                        <span class="airquality-label">Humidity</span>
                    </div>
                </div>            
                <!-- IAQ Index -->
                <div class="card airquality-card ${this.getIaqClass()}">
                    <svg class="airquality-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
                    </svg>
                    <div class="airquality-info">
                        <span class="airquality-value" id="iaq-value">${Math.round(this.data.iaq_index)}</span>
                        <span class="airquality-label">IAQ Index</span>
                        <span class="airquality-badge ${this.getIaqClass()}" id="iaq-badge">${this.getIaqLabel()}</span>
                    </div>
                </div>

                <!-- CO2 -->
                <div class="card airquality-card ${this.getCo2Class()}">
                    <svg class="airquality-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
                    </svg>
                    <div class="airquality-info">
                        <span class="airquality-value" id="co2-value">${Math.round(this.data.co2_ppm)}<span class="airquality-unit">ppm</span></span>
                        <span class="airquality-label">CO₂</span>
                        <span class="airquality-badge ${this.getCo2Class()}" id="co2-badge">${this.getCo2Label()}</span>
                    </div>
                </div>
            </div>
        `;
    }

    getIaqClass() {
        const iaq = this.data.iaq_index;
        if (iaq <= 50) return 'good';
        if (iaq <= 100) return 'moderate';
        if (iaq <= 150) return 'sensitive';
        return 'unhealthy';
    }

    getIaqLabel() {
        const iaq = this.data.iaq_index;
        if (iaq <= 50) return 'Good';
        if (iaq <= 100) return 'Moderate';
        if (iaq <= 150) return 'Sensitive';
        return 'Unhealthy';
    }

    getCo2Class() {
        const co2 = this.data.co2_ppm;
        if (co2 < 800) return 'good';
        if (co2 < 1000) return 'moderate';
        if (co2 < 2000) return 'sensitive';
        return 'unhealthy';
    }

    getCo2Label() {
        const co2 = this.data.co2_ppm;
        if (co2 < 800) return 'Good';
        if (co2 < 1000) return 'Moderate';
        if (co2 < 2000) return 'Poor';
        return 'Unhealthy';
    }

    init(data, dataTempAndHumidity) {
        this.data = data || this.data;
        this.dataTempAndHumidity = dataTempAndHumidity || this.dataTempAndHumidity;
        this.updateDisplay();
        this.updateTempAndHumidity();

        // Setup WebSocket listener
        this.wsHandler = (data) => {
            this.data = data;
            this.updateDisplay();
        };
        wsClient.on('airquality', this.wsHandler);

        this.wsTempAndHumidityHandler = (dataTempAndHumidity) => {
            this.dataTempAndHumidity = dataTempAndHumidity;
            this.updateTempAndHumidity();
        }
        wsClient.on('temphumid',this.wsTempAndHumidityHandler);
    }

    updateTempAndHumidity() {
        const tempValue = document.getElementById('temp-value');
        const humidityValue = document.getElementById('humidity-value');

        if (tempValue) {
            tempValue.innerHTML = `${Math.round(this.dataTempAndHumidity.tempInF)}<span class="airquality-unit">°F</span>`;
        }

        if (humidityValue) {
            humidityValue.innerHTML = `${Math.round(this.dataTempAndHumidity.humidity)}<span class="airquality-unit">%</span>`;
        }
    }

    updateDisplay() {
        const iaqValue = document.getElementById('iaq-value');
        const iaqBadge = document.getElementById('iaq-badge');
        const co2Value = document.getElementById('co2-value');
        const co2Badge = document.getElementById('co2-badge');

        if (iaqValue) {
            iaqValue.textContent = Math.round(this.data.iaq_index);
        }
        if (iaqBadge) {
            iaqBadge.textContent = this.getIaqLabel();
            iaqBadge.className = `airquality-badge ${this.getIaqClass()}`;
        }

        if (co2Value) {
            co2Value.innerHTML = `${Math.round(this.data.co2_ppm)}<span class="airquality-unit">ppm</span>`;
        }
        if (co2Badge) {
            co2Badge.textContent = this.getCo2Label();
            co2Badge.className = `airquality-badge ${this.getCo2Class()}`;
        }
        // Update card classes for IAQ
        const iaqCard = document.querySelector('.airquality-card:first-child');
        if (iaqCard) {
            iaqCard.className = `card airquality-card ${this.getIaqClass()}`;
        }

        // Update card classes for CO2
        const co2Card = document.querySelector('.airquality-card:nth-child(2)');
        if (co2Card) {
            co2Card.className = `card airquality-card ${this.getCo2Class()}`;
        }
    }

    cleanup() {
        if (this.wsHandler) {
            wsClient.off('airquality', this.wsHandler);
        }
        if (this.wsTempAndHumidityHandler) {
            wsClient.off('temphumid', this.wsTempAndHumidityHandler);
        }
    }
}
