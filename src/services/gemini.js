import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { colorize, success, error, info, warning, bold, SYMBOLS, drawBox } from '../utils/ui.js';

const ENV_PATH = path.resolve(process.cwd(), '.env');

// ─── Fetch model dari API (selalu fresh) ─────────────────────────────────────

async function fetchAvailableModels(apiKey) {
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`);
        const data = await res.json();
        if (data.error) return null;
        return data.models
            .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
            .map(m => m.name.replace('models/', ''));
    } catch {
        return null;
    }
}

// ─── Baca/tulis .env ──────────────────────────────────────────────────────────

function readEnv() {
    if (!fs.existsSync(ENV_PATH)) return {};
    const lines = fs.readFileSync(ENV_PATH, 'utf8').split('\n');
    const result = {};
    for (const line of lines) {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) result[match[1].trim()] = match[2].trim();
    }
    return result;
}

function writeEnvKey(key, value) {
    let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
    } else {
        content = content.trimEnd() + `\n${key}=${value}\n`;
    }
    fs.writeFileSync(ENV_PATH, content);
    process.env[key] = value;
}

// ─── Deteksi model terbaik yang tersedia ─────────────────────────────────────

async function detectBestModel(apiKey) {
    // Prioritas model untuk auto-detect (urutan dari terbaik ke fallback)
    const PRIORITY = [
        'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite',
        'gemini-2.0-flash', 'gemini-2.0-flash-001',
        'gemini-2.0-flash-lite', 'gemini-2.0-flash-lite-001',
        'gemini-flash-latest', 'gemini-pro-latest',
    ];

    // Ambil daftar model yang benar-benar tersedia dari API
    const available = await fetchAvailableModels(apiKey);
    const candidates = available
        ? [...PRIORITY.filter(m => available.includes(m)), ...available.filter(m => !PRIORITY.includes(m))]
        : PRIORITY;

    for (const modelName of candidates) {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });
            const result = await model.generateContent('hi');
            result.response.text();
            return { modelName, apiVersion: 'v1beta' };
        } catch (e) {
            const msg = e.message || '';
            if (msg.includes('429')) return { modelName, apiVersion: 'v1beta' };
            if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) return null;
        }
    }
    return null;
}

// ─── Validasi key yang sudah tersimpan ───────────────────────────────────────

async function validateSavedKey(apiKey) {
    try {
        return await detectBestModel(apiKey); // null kalau semua model gagal
    } catch {
        return null;
    }
}

// ─── Setup utama (dipanggil dari index.js) ───────────────────────────────────

export async function setupGemini() {
    const env = readEnv();
    const savedKey        = env.GEMINI_API_KEY    || process.env.GEMINI_API_KEY;
    const savedModel      = env.GEMINI_MODEL      || process.env.GEMINI_MODEL;
    const savedApiVersion = env.GEMINI_API_VERSION || process.env.GEMINI_API_VERSION;

    // Kalau sudah ada key, validasi dulu
    if (savedKey) {
        console.log(info('Memeriksa Gemini API Key tersimpan...'));
        const detected = await validateSavedKey(savedKey);

        if (detected) {
            const activeModel      = savedModel      || detected.modelName;
            const activeApiVersion = savedApiVersion || detected.apiVersion;

            // Simpan jika belum tersimpan
            if (!savedModel)      writeEnvKey('GEMINI_MODEL',       activeModel);
            if (!savedApiVersion) writeEnvKey('GEMINI_API_VERSION', activeApiVersion);

            process.env.GEMINI_API_KEY    = savedKey;
            process.env.GEMINI_MODEL      = activeModel;
            process.env.GEMINI_API_VERSION = activeApiVersion;

            console.log(success(`Valid! Model aktif: ${bold(colorize(activeModel, 'orange'))}`));
            return { apiKey: savedKey, model: activeModel, apiVersion: activeApiVersion };
        }

        // Key tidak valid / semua model gagal
        console.log('');
        console.log(warning('Gemini API Key tidak valid atau semua model tidak tersedia.'));
    }

    // Minta input key baru
    return await promptGeminiKey();
}

async function promptGeminiKey() {
    console.log('');
    console.log(drawBox('SETUP GEMINI API KEY', [
        '  Dapatkan API Key gratis di:',
        `  ${bold(colorize('https://aistudio.google.com/app/apikey', 'orange'))}`,
        '  Key hanya perlu dimasukkan sekali dan disimpan otomatis.',
    ], 'orange'));
    console.log('');

    while (true) {
        const { apiKey } = await inquirer.prompt([
            {
                type: 'password',
                name: 'apiKey',
                message: colorize(`${SYMBOLS.arrow} Masukkan Gemini API Key:`, 'orange'),
                mask: '*',
                validate: input => input.trim() !== '' ? true : 'API Key tidak boleh kosong!'
            }
        ]);

        const cleanKey = apiKey.trim();
        console.log(info('Mendeteksi model yang tersedia...'));

        const detected = await detectBestModel(cleanKey);

        if (detected) {
            writeEnvKey('GEMINI_API_KEY',    cleanKey);
            writeEnvKey('GEMINI_MODEL',      detected.modelName);
            writeEnvKey('GEMINI_API_VERSION', detected.apiVersion);

            process.env.GEMINI_API_KEY     = cleanKey;
            process.env.GEMINI_MODEL       = detected.modelName;
            process.env.GEMINI_API_VERSION = detected.apiVersion;

            console.log(success(`API Key valid! Model terdeteksi: ${bold(colorize(detected.modelName, 'orange'))}`));
            console.log('');
            return { apiKey: cleanKey, model: detected.modelName, apiVersion: detected.apiVersion };
        }

        console.log(error('API Key tidak valid atau tidak ada model yang tersedia. Coba lagi.'));
        console.log('');
    }
}

// ─── Getter untuk dipakai modul lain ─────────────────────────────────────────

export function getGeminiModel() {
    const apiKey     = process.env.GEMINI_API_KEY;
    const modelName  = process.env.GEMINI_MODEL      || 'gemini-1.5-flash';
    const apiVersion = process.env.GEMINI_API_VERSION || 'v1beta';

    if (!apiKey) throw new Error('Gemini API Key belum dikonfigurasi. Jalankan ulang aplikasi.');

    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: modelName }, { apiVersion });
}

export function getActiveModelName() {
    return process.env.GEMINI_MODEL || 'gemini-1.5-flash';
}

/**
 * Tampilkan daftar model dan biarkan user pilih manual.
 * Return modelName yang dipilih, atau null jika batal.
 */
export async function switchModel(inquirerInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    console.log(info('Mengambil daftar model dari Gemini API...'));

    const availableModels = await fetchAvailableModels(apiKey);
    if (!availableModels || availableModels.length === 0) {
        console.log(error('Gagal mengambil daftar model. Periksa koneksi internet.'));
        return null;
    }

    console.log(info(`Ditemukan ${bold(colorize(String(availableModels.length), 'orange'))} model. Mengecek status quota...\n`));

    // Cek status tiap model secara paralel (lebih cepat)
    const statusResults = await Promise.all(
        availableModels.map(async (modelName) => {
            // Tentukan apiVersion: model lama pakai v1, sisanya v1beta
            const apiVersion = 'v1beta';
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion });
                await model.generateContent('hi');
                return { modelName, apiVersion, status: 'ok' };
            } catch (e) {
                const msg = e.message || '';
                if (msg.includes('429')) return { modelName, apiVersion, status: '429' };
                if (msg.includes('400') && msg.includes('not supported')) return { modelName, apiVersion, status: 'unsupported' };
                return { modelName, apiVersion, status: 'error', msg: msg.substring(0, 60) };
            }
        })
    );

    // Filter hanya yang bisa dipakai (ok atau 429 — key valid)
    const usable = statusResults.filter(m => m.status === 'ok' || m.status === '429');

    if (usable.length === 0) {
        console.log(error('Tidak ada model yang dapat digunakan saat ini.'));
        return null;
    }

    const currentModel = process.env.GEMINI_MODEL;

    const choices = usable.map(m => {
        const isCurrent = m.modelName === currentModel;
        const statusTag = m.status === 'ok'
            ? colorize('● tersedia', 'green')
            : colorize('⚠ quota habis', 'yellow');
        const currentTag = isCurrent ? colorize(' ← aktif', 'cyan') : '';
        return {
            name: `${bold(m.modelName)}  ${statusTag}${currentTag}`,
            value: m,
        };
    });

    choices.push({ name: colorize('↩ Batal', 'gray'), value: null });

    const { chosen } = await inquirerInstance.prompt([{
        type: 'list',
        name: 'chosen',
        message: colorize('Pilih model AI:', 'orange'),
        choices,
        pageSize: 15,
    }]);

    if (!chosen) {
        console.log(info('Dibatalkan.'));
        return null;
    }

    process.env.GEMINI_MODEL       = chosen.modelName;
    process.env.GEMINI_API_VERSION = chosen.apiVersion;
    writeEnvKey('GEMINI_MODEL',       chosen.modelName);
    writeEnvKey('GEMINI_API_VERSION', chosen.apiVersion);

    console.log('');
    console.log(success(`Model diubah ke: ${bold(colorize(chosen.modelName, 'orange'))}`));
    return chosen.modelName;
}
export async function fallbackToNextModel() {
    const apiKey       = process.env.GEMINI_API_KEY;
    const currentModel = process.env.GEMINI_MODEL;

    const available = await fetchAvailableModels(apiKey);
    if (!available) return null;

    const currentIdx = available.indexOf(currentModel);
    const remaining  = currentIdx >= 0 ? available.slice(currentIdx + 1) : available;

    for (const modelName of remaining) {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });
            const result = await model.generateContent('hi');
            result.response.text();
            process.env.GEMINI_MODEL       = modelName;
            process.env.GEMINI_API_VERSION = 'v1beta';
            writeEnvKey('GEMINI_MODEL',       modelName);
            writeEnvKey('GEMINI_API_VERSION', 'v1beta');
            return modelName;
        } catch (e) {
            const msg = e.message || '';
            if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) return null;
            // 429 atau tidak support → coba berikutnya
        }
    }
    return null;
}
