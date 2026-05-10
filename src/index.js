import { fetchMentari } from './api/client.js';
import { scanTugasPending } from './services/scanner.js';
import { runAutoPilot, runPreTest, runForum, runPostTest, runKuesioner, discoverEndpoints } from './services/autopilot.js';
import { startAuthServer } from './services/auth.js';
import { setupGemini, switchModel } from './services/gemini.js';
import { chatWithAI, resetConversation } from './services/chat.js';
import inquirer from 'inquirer';
import 'dotenv/config';
import { header, section, success, error, warning, info, logo, mainMenu, displayStep, SYMBOLS, colorize, bold, separator, statusBox, chatBubble, drawBox } from './utils/ui.js';

// ─── Global left padding untuk semua output ───────────────────────────────────
const PAD = '  ';
const _origLog = console.log.bind(console);
console.log = (...args) => {
    if (args.length === 0) return _origLog();
    const first = args[0];
    if (typeof first === 'string') {
        // Tambah PAD di setiap baris supaya multiline box tetap rapi
        args[0] = first.split('\n').map(line => line.length > 0 ? PAD + line : line).join('\n');
    }
    _origLog(...args);
};

async function checkConnection(silent = false) {
    try {
        const response = await fetchMentari(`/user-course?page=1&limit=12&t=${Date.now()}`);
        return response && response.data !== undefined ? response.data : null;
    } catch (err) {
        if (!silent) console.log(error(`Koneksi gagal: ${err.message}`));
        return null;
    }
}

async function authenticate() {
    try {
        console.log(info('Menguji koneksi ke LMS Mentari...'));
        
        let coursesData = await checkConnection(true);

        if (!coursesData) {
            console.log(error('Token/Cookie tidak valid atau sudah expired.'));
            try {
                console.log(info('Memulai proses autentikasi...'));
                await startAuthServer();
                
                console.log(info('Menghubungkan ulang...'));
                coursesData = await checkConnection(true);
                
                if (!coursesData) throw new Error("Token baru masih ditolak oleh Cloudflare.");
                
            } catch (err) {
                console.log(error(`Autentikasi Gagal: ${err.message}`));
                return null;
            }
        }

        console.log(success('Koneksi berhasil!'));
        return coursesData;
    } catch (err) {
        console.log(error(`Error autentikasi: ${err.message}`));
        return null;
    }
}

async function showMainMenu(coursesData) {
    const courseChoices = coursesData.map((course) => ({
        name: course.coursename,
        value: { kode: course.kode_course, nama: course.coursename }
    }));

    const answer = await inquirer.prompt([
        {
            type: 'list',
            name: 'menu',
            message: colorize('Pilih aksi:', 'orange'),
            choices: [
                { name: colorize(`${SYMBOLS.bullet} Scan Tugas Pending`, 'orange'), value: '1' },
                { name: colorize(`${SYMBOLS.bullet} Auto-Pilot Eksekusi`, 'orange'), value: '2' },
                { name: colorize(`${SYMBOLS.bullet} Chat Bot Asisten AI`, 'orange'), value: '3' },
                { name: colorize(`${SYMBOLS.bullet} Ganti Model AI`, 'orange'), value: '5' },
                { name: colorize(`${SYMBOLS.bullet} Keluar dari CLI`, 'orange'), value: '4' }
            ]
        }
    ]);

    if (answer.menu === '1') {
        try {
            await scanTugasPending();
            console.log(success('Scan tugas selesai.'));
        } catch (err) {
            console.log(error(`Scan gagal: ${err.message}`));
        }
        return 'continue';
    } else if (answer.menu === '2') {
        return await handleAutoPilot(courseChoices);
    } else if (answer.menu === '3') {
        return await handleChatBot();
    } else if (answer.menu === '5') {
        await switchModel(inquirer);
        return 'continue';
    } else if (answer.menu === '4') {
        return 'exit';
    }

    return 'continue';
}

async function handleAutoPilot(courseChoices) {
    try {
        console.log('');

        // ── Pilih mata kuliah & pertemuan ──
        const { selectedCourse, pertemuanKe } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedCourse',
                message: colorize('Pilih Mata Kuliah:', 'orange'),
                choices: courseChoices,
                pageSize: 12,
            },
            {
                type: 'input',
                name: 'pertemuanKe',
                message: colorize('Pertemuan ke berapa? (contoh: 5)', 'orange'),
                validate: (v) => !isNaN(v) && v.trim() !== '' ? true : 'Masukkan angka yang valid!',
            },
        ]);

        const { kode: kodeCourse, nama: namaMataKuliah } = selectedCourse;

        // ── Sub-menu tahap ──
        while (true) {
            console.log('');
            console.log(drawBox(`AUTO-PILOT  •  ${namaMataKuliah}`, [
                `  ${colorize(`Pertemuan ${pertemuanKe}`, 'gray')}`,
                `  ${colorize('Pilih tahap yang ingin dieksekusi:', 'gray')}`,
            ], 'orange'));
            console.log('');

            const { tahap } = await inquirer.prompt([{
                type: 'list',
                name: 'tahap',
                message: colorize('Pilih tahap:', 'orange'),
                choices: [
                    { name: colorize(`${SYMBOLS.bullet} [1] Pre-Test`, 'orange'),              value: '1' },
                    { name: colorize(`${SYMBOLS.bullet} [2] Forum Diskusi`, 'orange'),          value: '2' },
                    { name: colorize(`${SYMBOLS.bullet} [3] Post-Test`, 'orange'),              value: '3' },
                    { name: colorize(`${SYMBOLS.bullet} [4] Kuesioner / Absensi`, 'orange'),    value: '4' },
                    new inquirer.Separator(colorize('─'.repeat(40), 'gray')),
                    { name: colorize(`${SYMBOLS.process} Eksekusi Semua Tahap Sekaligus`, 'orange'), value: 'all' },
                    new inquirer.Separator(colorize('─'.repeat(40), 'gray')),
                    { name: colorize(`${SYMBOLS.info} Discovery Mode (cari endpoint API)`, 'cyan'), value: 'discover' },
                    new inquirer.Separator(colorize('─'.repeat(40), 'gray')),
                    { name: colorize(`${SYMBOLS.corner} Kembali ke Menu Utama`, 'gray'),        value: 'back' },
                ],
            }]);

            if (tahap === 'back') break;

            if (tahap === '1')        await runPreTest(kodeCourse, namaMataKuliah, pertemuanKe);
            if (tahap === '2')        await runForum(kodeCourse, namaMataKuliah, pertemuanKe);
            if (tahap === '3')        await runPostTest(kodeCourse, namaMataKuliah, pertemuanKe);
            if (tahap === '4')        await runKuesioner(kodeCourse, namaMataKuliah, pertemuanKe);
            if (tahap === 'all')      await runAutoPilot(kodeCourse, namaMataKuliah, pertemuanKe);
            if (tahap === 'discover') await discoverEndpoints(kodeCourse, pertemuanKe);
        }

    } catch (err) {
        console.log(error(`Auto-Pilot Error: ${err.message}`));
    }
    return 'continue';
}

async function handleChatBot() {
    const activeModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    console.log('');
    console.log(drawBox('CHAT BOT ASISTEN AI', [
        `  Model  : ${bold(colorize(activeModel, 'orange'))}`,
        `  ${colorize('ketik "/model" untuk ganti model  •  "keluar" untuk kembali', 'gray')}`,
    ], 'orange'));
    console.log('');
    resetConversation();

    while (true) {
        const userInput = await inquirer.prompt([
            {
                type: 'input',
                name: 'message',
                message: colorize('❯', 'orange'),
                prefix: '',
            }
        ]);

        const msg = userInput.message.trim();
        if (!msg) continue;

        if (msg.toLowerCase() === 'keluar') {
            console.log('');
            console.log(success('Kembali ke menu utama.'));
            console.log('');
            return 'continue';
        }

        if (msg.toLowerCase() === '/model') {
            console.log('');
            await switchModel(inquirer);
            const newModel = process.env.GEMINI_MODEL;
            console.log('');
            console.log(drawBox('CHAT BOT ASISTEN AI', [
                `  Model  : ${bold(colorize(newModel, 'orange'))}`,
                `  ${colorize('Percakapan direset karena ganti model.', 'gray')}`,
            ], 'orange'));
            console.log('');
            resetConversation();
            continue;
        }

        // Tampilkan bubble user
        console.log('');
        console.log(chatBubble('user', msg));
        console.log('');

        // Tampilkan indikator loading
        process.stdout.write('  ' + colorize('⟳ Sedang merespon...', 'gray'));

        const response = await chatWithAI(msg);

        // Hapus baris loading
        process.stdout.write('\r\x1b[K');

        if (response) {
            console.log(chatBubble('bot', response));
            console.log('');
        } else {
            console.log(chatBubble('system', 'Bot tidak dapat merespon. Coba lagi atau ganti model dengan /model'));
            console.log('');
        }
    }
}

async function main() {
    console.clear();
    console.log(logo());
    console.log('');

    // Setup Gemini API Key (sekali saja, validasi otomatis jika sudah ada)
    await setupGemini();

    let coursesData = await authenticate();
    
    if (!coursesData) {
        console.log(error('Gagal terhubung. Silakan cek koneksi atau token Anda.'));
        process.exit(1);
    }

    console.log(success('Siap digunakan!'));
    console.log('');

    // Loop infinite seperti Claude Code
    while (true) {
        try {
            console.log(mainMenu());
            console.log('');
            const action = await showMainMenu(coursesData);
            
            if (action === 'exit') {
                console.log(`\n${separator()}`);
                console.log(colorize('Terima kasih telah menggunakan Mentari CLI!', 'orange'));
                console.log(colorize('Sampai jumpa lagi!', 'orange'));
                console.log(`${separator()}\n`);
                process.exit(0);
            }

            // Re-authenticate jika koneksi tidak stabil
            if (action === 'continue') {
                const stillConnected = await checkConnection(true);
                if (!stillConnected) {
                    coursesData = await authenticate();
                    if (!coursesData) {
                        console.log(error('Koneksi hilang. Silakan mulai ulang aplikasi.'));
                        process.exit(1);
                    }
                }
            }
        } catch (err) {
            console.log(error(`Terjadi kesalahan: ${err.message}`));
            console.log(info('Kembali ke menu utama...\n'));
            // Loop berlanjut ke menu utama
        }
    }
}

main().catch(err => {
    console.log(error(`Fatal Error: ${err.message}`));
    process.exit(1);
});