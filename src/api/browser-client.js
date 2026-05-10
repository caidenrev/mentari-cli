/**
 * Browser-based API client.
 * Semua request dijalankan dari dalam Puppeteer page supaya CF clearance valid.
 */

const BASE_URL = 'https://mentari.unpam.ac.id/api';

// Singleton page instance — diset oleh auth.js setelah login
let _page = null;

export function setBrowserPage(page) {
    _page = page;
}

export function getBrowserPage() {
    return _page;
}

export function hasBrowserPage() {
    return _page !== null;
}

/**
 * Jalankan fetch dari dalam browser Puppeteer.
 * Ini bypass CF karena request keluar dari browser yang sudah solve challenge.
 */
export async function fetchViaBrowser(endpoint, method = 'GET', payload = null, bearerToken = null) {
    if (!_page) throw new Error('Browser page belum diinisialisasi.');

    const token = bearerToken || process.env.BEARER_TOKEN;
    const url   = `${BASE_URL}${endpoint}`;

    const result = await _page.evaluate(async (url, method, payload, token) => {
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        const options = { method, headers };
        if (payload) options.body = JSON.stringify(payload);

        try {
            const res = await fetch(url, options);
            const text = await res.text();
            return { ok: res.ok, status: res.status, body: text };
        } catch (e) {
            return { ok: false, status: 0, body: e.message };
        }
    }, url, method, payload, token);

    if (!result.ok) {
        // Parse server message dari body kalau ada
        let serverMsg = '';
        try {
            const body = JSON.parse(result.body);
            if (body.message) serverMsg = ` — ${body.message}`;
        } catch {}
        throw new Error(`HTTP Error: ${result.status}${serverMsg} pada ${endpoint}`);
    }

    try {
        return JSON.parse(result.body);
    } catch {
        throw new Error(`Response bukan JSON dari ${endpoint}`);
    }
}
