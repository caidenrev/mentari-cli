import { getGeminiModel, fallbackToNextModel } from './gemini.js';
import { warning, info } from '../utils/ui.js';

/**
 * Helper: jalankan prompt dengan auto-fallback saat 429
 */
async function generateWithFallback(promptText) {
    const model = getGeminiModel();
    try {
        const result = await model.generateContent(promptText);
        return result.response.text().trim();
    } catch (e) {
        const msg = e.message || '';
        if (msg.includes('429')) {
            console.log(warning('Quota model habis, mencoba model lain...'));
            const newModel = await fallbackToNextModel();
            if (newModel) {
                console.log(info(`Beralih ke model: ${newModel}`));
                const retryModel = getGeminiModel();
                const retryResult = await retryModel.generateContent(promptText);
                return retryResult.response.text().trim();
            }
        }
        throw e;
    }
}

/**
 * Fungsi untuk mencari jawaban Kuis Pilihan Ganda
 */
export async function getJawabanKuisAI(teksSoal, listOpsi) {
    const opsiString = listOpsi.map(opsi => `ID: ${opsi.id} | Teks: ${opsi.jawaban}`).join("\n");
    
    const prompt = `Kamu adalah mahasiswa cerdas yang sedang ujian.
    
    Soal: ${teksSoal}
    
    Pilihan Jawaban:
    ${opsiString}
    
    Tugasmu: Pilih SATU jawaban yang paling benar.
    OUTPUT HANYA STRING ID DARI JAWABAN YANG BENAR, TANPA PENJELASAN APAPUN.`;

    try {
        return await generateWithFallback(prompt);
    } catch (error) {
        console.log(warning(`AI Gagal merespon kuis: ${error.message.substring(0, 80)}`));
        return null;
    }
}

/**
 * Fungsi untuk generate argumen Forum Diskusi
 */
export async function getJawabanForumAI(teksTopik, instruksiTambahan = "") {
    const prompt = `Kamu adalah mahasiswa IT yang sedang mengikuti forum diskusi perkuliahan.
    
    Topik/Pertanyaan dari Dosen:
    "${teksTopik}"
    
    Instruksi: ${instruksiTambahan}
    Tugasmu: Buatlah balasan diskusi yang natural, menggunakan bahasa Indonesia akademis yang sopan, seolah-olah ditulis oleh mahasiswa asli. Awali dengan kata-kata seperti "Izin menjawab pak/bu" atau sejenisnya.
    OUTPUT HANYA TEKS BALASAN FORUM, TANPA KUTIPAN ATAU FORMAT MARKDOWN.`;

    try {
        return await generateWithFallback(prompt);
    } catch (error) {
        console.log(warning(`AI Gagal merespon forum: ${error.message.substring(0, 80)}`));
        return "Izin menyimak materi dari Bapak/Ibu dosen.";
    }
}