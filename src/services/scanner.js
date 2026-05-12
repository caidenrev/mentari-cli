import { fetchMentari } from '../api/client.js';
import { success, error, warning, info, SYMBOLS, colorize, bold, separator, drawBox } from '../utils/ui.js';

// Ekstrak jumlah SKS dari nama course, misal "[3] REKAYASA..." → 3
function getSKS(coursename) {
    const match = coursename?.match(/^\[(\d+)\]/);
    return match ? parseInt(match[1]) : null;
}

export async function scanTugasPending() {
    console.log('\n' + separator());
    console.log(drawBox('SCANNER TUGAS & ABSENSI LMS MENTARI', [
        '  Filter: Mata kuliah 3 SKS yang memiliki Forum Diskusi',
    ], 'orange'));
    console.log('');

    try {
        const timestamp = Date.now();
        const resCourses = await fetchMentari(`/user-course?page=1&limit=12&t=${timestamp}`);
        const courses = resCourses.data;

        // Filter hanya mata kuliah 3 SKS
        const filtered = courses.filter(c => getSKS(c.coursename) === 3);

        if (filtered.length === 0) {
            console.log(warning('Tidak ada mata kuliah 3 SKS yang ditemukan.'));
            return;
        }

        console.log(info(`Memindai ${bold(String(filtered.length))} mata kuliah 3 SKS...\n`));

        let totalPending = 0;

        for (const course of filtered) {
            const detailCourse = await fetchMentari(`/user-course/${course.kode_course}`);
            let printedCourseName = false;

            for (const pertemuan of detailCourse.data) {
                if (!pertemuan.sub_section) continue;

                const forum     = pertemuan.sub_section.find(s => s.kode_template === 'FORUM_DISKUSI');
                const pretest   = pertemuan.sub_section.find(s => s.kode_template === 'PRE_TEST');
                const posttest  = pertemuan.sub_section.find(s => s.kode_template === 'POST_TEST');
                const kuesioner = pertemuan.sub_section.find(s => s.kode_template === 'KUESIONER');

                // Hanya tampilkan pertemuan yang ADA forum-nya dan belum tuntas
                if (!forum) continue;

                // Cek apakah semua tahap sudah selesai
                const forumSelesai     = forum?.completion === true;
                const kuesionerSelesai = kuesioner?.completion === true;
                const pretestSelesai   = !pretest || pretest?.completion === true;
                const posttestSelesai  = !posttest || posttest?.completion === true;

                if (forumSelesai && kuesionerSelesai && pretestSelesai && posttestSelesai) continue;

                totalPending++;

                if (!printedCourseName) {
                    console.log('\n' + drawBox(
                        `MATA KULIAH: ${course.coursename}`,
                        [`  Kode: ${course.kode_course}`],
                        'orange'
                    ));
                    printedCourseName = true;
                }

                console.log(`${SYMBOLS.warning} ${bold('[PENDING]')} ${pertemuan.nama_section}`);
                console.log(`  ${SYMBOLS.corner}${SYMBOLS.bullet} Pretest   : ${pretest?.completion   ? colorize(SYMBOLS.check + ' Selesai', 'green') : colorize(SYMBOLS.cross + ' Belum', 'red')}`);
                console.log(`  ${SYMBOLS.corner}${SYMBOLS.bullet} Forum     : ${forum?.completion     ? colorize(SYMBOLS.check + ' Selesai', 'green') : colorize(SYMBOLS.cross + ' Belum / Kurang Reply', 'red')}`);
                console.log(`  ${SYMBOLS.corner}${SYMBOLS.bullet} Posttest  : ${posttest?.completion  ? colorize(SYMBOLS.check + ' Selesai', 'green') : colorize(SYMBOLS.cross + ' Belum', 'red')}`);
                console.log(`  ${SYMBOLS.corner}${SYMBOLS.bullet} Kuesioner : ${kuesioner?.completion ? colorize(SYMBOLS.check + ' Selesai', 'green') : colorize(SYMBOLS.cross + ' Belum (Absensi Belum Masuk)', 'red')}\n`);
            }
        }

        console.log(separator());
        if (totalPending === 0) {
            console.log(colorize(`\n${SYMBOLS.check} SELAMAT! Semua pertemuan di mata kuliah 3 SKS sudah AMAN.\n`, 'green'));
        } else {
            console.log(warning(`Ditemukan ${bold(String(totalPending))} pertemuan yang belum tuntas!`));
            console.log(info(`Jalankan ${bold('Auto-Pilot Eksekusi')} untuk menyelesaikannya.\n`));
        }

    } catch (err) {
        console.log(error(`Gagal melakukan proses scanning: ${err.message}`));
    }
}