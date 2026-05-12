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
    const prompt = `Kamu adalah mahasiswa IT semester akhir yang aktif di forum diskusi perkuliahan online.

Topik diskusi dari dosen:
"${teksTopik}"

Instruksi tambahan: ${instruksiTambahan}

Aturan penulisan yang WAJIB diikuti:
- Tulis seperti mahasiswa asli, santai tapi tetap sopan dan akademis
- Jika topik diawali salam (Assalamualaikum, Halo, dll), balas salamnya dulu secara singkat
- JANGAN gunakan "Izin menjawab pak/bu" atau sapaan pak/bu sama sekali
- JANGAN gunakan format markdown: tidak ada **bold**, tidak ada *italic*, tidak ada bullet point dengan simbol
- JANGAN gunakan simbol *, #, -, atau format apapun
- Tulis paragraf biasa, mengalir, seperti orang mengetik di kolom komentar
- Panjang jawaban 2-3 kalimat saja, singkat dan langsung ke poin
- Gunakan bahasa Indonesia yang natural, boleh sedikit informal tapi tetap berbobot

OUTPUT HANYA TEKS BALASAN FORUM SAJA, TANPA APAPUN SELAIN TEKS ITU.`;

    try {
        return await generateWithFallback(prompt);
    } catch (error) {
        console.log(warning(`AI Gagal merespon forum: ${error.message.substring(0, 80)}`));
        return "Waalaikumsalam, terima kasih atas materinya. Saya setuju bahwa topik ini sangat penting untuk dipahami lebih dalam.";
    }
}