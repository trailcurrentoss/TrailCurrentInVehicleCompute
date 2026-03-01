// Curated SVG icon set for PDM channel configuration
// All icons use viewBox="0 0 24 24", stroke="currentColor", stroke-width="2"

export const PDM_ICONS = {
    'lightbulb': {
        label: 'Light Bulb',
        svg: (filled) => `<svg class="light-icon" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M9 18h6M10 22h4M12 2v1M4.22 4.22l.71.71M1 12h1M4.22 19.78l.71-.71M12 23v-1M18.36 4.93l.71-.71M23 12h-1M18.36 19.07l.71.71"/>
            <path d="M15 9A3 3 0 0 0 9 9a5.5 5.5 0 0 0 1 7h4a5.5 5.5 0 0 0 1-7z"/>
        </svg>`
    },
    'ceiling-light': {
        label: 'Ceiling Light',
        svg: (filled) => `<svg class="light-icon" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4"/>
            <path d="M6 10l12 0c0 0 1 0 1 1l-2 6H7L5 11c0-1 1-1 1-1z"/>
            <path d="M9 20h6M10 22h4"/>
        </svg>`
    },
    'exterior-light': {
        label: 'Exterior Light',
        svg: (filled) => `<svg class="light-icon" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M18 2H6v6l3 4v2h6v-2l3-4V2z"/>
            <path d="M9 18h6M10 22h4"/>
            <path d="M12 2v1"/>
        </svg>`
    },
    'strip-light': {
        label: 'LED Strip',
        svg: (filled) => `<svg class="light-icon" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <rect x="2" y="9" width="20" height="6" rx="2"/>
            <circle cx="6" cy="12" r="1" fill="currentColor"/>
            <circle cx="10" cy="12" r="1" fill="currentColor"/>
            <circle cx="14" cy="12" r="1" fill="currentColor"/>
            <circle cx="18" cy="12" r="1" fill="currentColor"/>
        </svg>`
    },
    'water-pump': {
        label: 'Water Pump',
        svg: (filled) => `<svg class="light-icon" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="6"/>
            <path d="M12 6v-4M12 22v-4"/>
            <path d="M12 12l4-3M12 12l-2 4M12 12l-2-1"/>
        </svg>`
    },
    'fan': {
        label: 'Fan',
        svg: (filled) => `<svg class="light-icon" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="2"/>
            <path d="M12 10C12 6 14 2 17 2c2 0 3 2 1 4s-4 4-6 4"/>
            <path d="M14 12c4 0 8 2 8 5 0 2-2 3-4 1s-4-4-4-6"/>
            <path d="M12 14c0 4-2 8-5 8-2 0-3-2-1-4s4-4 6-4"/>
            <path d="M10 12c-4 0-8-2-8-5 0-2 2-3 4-1s4 4 4 6"/>
        </svg>`
    },
    'heater': {
        label: 'Heater',
        svg: (filled) => `<svg class="light-icon" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <rect x="4" y="10" width="16" height="10" rx="2"/>
            <path d="M8 4c0 2 2 2 2 4M12 4c0 2 2 2 2 4M16 4c0 2 2 2 2 4"/>
        </svg>`
    },
    'power-outlet': {
        label: 'Power Outlet',
        svg: (filled) => `<svg class="light-icon" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <rect x="4" y="4" width="16" height="16" rx="3"/>
            <line x1="9" y1="9" x2="9" y2="12"/>
            <line x1="15" y1="9" x2="15" y2="12"/>
            <path d="M10 15h4"/>
        </svg>`
    },
    'fridge': {
        label: 'Refrigerator',
        svg: (filled) => `<svg class="light-icon" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <rect x="5" y="2" width="14" height="20" rx="2"/>
            <line x1="5" y1="10" x2="19" y2="10"/>
            <line x1="16" y1="5" x2="16" y2="8"/>
            <line x1="16" y1="13" x2="16" y2="17"/>
        </svg>`
    },
    'awning': {
        label: 'Awning',
        svg: (filled) => `<svg class="light-icon" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M3 4h18v2l-3 5H6L3 6V4z"/>
            <line x1="6" y1="11" x2="6" y2="20"/>
            <line x1="18" y1="11" x2="18" y2="20"/>
        </svg>`
    },
    'step': {
        label: 'Entry Step',
        svg: (filled) => `<svg class="light-icon" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M2 18h8v4h12v-8h-8v-4H6v4H2v4z"/>
        </svg>`
    },
    'lock': {
        label: 'Door Lock',
        svg: (filled) => `<svg class="light-icon" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <rect x="5" y="11" width="14" height="10" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            <circle cx="12" cy="16" r="1" fill="currentColor"/>
        </svg>`
    },
    'antenna': {
        label: 'Antenna',
        svg: (filled) => `<svg class="light-icon" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M12 10V22"/>
            <path d="M6 6l6 4 6-4"/>
            <path d="M4 2l8 8 8-8"/>
        </svg>`
    },
    'speaker': {
        label: 'Speaker',
        svg: (filled) => `<svg class="light-icon" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M11 5L6 9H2v6h4l5 4V5z"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>`
    },
    'generic': {
        label: 'Generic Device',
        svg: (filled) => `<svg class="light-icon" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
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
 * @param {boolean} filled - Whether to show the filled (on) version
 * @returns {string} SVG markup string
 */
export function getIconSvg(iconKey, filled = false) {
    const icon = PDM_ICONS[iconKey] || PDM_ICONS['lightbulb'];
    return icon.svg(filled);
}
