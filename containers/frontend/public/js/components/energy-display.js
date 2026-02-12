// Energy display component
import { wsClient } from '../api.js';

export class EnergyDisplay {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.data = {
            solar_watts: 0,
            battery_percent: 100,
            battery_voltage: null,
            charge_type: 'float',
            time_remaining_minutes: null
        };
        this.wsHandler = null;
    }

    render() {
        return `
            <div class="energy-container">
                <!-- Solar Panel -->
                <div class="card energy-card">
                    <svg class="energy-icon solar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="5"/>
                        <line x1="12" y1="1" x2="12" y2="3"/>
                        <line x1="12" y1="21" x2="12" y2="23"/>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                        <line x1="1" y1="12" x2="3" y2="12"/>
                        <line x1="21" y1="12" x2="23" y2="12"/>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                    </svg>
                    <div class="energy-info">
                        <span class="energy-value" id="solar-watts">${Math.round(this.data.solar_watts)}<span class="energy-unit">W</span></span>
                        <span class="energy-label">Solar Input</span>
                    </div>
                </div>

                <!-- Battery -->
                <div class="card energy-card">
                    <svg class="energy-icon battery ${this.data.battery_percent < 20 ? 'low' : ''}" id="battery-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="1" y="6" width="18" height="12" rx="2" ry="2"/>
                        <line x1="23" y1="10" x2="23" y2="14"/>
                        <rect x="3" y="8" width="${(this.data.battery_percent / 100) * 14}" height="8" fill="currentColor" stroke="none" id="battery-fill"/>
                    </svg>
                    <div class="energy-info">
                        <span class="energy-value" id="battery-percent">${Math.round(this.data.battery_percent)}<span class="energy-unit">%</span></span>
                        <span class="energy-label">Battery Level</span>
                    </div>
                </div>

                <!-- Battery Voltage -->
                <div class="card energy-card">
                    <svg class="energy-icon voltage" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>
                    <div class="energy-info">
                        <span class="energy-value" id="battery-voltage">${this.formatVoltage()}<span class="energy-unit">V</span></span>
                        <span class="energy-label">Battery Voltage</span>
                    </div>
                </div>

                <!-- Charge Type -->
                <div class="card energy-card">
                    <svg class="energy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    <div class="energy-info">
                        <span class="charge-badge ${this.data.charge_type}" id="charge-type">${this.formatChargeType(this.data.charge_type)}</span>
                        <span class="energy-label">Charge Status</span>
                    </div>
                </div>

                <!-- Time Remaining -->
                <div class="card energy-card time-remaining-card ${this.getTimeRemainingClass()}">
                    <svg class="energy-icon time-remaining" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <div class="energy-info">
                        <span class="energy-value time-remaining-value" id="time-remaining">${this.formatTimeRemaining()}</span>
                        <span class="energy-label">Time Remaining</span>
                    </div>
                </div>
            </div>
        `;
    }

    formatChargeType(type) {
        const types = {
            float: 'Float',
            bulk: 'Bulk',
            absorption: 'Absorption',
            equalize: 'Equalize'
        };
        return types[type] || type;
    }

    formatVoltage() {
        const voltage = this.data.battery_voltage;
        if (voltage === null || voltage === undefined) {
            return '--';
        }
        return voltage.toFixed(1);
    }

    formatTimeRemaining() {
        const minutes = this.data.time_remaining_minutes;
        if (minutes === null || minutes === undefined) {
            return '--';
        }

        const days = Math.floor(minutes / 1440);
        const hours = Math.floor((minutes % 1440) / 60);
        const mins = Math.floor(minutes % 60);

        if (days > 0) {
            return `${days}d ${hours}h`;
        } else if (hours > 0) {
            return `${hours}h ${mins}m`;
        } else {
            return `${mins}m`;
        }
    }

    getTimeRemainingClass() {
        const minutes = this.data.time_remaining_minutes;
        if (minutes === null || minutes === undefined) {
            return '';
        }
        if (minutes <= 60) {
            return 'critical';
        } else if (minutes <= 240) {
            return 'warning';
        }
        return '';
    }

    init(data) {
        this.data = data || this.data;
        this.updateDisplay();

        // Setup WebSocket listener
        this.wsHandler = (data) => {
            this.data = data;
            this.updateDisplay();
        };
        wsClient.on('energy', this.wsHandler);
    }

    updateDisplay() {
        const solarWatts = document.getElementById('solar-watts');
        const batteryPercent = document.getElementById('battery-percent');
        const chargeType = document.getElementById('charge-type');
        const batteryFill = document.getElementById('battery-fill');
        const batteryIcon = document.getElementById('battery-icon');

        if (solarWatts) {
            solarWatts.innerHTML = `${Math.round(this.data.solar_watts)}<span class="energy-unit">W</span>`;
        }

        if (batteryPercent) {
            batteryPercent.innerHTML = `${Math.round(this.data.battery_percent)}<span class="energy-unit">%</span>`;
        }

        const batteryVoltage = document.getElementById('battery-voltage');
        if (batteryVoltage) {
            batteryVoltage.innerHTML = `${this.formatVoltage()}<span class="energy-unit">V</span>`;
        }

        if (chargeType) {
            chargeType.textContent = this.formatChargeType(this.data.charge_type);
            chargeType.className = `charge-badge ${this.data.charge_type}`;
        }

        if (batteryFill) {
            const fillWidth = (this.data.battery_percent / 100) * 14;
            batteryFill.setAttribute('width', fillWidth);
        }

        if (batteryIcon) {
            batteryIcon.classList.toggle('low', this.data.battery_percent < 20);
        }

        const timeRemaining = document.getElementById('time-remaining');
        const timeRemainingCard = document.querySelector('.time-remaining-card');
        if (timeRemaining) {
            timeRemaining.textContent = this.formatTimeRemaining();
        }
        if (timeRemainingCard) {
            timeRemainingCard.classList.remove('warning', 'critical');
            const warningClass = this.getTimeRemainingClass();
            if (warningClass) {
                timeRemainingCard.classList.add(warningClass);
            }
        }
    }

    cleanup() {
        if (this.wsHandler) {
            wsClient.off('energy', this.wsHandler);
        }
    }
}
