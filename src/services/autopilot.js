import { fetchMentari } from '../api/client.js';
import { startAuthServer } from './auth.js';
import { getJawabanKuisAI, getJawabanForumAI } from './ai.js';
import { success, error, warning, info, displayStep, SYMBOLS, colorize, bold, separator, drawBox } from '../utils/ui.js';

// ─── Endpoints ────────────────────────────────────────────────────────────────
const ENDPOINT_QUIZ_START = '/quiz/start';   // PUT
const ENDPOINT_QUIZ_DATA  = '/quiz/soal';    // GET (harus setelah start)
const ENDPOINT_QUIZ_JAWAB = '/quiz/jawab';   // PUT
const ENDPOINT_QUIZ_END   = '/quiz/end';     // PUT
const ENDPOINT_FORUM_TOPIC = '/forum/topic'; // GET /{id_forum}
const ENDPOINT_FORUM_REPLY = '/forum/reply'; // POST (body: {id_topic, id_post, konten})

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Auto-reauth saat 403 ─────────────────────────────────────────────────────
async function fetchWithReauth(endpoint, method = 'GET', payload = null) {
    try {
        return await fetchMentari(endpoint, method, payload);
    } catch (err) {
        const msg = err.message || '';
        // Hanya reauth untuk 403 (token expired), bukan 404 atau error lain
        if (msg.includes('403')) {
            console.log('');
            console.log(warning('Token expired. Memulai re-autentikasi...'));
            await startAuthServer();
            console.log(info('Melanjutkan proses...\n'));
            return await fetchMentari(endpoint, method, payload);
        }
        throw err;
    }
}

// ─── Helper: ambil data pertemuan ────────────────────────────────────────────
export async function getPertemuanTarget(kodeCourse, pertemuanKe) {
    const detailCourse = await fetchWithReauth(`/user-course/${kodeCourse}`);
    const targetSection = `PERTEMUAN_${parseInt(pertemuanKe)}`;
    const pertemuan = detailCourse.data.find(p => p.kode_section === targetSection);
    if (!pertemuan) throw new Error(`Pertemuan Ke-${pertemuanKe} tidak ditemukan.`);
    return pertemuan;
}

// ─── Helper: print header tahap ──────────────────────────────────────────────
function printHeader(namaMataKuliah, pertemuanKe, tahap) {
    console.log('');
    console.log(drawBox(`AUTO-PILOT  •  ${tahap}`, [
        `  ${SYMBOLS.bullet} ${namaMataKuliah}`,
        `  ${colorize(`Pertemuan ${pertemuanKe}`, 'gray')}`,
    ], 'orange'));
    console.log('');
}

// ─── TAHAP 1: PRE-TEST ───────────────────────────────────────────────────────
export async function runPreTest(kodeCourse, namaMataKuliah, pertemuanKe) {
    printHeader(namaMataKuliah, pertemuanKe, 'PRE-TEST');
    try {
        const pertemuan   = await getPertemuanTarget(kodeCourse, pertemuanKe);
        const pretestModul = pertemuan.sub_section.find(s => s.kode_template === 'PRE_TEST');

        if (!pretestModul) {
            console.log(warning('PRE-TEST tidak tersedia di pertemuan ini.'));
            return;
        }
        if (pretestModul.completion) {
            console.log(success('PRE-TEST sudah selesai sebelumnya. Tidak perlu diulang.'));
            return;
        }

        await eksekusiKuis(getId(pretestModul, 'PRE-TEST'));
        console.log('');
        console.log(success('PRE-TEST berhasil diselesaikan!'));
    } catch (err) {
        console.log(error(`PRE-TEST gagal: ${err.message}`));
    }
}

// ─── TAHAP 2: FORUM DISKUSI ──────────────────────────────────────────────────
export async function runForum(kodeCourse, namaMataKuliah, pertemuanKe) {
    printHeader(namaMataKuliah, pertemuanKe, 'FORUM DISKUSI');
    try {
        const pertemuan  = await getPertemuanTarget(kodeCourse, pertemuanKe);
        const forumModul = pertemuan.sub_section.find(s => s.kode_template === 'FORUM_DISKUSI');

        if (!forumModul) {
            console.log(warning('FORUM DISKUSI tidak tersedia di pertemuan ini.'));
            return;
        }
        if (forumModul.completion) {
            console.log(success('FORUM DISKUSI sudah memenuhi syarat. Tidak perlu diulang.'));
            return;
        }

        await eksekusiForum(getId(forumModul, 'FORUM'));
        console.log('');
        console.log(success('FORUM DISKUSI (2x Reply) berhasil diselesaikan!'));
    } catch (err) {
        console.log(error(`FORUM gagal: ${err.message}`));
    }
}

// ─── TAHAP 3: POST-TEST ──────────────────────────────────────────────────────
export async function runPostTest(kodeCourse, namaMataKuliah, pertemuanKe) {
    printHeader(namaMataKuliah, pertemuanKe, 'POST-TEST');
    try {
        const pertemuan    = await getPertemuanTarget(kodeCourse, pertemuanKe);
        const posttestModul = pertemuan.sub_section.find(s => s.kode_template === 'POST_TEST');

        if (!posttestModul) {
            console.log(warning('POST-TEST tidak tersedia di pertemuan ini.'));
            return;
        }
        if (posttestModul.completion) {
            console.log(success('POST-TEST sudah selesai sebelumnya. Tidak perlu diulang.'));
            return;
        }

        await eksekusiKuis(getId(posttestModul, 'POST-TEST'));
        console.log('');
        console.log(success('POST-TEST berhasil diselesaikan!'));
    } catch (err) {
        console.log(error(`POST-TEST gagal: ${err.message}`));
    }
}

// ─── TAHAP 4: KUESIONER / ABSENSI ────────────────────────────────────────────
export async function runKuesioner(kodeCourse, namaMataKuliah, pertemuanKe) {
    printHeader(namaMataKuliah, pertemuanKe, 'KUESIONER ABSENSI');
    try {
        const pertemuan      = await getPertemuanTarget(kodeCourse, pertemuanKe);
        const kuesionerModul = pertemuan.sub_section.find(s => s.kode_template === 'KUESIONER');

        if (!kuesionerModul) {
            console.log(warning('KUESIONER tidak tersedia di pertemuan ini.'));
            return;
        }
        if (kuesionerModul.completion) {
            console.log(success('KUESIONER sudah disubmit. Absensi sudah aman.'));
            return;
        }

        const kuesionerId = getId(kuesionerModul, 'KUESIONER', true);
        await eksekusiKuesioner(kuesionerId, kodeCourse, pertemuanKe, kuesionerModul.judul);
        console.log('');
        console.log(success('KUESIONER selesai. ABSENSI TERCATAT!'));
    } catch (err) {
        console.log(error(`KUESIONER gagal: ${err.message}`));
    }
}

// ─── SEMUA TAHAP SEKALIGUS ────────────────────────────────────────────────────
export async function runAutoPilot(kodeCourse, namaMataKuliah, pertemuanKe) {
    printHeader(namaMataKuliah, pertemuanKe, 'EKSEKUSI PENUH');

    try {
        // Ambil data pertemuan sekali, cek semua modul
        const pertemuan      = await getPertemuanTarget(kodeCourse, pertemuanKe);
        const pretestModul   = pertemuan.sub_section.find(s => s.kode_template === 'PRE_TEST');
        const forumModul     = pertemuan.sub_section.find(s => s.kode_template === 'FORUM_DISKUSI');
        const posttestModul  = pertemuan.sub_section.find(s => s.kode_template === 'POST_TEST');
        const kuesionerModul = pertemuan.sub_section.find(s => s.kode_template === 'KUESIONER');

        // ── PRE-TEST ──
        console.log(displayStep('1', '4', 'PRE-TEST'));
        if (!pretestModul) {
            console.log(`   ${colorize('├─', 'orange')} ${warning('Tidak tersedia.')}\n`);
        } else if (pretestModul.completion) {
            console.log(`   ${colorize('├─', 'orange')} ${success('Sudah selesai. Dilewati.')}\n`);
        } else {
            await eksekusiKuis(getId(pretestModul, 'PRE-TEST'));
            console.log(`   ${colorize('├─', 'orange')} ${success('Selesai.')}\n`);
            await sleep(3000);
        }

        // ── FORUM ──
        console.log(displayStep('2', '4', 'FORUM DISKUSI'));
        if (!forumModul) {
            console.log(`   ${colorize('├─', 'orange')} ${warning('Tidak tersedia.')}\n`);
        } else if (forumModul.completion) {
            console.log(`   ${colorize('├─', 'orange')} ${success('Sudah memenuhi syarat. Dilewati.')}\n`);
        } else {
            await eksekusiForum(getId(forumModul, 'FORUM'));
            console.log(`   ${colorize('├─', 'orange')} ${success('2x Reply selesai.')}\n`);
            await sleep(3000);
        }

        // ── POST-TEST ──
        console.log(displayStep('3', '4', 'POST-TEST'));
        if (!posttestModul) {
            console.log(`   ${colorize('├─', 'orange')} ${warning('Tidak tersedia.')}\n`);
        } else if (posttestModul.completion) {
            console.log(`   ${colorize('├─', 'orange')} ${success('Sudah selesai. Dilewati.')}\n`);
        } else {
            await eksekusiKuis(getId(posttestModul, 'POST-TEST'));
            console.log(`   ${colorize('├─', 'orange')} ${success('Selesai.')}\n`);
            await sleep(3000);
        }

        // ── KUESIONER ──
        console.log(displayStep('4', '4', 'KUESIONER ABSENSI'));
        if (!kuesionerModul) {
            console.log(`   ${colorize('├─', 'orange')} ${warning('Tidak tersedia.')}\n`);
        } else if (kuesionerModul.completion) {
            console.log(`   ${colorize('├─', 'orange')} ${success('Sudah disubmit. Absensi aman.')}\n`);
        } else {
            const kuesionerId = getId(kuesionerModul, 'KUESIONER', true);
            await eksekusiKuesioner(kuesionerId, kodeCourse, pertemuanKe, kuesionerModul.judul);
            console.log(`   ${colorize('├─', 'orange')} ${success('Selesai. ABSENSI TERCATAT!')}\n`);
        }

        console.log(separator());
        console.log(colorize(`\n${SYMBOLS.check} SUCCESS! Seluruh rangkaian pertemuan berhasil dieksekusi.`, 'green'));
        console.log(colorize(`${SYMBOLS.check} Absensi kamu sudah AMAN!\n`, 'green'));
        console.log(separator());

    } catch (err) {
        console.log('');
        console.log(separator());
        console.log(error(`PROSES DIHENTIKAN: ${err.message}`));
        console.log(separator());
        throw err;
    }
}

// ─── Discovery: sniff network request dari browser Puppeteer ─────────────────
export async function discoverEndpoints(kodeCourse, pertemuanKe) {
    const { getBrowserPage } = await import('../api/browser-client.js');
    const page = getBrowserPage();

    if (!page) {
        console.log(error('Browser tidak aktif. Login dulu via browser otomatis.'));
        return;
    }

    const pertemuanUrl = `https://mentari.unpam.ac.id/u-courses/${kodeCourse}?accord_pertemuan=PERTEMUAN_${parseInt(pertemuanKe)}`;

    console.log('');
    console.log(drawBox('DISCOVERY MODE', [
        `  URL: ${pertemuanUrl}`,
        '  Browser akan buka halaman pertemuan.',
        '  Klik modul yang ingin di-sniff (Pretest/Kuesioner/Forum/dll)',
        '  CLI menangkap semua API request selama 90 detik.',
    ], 'orange'));
    console.log('');
    console.log(info('Membuka halaman pertemuan di browser...'));

    const capturedRequests  = [];
    const capturedResponses = [];

    const reqListener = (req) => {
        const url = req.url();
        if (url.includes('mentari.unpam.ac.id/api')) {
            const path = url.replace('https://mentari.unpam.ac.id/api', '');
            if (!path.includes('/user-course?')) {
                capturedRequests.push({
                    method:   req.method(),
                    path,
                    postData: req.postData()?.substring(0, 300) || '',
                });
            }
        }
    };

    const resListener = async (res) => {
        const url = res.url();
        if (url.includes('mentari.unpam.ac.id/api') && !url.includes('/user-course?')) {
            try {
                const body = await res.text();
                const path = url.replace('https://mentari.unpam.ac.id/api', '');
                capturedResponses.push({
                    status: res.status(),
                    method: res.request().method(),
                    path,
                    body:   body.substring(0, 500),
                });
            } catch {}
        }
    };

    page.on('request',  reqListener);
    page.on('response', resListener);

    try {
        await page.goto(pertemuanUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch {}

    console.log(success('Halaman terbuka!'));
    console.log(info('Klik modul yang ingin di-sniff di browser sekarang...'));
    console.log(colorize('  (Menunggu 90 detik — klik sebanyak yang kamu mau)', 'gray'));
    console.log('');

    await new Promise(r => setTimeout(r, 90000));

    page.off('request',  reqListener);
    page.off('response', resListener);

    if (capturedRequests.length === 0) {
        console.log(warning('Tidak ada API request tertangkap.'));
        return;
    }

    // Tampilkan request
    console.log(colorize(`─── ${capturedRequests.length} API request tertangkap ───`, 'orange'));
    for (const r of capturedRequests) {
        console.log(`  ${colorize(r.method.padEnd(6), 'orange')} ${colorize(r.path, 'green')}`);
        if (r.postData) console.log(`         ${colorize('body: ' + r.postData, 'gray')}`);
    }

    // Tampilkan response
    if (capturedResponses.length > 0) {
        console.log('');
        console.log(colorize(`─── ${capturedResponses.length} API response tertangkap ───`, 'green'));
        for (const r of capturedResponses) {
            const sc = r.status === 200 ? 'green' : 'yellow';
            console.log(`  ${colorize(r.method.padEnd(6), 'orange')} ${colorize(String(r.status), sc)} ${r.path}`);
            console.log(`         ${colorize(r.body, 'gray')}`);
        }
    }
    console.log('');
}

const getId = (modul, namaModul, allowNull = false) => {
    const id = modul.id_trx_course_sub_section || modul.id_course_sub_section || modul.id;
    if (!id && !allowNull) {
        throw new Error(`Modul ${namaModul} masih terkunci! (${modul.warningAlert || 'Prasyarat belum terpenuhi'})`);
    }
    return id;
};

async function eksekusiKuis(idModul) {
    if (!idModul) return;
    console.log(`   ${colorize('├─', 'orange')} ${info(`Memulai kuis ID: ${idModul}`)}`);

    // Step 1: PUT /quiz/start/{id} — wajib sebelum bisa GET soal
    try {
        const startRes = await fetchWithReauth(`${ENDPOINT_QUIZ_START}/${idModul}`, 'PUT', {
            id_trx_course_sub_section: idModul,
            reset: true,
        });
        console.log(`   ${colorize('├─', 'orange')} ${info(`Start: ${startRes?.message || 'OK'}`)}`);
    } catch (e) {
        const msg = e.message || '';
        if (!msg.includes('404')) {
            console.log(`   ${colorize('├─', 'orange')} ${warning(`Start warning: ${msg.substring(0, 60)}`)}`);
        }
    }

    try {
        // Step 2: GET /quiz/soal/{id} — ambil soal setelah start
        const dataKuis  = await fetchWithReauth(`${ENDPOINT_QUIZ_DATA}/${idModul}`);
        const soalArray = dataKuis.data || dataKuis;

        if (!soalArray || soalArray.length === 0) {
            console.log(`   ${colorize('├─', 'orange')} ${warning('Tidak ada soal. Kuis belum diisi dosen.')}`);
            return;
        }

        console.log(`   ${colorize('├─', 'orange')} ${info(`${soalArray.length} soal ditemukan.`)}`);

        for (let i = 0; i < soalArray.length; i++) {
            const soal            = soalArray[i];
            const deskripsiBersih = soal.deskripsi.replace(/<[^>]*>?/gm, '');
            console.log(`   ${colorize('├─', 'orange')} Soal ${i + 1}/${soalArray.length}: ${deskripsiBersih.substring(0, 55)}...`);

            const aiChoiceID = await getJawabanKuisAI(deskripsiBersih, soal.list_jawaban);
            if (aiChoiceID) {
                console.log(`   ${colorize('│  ', 'orange')} ${success(`AI memilih: ${aiChoiceID}`)}`);
                // Step 3: PUT /quiz/jawab
                await fetchWithReauth(ENDPOINT_QUIZ_JAWAB, 'PUT', {
                    id_trx_quiz_user_soal: soal.id,
                    id_jawaban: aiChoiceID,
                    jawaban: null,
                });
            } else {
                console.log(`   ${colorize('│  ', 'orange')} ${warning('AI gagal memilih jawaban.')}`);
            }
            await sleep(2000);
        }

        // Step 4: PUT /quiz/end
        console.log(`   ${colorize('├─', 'orange')} ${info('Menyelesaikan kuis...')}`);
        await fetchWithReauth(ENDPOINT_QUIZ_END, 'PUT', { id_trx_course_sub_section: idModul });

    } catch (err) {
        console.log(`   ${colorize('├─', 'orange')} ${warning(`Kuis error: ${err.message.substring(0, 70)}`)}`);
    }
}

async function eksekusiForum(idModul) {
    if (!idModul) return;

    try {
        // GET /forum/topic/{id_forum} — ambil topik diskusi
        console.log(`   ${colorize('├─', 'orange')} ${info('Mengambil topik forum...')}`);
        const forumData = await fetchWithReauth(`${ENDPOINT_FORUM_TOPIC}/${idModul}`);

        // Cari topik utama (reply_level === 0, post_type === 'TOPIC')
        const topics = forumData.topics || forumData.data || [];
        const topik  = topics.find(t => t.post_type === 'TOPIC' && t.reply_level === 0)
                    || topics[0];

        if (!topik) throw new Error('Topik forum tidak ditemukan.');

        const kontenTopik = (topik.konten || '').replace(/<[^>]*>?/gm, '');
        const idTopik     = topik.id;

        console.log(`   ${colorize('├─', 'orange')} Topik: ${colorize(kontenTopik.substring(0, 70) + '...', 'gray')}`);
        console.log(`   ${colorize('├─', 'orange')} ${info(`id_topic: ${idTopik}`)}`);
        console.log(`   ${colorize('├─', 'orange')} ${info(`id_forum (idModul): ${idModul}`)}`)

        // Balasan ke-1: id_post = id_topic
        let idPostPrev = idTopik;

        for (let i = 1; i <= 2; i++) {
            console.log(`   ${colorize('├─', 'orange')} ${info(`Membuat balasan ke-${i} via AI...`)}`);
            const instruksi = i === 1
                ? 'Berikan jawaban yang padat dan komprehensif.'
                : 'Berikan jawaban yang sedikit berbeda, tambahkan contoh praktis singkat.';

            const balasanAI = await getJawabanForumAI(kontenTopik, instruksi);
            console.log(`   ${colorize('├─', 'orange')} ${info(`Mengirim balasan ke-${i}...`)}`);

            await fetchWithReauth(ENDPOINT_FORUM_REPLY, 'POST', {
                id_topic: idTopik,
                id_post:  idPostPrev,
                judul:    `RE: ${topik.judul || 'Forum Diskusi'}`,
                konten:   balasanAI,
            });

            console.log(`   ${colorize('│  ', 'orange')} ${success(`Balasan ke-${i} terkirim.`)}`)

            if (i === 1) {
                console.log(`   ${colorize('├─', 'orange')} ${info('Jeda 5 detik...')}`);
                await sleep(5000);

                // GET /forum/reply/{id_topic} untuk dapat id reply pertama
                try {
                    const replyData = await fetchWithReauth(`${ENDPOINT_FORUM_REPLY}/${idTopik}`);
                    // Cari reply terbaru milik kita (reply_level > 0, nim tidak null)
                    const replies = replyData.topics || replyData.replies || replyData.data || [];
                    const myReply = [...replies]
                        .reverse()
                        .find(r => r.reply_level > 0 && r.nim !== null);
                    if (myReply?.id) {
                        idPostPrev = myReply.id;
                        console.log(`   ${colorize('├─', 'orange')} ${info(`id_post untuk reply ke-2: ${idPostPrev.substring(0, 8)}...`)}`);
                    }
                } catch { /* pakai idTopik sebagai fallback */ }
            }
        }
    } catch (e) {
        console.log(`   ${colorize('├─', 'orange')} ${warning(`Forum error: ${e.message.substring(0, 70)}`)}`);
    }
}

async function eksekusiKuesioner(idModul, kodeCourse, pertemuanKe, judulModul) {
    const kodeSection = `PERTEMUAN_${parseInt(pertemuanKe)}`;
    const getUrl      = `/kuesioner/${kodeCourse}/${kodeSection}`;
    let kuesionerData = [];

    try {
        console.log(`   ${colorize('├─', 'orange')} ${info('Mengambil data kuesioner...')}`);
        const res = await fetchWithReauth(getUrl, 'GET');
        if (res?.kuesioner) {
            kuesionerData = res.kuesioner;
            console.log(`   ${colorize('├─', 'orange')} ${success(`${kuesionerData.length} pertanyaan ditemukan.`)}`);
        }
    } catch (e) {
        console.log(`   ${colorize('├─', 'orange')} ${warning(`Gagal ambil data kuesioner: ${e.message.substring(0, 60)}`)}`);
        return;
    }

    if (kuesionerData.length === 0) {
        console.log(`   ${colorize('├─', 'orange')} ${warning('Tidak ada pertanyaan kuesioner.')}`);
        return;
    }

    // Payload sesuai hasil discovery — field id_kuesioner, bukan id
    const payload = {
        kode_course:  kodeCourse,
        kode_section: kodeSection,
        kuesioner:    kuesionerData.map(q => ({
            id_kuesioner: q.id,
            jawaban:      1,  // 1 = Sangat Setuju
        })),
    };

    console.log(`   ${colorize('├─', 'orange')} ${info('Mengirim jawaban kuesioner...')}`);
    try {
        const res = await fetchWithReauth('/kuesioner/submit', 'POST', payload);
        console.log(`   ${colorize('├─', 'orange')} ${success(`Submit berhasil: ${res?.message || 'OK'}`)}`);
    } catch (e) {
        const msg = e.message || '';
        // Error message dari server sudah ada di msg (format: "HTTP Error: 400 — Anda belum menyelesaikan...")
        const serverMsg = msg.match(/— (.+?) pada/)?.[1] || msg.substring(0, 80);
        console.log(`   ${colorize('├─', 'orange')} ${warning(`Submit gagal: ${serverMsg}`)}`);
    }
}
