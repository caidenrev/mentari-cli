import fs from 'fs';
import http from 'http';
import path from 'path';
import { exec } from 'child_process';
import inquirer from 'inquirer';
import { colorize, bold, drawBox, success as uiSuccess, info, warning, error as uiError, SYMBOLS } from '../utils/ui.js';
import { setBrowserPage } from '../api/browser-client.js';

const MENTARI_URL    = 'https://mentari.unpam.ac.id';
const CALLBACK_PORT  = 3847;

// ─── Deteksi environment ──────────────────────────────────────────────────────
function isAndroid() {
    return process.platform === 'linux' && (
        fs.existsSync('/data/data/com.termux') ||
        fs.existsSync('/data/data/com.termux.api') ||
        process.env.TERMUX_VERSION !== undefined ||
        process.env.PREFIX?.includes('com.termux')
    );
}

// ─── Auto-detect Chrome/Chromium di desktop ───────────────────────────────────
function findChromePath() {
    const candidates = {
        win32: [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
            `${process.env.LOCALAPPDATA}\\Chromium\\Application\\chrome.exe`,
            'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
            `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
        ],
        darwin: [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        ],
        linux: [
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/snap/bin/chromium',
            '/usr/bin/microsoft-edge',
        ],
    };
    const paths = candidates[process.platform] || candidates.linux;
    for (const p of paths) {
        if (p && fs.existsSync(p)) return p;
    }
    return null;
}

// ─── Buka URL di browser default OS ──────────────────────────────────────────
function openUrl(url) {
    const cmd = process.platform === 'win32'  ? `start "" "${url}"` :
                process.platform === 'darwin' ? `open "${url}"` :
                isAndroid()                   ? `termux-open-url "${url}"` :
                                                `xdg-open "${url}"`;
    exec(cmd, () => {});
}

// ─── Local callback server untuk Android ─────────────────────────────────────
function startCallbackServer(timeoutMs = 180000) {
    return new Promise((resolve, reject) => {

        // HTML halaman helper — user buka ini dulu, lalu klik tombol Login
        const helperPage = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mentari CLI Login</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: monospace; background: #0d1117; color: #e6edf3;
         display: flex; flex-direction: column; align-items: center;
         justify-content: center; min-height: 100vh; padding: 20px; }
  h1 { color: #ff8c00; font-size: 1.2rem; margin-bottom: 8px; }
  p  { color: #8b949e; font-size: 0.85rem; margin-bottom: 24px; text-align: center; }
  .btn { background: #ff8c00; color: #000; border: none; padding: 14px 28px;
         font-size: 1rem; font-family: monospace; border-radius: 6px;
         cursor: pointer; width: 100%; max-width: 320px; font-weight: bold; }
  .btn:active { opacity: 0.8; }
  .status { margin-top: 20px; color: #58a6ff; font-size: 0.9rem; text-align: center; }
  .success { color: #3fb950; }
  .error   { color: #f85149; }
</style>
</head>
<body>
<h1>MENTARI CLI</h1>
<p>Klik tombol di bawah untuk login ke LMS Mentari.<br>
Token akan otomatis dikirim ke CLI setelah login.</p>
<button class="btn" onclick="startLogin()">🔐 Login ke Mentari</button>
<div class="status" id="status"></div>
<script>
const CLI_PORT = ${CALLBACK_PORT};

function setStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = 'status ' + (type || '');
}

function grabToken() {
  let bearer = null, cf = null;
  for (const store of [localStorage, sessionStorage]) {
    for (const key of Object.keys(store)) {
      try {
        const val = store.getItem(key);
        if (!val) continue;
        try {
          const obj = JSON.parse(val);
          for (const t of [obj?.token, obj?.access_token, obj?.accessToken, obj?.data?.token]) {
            if (t && typeof t === 'string' && t.startsWith('eyJ') && t.length > 50) {
              bearer = t; break;
            }
          }
        } catch {
          if (val.startsWith('eyJ') && val.length > 50) bearer = val;
        }
      } catch {}
      if (bearer) break;
    }
    if (bearer) break;
  }
  for (const c of document.cookie.split(';')) {
    const [k, v] = c.trim().split('=');
    if (k === 'cf_clearance') { cf = v; break; }
  }
  return { bearer, cf };
}

function sendToken(bearer, cf) {
  fetch('http://127.0.0.1:' + CLI_PORT + '/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bearer, cf: cf || '' })
  })
  .then(r => r.json())
  .then(() => {
    setStatus('✓ Token berhasil dikirim! Kembali ke Termux.', 'success');
    document.querySelector('.btn').textContent = '✓ Selesai';
    document.querySelector('.btn').disabled = true;
  })
  .catch(() => setStatus('Gagal kirim token. Pastikan CLI masih berjalan.', 'error'));
}

function startLogin() {
  // Buka Mentari di tab baru
  const win = window.open('https://mentari.unpam.ac.id', '_blank');
  setStatus('Silakan login di tab yang terbuka...', '');

  // Poll setiap 2 detik untuk cek apakah sudah login
  const interval = setInterval(() => {
    try {
      // Cek localStorage di tab Mentari
      const { bearer } = grabToken();
      if (bearer) {
        clearInterval(interval);
        setStatus('Token ditemukan! Mengirim ke CLI...', '');
        const { cf } = grabToken();
        sendToken(bearer, cf);
        return;
      }
    } catch {}

    // Coba ambil dari tab Mentari yang terbuka
    try {
      if (win && !win.closed) {
        const ls = win.localStorage;
        for (const key of Object.keys(ls)) {
          try {
            const val = ls.getItem(key);
            if (!val) continue;
            try {
              const obj = JSON.parse(val);
              for (const t of [obj?.token, obj?.access_token, obj?.accessToken, obj?.data?.token]) {
                if (t && typeof t === 'string' && t.startsWith('eyJ') && t.length > 50) {
                  clearInterval(interval);
                  setStatus('Token ditemukan! Mengirim ke CLI...', '');
                  sendToken(t, '');
                  return;
                }
              }
            } catch {}
          } catch {}
        }
      }
    } catch {}
  }, 2000);

  // Timeout 5 menit
  setTimeout(() => {
    clearInterval(interval);
    setStatus('Timeout. Coba lagi.', 'error');
  }, 300000);
}
</script>
</body>
</html>`;

        const server = http.createServer((req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

            // Halaman helper utama
            if (req.method === 'GET' && (req.url === '/' || req.url === '/login')) {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(helperPage);
                return;
            }

            // Endpoint terima token dari browser
            if (req.method === 'POST' && req.url === '/token') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', () => {
                    try {
                        const data = JSON.parse(body);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: true }));
                        server.close();
                        clearTimeout(timer);
                        resolve(data);
                    } catch {
                        res.writeHead(400); res.end('Bad Request');
                    }
                });
                return;
            }

            res.writeHead(404); res.end();
        });

        server.listen(CALLBACK_PORT, '127.0.0.1', () => {});
        server.on('error', (e) => reject(e));

        const timer = setTimeout(() => {
            server.close();
            reject(new Error('Timeout: token tidak diterima dalam 3 menit.'));
        }, timeoutMs);
    });
}

// ─── Script yang dijalankan di Console browser untuk kirim token ──────────────
function buildConsoleScript() {
    return `(function(){let b=null,c=null;for(const k of Object.keys(localStorage)){try{const v=localStorage.getItem(k);if(!v)continue;try{const o=JSON.parse(v);for(const t of[o?.token,o?.access_token,o?.accessToken,o?.data?.token]){if(t&&t.startsWith&&t.startsWith('eyJ')&&t.length>50){b=t;break;}}}catch{if(v.startsWith('eyJ')&&v.length>50)b=v;}}catch{} if(b)break;}for(const x of document.cookie.split(';')){const[k,v]=x.trim().split('=');if(k==='cf_clearance')c=v;}if(!b){alert('Token tidak ditemukan. Coba refresh halaman dulu.');return;}fetch('http://127.0.0.1:${CALLBACK_PORT}/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bearer:b,cf:c||''})}).then(()=>alert('✓ Token berhasil! Kembali ke Termux.')).catch(()=>alert('Gagal kirim token.'));})();`;
}

// ─── Login via Puppeteer (Desktop) ───────────────────────────────────────────
async function loginViaBrowser() {
    let puppeteer;
    try {
        const extra   = await import('puppeteer-extra');
        const stealth = await import('puppeteer-extra-plugin-stealth');
        extra.default.use(stealth.default());
        puppeteer = extra.default;
    } catch { return null; }

    const chromePath = findChromePath();
    if (!chromePath) {
        console.log(warning('Chrome/Edge tidak ditemukan.'));
        return null;
    }

    console.log(info(`Browser: ${chromePath}`));
    console.log(info('Membuka browser... Silakan login seperti biasa.'));
    console.log('');

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            executablePath: chromePath,
            defaultViewport: null,
            args: ['--start-maximized', '--no-sandbox', '--disable-blink-features=AutomationControlled'],
            ignoreDefaultArgs: ['--enable-automation'],
        });

        const page = (await browser.pages())[0] || await browser.newPage();
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });

        await page.goto(MENTARI_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log(info('Browser terbuka. Silakan login...'));

        const token = await Promise.race([
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

// ─── Login via Callback Server (Android/Termux) ───────────────────────────────
async function loginViaCallback() {
    const helperUrl = `http://127.0.0.1:${CALLBACK_PORT}/login`;

    console.log('');
    console.log(drawBox('LOGIN VIA CHROME ANDROID', [
        `  ${SYMBOLS.process} Halaman login akan terbuka di Chrome`,
        `  ${SYMBOLS.process} Klik tombol "Login ke Mentari"`,
        `  ${SYMBOLS.process} Login dengan NIM dan password`,
        `  ${SYMBOLS.process} Token otomatis terkirim ke CLI`,
        `  ${colorize('Tidak perlu copy-paste apapun!', 'green')}`,
    ], 'orange'));
    console.log('');

    // Start server dulu sebelum buka browser
    const tokenPromise = startCallbackServer().catch(() => null);

    // Buka halaman helper di Chrome Android
    const helperUrlDisplay = `http://127.0.0.1:${CALLBACK_PORT}/login`;
    console.log(info('Membuka halaman login...'));
    console.log('');
    console.log(colorize(`  URL: ${bold(colorize(helperUrlDisplay, 'orange'))}`, 'gray'));
    console.log('');

    openUrl(helperUrl);

    console.log(info('Menunggu token dari browser... (timeout 3 menit)'));
    console.log(warning('Ketik "manual" jika ingin input token manual.'));
    console.log('');

    const { input } = await inquirer.prompt([{
        type: 'input',
        name: 'input',
        message: colorize('Tekan Enter untuk tunggu, atau ketik "manual":', 'orange'),
    }]);

    if (input.trim().toLowerCase() === 'manual') return null;

    const result = await tokenPromise;
    return result;
}

// ─── Main auth flow ───────────────────────────────────────────────────────────
export async function startAuthServer() {
    console.log('');

    const android = isAndroid();

    if (android) {
        // Flow Android/Termux
        console.log(drawBox('AUTENTIKASI MENTARI CLI', [
            `  ${SYMBOLS.process} Mode: Android / Termux`,
            `  ${SYMBOLS.process} Login via Chrome Android`,
            `  ${SYMBOLS.process} Token ditangkap otomatis via localhost`,
        ], 'orange'));
        console.log('');

        const result = await loginViaCallback();
        if (result?.bearer) {
            const cleanBearer = result.bearer.replace(/^Bearer\s+/i, '').trim();
            const cleanCf     = (result.cf || '').trim();
            updateEnvFile(cleanBearer, cleanCf);
            return { bearerToken: cleanBearer, cfClearance: cleanCf };
        }

    } else {
        // Flow Desktop — Puppeteer
        console.log(drawBox('AUTENTIKASI MENTARI CLI', [
            `  ${SYMBOLS.process} Browser akan terbuka otomatis`,
            `  ${SYMBOLS.process} Login dengan NIM dan password seperti biasa`,
            `  ${SYMBOLS.process} CLI otomatis mendeteksi token setelah login`,
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
