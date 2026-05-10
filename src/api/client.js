import 'dotenv/config';
import { colorize, error as uiError } from '../utils/ui.js';
import { hasBrowserPage, fetchViaBrowser } from './browser-client.js';

const BASE_URL = 'https://mentari.unpam.ac.id/api';

/**
 * Fungsi inti untuk melakukan request ke API Mentari.
 * Otomatis pakai Puppeteer browser kalau tersedia (bypass CF),
 * fallback ke Node.js fetch kalau tidak ada.
 */
export async function fetchMentari(endpoint, method = 'GET', payload = null) {
    try {
        // Prioritas: pakai browser Puppeteer kalau ada (CF bypass)
        if (hasBrowserPage()) {
            return await fetchViaBrowser(endpoint, method, payload);
        }

        // Fallback: Node.js fetch biasa
        return await fetchNode(endpoint, method, payload);

    } catch (err) {
        const msg = err.message || '';
        if (!msg.includes('403')) {
            console.log('');
            console.log(uiError(`[API ERROR] ${msg}`));
            console.log('');
        }
        throw err;
    }
}

async function fetchNode(endpoint, method, payload) {
    const ua = process.env.BROWSER_UA ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';

    const headers = {
        'Authorization': `Bearer ${process.env.BEARER_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': ua,
    };

    if (process.env.ALL_COOKIES) {
        headers['Cookie'] = process.env.ALL_COOKIES;
    } else if (process.env.CF_CLEARANCE) {
        headers['Cookie'] = `cf_clearance=${process.env.CF_CLEARANCE}`;
    }

    const options = { method, headers };
    if (payload) options.body = JSON.stringify(payload);

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    if (!response.ok) {
        let serverMsg = '';
        try { const b = await response.json(); serverMsg = b.message ? ` — ${b.message}` : ''; } catch {}
        throw new Error(`HTTP Error: ${response.status}${serverMsg} pada ${endpoint}`);
    }
    return await response.json();
}
