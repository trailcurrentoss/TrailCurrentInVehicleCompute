// Curated SVG icon set for PDM channel configuration
// Solid filled silhouette style (Font Awesome-like)
// Icons always render as solid fills — button CSS handles on/off state
// pointer-events:none ensures clicks pass through to parent button

export const PDM_ICONS = {
    'lightbulb': {
        label: 'Light Bulb',
        svg: () => `<svg class="light-icon" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zM9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z"/>
        </svg>`
    },
    'ceiling-light': {
        label: 'Ceiling Light',
        svg: () => `<svg class="light-icon" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none">
            <path d="M12 2c-.55 0-1 .45-1 1v2H11C7.69 5 5 7 5 9.5L7 17h10l2-7.5C19 7 16.31 5 13 5h0v-2c0-.55-.45-1-1-1zM9 19h6v1c0 .55-.45 1-1 1h-4c-.55 0-1-.45-1-1v-1z"/>
        </svg>`
    },
    'exterior-light': {
        label: 'Exterior Light',
        svg: () => `<svg class="light-icon" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none">
            <path d="M6 1h2v3H6zM7 5C4.79 5 3 6.79 3 9v3c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2V9c0-2.21-1.79-4-4-4zM6 16h2v3H6zM13 6h4v1.5h-4zM13 9h3v1.5h-3zM13 12h2v1.5h-2z"/>
        </svg>`
    },
    'strip-light': {
        label: 'LED Strip',
        svg: () => `<svg class="light-icon" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none">
            <rect x="1" y="8" width="22" height="8" rx="4"/>
            <circle cx="6" cy="12" r="1.5" fill="var(--bg-primary, #1a1a2e)"/>
            <circle cx="10" cy="12" r="1.5" fill="var(--bg-primary, #1a1a2e)"/>
            <circle cx="14" cy="12" r="1.5" fill="var(--bg-primary, #1a1a2e)"/>
            <circle cx="18" cy="12" r="1.5" fill="var(--bg-primary, #1a1a2e)"/>
        </svg>`
    },
    'water-pump': {
        label: 'Water Pump',
        svg: () => `<svg class="light-icon" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none">
            <path d="M2 15c1.67-2.5 3.33-2.5 5 0s3.33 2.5 5 0 3.33-2.5 5 0 3.33 2.5 5 0"/>
            <path d="M2 19c1.67-2.5 3.33-2.5 5 0s3.33 2.5 5 0 3.33-2.5 5 0 3.33 2.5 5 0"/>
            <path d="M12 3C10.9 3 10 3.9 10 5v4H8l4 5 4-5h-2V5c0-1.1-.9-2-2-2z"/>
        </svg>`
    },
    'fan': {
        label: 'Fan',
        svg: () => `<svg class="light-icon" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none">
            <path d="M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
            <path d="M14 12c0-5-1-10-5-10-2 0-3 2-2 4 1.5 2.5 4 4.5 7 6z"/>
            <path d="M12 14c5 0 10-1 10-5 0-2-2-3-4-2-2.5 1.5-4.5 4-6 7z"/>
            <path d="M10 12c0 5 1 10 5 10 2 0 3-2 2-4-1.5-2.5-4-4.5-7-6z"/>
            <path d="M12 10c-5 0-10 1-10 5 0 2 2 3 4 2 2.5-1.5 4.5-4 6-7z"/>
        </svg>`
    },
    'heater': {
        label: 'Heater',
        svg: () => `<svg class="light-icon" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none">
            <path d="M7.5 3C7.5 3 6 4.5 6 5.5S7 7 7 7s-1.5 1-1.5 2S7 11 7 11"/>
            <path d="M12 3c0 0-1.5 1.5-1.5 2.5S12 7 12 7s-1.5 1-1.5 2S12 11 12 11"/>
            <path d="M16.5 3c0 0-1.5 1.5-1.5 2.5S16.5 7 16.5 7 15 8 15 9s1.5 2 1.5 2"/>
            <rect x="3" y="12" width="18" height="9" rx="2"/>
        </svg>`
    },
    'power-outlet': {
        label: 'Power Outlet',
        svg: () => `<svg class="light-icon" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none">
            <path d="M7 2v5H5v4c0 2.76 2.24 5 5 5v4h4v-4c2.76 0 5-2.24 5-5V7h-2V2h-3v5h-4V2H7z"/>
        </svg>`
    },
    'fridge': {
        label: 'Refrigerator',
        svg: () => `<svg class="light-icon" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none">
            <path d="M7 2C5.9 2 5 2.9 5 4v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H7zm0 2h10v6H7V4zm0 8h10v8H7v-8zm1.5-6v3H10V6H8.5zm0 8v4H10v-4H8.5z"/>
        </svg>`
    },
    'awning': {
        label: 'Awning',
        svg: () => `<svg class="light-icon" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none">
            <path d="M2 4c0-.55.45-1 1-1h18c.55 0 1 .45 1 1v1L19 12H5L2 5V4z"/>
            <rect x="4" y="13" width="2" height="8"/>
            <rect x="18" y="13" width="2" height="8"/>
        </svg>`
    },
    'step': {
        label: 'Entry Step',
        svg: () => `<svg class="light-icon" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none">
            <path d="M2 16h6V10h6V4h8v2h-6v6H10v6H4v4H2v-6z"/>
        </svg>`
    },
    'lock': {
        label: 'Door Lock',
        svg: () => `<svg class="light-icon" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm3 13c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
        </svg>`
    },
    'antenna': {
        label: 'Antenna',
        svg: () => `<svg class="light-icon" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none">
            <path d="M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
            <path d="M7 3.46a9 9 0 0 0 0 9.08l1.5-1a7 7 0 0 1 0-7.08L7 3.46z"/>
            <path d="M17 3.46l-1.5 1a7 7 0 0 1 0 7.08l1.5 1a9 9 0 0 0 0-9.08z"/>
            <path d="M4.06 1a12 12 0 0 0 0 14l1.5-1a10 10 0 0 1 0-12L4.06 1z"/>
            <path d="M19.94 1l-1.5 1a10 10 0 0 1 0 12l1.5 1a12 12 0 0 0 0-14z"/>
            <rect x="11" y="11" width="2" height="10"/>
            <rect x="8" y="21" width="8" height="2" rx="1"/>
        </svg>`
    },
    'speaker': {
        label: 'Speaker',
        svg: () => `<svg class="light-icon" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none">
            <path d="M3 9v6h4l5 5V4L7 9H3z"/>
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>`
    },
    'generic': {
        label: 'Generic Device',
        svg: () => `<svg class="light-icon" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none">
            <path d="M13 2.05v2.02c3.95.49 7 3.85 7 7.93 0 3.21-1.92 6-4.72 7.28L13 16v6h6l-2.11-2.11C19.42 17.77 21 14.9 21 12c0-5.18-3.95-9.45-8-9.95z"/>
            <path d="M11 21.95v-2.02C7.05 19.44 4 16.08 4 12c0-3.21 1.92-6 4.72-7.28L11 8V2H5l2.11 2.11C4.58 6.23 3 9.1 3 12c0 5.18 3.95 9.45 8 9.95z"/>
        </svg>`
    }
};

// List of icons for use in config UI dropdowns
export const ICON_LIST = Object.entries(PDM_ICONS).map(([key, val]) => ({
    key,
    label: val.label
}));

/**
 * Get the SVG markup for an icon
 * @param {string} iconKey - Icon key from PDM_ICONS
 * @param {boolean} filled - Whether to show the filled (on) version (kept for API compat)
 * @returns {string} SVG markup string
 */
export function getIconSvg(iconKey, filled = false) {
    const icon = PDM_ICONS[iconKey] || PDM_ICONS['lightbulb'];
    return icon.svg(filled);
}
