import { fetchMentari } from './api/client.js';
import { scanTugasPending } from './services/scanner.js';
import { runAutoPilot } from './services/autopilot.js';
import { startAuthServer } from './services/auth.js';
import { chatWithAI, resetConversation } from './services/chat.js';
import inquirer from 'inquirer';
import 'dotenv/config';
import { header, section, success, error, warning, info, logo, mainMenu, displayStep, SYMBOLS, colorize, bold, separator, statusBox } from './utils/ui.js';

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
    } else if (answer.menu === '4') {
        return 'exit';
    }

    return 'continue';
}

async function handleAutoPilot(courseChoices) {
    try {
        console.log('');
        const inputAutoPilot = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedCourse',
                message: colorize('Pilih Mata Kuliah:', 'orange'),
                choices: courseChoices
            },
            {
                type: 'input',
                name: 'pertemuanKe',
                message: colorize('Masukkan Pertemuan Ke Berapa? (Contoh: 5)', 'orange'),
                validate: (input) => !isNaN(input) && input.trim() !== '' ? true : 'Harap masukkan angka yang valid!'
            }
        ]);
        
        await runAutoPilot(
            inputAutoPilot.selectedCourse.kode, 
            inputAutoPilot.selectedCourse.nama, 
            inputAutoPilot.pertemuanKe
        );
        console.log(success('Auto-Pilot selesai.'));
    } catch (err) {
        console.log(error(`Auto-Pilot Error: ${err.message}`));
    }
    return 'continue';
}

async function handleChatBot() {
    console.log('\n' + separator());
    console.log(statusBox('CHAT BOT ASISTEN AI', ''));
    console.log(separator());
    console.log(info('Ketik "keluar" untuk kembali ke menu utama\n'));
    resetConversation();

    while (true) {
        const userInput = await inquirer.prompt([
            {
                type: 'input',
                name: 'message',
                message: colorize('Anda', 'orange')
            }
        ]);

        if (userInput.message.toLowerCase() === 'keluar') {
            console.log(success('Kembali ke menu utama.\n'));
            return 'continue';
        }

        console.log(info('Bot sedang merespon...'));
        const response = await chatWithAI(userInput.message);
        
        if (response) {
            console.log(`${colorize('Bot', 'orange')}: ${response}\n`);
        } else {
            console.log(error('Bot tidak dapat merespon. Silakan coba lagi.\n'));
        }
    }
}

async function main() {
    console.clear();
    console.log(logo());
    console.log('');

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