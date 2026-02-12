// Level indicator component
import { wsClient } from '../api.js';

export class GnssDetails {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.data = {
            altitudeFeet: 0,
            altitudeInMeters: 0
        }
        this.gnssDetailsData = {
            numberOfSatellites: 0,
            speedOverGround: 0,
            courseOverGround: 0,
            gnssMode: 0
        }
        this.wsHandler = null;
        this.wsGnssDetailsHandler = null;
    }

    render() {
        return `           
            <div class="gps-info-row">
                <div class="gps-info-item">
                    <svg class="gps-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <div class="gps-info-text">
                        <span class="gps-info-value" id="elevation-value">${this.formatElevation()}</span>
                        <span class="gps-info-label">Elevation</span>
                    </div>
                </div>
                <div class="gps-info-item">
                    <svg class="gps-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="2" y1="12" x2="22" y2="12"/>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    <div class="gps-info-text">
                        <span class="gps-info-value" id="satellites-value">${this.formatSatellites()}</span>
                        <span class="gps-info-label">Satellites</span>
                    </div>
                </div>
            </div>
            <div class="gnss-systems" id="gnss-systems">
                ${this.renderGnssSystems()}
            </div>
        `;
    }

    formatElevation() {
        const elevation = this.data.altitudeFeet;
        if (elevation === null || elevation === undefined) {
            return '--';
        }
        return `${elevation.toLocaleString()} ft`;
    }

    formatSatellites() {
        const satellites = this.gnssDetailsData.numberOfSatellites;
        if (satellites === null || satellites === undefined) {
            return '--';
        }
        return satellites.toString();
    }

    renderGnssSystems() {
        const systems = this.gnssDetailsData.gnssMode || 0;
        switch(systems) {
            case 0:
                return '<span class="gnss-badge inactive">No Fix</span>';
            case 1:
                return '<span class="gnss-badge active">Gps</span>';            
            case 2:
                return '<span class="gnss-badge active">Beidou</span>';                            
            case 3:
                return '<span class="gnss-badge active">Gps + Beidou</span>';                            
            case 4:
                return '<span class="gnss-badge active">Glonass</span>';                            
            case 5:
                return '<span class="gnss-badge active">Gps + Glonass</span>';                            
            case 6:
                return '<span class="gnss-badge active">Beidou + Glonass</span>';                            
            case 7:
                return '<span class="gnss-badge active">Gps + Beidou + Glonass</span>';                            
            default:
                 return '<span class="gnss-badge inactive">No Fix</span>';
        }
    }

    getSatelliteClass() {
        const sats = this.gnssDetailsData.numberOfSatellites;
        if (sats === null || sats === undefined || sats < 4) return 'poor';
        if (sats < 8) return 'moderate';
        return 'good';
    }

    getStatusClass(value) {
        const absValue = Math.abs(value);
        if (absValue > 5) return 'danger';
        if (absValue > 2) return 'warning';
        return '';
    }

    init(data) {
        this.data = { ...this.data, ...data };
        this.updateDisplay();
        this.updateGnssDetailsDisplay();

        // Setup WebSocket listener
        this.wsHandler = (data) => {
            this.data = { ...this.data, ...data };
            this.updateDisplay();
        };
        wsClient.on('alt', this.wsHandler);

        // Setup WebSocket listener for GNSS details
        this.wsGnssDetailsHandler = (dataDetails) => {
            this.gnssDetailsData = { ...this.gnssDetailsData, ...dataDetails };
            this.updateGnssDetailsDisplay();
        }
        wsClient.on('gnss_details',this.wsGnssDetailsHandler);
    }

    updateDisplay() {
        // Update GPS info
        const elevationValue = document.getElementById('elevation-value');
        if (elevationValue) {
            elevationValue.textContent = this.formatElevation();
        }
    }

    updateGnssDetailsDisplay() {
        const satellitesValue = document.getElementById('satellites-value');
        const gnssSystems = document.getElementById('gnss-systems');        
        if (satellitesValue) {
            satellitesValue.textContent = this.formatSatellites();
            const satItem = satellitesValue.closest('.gps-info-item');
            if (satItem) {
                satItem.className = `gps-info-item ${this.getSatelliteClass()}`;
            }
        }

        if (gnssSystems) {
            gnssSystems.innerHTML = this.renderGnssSystems();
        }
    }

    cleanup() {
        if (this.wsHandler) {
            wsClient.off('alt', this.wsHandler);
        }
        if (this.wsGnssDetailsHandler) {
            wsClient.off('gnss_details',this.wsGnssDetailsHandler);
        }
    }
}
