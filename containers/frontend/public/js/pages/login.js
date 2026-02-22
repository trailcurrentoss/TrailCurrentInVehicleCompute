// Login page
import { API } from '../api.js';

export const loginPage = {
    render() {
        return `
            <div class="login-container">
                <div class="login-card">
                    <div class="login-header">
                        <img src="/icons/logo-white.svg" alt="TrailCurrent" class="login-logo-img app-logo-dark">
                        <img src="/icons/logo-color.svg" alt="TrailCurrent" class="login-logo-img app-logo-light">
                        <p class="login-subtitle">Sign in to continue</p>
                    </div>

                    <form id="login-form" class="login-form">
                        <div class="form-group">
                            <label for="username" class="form-label">Username</label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                class="form-input"
                                placeholder="Enter username"
                                autocomplete="username"
                                required
                            />
                        </div>

                        <div class="form-group">
                            <label for="password" class="form-label">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                class="form-input"
                                placeholder="Enter password"
                                autocomplete="current-password"
                                required
                            />
                        </div>

                        <div id="login-error" class="login-error hidden"></div>

                        <button type="submit" class="login-btn" id="login-btn">
                            <span class="login-btn-text">Sign In</span>
                            <span class="login-btn-spinner hidden"></span>
                        </button>
                    </form>

                    <div class="login-footer">
                        <p>TrailCurrent bringing software defined vehicles to <b>all</b> vehicles</p>
                    </div>
                </div>
            </div>
        `;
    },

    init() {
        const form = document.getElementById('login-form');
        const errorEl = document.getElementById('login-error');
        const submitBtn = document.getElementById('login-btn');
        const btnText = submitBtn.querySelector('.login-btn-text');
        const btnSpinner = submitBtn.querySelector('.login-btn-spinner');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            if (!username || !password) {
                this.showError('Please enter username and password');
                return;
            }

            // Show loading state
            submitBtn.disabled = true;
            btnText.classList.add('hidden');
            btnSpinner.classList.remove('hidden');
            errorEl.classList.add('hidden');

            try {
                await API.login(username, password);
                window.dispatchEvent(new CustomEvent('authSuccess'));
            } catch (error) {
                this.showError(error.message || 'Login failed');
                submitBtn.disabled = false;
                btnText.classList.remove('hidden');
                btnSpinner.classList.add('hidden');
            }
        });

        // Focus username input
        document.getElementById('username').focus();
    },

    showError(message) {
        const errorEl = document.getElementById('login-error');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
        }
    },

    cleanup() {
        // Nothing to clean up
    }
};
