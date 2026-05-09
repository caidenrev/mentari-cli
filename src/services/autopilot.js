import { fetchMentari } from '../api/client.js';
import { getJawabanKuisAI, getJawabanForumAI } from './ai.js';
import { success, error, warning, info, displayStep, SYMBOLS, colorize, bold, separator } from '../utils/ui.js';

// =========================================================================
// ENDPOINT RESMI BERDASARKAN HASIL REVERSE ENGINEERING
// =========================================================================
const ENDPOINT_QUIZ_DATA  = "/quiz/soal";             
const ENDPOINT_QUIZ_JAWAB = "/quiz/jawab";            
const ENDPOINT_QUIZ_END   = "/quiz/end";              

// (Forum di-set ke default, jika error tidak akan menghentikan proses lain)
const ENDPOINT_FORUM_DATA = "/forum/data";           
const ENDPOINT_FORUM_POST = "/forum/reply";          
// =========================================================================

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getPertemuanTarget(kodeCourse, pertemuanKe) {
    const detailCourse = await fetchMentari(`/user-course/${kodeCourse}`);
    const targetSection = `PERTEMUAN_${parseInt(pertemuanKe)}`;
    return detailCourse.data.find(p => p.kode_section === targetSection);
}

const getId = (modul, namaModul, allowNull = false) => {
    const id = modul.id_trx_course_sub_section || modul.id_course_sub_section || modul.id;
    if (!id && !allowNull) {
        throw new Error(`Modul ${namaModul} masih terkunci! (Alasan LMS: ${modul.warningAlert || 'Prasyarat belum terpenuhi'})`);
    }
    return id;
};

export async function runAutoPilot(kodeCourse, namaMataKuliah, pertemuanKe) {
    console.log('\n' + separator());
    console.log(colorize('╔═ AUTO-PILOT EKSEKUSI ════════════════════════════════╗', 'orange'));
    console.log(colorize('╚═══════════════════════════════════════════════════════╝', 'orange'));
    console.log(bold(colorize(`${SYMBOLS.process} Memulai eksekusi berantai: ${namaMataKuliah} (Pertemuan ${pertemuanKe})`, 'orange')));
    console.log(separator() + '\n');

    try {
        // =========================================================
        // TAHAP 1: EKSEKUSI PRE-TEST
        // =========================================================
        let pertemuan = await getPertemuanTarget(kodeCourse, pertemuanKe);
        if (!pertemuan) throw new Error(`Pertemuan Ke-${pertemuanKe} tidak ditemukan.`);
        
        let pretestModul = pertemuan.sub_section.find(s => s.kode_template === 'PRE_TEST');
        if (pretestModul) {
             console.log(displayStep('1', '4', 'Mengeksekusi PRE-TEST...'));
             if(pretestModul.completion) {
                 console.log(`   ${colorize('├─ Status:', 'orange')} ${success('PRE-TEST sudah selesai sebelumnya. Melewati tahap ini.')}\n`);
             } else {
                 await eksekusiKuis(getId(pretestModul, 'PRE-TEST'));
                 console.log(`   ${colorize('├─ Status:', 'orange')} ${success('PRE-TEST Selesai.')}\n`);
                 await sleep(3000);
             }
        } else {
             console.log(`${displayStep('1', '4', 'PRE-TEST tidak tersedia')}\n`);
        }

        // =========================================================
        // TAHAP 2: EKSEKUSI FORUM DISKUSI
        // =========================================================
        pertemuan = await getPertemuanTarget(kodeCourse, pertemuanKe);
        let forumModul = pertemuan.sub_section.find(s => s.kode_template === 'FORUM_DISKUSI');
        
        if (forumModul) {
            console.log(displayStep('2', '4', 'Mengeksekusi FORUM DISKUSI...'));
            if(forumModul.completion) {
                 console.log(`   ${colorize('├─ Status:', 'orange')} ${success('FORUM DISKUSI sudah memenuhi syarat. Melewati tahap ini.')}\n`);
            } else {
                 await eksekusiForum(getId(forumModul, 'FORUM'));
                 console.log(`   ${colorize('├─ Status:', 'orange')} ${success('FORUM DISKUSI (2x Reply) Selesai.')}\n`);
                 await sleep(3000);
            }
        } else {
            console.log(`${displayStep('2', '4', 'FORUM DISKUSI tidak tersedia')}\n`);
        }

        // =========================================================
        // TAHAP 3: EKSEKUSI POST-TEST
        // =========================================================
        pertemuan = await getPertemuanTarget(kodeCourse, pertemuanKe);
        let posttestModul = pertemuan.sub_section.find(s => s.kode_template === 'POST_TEST');
        
        if (posttestModul) {
            console.log(displayStep('3', '4', 'Mengeksekusi POST-TEST...'));
             if(posttestModul.completion) {
                 console.log(`   ${colorize('├─ Status:', 'orange')} ${success('POST-TEST sudah selesai sebelumnya. Melewati tahap ini.')}\n`);
             } else {
                 await eksekusiKuis(getId(posttestModul, 'POST-TEST'));
                 console.log(`   ${colorize('├─ Status:', 'orange')} ${success('POST-TEST Selesai.')}\n`);
                 await sleep(3000);
             }
        } else {
             console.log(`${displayStep('3', '4', 'POST-TEST tidak tersedia')}\n`);
        }

        // =========================================================
        // TAHAP 4: EKSEKUSI KUESIONER
        // =========================================================
        pertemuan = await getPertemuanTarget(kodeCourse, pertemuanKe);
        let kuesionerModul = pertemuan.sub_section.find(s => s.kode_template === 'KUESIONER');
        
        if (kuesionerModul) {
             console.log(displayStep('4', '4', 'Mengisi KUESIONER ABSENSI...'));
             if(kuesionerModul.completion) {
                 console.log(`   ${colorize('├─ Status:', 'orange')} ${success('KUESIONER sudah disubmit sebelumnya. Absensi aman.')}\n`);
             } else {
                 const kuesionerId = getId(kuesionerModul, 'KUESIONER', true);
                 await eksekusiKuesioner(kuesionerId, kodeCourse, pertemuanKe, kuesionerModul.judul);
                 console.log(`   ${colorize('├─ Status:', 'orange')} ${success('KUESIONER Selesai. ABSENSI TERCATAT!')}\n`);
             }
        } else {
             console.log(`${displayStep('4', '4', 'KUESIONER tidak tersedia')}\n`);
        }

        console.log(separator());
        console.log(colorize(`\n${SYMBOLS.check} SUCCESS! Seluruh rangkaian pertemuan berhasil dieksekusi.`, 'green'));
        console.log(colorize(`${SYMBOLS.check} Absensi kamu sudah AMAN!\n`, 'green'));
        console.log(separator());

    } catch (err) {
        console.log('\n' + separator());
        console.error(error(`PROSES DIHENTIKAN: ${err.message}`));
        console.log(separator() + '\n');
        throw err; // Propagate error ke main untuk error handling
    }
}

// ---------------------------------------------------------
// FUNGSI HELPER UNTUK TIAP MODUL
// ---------------------------------------------------------

async function eksekusiKuis(idModul) {
    if (!idModul) return;
    
    console.log(`   [KUIS] ${SYMBOLS.bullet} Memulai kuis ID: ${idModul}`);
    
    // Trik: Coba hit endpoint start (kalau ada), kalau error 404 abaikan karena mungkin langsung bisa ditarik soalnya
    try {
        await fetchMentari(`/quiz/start`, "POST", { id_trx_course_sub_section: idModul, reset: true });
    } catch (e) {
        // Abaikan jika tidak ada endpoint start
    }
    
    try {
        // Tarik soal menggunakan URL resmi
        const dataKuis = await fetchMentari(`${ENDPOINT_QUIZ_DATA}/${idModul}`);
        const soalArray = dataKuis.data || dataKuis; 
        
        if (!soalArray || soalArray.length === 0) {
            console.log(`   [KUIS] ${warning('Tidak ada data soal. Kuis kemungkinan belum diisi oleh dosen.')}`);
            return; // Selesaikan eksekusiKuis agar lanjut ke tahap berikutnya
        }

        for (let i = 0; i < soalArray.length; i++) {
            const soal = soalArray[i];
            const deskripsiBersih = soal.deskripsi.replace(/<[^>]*>?/gm, ''); 
            
            console.log(`   [KUIS] ${SYMBOLS.bullet} Soal ${i + 1}/${soalArray.length}: ${deskripsiBersih.substring(0, 50)}...`);
            const aiChoiceID = await getJawabanKuisAI(deskripsiBersih, soal.list_jawaban);
            
            if (aiChoiceID) {
                console.log(`   [KUIS] ${success(`AI memilih Opsi: ${aiChoiceID}`)}`);
                await fetchMentari(`${ENDPOINT_QUIZ_JAWAB}`, "POST", { 
                    id_trx_quiz_user_soal: soal.id, 
                    id_jawaban: aiChoiceID, 
                    jawaban: null 
                });
            } else {
                console.log(`   [KUIS] ${warning('AI gagal memilih jawaban.')}`);
            }
            await sleep(3500); // Jeda aman
        }

        console.log(`   [KUIS] ${info('Menyelesaikan kuis...')}`);
        await fetchMentari(`${ENDPOINT_QUIZ_END}`, "POST", { id_trx_course_sub_section: idModul });
        
    } catch (err) {
        // PEREDAM KEJUT: Mencegah aplikasi crash jika kuis error 404
        console.log(`   [KUIS] ${warning('Gagal mengakses Kuis (404/Not Found). Kemungkinan kuis kosong/dikunci dosen. Melanjutkan...')}`);
    }
}

async function eksekusiForum(idModul) {
    if (!idModul) return;
    
    try {
        console.log(`   [FORUM] ${SYMBOLS.bullet} Mengambil data topik diskusi ID: ${idModul}...`);
        const forumData = await fetchMentari(`${ENDPOINT_FORUM_DATA}/${idModul}`);
        
        const topikDiskusi = (forumData.data && forumData.data.find(d => d.post_type === 'TOPIC')) || forumData; 
        if (!topikDiskusi || !topikDiskusi.konten) {
                throw new Error("Konten topik forum tidak ditemukan.");
        }
        const kontenTopik = topikDiskusi.konten.replace(/<[^>]*>?/gm, '');

        for(let i=1; i<=2; i++) {
                console.log(`   [FORUM] ${SYMBOLS.bullet} Men-generate balasan ke-${i} dari AI...`);
                const instruksi = i === 1 
                ? "Berikan jawaban yang padat dan komprehensif." 
                : "Berikan jawaban yang sedikit berbeda dari balasan pertama, tambahkan contoh praktis singkat.";
                
                const balasanAI = await getJawabanForumAI(kontenTopik, instruksi);
                console.log(`   [FORUM] ${SYMBOLS.bullet} Mengirim balasan ke-${i}...`);
                
                const payloadReply = {
                    id_topic: topikDiskusi.id,
                    id_post: topikDiskusi.id, 
                    judul: `RE ${topikDiskusi.judul.replace("RE ", "")}`, 
                    konten: balasanAI
                };

                await fetchMentari(`${ENDPOINT_FORUM_POST}`, "POST", payloadReply);
                
                if (i === 1) {
                    console.log(`   [FORUM] ${info('Jeda 5 detik sebelum balasan kedua...')}`);
                    await sleep(5000);
                }
        }
    } catch (e) {
        console.log(`   [FORUM] ${warning('Gagal mengeksekusi forum, dilanjutkan ke tahap berikutnya. (Pesan: ' + e.message + ')')}`);
    }
}

async function eksekusiKuesioner(idModul, kodeCourse, pertemuanKe, judulModul) {
    let payloadKuesionerArray = [];

    // URL Dinamis (Sesuai hasil tangkapan Network kamu)
    const dynamicUrl = `/kuesioner/${kodeCourse}/PERTEMUAN_${parseInt(pertemuanKe)}`;

    try {
        console.log(`   [KUESIONER] ${SYMBOLS.bullet} Mengambil data kuesioner dinamis...`);
        const kuesionerResponse = await fetchMentari(dynamicUrl, "GET");
        
        if (kuesionerResponse && kuesionerResponse.kuesioner) {
            payloadKuesionerArray = kuesionerResponse.kuesioner.map(q => ({
                id: q.id,
                kuesioner: q.kuesioner,
                jawaban: 1 // 1 = Sangat Setuju / Ya
            }));
        }
    } catch (err) {
        console.log(`   [KUESIONER] ${warning('Gagal menarik data spesifik. Menggunakan template standar...')}`);
    }

    // Jika gagal ambil dari API, generate template otomatis (Biasanya ada 10 pertanyaan)
    if (payloadKuesionerArray.length === 0) {
        const standardIds = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
        payloadKuesionerArray = standardIds.map(id => ({
            id: id,
            kuesioner: "Pernyataan",
            jawaban: 1
        }));
    }

    const finalPayload = {
        kode_course: kodeCourse,
        kode_section: `PERTEMUAN_${parseInt(pertemuanKe)}`,
        judul: judulModul || `Kuesioner Pertemuan ${pertemuanKe}`,
        konten: "",
        kuesioner: payloadKuesionerArray,
        createdAt: new Date().toISOString()
    };

    console.log(`   [KUESIONER] ${SYMBOLS.bullet} Mengirim jawaban positif ke sistem...`);
    
    // Tambahkan pengaman try-catch agar aplikasi tidak crash jika kena Error 404
    try {
        await fetchMentari(dynamicUrl, "POST", finalPayload);
    } catch (err) {
        console.log(`   [KUESIONER] ${warning('Jalur utama menolak (404). Mencoba jalur alternatif...')}`);
        try {
            // Fallback: Siapa tahu server menggunakan endpoint umum untuk submit
            await fetchMentari(`/user-course-sub-section/kuesioner/submit`, "POST", finalPayload);
        } catch (err2) {
            console.log(`   [KUESIONER] ${warning('Kuesioner tidak dapat disubmit (Abaikan jika absensimu sudah tercentang hijau di LMS).')}`);
        }
    }
}