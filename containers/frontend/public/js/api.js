// API communication module
const API_BASE = '/api';

// Auth token storage
class AuthStore {
    static TOKEN_KEY = 'rv_auth_token';
    static USER_KEY = 'rv_auth_user';

    static getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    static setToken(token) {
        localStorage.setItem(this.TOKEN_KEY, token);
    }

    static getUser() {
        const user = localStorage.getItem(this.USER_KEY);
        return user ? JSON.parse(user) : null;
    }

    static setUser(user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }

    static clear() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
    }

    static isAuthenticated() {
        return !!this.getToken();
    }
}

class API {
    static async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const token = AuthStore.getToken();
        const apiKey = this.getApiKey();

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...(apiKey ? { 'Authorization': apiKey } : {})
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                // Handle auth errors
                if (response.status === 401) {
                    AuthStore.clear();
                    this.clearApiKey();
                    window.dispatchEvent(new CustomEvent('authRequired'));
                }
                throw new Error(data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    // Auth
    static async login(username, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        AuthStore.setToken(data.token);
        AuthStore.setUser(data.user);

        return data;
    }

    static async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } finally {
            AuthStore.clear();
        }
    }

    static async checkAuth() {
        if (!AuthStore.getToken()) {
            return { authenticated: false };
        }

        try {
            const data = await this.request('/auth/check');
            if (data.authenticated) {
                AuthStore.setUser(data.user);
            }
            return data;
        } catch (error) {
            AuthStore.clear();
            return { authenticated: false };
        }
    }

    static isAuthenticated() {
        return AuthStore.isAuthenticated();
    }

    static getUser() {
        return AuthStore.getUser();
    }

    static async changePassword(currentPassword, newPassword) {
        return this.request('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });
    }

    // API Keys
    static async getApiKeys() {
        return this.request('/auth/api-keys');
    }

    static async createApiKey(name) {
        return this.request('/auth/api-keys', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
    }

    static async deleteApiKey(id) {
        return this.request(`/auth/api-keys/${id}`, {
            method: 'DELETE'
        });
    }

    // API key storage
    static setApiKey(key) {
        localStorage.setItem('rv_api_key', key);
    }

    static getApiKey() {
        return localStorage.getItem('rv_api_key');
    }

    static clearApiKey() {
        localStorage.removeItem('rv_api_key');
    }

    // Thermostat
    static async getThermostat() {
        return this.request('/thermostat');
    }

    static async setThermostat(data) {
        return this.request('/thermostat', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // Lights
    static async getLights() {
        return this.request('/lights');
    }

    static async setLight(id, state, brightness = null) {
        const body = { state };
        if (brightness !== null) {
            body.brightness = brightness;
        }
        return this.request(`/lights/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    static async setLightBrightness(id, brightness) {
        // Send brightness change with current state (keeps light on)
        return this.request(`/lights/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ state: 1, brightness })
        });
    }

    static async setAllLights(state) {
        return this.request('/lights/all', {
            method: 'PUT',
            body: JSON.stringify({ state })
        });
    }

    // Trailer
    static async getTrailerLevel() {
        return this.request('/trailer/level');
    }

    // Energy
    static async getEnergy() {
        return this.request('/energy');
    }

    // Water tanks
    static async getWater() {
        return this.request('/water');
    }

    // Air quality
    static async getAirQuality() {
        return this.request('/airquality');
    }

    // Settings
    static async getSettings() {
        return this.request('/settings');
    }

    static async setSettings(data) {
        return this.request('/settings', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // System Configuration
    static async getSystemConfig() {
        return this.request('/system-config');
    }

    static async updateSystemConfig(data) {
        return this.request('/system-config', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    static async resetConfiguration() {
        return this.request('/system-config/reset', {
            method: 'POST'
        });
    }

    // Modules
    static async getModules() {
        return this.request('/modules');
    }

    static async getModuleTypes() {
        return this.request('/modules/types');
    }

    static async createModule(data) {
        return this.request('/modules', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async updateModule(id, data) {
        return this.request(`/modules/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    static async deleteModule(id) {
        return this.request(`/modules/${id}`, {
            method: 'DELETE'
        });
    }

    // Health check
    static async healthCheck() {
        return this.request('/health');
    }

    // OTA trigger
    static async triggerOta(hostname) {
        return this.request('/ota/trigger', {
            method: 'POST',
            body: JSON.stringify({ hostname })
        });
    }
}

// WebSocket connection for real-time updates
class WebSocketClient {
    constructor() {
        this.ws = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;
        this.isConnected = false;
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.emit('connection', { status: 'connected' });
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.isConnected = false;
                this.emit('connection', { status: 'disconnected' });
                this.attemptReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.emit('connection', { status: 'error' });
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.emit(message.type, message.data);
                } catch (error) {
                    console.error('WebSocket message parse error:', error);
                }
            };
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.attemptReconnect();
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        setTimeout(() => this.connect(), delay);
    }

    on(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type).push(callback);
    }

    off(type, callback) {
        if (this.listeners.has(type)) {
            const callbacks = this.listeners.get(type);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(type, data) {
        if (this.listeners.has(type)) {
            this.listeners.get(type).forEach(callback => callback(data));
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// Export singleton instances
export { API, AuthStore };
export const wsClient = new WebSocketClient();
