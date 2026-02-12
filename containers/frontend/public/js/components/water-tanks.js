// Water tanks display component
import { wsClient } from '../api.js';

export class WaterTanks {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.data = {
            fresh: 75.0,
            grey: 30.0,
            black: 15.0
        };
        this.wsHandler = null;
    }

    render() {
        return `
            <div class="water-tanks-container">
                <!-- Fresh Water Tank -->
                <div class="card water-tank-card">
                    <div class="tank-header">
                        <svg class="tank-icon fresh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
                        </svg>
                        <span class="tank-label">Fresh</span>
                    </div>
                    <div class="tank-visual">
                        <div class="tank-container">
                            <div class="tank-fill fresh ${this.getFreshWarningClass()}" id="fresh-fill" style="height: ${this.data.fresh}%"></div>
                            <div class="tank-level-lines">
                                <div class="level-line" style="bottom: 75%"></div>
                                <div class="level-line" style="bottom: 50%"></div>
                                <div class="level-line" style="bottom: 25%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="tank-value">
                        <span class="tank-percent" id="fresh-value">${this.data.fresh.toFixed(0)}</span>
                        <span class="tank-unit">%</span>
                    </div>
                </div>

                <!-- Grey Water Tank -->
                <div class="card water-tank-card">
                    <div class="tank-header">
                        <svg class="tank-icon grey" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
                        </svg>
                        <span class="tank-label">Grey</span>
                    </div>
                    <div class="tank-visual">
                        <div class="tank-container">
                            <div class="tank-fill grey ${this.getGreyWarningClass()}" id="grey-fill" style="height: ${this.data.grey}%"></div>
                            <div class="tank-level-lines">
                                <div class="level-line" style="bottom: 75%"></div>
                                <div class="level-line" style="bottom: 50%"></div>
                                <div class="level-line" style="bottom: 25%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="tank-value">
                        <span class="tank-percent" id="grey-value">${this.data.grey.toFixed(0)}</span>
                        <span class="tank-unit">%</span>
                    </div>
                </div>

                <!-- Black Water Tank -->
                <div class="card water-tank-card">
                    <div class="tank-header">
                        <svg class="tank-icon black" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
                        </svg>
                        <span class="tank-label">Black</span>
                    </div>
                    <div class="tank-visual">
                        <div class="tank-container">
                            <div class="tank-fill black ${this.getBlackWarningClass()}" id="black-fill" style="height: ${this.data.black}%"></div>
                            <div class="tank-level-lines">
                                <div class="level-line" style="bottom: 75%"></div>
                                <div class="level-line" style="bottom: 50%"></div>
                                <div class="level-line" style="bottom: 25%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="tank-value">
                        <span class="tank-percent" id="black-value">${this.data.black.toFixed(0)}</span>
                        <span class="tank-unit">%</span>
                    </div>
                </div>
            </div>
        `;
    }

    getFreshWarningClass() {
        if (this.data.fresh <= 10) return 'critical';
        if (this.data.fresh <= 20) return 'warning';
        return '';
    }

    getGreyWarningClass() {
        if (this.data.grey >= 90) return 'critical';
        if (this.data.grey >= 75) return 'warning';
        return '';
    }

    getBlackWarningClass() {
        if (this.data.black >= 90) return 'critical';
        if (this.data.black >= 75) return 'warning';
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
        wsClient.on('water', this.wsHandler);
    }

    updateDisplay() {
        const freshFill = document.getElementById('fresh-fill');
        const freshValue = document.getElementById('fresh-value');
        const greyFill = document.getElementById('grey-fill');
        const greyValue = document.getElementById('grey-value');
        const blackFill = document.getElementById('black-fill');
        const blackValue = document.getElementById('black-value');

        if (freshFill) {
            freshFill.style.height = `${this.data.fresh}%`;
            freshFill.className = `tank-fill fresh ${this.getFreshWarningClass()}`;
        }
        if (freshValue) {
            freshValue.textContent = this.data.fresh.toFixed(0);
        }

        if (greyFill) {
            greyFill.style.height = `${this.data.grey}%`;
            greyFill.className = `tank-fill grey ${this.getGreyWarningClass()}`;
        }
        if (greyValue) {
            greyValue.textContent = this.data.grey.toFixed(0);
        }

        if (blackFill) {
            blackFill.style.height = `${this.data.black}%`;
            blackFill.className = `tank-fill black ${this.getBlackWarningClass()}`;
        }
        if (blackValue) {
            blackValue.textContent = this.data.black.toFixed(0);
        }
    }

    cleanup() {
        if (this.wsHandler) {
            wsClient.off('water', this.wsHandler);
        }
    }
}
