// Level indicator component
import { wsClient } from '../api.js';

export class LevelIndicator {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.data = {
            front_back: 0,
            side_to_side: 0,
        };
        this.wsHandler = null;
        // Trailer dimensions for inches calculation (in inches)
        this.trailerLength = 300; // 25 feet
        this.trailerWidth = 96;   // 8 feet
    }

    render() {
        return `
            <div class="level-container">
                <div class="level-indicator">
                    <span class="level-label">Front / Back</span>
                    <div class="level-bubble" id="fb-bubble">
                        <div class="level-bubble-fill" id="fb-fill"></div>
                    </div>
                    <div class="level-values">
                        <span class="level-value" id="fb-value">${this.formatDegrees(this.data.front_back)}</span>
                        <span class="level-inches" id="fb-inches">${this.formatInches(this.data.front_back, this.trailerLength)}</span>
                    </div>
                </div>
                <div class="level-indicator">
                    <span class="level-label">Side to Side</span>
                    <div class="level-bubble" id="ss-bubble">
                        <div class="level-bubble-fill" id="ss-fill"></div>
                    </div>
                    <div class="level-values">
                        <span class="level-value" id="ss-value">${this.formatDegrees(this.data.side_to_side)}</span>
                        <span class="level-inches" id="ss-inches">${this.formatInches(this.data.side_to_side, this.trailerWidth)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    formatDegrees(value) {
        const sign = value > 0 ? '+' : '';
        return `${sign}${value.toFixed(1)}°`;
    }

    formatInches(degrees, length) {
        // Calculate rise at end: tan(angle) * (length/2)
        const radians = Math.abs(degrees) * (Math.PI / 180);
        const inches = Math.tan(radians) * (length / 2);
        const sign = degrees > 0 ? '+' : degrees < 0 ? '-' : '';
        return `${sign}${inches.toFixed(1)}"`;
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

        // Setup WebSocket listener
        this.wsHandler = (data) => {
            this.data = { ...this.data, ...data };
            this.updateDisplay();
        };
        wsClient.on('level', this.wsHandler);
    }

    updateDisplay() {
        const fbFill = document.getElementById('fb-fill');
        const ssFill = document.getElementById('ss-fill');
        const fbValue = document.getElementById('fb-value');
        const ssValue = document.getElementById('ss-value');
        const fbInches = document.getElementById('fb-inches');
        const ssInches = document.getElementById('ss-inches');

        if (fbFill) {
            // Calculate position: -15 to +15 degrees maps to 0-100% offset
            const fbOffset = (this.data.front_back / 15) * 40; // Max 40% offset from center
            fbFill.style.transform = `translate(calc(-50% + ${fbOffset}%), -50%)`;

            const fbStatus = this.getStatusClass(this.data.front_back);
            fbFill.className = `level-bubble-fill ${fbStatus}`;
        }

        if (ssFill) {
            const ssOffset = (this.data.side_to_side / 15) * 40;
            ssFill.style.transform = `translate(calc(-50% + ${ssOffset}%), -50%)`;

            const ssStatus = this.getStatusClass(this.data.side_to_side);
            ssFill.className = `level-bubble-fill ${ssStatus}`;
        }

        if (fbValue) {
            fbValue.textContent = this.formatDegrees(this.data.front_back);
            fbValue.className = `level-value ${this.getStatusClass(this.data.front_back)}`;
        }

        if (ssValue) {
            ssValue.textContent = this.formatDegrees(this.data.side_to_side);
            ssValue.className = `level-value ${this.getStatusClass(this.data.side_to_side)}`;
        }

        if (fbInches) {
            fbInches.textContent = this.formatInches(this.data.front_back, this.trailerLength);
            fbInches.className = `level-inches ${this.getStatusClass(this.data.front_back)}`;
        }

        if (ssInches) {
            ssInches.textContent = this.formatInches(this.data.side_to_side, this.trailerWidth);
            ssInches.className = `level-inches ${this.getStatusClass(this.data.side_to_side)}`;
        }
    }

    cleanup() {
        if (this.wsHandler) {
            wsClient.off('level', this.wsHandler);
        }
    }
}
