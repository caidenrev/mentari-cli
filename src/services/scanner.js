import { fetchMentari } from '../api/client.js';
import { success, error, warning, info, SYMBOLS, colorize, bold, separator, drawBox } from '../utils/ui.js';

export async function scanTugasPending() {
    console.log('\n' + separator());
    console.log(drawBox('SCANNER TUGAS & ABSENSI LMS MENTARI', [], 'orange'));
    console.log(info('Sedang memindai seluruh Mata Kuliah... (Ini mungkin memakan waktu beberapa detik)\n'));

    try {
        const timestamp = Date.now();
        const resCourses = await fetchMentari(`/user-course?page=1&limit=12&t=${timestamp}`);
        const courses = resCourses.data;

        let totalPending = 0;

        for (const course of courses) {
            const detailCourse = await fetchMentari(`/user-course/${course.kode_course}`);
            let printedCourseName = false;

            for (const pertemuan of detailCourse.data) {
                if (!pertemuan.sub_section) continue;

                const pretest   = pertemuan.sub_section.find(s => s.kode_template === 'PRE_TEST');
                const forum     = pertemuan.sub_section.find(s => s.kode_template === 'FORUM_DISKUSI');
                const posttest  = pertemuan.sub_section.find(s => s.kode_template === 'POST_TEST');
                const kuesioner = pertemuan.sub_section.find(s => s.kode_template === 'KUESIONER');

                if (forum && kuesioner && kuesioner.completion === false) {
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
                    console.log(`  ${SYMBOLS.corner}${SYMBOLS.bullet} Pretest   : ${pretest?.completion   ? colorize(SYMBOLS.check + ' Selesai', 'green')              : colorize(SYMBOLS.cross + ' Belum', 'red')}`);
                    console.log(`  ${SYMBOLS.corner}${SYMBOLS.bullet} Forum     : ${forum?.completion     ? colorize(SYMBOLS.check + ' Selesai', 'green')              : colorize(SYMBOLS.cross + ' Belum / Kurang Reply', 'red')}`);
                    console.log(`  ${SYMBOLS.corner}${SYMBOLS.bullet} Posttest  : ${posttest?.completion  ? colorize(SYMBOLS.check + ' Selesai', 'green')              : colorize(SYMBOLS.cross + ' Belum', 'red')}`);
                    console.log(`  ${SYMBOLS.corner}${SYMBOLS.bullet} Kuesioner : ${colorize(SYMBOLS.cross + ' Belum (Absensi Belum Masuk)', 'red')}\n`);
                }
            }
        }

        console.log(separator());
        if (totalPending === 0) {
            console.log(colorize(`\n${SYMBOLS.check} SELAMAT! Semua absensi dan forum di seluruh mata kuliah sudah AMAN.\n`, 'green'));
        } else {
            console.log(warning(`Ditemukan total ${bold(totalPending)} pertemuan yang belum tuntas!`));
            console.log(info(`Jalankan ${bold('Auto-Pilot Eksekusi')} untuk menyelesaikannya.\n`));
        }

    } catch (err) {
        console.log(error(`Gagal melakukan proses scanning: ${err.message}`));
    }
}