import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { colorize, bold, drawBox, success as uiSuccess, info, warning, SYMBOLS } from '../utils/ui.js';
import { setBrowserPage } from '../api/browser-client.js';

const MENTARI_URL = 'https://mentari.unpam.ac.id';

// ─── Login via Puppeteer ──────────────────────────────────────────────────────
async function loginViaBrowser() {
    let puppeteer;
    try {
        const extra   = await import('puppeteer-extra');
        const stealth = await import('puppeteer-extra-plugin-stealth');
        extra.default.use(stealth.default());
        puppeteer = extra.default;
    } catch {
        return null;
    }

    console.log(info('Membuka browser... Silakan login seperti biasa.'));
    console.log(colorize('  (Browser akan tetap terbuka di background setelah login)', 'gray'));
    console.log('');

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: [
                '--start-maximized',
                '--no-sandbox',
                '--disable-blink-features=AutomationControlled',
            ],
            ignoreDefaultArgs: ['--enable-automation'],
        });

        const page = (await browser.pages())[0] || await browser.newPage();

        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });

        await page.goto(MENTARI_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log(info('Browser terbuka. Silakan login...'));

        // Tunggu token — race antara network intercept dan localStorage polling
        const token = await Promise.race([
            // Cara 1: intercept Authorization header dari network request
            new Promise((resolve) => {
                page.on('request', async (req) => {
                    try {
                        const auth = req.headers()['authorization'];
                        if (auth && auth.startsWith('Bearer ') && auth.length > 60) {
                            const bearer = auth.replace('Bearer ', '').trim();
                            const cookies = await page.cookies();
                            const cf = cookies.find(c => c.name === 'cf_clearance')?.value || '';
                            resolve({ bearer, cf, page });
                        }
                    } catch {}
                });
            }),

            // Cara 2: polling localStorage
            new Promise((resolve) => {
                const interval = setInterval(async () => {
                    try {
                        const result = await page.evaluate(() => {
                            for (const store of [localStorage, sessionStorage]) {
                                for (const key of Object.keys(store)) {
                                    try {
                                        const val = store.getItem(key);
                                        if (!val) continue;
                                        try {
                                            const obj = JSON.parse(val);
                                            for (const t of [obj?.token, obj?.access_token, obj?.accessToken, obj?.data?.token]) {
                                                if (t && typeof t === 'string' && t.startsWith('eyJ') && t.length > 50)
                                                    return { bearer: t };
                                            }
                                        } catch {
                                            if (val.startsWith('eyJ') && val.length > 50) return { bearer: val };
                                        }
                                    } catch {}
                                }
                            }
                            return null;
                        });

                        if (result?.bearer) {
                            clearInterval(interval);
                            const cookies = await page.cookies();
                            const cf = cookies.find(c => c.name === 'cf_clearance')?.value || '';
                            resolve({ bearer: result.bearer, cf, page });
                        }
                    } catch {}
                }, 2000);

                setTimeout(() => { clearInterval(interval); resolve(null); }, 300000);
            }),
        ]);

        if (token?.page) {
            // Simpan page instance — JANGAN tutup browser
            setBrowserPage(token.page);
            return { bearer: token.bearer, cf: token.cf };
        }

        await browser.close();
        return null;

    } catch (err) {
        try { await browser?.close(); } catch {}
        console.log(warning(`Browser error: ${err.message.substring(0, 80)}`));
        return null;
    }
}

// ─── Main auth flow ───────────────────────────────────────────────────────────
export async function startAuthServer() {
    console.log('');
    console.log(drawBox('AUTENTIKASI MENTARI CLI', [
        `  ${SYMBOLS.process} Browser akan terbuka otomatis`,
        `  ${SYMBOLS.process} Login dengan NIM dan password seperti biasa`,
        `  ${SYMBOLS.process} CLI otomatis mendeteksi token — tidak perlu copy-paste`,
        `  ${colorize('Browser tetap terbuka di background untuk bypass Cloudflare', 'green')}`,
    ], 'orange'));
    console.log('');

    const result = await loginViaBrowser();

    if (result?.bearer) {
        const cleanBearer = result.bearer.replace(/^Bearer\s+/i, '').trim();
        const cleanCf     = (result.cf || '').trim();
        updateEnvFile(cleanBearer, cleanCf);
        return { bearerToken: cleanBearer, cfClearance: cleanCf };
    }

    console.log(warning('Login otomatis gagal. Beralih ke input manual.'));
    return await inputManual();
}

// ─── Input manual (fallback) ──────────────────────────────────────────────────
async function inputManual() {
    console.log('');
    console.log(drawBox('INPUT TOKEN MANUAL', [
        '  1. Buka mentari.unpam.ac.id di browser',
        '  2. Login, lalu buka F12 → Network',
        '  3. Klik request apapun ke mentari.unpam.ac.id',
        '  4. Copy nilai Authorization (tanpa kata "Bearer")',
        '  5. Copy nilai cookie cf_clearance',
    ], 'orange'));
    console.log('');

    try {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'bearer',
                message: colorize('Paste BEARER_TOKEN:', 'orange'),
                validate: v => v.trim() !== '' ? true : 'Token tidak boleh kosong!'
            },
            {
                type: 'input',
                name: 'cf',
                message: colorize('Paste CF_CLEARANCE (Enter untuk skip):', 'orange'),
            }
        ]);

        const cleanBearer = answers.bearer.replace(/^Bearer\s+/i, '').trim();
        const cleanCf     = answers.cf.trim();
        console.log('');
        updateEnvFile(cleanBearer, cleanCf);
        return { bearerToken: cleanBearer, cfClearance: cleanCf };
    } catch {
        throw new Error('Input token dibatalkan.');
    }
}

// ─── Simpan ke .env ───────────────────────────────────────────────────────────
function updateEnvFile(bearer, cf) {
    const envPath = path.resolve(process.cwd(), '.env');
    let content   = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    const set = (key, value) => {
        if (!value) return;
        const re = new RegExp(`^${key}=.*$`, 'm');
        if (re.test(content)) {
            content = content.replace(re, `${key}=${value}`);
        } else {
            content = content.trimEnd() + `\n${key}=${value}`;
        }
    };

    set('BEARER_TOKEN', bearer);
    set('CF_CLEARANCE', cf);

    fs.writeFileSync(envPath, content.trim() + '\n');
    process.env.BEARER_TOKEN = bearer;
    if (cf) process.env.CF_CLEARANCE = cf;

    console.log(uiSuccess('Token berhasil diterapkan!'));
    console.log('');
}
