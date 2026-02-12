// Brightness modal component
export class BrightnessModal {
    constructor() {
        this.light = null;
        this.onBrightnessChange = null;
        this.modalElement = null;
        this.debounceTimer = null;
        this.lastSentValue = null;
    }

    render() {
        return `
            <div class="brightness-modal-overlay" id="brightness-modal-overlay">
                <div class="brightness-modal">
                    <div class="brightness-modal-header">
                        <span class="brightness-modal-title" id="brightness-modal-title">Brightness</span>
                        <button class="brightness-modal-close" id="brightness-modal-close" aria-label="Close">
                            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="brightness-modal-body">
                        <div class="brightness-value" id="brightness-value">100%</div>
                        <div class="brightness-slider-container">
                            <svg class="brightness-icon-dim" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="4"/>
                            </svg>
                            <input type="range"
                                   id="brightness-slider"
                                   class="brightness-slider"
                                   min="0"
                                   max="255"
                                   value="255"
                                   aria-label="Brightness level">
                            <svg class="brightness-icon-bright" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="4"/>
                                <line x1="12" y1="2" x2="12" y2="5"/>
                                <line x1="12" y1="19" x2="12" y2="22"/>
                                <line x1="4.93" y1="4.93" x2="7.05" y2="7.05"/>
                                <line x1="16.95" y1="16.95" x2="19.07" y2="19.07"/>
                                <line x1="2" y1="12" x2="5" y2="12"/>
                                <line x1="19" y1="12" x2="22" y2="12"/>
                                <line x1="4.93" y1="19.07" x2="7.05" y2="16.95"/>
                                <line x1="16.95" y1="7.05" x2="19.07" y2="4.93"/>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    updateSliderFill(slider) {
        const percent = (slider.value / 255) * 100;
        slider.style.setProperty('--slider-percent', `${percent}%`);
    }

    init() {
        // Inject modal into DOM if not already present
        if (!document.getElementById('brightness-modal-overlay')) {
            document.body.insertAdjacentHTML('beforeend', this.render());
        }

        this.modalElement = document.getElementById('brightness-modal-overlay');
        const slider = document.getElementById('brightness-slider');
        const valueDisplay = document.getElementById('brightness-value');
        const closeBtn = document.getElementById('brightness-modal-close');

        // Update percentage display and fill as slider moves
        slider.addEventListener('input', () => {
            const percent = Math.round((slider.value / 255) * 100);
            valueDisplay.textContent = `${percent}%`;
            this.updateSliderFill(slider);

            // Debounce: send brightness change after slider stops moving for 300ms
            this.debounceBrightnessChange(parseInt(slider.value));
        });

        // Also send on touchend/mouseup for immediate feedback when user releases
        slider.addEventListener('change', () => {
            // Clear any pending debounce and send immediately
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = null;
            }
            this.sendBrightnessChange(parseInt(slider.value));
        });

        // Close handler
        closeBtn.addEventListener('click', () => this.close());

        // Close on overlay click (but not modal itself)
        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) {
                this.close();
            }
        });

        // Escape key closes modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.close();
            }
        });
    }

    debounceBrightnessChange(brightness) {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.sendBrightnessChange(brightness);
            this.debounceTimer = null;
        }, 300);
    }

    sendBrightnessChange(brightness) {
        // Only send if value changed from last sent value
        if (this.onBrightnessChange && this.light && brightness !== this.lastSentValue) {
            this.lastSentValue = brightness;
            this.onBrightnessChange(this.light.id, brightness);
        }
    }

    open(light, onBrightnessChange) {
        this.light = light;
        this.onBrightnessChange = onBrightnessChange;
        this.lastSentValue = null;

        const title = document.getElementById('brightness-modal-title');
        const slider = document.getElementById('brightness-slider');
        const valueDisplay = document.getElementById('brightness-value');

        title.textContent = `${light.name}`;

        // Set slider to current brightness (default to 255 if not set)
        const currentBrightness = light.brightness !== undefined ? light.brightness : 255;
        slider.value = currentBrightness;
        this.lastSentValue = currentBrightness;
        const percent = Math.round((currentBrightness / 255) * 100);
        valueDisplay.textContent = `${percent}%`;
        this.updateSliderFill(slider);

        this.modalElement.classList.add('open');
    }

    close() {
        // Clear any pending debounce
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        this.modalElement.classList.remove('open');
        this.light = null;
        this.onBrightnessChange = null;
        this.lastSentValue = null;
    }

    isOpen() {
        return this.modalElement && this.modalElement.classList.contains('open');
    }
}

// Singleton instance
export const brightnessModal = new BrightnessModal();
