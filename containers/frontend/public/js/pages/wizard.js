// Configuration Wizard page
import { API } from '../api.js';

let systemConfig = null;
let currentStep = 1;
let step2ListenersAttached = false;

const MCU_MODULES = [
    'air_quality_module',
    'cabinet_and_door_sensor',
    'can_esp_now_gateway',
    'eight_button_panel',
    'electric_heater_control',
    'gnss_module',
    'mppt_can_gateway',
    'power_distribution_module',
    'seven_pin_trailer_monitor',
    'shunt_gateway',
    'vehicle_leveler',
    'wall_mounted_display'
];

// Map snake_case module values to friendly display names
const MODULE_DISPLAY_NAMES = {
    'air_quality_module': 'Air Quality Sensor',
    'cabinet_and_door_sensor': 'Cabinet/Door Sensor',
    'can_esp_now_gateway': 'CAN ESP-NOW Gateway',
    'eight_button_panel': 'Eight Button Panel',
    'electric_heater_control': 'Electric Heater Control',
    'gnss_module': 'GPS Module',
    'mppt_can_gateway': 'MPPT CAN Gateway',
    'power_distribution_module': 'Power Distribution Module',
    'seven_pin_trailer_monitor': 'Seven Pin Trailer Monitor',
    'shunt_gateway': 'Shunt Gateway',
    'vehicle_leveler': 'Vehicle Leveler',
    'wall_mounted_display': 'Wall Mounted Display'
};

export const wizardPage = {
    render() {
        return `
            <section class="page-wizard">
                <div class="wizard-container">
                    <!-- Wizard steps indicator -->
                    <div class="wizard-steps">
                        <div class="wizard-step-indicator step-1 active">
                            <div class="step-number">1</div>
                            <div class="step-label">Cloud Setup</div>
                        </div>
                        <div class="wizard-step-indicator step-2">
                            <div class="step-number">2</div>
                            <div class="step-label">MCU Modules</div>
                        </div>
                        <div class="wizard-step-indicator step-3">
                            <div class="step-number">3</div>
                            <div class="step-label">Finish</div>
                        </div>
                    </div>

                    <!-- Wizard content -->
                    <div class="wizard-content" id="wizard-content">
                        <!-- Steps will be rendered here -->
                    </div>

                    <!-- Wizard actions -->
                    <div class="wizard-actions">
                        <button class="wizard-btn wizard-btn-secondary" id="wizard-back-btn" style="display: none;">
                            Back
                        </button>
                        <button class="wizard-btn wizard-btn-primary" id="wizard-next-btn">
                            Next
                        </button>
                    </div>
                </div>
            </section>
        `;
    },

    async init() {
        try {
            // Load system configuration
            systemConfig = await API.getSystemConfig();
            currentStep = 1;

            // Initialize mcu_modules if not present
            if (!systemConfig.mcu_modules) {
                systemConfig.mcu_modules = [];
            }

            // Initialize WiFi config if not present
            if (!systemConfig.wifi_ssid) {
                systemConfig.wifi_ssid = '';
            }
            if (!systemConfig.wifi_password) {
                systemConfig.wifi_password = '';
            }

            // Render first step
            this.renderStep(1);

            // Setup listeners after DOM is ready
            setTimeout(() => this.setupListeners(), 0);
        } catch (error) {
            console.error('Failed to load system config:', error);
            const contentEl = document.getElementById('wizard-content');
            if (contentEl) {
                contentEl.innerHTML = '<p style="color: var(--danger);">Failed to load configuration. Please try refreshing the page.</p>';
            }
        }
    },

    renderStep(step) {
        const contentEl = document.getElementById('wizard-content');
        let html = '';

        if (step === 1) {
            html = this.renderStep1();
        } else if (step === 2) {
            html = this.renderStep2();
        } else if (step === 3) {
            html = this.renderStep3();
        }

        contentEl.innerHTML = html;
        currentStep = step;

        // Update step indicators
        const stepIndicators = document.querySelectorAll('.wizard-step-indicator');
        stepIndicators.forEach((el, idx) => {
            el.classList.toggle('active', idx + 1 === step);
            el.classList.toggle('completed', idx + 1 < step);
        });

        // Update button visibility
        const backBtn = document.getElementById('wizard-back-btn');
        const nextBtn = document.getElementById('wizard-next-btn');

        if (backBtn) {
            backBtn.style.display = step === 1 ? 'none' : 'block';
        }

        if (nextBtn) {
            nextBtn.textContent = step === 3 ? 'Complete Setup' : 'Next';
        }

        // Re-attach event listeners for this step
        if (step === 1) {
            step2ListenersAttached = false;
            this.attachStep1Listeners();
        } else if (step === 2) {
            this.attachStep2Listeners();
        } else if (step === 3) {
            step2ListenersAttached = false;
        }
    },

    renderStep1() {
        return `
            <div class="wizard-step">
                <h2 class="wizard-title">Initial Configuration</h2>
                <p class="wizard-description">
                    Configure your system for cloud synchronization and WiFi access for MCU updates.
                </p>

                <div class="wizard-form">
                    <h3 class="wizard-subtitle">Cloud Configuration</h3>
                    <div class="wizard-field">
                        <div class="wizard-toggle-group">
                            <label class="wizard-toggle-label">
                                <span>Enable Cloud Synchronization</span>
                            </label>
                            <button class="toggle-switch ${systemConfig.cloud_enabled ? 'active' : ''}"
                                    id="cloud-toggle"
                                    aria-pressed="${systemConfig.cloud_enabled}">
                            </button>
                        </div>
                        <p class="wizard-field-hint">
                            When enabled, your system data will be synced to the cloud service for remote monitoring and management.
                        </p>
                    </div>

                    <div class="wizard-field ${!systemConfig.cloud_enabled ? 'hidden' : ''}">
                        <label class="wizard-label" for="cloud-url">Cloud Service URL</label>
                        <input type="url"
                               id="cloud-url"
                               class="wizard-input"
                               placeholder="https://cloud.example.com"
                               value="${systemConfig.cloud_url || ''}"
                               ${!systemConfig.cloud_enabled ? 'disabled' : ''}>
                        <p class="wizard-field-hint">
                            Enter the full URL of your cloud service (e.g., https://cloud.trailcurrent.com)
                        </p>
                        <div id="cloud-url-error" class="wizard-error hidden"></div>
                    </div>

                    <div class="wizard-divider"></div>
                    <h3 class="wizard-subtitle">WiFi Configuration for MCU Updates</h3>
                    <p class="wizard-description">
                        Configure WiFi access point that MCU devices will use for OTA firmware updates.
                    </p>

                    <div class="wizard-field">
                        <label class="wizard-label" for="wizard-wifi-ssid">WiFi SSID (Network Name)</label>
                        <input type="text"
                               id="wizard-wifi-ssid"
                               class="wizard-input"
                               placeholder="e.g., TrailCurrent-OTA"
                               value="${systemConfig.wifi_ssid || ''}">
                        <p class="wizard-field-hint">Name of the WiFi network MCUs will connect to</p>
                        <div id="wizard-wifi-ssid-error" class="wizard-error hidden"></div>
                    </div>

                    <div class="wizard-field">
                        <label class="wizard-label" for="wizard-wifi-password">WiFi Password</label>
                        <input type="password"
                               id="wizard-wifi-password"
                               class="wizard-input"
                               placeholder="Enter WiFi password"
                               value="${systemConfig.wifi_password || ''}">
                        <p class="wizard-field-hint">Password for the WiFi network (stored encrypted)</p>
                        <div id="wizard-wifi-password-error" class="wizard-error hidden"></div>
                    </div>
                </div>
            </div>
        `;
    },

    renderStep2() {
        const modules = systemConfig.mcu_modules || [];

        return `
            <div class="wizard-step">
                <h2 class="wizard-title">MCU Modules Configuration</h2>
                <p class="wizard-description">
                    Add the MCU modules that are part of your system. You can add them later if needed.
                </p>

                <!-- Add Module Form (initially hidden) -->
                <div id="add-module-form" class="wizard-form module-form hidden">
                    <div class="wizard-field">
                        <label class="wizard-label" for="module-type">Module Type</label>
                        <select id="module-type" class="wizard-input">
                            <option value="">-- Select a module type --</option>
                            ${MCU_MODULES.map(module => `<option value="${module}">${MODULE_DISPLAY_NAMES[module]}</option>`).join('')}
                        </select>
                        <div id="module-type-error" class="wizard-error hidden"></div>
                    </div>

                    <div class="wizard-field">
                        <label class="wizard-label" for="module-name">Friendly Name</label>
                        <input type="text"
                               id="module-name"
                               class="wizard-input"
                               placeholder="e.g., Cabin Air Quality"
                               maxlength="50">
                        <p class="wizard-field-hint">A descriptive name for this module instance</p>
                        <div id="module-name-error" class="wizard-error hidden"></div>
                    </div>

                    <div class="wizard-field">
                        <label class="wizard-label" for="module-hostname">Hostname</label>
                        <input type="text"
                               id="module-hostname"
                               class="wizard-input"
                               placeholder="e.g., airquality-01"
                               maxlength="50">
                        <p class="wizard-field-hint">Device hostname containing chipid for CAN bus identification</p>
                        <div id="module-hostname-error" class="wizard-error hidden"></div>
                    </div>

                    <div class="wizard-field-actions">
                        <button class="wizard-btn wizard-btn-secondary" id="module-cancel-btn">
                            Cancel
                        </button>
                        <button class="wizard-btn wizard-btn-primary" id="module-add-btn">
                            Add Module
                        </button>
                    </div>
                </div>

                <!-- Modules List -->
                <div id="modules-list" class="modules-list">
                    ${modules.length > 0 ? `
                        <div class="modules-header">
                            <h3>Added Modules</h3>
                        </div>
                        <div class="modules-items">
                            ${modules.map((mod, idx) => `
                                <div class="module-item">
                                    <div class="module-info">
                                        <div class="module-type">${MODULE_DISPLAY_NAMES[mod.type] || mod.type}</div>
                                        <div class="module-details">
                                            <div class="module-name">${mod.name}</div>
                                            <div class="module-hostname">${mod.hostname}</div>
                                        </div>
                                    </div>
                                    <button class="module-delete-btn" data-index="${idx}" title="Delete module">
                                        <span>×</span>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="modules-empty">
                            <p>No modules added yet. Click below to add your first module.</p>
                        </div>
                    `}
                </div>

                <!-- Add Module Button (visible when form is hidden) -->
                <button class="wizard-btn wizard-btn-primary" id="add-module-btn" style="width: 100%;">
                    + Add Module
                </button>
            </div>
        `;
    },

    renderStep3() {
        const modules = systemConfig.mcu_modules || [];

        return `
            <div class="wizard-step">
                <h2 class="wizard-title">Setup Complete</h2>
                <p class="wizard-description">
                    Review your configuration below. You can change these settings later in the application.
                </p>

                <div class="wizard-summary">
                    <div class="summary-section">
                        <h3 class="summary-section-title">Cloud Configuration</h3>
                        <div class="summary-item">
                            <span class="summary-label">Cloud Synchronization</span>
                            <span class="summary-value">
                                ${systemConfig.cloud_enabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>
                        ${systemConfig.cloud_enabled ? `
                            <div class="summary-item">
                                <span class="summary-label">Cloud Service URL</span>
                                <span class="summary-value summary-url">${systemConfig.cloud_url || 'Not configured'}</span>
                            </div>
                        ` : ''}
                    </div>

                    <div class="summary-section">
                        <h3 class="summary-section-title">MCU Modules</h3>
                        ${modules.length > 0 ? `
                            <div class="summary-modules">
                                ${modules.map(mod => `
                                    <div class="summary-module-item">
                                        <span class="summary-module-type">${MODULE_DISPLAY_NAMES[mod.type] || mod.type}</span>
                                        <span class="summary-module-name">${mod.name}</span>
                                        <span class="summary-module-hostname">${mod.hostname}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <p class="summary-empty">No modules configured</p>
                        `}
                    </div>
                </div>

                <p class="wizard-note">
                    You can add or modify modules later in the application settings.
                </p>
            </div>
        `;
    },

    attachStep1Listeners() {
        const cloudToggle = document.getElementById('cloud-toggle');
        const cloudUrlField = document.querySelector('.wizard-field:nth-of-type(2)');
        const cloudUrlInput = document.getElementById('cloud-url');
        const wifiSsidInput = document.getElementById('wizard-wifi-ssid');
        const wifiPasswordInput = document.getElementById('wizard-wifi-password');

        if (cloudToggle) {
            cloudToggle.addEventListener('click', () => {
                systemConfig.cloud_enabled = !systemConfig.cloud_enabled;
                cloudToggle.classList.toggle('active', systemConfig.cloud_enabled);
                cloudToggle.setAttribute('aria-pressed', systemConfig.cloud_enabled);

                // Show/hide URL field
                if (systemConfig.cloud_enabled) {
                    cloudUrlField.classList.remove('hidden');
                    cloudUrlInput.disabled = false;
                    cloudUrlInput.focus();
                } else {
                    cloudUrlField.classList.add('hidden');
                    cloudUrlInput.disabled = true;
                }
            });
        }

        if (cloudUrlInput) {
            cloudUrlInput.addEventListener('change', (e) => {
                systemConfig.cloud_url = e.target.value;
            });
        }

        if (wifiSsidInput) {
            wifiSsidInput.addEventListener('change', (e) => {
                systemConfig.wifi_ssid = e.target.value;
            });
        }

        if (wifiPasswordInput) {
            wifiPasswordInput.addEventListener('change', (e) => {
                systemConfig.wifi_password = e.target.value;
            });
        }
    },

    attachStep2Listeners() {
        // Prevent duplicate listener attachment
        if (step2ListenersAttached) {
            return;
        }

        const wizardContent = document.getElementById('wizard-content');
        if (!wizardContent) return;

        // Use event delegation on wizard-content to handle all step 2 button clicks
        // This prevents duplicate listeners when step 2 is re-rendered
        wizardContent.addEventListener('click', (e) => {
            const addModuleBtn = e.target.closest('#add-module-btn');
            const moduleAddBtn = e.target.closest('#module-add-btn');
            const moduleCancelBtn = e.target.closest('#module-cancel-btn');
            const moduleDeleteBtn = e.target.closest('.module-delete-btn');

            if (addModuleBtn) {
                const addModuleForm = document.getElementById('add-module-form');
                addModuleForm.classList.remove('hidden');
                addModuleBtn.style.display = 'none';
                document.getElementById('module-type').focus();
            } else if (moduleAddBtn) {
                this.confirmAddModule();
            } else if (moduleCancelBtn) {
                this.cancelAddModule();
            } else if (moduleDeleteBtn) {
                const index = moduleDeleteBtn.dataset.index;
                this.deleteModule(index);
            }
        });

        step2ListenersAttached = true;
    },

    cancelAddModule() {
        const addModuleForm = document.getElementById('add-module-form');
        const addModuleBtn = document.getElementById('add-module-btn');

        // Clear form
        document.getElementById('module-type').value = '';
        document.getElementById('module-name').value = '';
        document.getElementById('module-hostname').value = '';

        // Clear errors
        document.getElementById('module-type-error').classList.add('hidden');
        document.getElementById('module-name-error').classList.add('hidden');
        document.getElementById('module-hostname-error').classList.add('hidden');

        // Hide form, show button
        addModuleForm.classList.add('hidden');
        addModuleBtn.style.display = 'block';
    },

    confirmAddModule() {
        const moduleType = document.getElementById('module-type').value.trim();
        const moduleName = document.getElementById('module-name').value.trim();
        const moduleHostname = document.getElementById('module-hostname').value.trim();

        // Clear errors
        document.getElementById('module-type-error').classList.add('hidden');
        document.getElementById('module-name-error').classList.add('hidden');
        document.getElementById('module-hostname-error').classList.add('hidden');

        let isValid = true;

        // Validate
        if (!moduleType) {
            document.getElementById('module-type-error').textContent = 'Please select a module type';
            document.getElementById('module-type-error').classList.remove('hidden');
            isValid = false;
        }

        if (!moduleName) {
            document.getElementById('module-name-error').textContent = 'Friendly name is required';
            document.getElementById('module-name-error').classList.remove('hidden');
            isValid = false;
        }

        if (!moduleHostname) {
            document.getElementById('module-hostname-error').textContent = 'Hostname is required';
            document.getElementById('module-hostname-error').classList.remove('hidden');
            isValid = false;
        }

        if (!isValid) {
            return;
        }

        // Add module to config
        if (!systemConfig.mcu_modules) {
            systemConfig.mcu_modules = [];
        }

        systemConfig.mcu_modules.push({
            type: moduleType,
            name: moduleName,
            hostname: moduleHostname
        });

        // Re-render step 2 to show the new module
        this.renderStep(2);
    },

    deleteModule(index) {
        if (!systemConfig.mcu_modules) return;

        systemConfig.mcu_modules.splice(index, 1);
        this.renderStep(2);
    },

    setupListeners() {
        const nextBtn = document.getElementById('wizard-next-btn');
        const backBtn = document.getElementById('wizard-back-btn');

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.handleNext());
        }

        if (backBtn) {
            backBtn.addEventListener('click', () => this.handleBack());
        }
    },

    async handleNext() {
        if (currentStep === 1) {
            // Validate step 1
            if (!this.validateStep1()) {
                return;
            }
            // Move to step 2
            this.renderStep(2);
        } else if (currentStep === 2) {
            // Move to step 3 (no validation needed - modules are optional)
            this.renderStep(3);
        } else if (currentStep === 3) {
            // Complete wizard
            await this.completeWizard();
        }
    },

    handleBack() {
        if (currentStep > 1) {
            this.renderStep(currentStep - 1);
        }
    },

    validateStep1() {
        const cloudUrlInput = document.getElementById('cloud-url');
        const cloudUrlError = document.getElementById('cloud-url-error');
        const wifiSsidInput = document.getElementById('wizard-wifi-ssid');
        const wifiPasswordInput = document.getElementById('wizard-wifi-password');
        const wifiSsidError = document.getElementById('wizard-wifi-ssid-error');
        const wifiPasswordError = document.getElementById('wizard-wifi-password-error');

        // Clear previous errors
        cloudUrlError.classList.add('hidden');
        wifiSsidError.classList.add('hidden');
        wifiPasswordError.classList.add('hidden');

        // If cloud is enabled, URL must be provided and valid
        if (systemConfig.cloud_enabled) {
            const url = cloudUrlInput.value.trim();

            if (!url) {
                cloudUrlError.textContent = 'Cloud service URL is required when cloud is enabled';
                cloudUrlError.classList.remove('hidden');
                cloudUrlInput.focus();
                return false;
            }

            // Basic URL validation
            try {
                new URL(url);
            } catch (e) {
                cloudUrlError.textContent = 'Please enter a valid URL (e.g., https://cloud.example.com)';
                cloudUrlError.classList.remove('hidden');
                cloudUrlInput.focus();
                return false;
            }

            systemConfig.cloud_url = url;
        } else {
            systemConfig.cloud_url = '';
        }

        // WiFi validation: if password is provided, SSID must be provided
        const wifiSsid = wifiSsidInput.value.trim();
        const wifiPassword = wifiPasswordInput.value;

        if (wifiPassword && !wifiSsid) {
            wifiSsidError.textContent = 'WiFi SSID is required when a password is provided';
            wifiSsidError.classList.remove('hidden');
            wifiSsidInput.focus();
            return false;
        }

        // Update config
        systemConfig.wifi_ssid = wifiSsid;
        systemConfig.wifi_password = wifiPassword;

        return true;
    },

    async completeWizard() {
        const nextBtn = document.getElementById('wizard-next-btn');
        nextBtn.disabled = true;
        nextBtn.textContent = 'Completing...';

        try {
            // Save configuration
            await API.updateSystemConfig({
                wizard_completed: true,
                cloud_enabled: systemConfig.cloud_enabled,
                cloud_url: systemConfig.cloud_url,
                mcu_modules: systemConfig.mcu_modules || [],
                wifi_ssid: systemConfig.wifi_ssid || '',
                wifi_password: systemConfig.wifi_password || ''
            });

            // Dispatch event to notify app that wizard is complete
            window.dispatchEvent(new CustomEvent('wizardCompleted', {
                detail: { config: systemConfig }
            }));
        } catch (error) {
            console.error('Failed to save system config:', error);
            nextBtn.disabled = false;
            nextBtn.textContent = 'Complete Setup';
            alert('Failed to save configuration: ' + error.message);
        }
    },

    cleanup() {
        systemConfig = null;
        currentStep = 1;
    }
};
