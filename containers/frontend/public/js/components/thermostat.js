// Thermostat component
import { API, wsClient } from '../api.js';

export class Thermostat {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.data = {
            target_temp: null,
            mode: null
        };
        this.wsHandler = null;
        this.unsubStaleThermostat = null;

        this.dataTempAndHumidity = {
            tempInC: null,
            tempInF: null,
            humidity: null
        }
        this.wsTempAndHumidityHandler = null;
        this.unsubStaleTempHumid = null;
    }

    render() {
        const currentTempDisplay = this.dataTempAndHumidity.tempInF != null ? Math.round(this.dataTempAndHumidity.tempInF) : '-';
        const targetTempDisplay = this.data.target_temp != null ? this.data.target_temp : '-';
        const modeDisplay = this.data.mode || '-';
        return `
            <div class="thermostat-container">
                <div class="thermostat-dial" id="thermostat-dial">
                    <span class="current-temp">
                        <span id="current-temp">${currentTempDisplay}</span><span class="current-temp-unit">°F</span>
                    </span>
                    <span class="target-temp">Target: <span id="target-temp">${targetTempDisplay}</span>°F</span>
                    <span class="thermostat-mode" id="thermostat-mode">${modeDisplay}</span>
                </div>
                <div class="thermostat-controls">
                    <button class="temp-btn" id="temp-down" aria-label="Decrease temperature">−</button>
                    <button class="temp-btn" id="temp-up" aria-label="Increase temperature">+</button>
                </div>
            </div>
        `;
    }

    async init() {
        // Fetch initial data
        try {
            const thermostatData = await API.getThermostat();
            if (thermostatData) {
                this.data = thermostatData;
            }
            this.updateDisplay();
        } catch (error) {
            console.error('Failed to fetch thermostat data:', error);
        }

        // Setup event listeners
        document.getElementById('temp-up').addEventListener('click', () => this.adjustTemp(1));
        document.getElementById('temp-down').addEventListener('click', () => this.adjustTemp(-1));

        // Setup WebSocket listener
        this.wsHandler = (data) => {
            if (data) {
                this.data = data;
            }
            this.updateDisplay();
        };
        wsClient.on('thermostat', this.wsHandler);

        this.wsTempAndHumidityHandler = (dataTempAndHumidity) => {
            this.dataTempAndHumidity = dataTempAndHumidity;
            this.updateDisplay();
        }
        wsClient.on('temphumid',this.wsTempAndHumidityHandler);

        this.unsubStaleThermostat = wsClient.onStale('thermostat', () => {
            this.data = { target_temp: null, mode: null };
            this.updateDisplay();
        });
        this.unsubStaleTempHumid = wsClient.onStale('temphumid', () => {
            this.dataTempAndHumidity = { tempInC: null, tempInF: null, humidity: null };
            this.updateDisplay();
        });
    }

    updateDisplay() {
        const currentTempEl = document.getElementById('current-temp');
        const targetTempEl = document.getElementById('target-temp');
        const modeEl = document.getElementById('thermostat-mode');
        const dialEl = document.getElementById('thermostat-dial');

        const currentTempDisplay = this.dataTempAndHumidity.tempInF != null ? Math.round(this.dataTempAndHumidity.tempInF) : '-';
        if (currentTempEl) currentTempEl.textContent = currentTempDisplay;
        if (targetTempEl) targetTempEl.textContent = this.data.target_temp != null ? this.data.target_temp : '-';
        if (modeEl) modeEl.textContent = this.data.mode || '-';

        // Update dial state based on heating/cooling
        if (dialEl) {
            dialEl.classList.remove('heating', 'cooling');
            if (this.data.mode && this.data.mode !== 'off' && this.dataTempAndHumidity.tempInF != null && this.data.target_temp != null) {
                if (this.dataTempAndHumidity.tempInF < this.data.target_temp - 1) {
                    dialEl.classList.add('heating');
                } else if (this.dataTempAndHumidity.tempInF > this.data.target_temp + 1) {
                    dialEl.classList.add('cooling');
                }
            }
        }
    }

    async adjustTemp(delta) {
        const newTarget = Math.max(50, Math.min(90, this.data.target_temp + delta));

        if (newTarget === this.data.target_temp) return;

        try {
            this.data = await API.setThermostat({ target_temp: newTarget });
            this.updateDisplay();
        } catch (error) {
            console.error('Failed to set temperature:', error);
        }
    }

    cleanup() {
        if (this.wsHandler) {
            wsClient.off('thermostat', this.wsHandler);
        }
        if (this.wsTempAndHumidityHandler) {
            wsClient.off('temphumid',this.wsTempAndHumidityHandler);
        }
        if (this.unsubStaleThermostat) this.unsubStaleThermostat();
        if (this.unsubStaleTempHumid) this.unsubStaleTempHumid();
    }
}
