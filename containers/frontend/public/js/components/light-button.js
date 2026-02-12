// Light button component
import { API, wsClient } from '../api.js';
import { brightnessModal } from './brightness-modal.js';

export class LightButton {
    constructor(light) {
        this.light = light;
    }

    render() {
        const stateClass = this.light.state ? 'on' : '';
        return `
            <div class="light-btn-wrapper">
                <button class="light-btn ${stateClass}" data-light-id="${this.light.id}" aria-pressed="${this.light.state ? 'true' : 'false'}">
                    <svg class="light-icon" viewBox="0 0 24 24" fill="${this.light.state ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M9 18h6M10 22h4M12 2v1M4.22 4.22l.71.71M1 12h1M4.22 19.78l.71-.71M12 23v-1M18.36 4.93l.71-.71M23 12h-1M18.36 19.07l.71.71"/>
                        <path d="M15 9A3 3 0 0 0 9 9a5.5 5.5 0 0 0 1 7h4a5.5 5.5 0 0 0 1-7z"/>
                    </svg>
                    <span>${this.light.name}</span>
                </button>
                <button class="brightness-trigger" data-light-id="${this.light.id}" title="Adjust brightness" aria-label="Adjust brightness for ${this.light.name}">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3"/>
                        <line x1="12" y1="5" x2="12" y2="3"/>
                        <line x1="12" y1="21" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="3" y2="12"/>
                        <line x1="21" y1="12" x2="19" y2="12"/>
                        <line x1="7.05" y1="7.05" x2="5.63" y2="5.63"/>
                        <line x1="18.36" y1="18.36" x2="16.95" y2="16.95"/>
                        <line x1="7.05" y1="16.95" x2="5.63" y2="18.36"/>
                        <line x1="18.36" y1="5.64" x2="16.95" y2="7.05"/>
                    </svg>
                </button>
            </div>
        `;
    }
}

export class LightsGrid {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.lights = [];
        this.wsHandler = null;
    }

    render(lights) {
        this.lights = lights;
        return `
            <div class="lights-grid" id="lights-grid">
                ${lights.map(light => new LightButton(light).render()).join('')}
            </div>
        `;
    }

    async init(lights) {
        this.lights = lights;

        // Initialize brightness modal
        brightnessModal.init();

        const grid = document.getElementById('lights-grid');

        // Setup click handler for light toggle (main button)
        grid.addEventListener('click', async (e) => {
            // Ignore if clicking on brightness trigger
            if (e.target.closest('.brightness-trigger')) return;

            const btn = e.target.closest('.light-btn');
            if (!btn) return;

            const lightId = parseInt(btn.dataset.lightId);
            const light = this.lights.find(l => l.id === lightId);
            if (!light) return;

            const newState = light.state ? 0 : 1;

            try {
                // Send command via API (which publishes to MQTT)
                // Only sends state, not brightness
                await API.setLight(lightId, newState);
                // Note: UI will update when we receive the status via WebSocket
            } catch (error) {
                console.error('Failed to toggle light:', error);
            }
        });

        // Setup click handler for brightness trigger
        grid.addEventListener('click', (e) => {
            const trigger = e.target.closest('.brightness-trigger');
            if (!trigger) return;

            e.stopPropagation();

            const lightId = parseInt(trigger.dataset.lightId);
            const light = this.lights.find(l => l.id === lightId);
            if (!light) return;

            // Open brightness modal
            brightnessModal.open(light, async (id, brightness) => {
                try {
                    // Send brightness change (turns light on with specified brightness)
                    await API.setLightBrightness(id, brightness);
                } catch (error) {
                    console.error('Failed to set brightness:', error);
                }
            });
        });

        // Subscribe to WebSocket light status updates
        this.wsHandler = (lightData) => {
            this.updateLight(lightData);
        };
        wsClient.on('light', this.wsHandler);
    }

    updateLight(updatedLight) {
        const index = this.lights.findIndex(l => l.id === updatedLight.id);
        if (index > -1) {
            // Merge updated data with existing light data
            this.lights[index] = { ...this.lights[index], ...updatedLight };
        }

        const wrapper = document.querySelector(`.light-btn-wrapper:has(.light-btn[data-light-id="${updatedLight.id}"])`);
        if (!wrapper) return;

        const btn = wrapper.querySelector('.light-btn');
        if (btn) {
            btn.classList.toggle('on', updatedLight.state === 1);
            btn.setAttribute('aria-pressed', updatedLight.state === 1 ? 'true' : 'false');

            const svg = btn.querySelector('.light-icon');
            if (svg) {
                svg.setAttribute('fill', updatedLight.state ? 'currentColor' : 'none');
            }
        }
    }

    cleanup() {
        // Unsubscribe from WebSocket events
        if (this.wsHandler) {
            wsClient.off('light', this.wsHandler);
            this.wsHandler = null;
        }
    }
}
