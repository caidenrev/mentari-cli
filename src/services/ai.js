import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

// Inisialisasi Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (error) {
        console.error("❌ AI Gagal merespon kuis:", error.message);
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
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (error) {
        console.error("❌ AI Gagal merespon forum:", error.message);
        return "Izin menyimak materi dari Bapak/Ibu dosen."; // Fallback jawaban aman
    }
}