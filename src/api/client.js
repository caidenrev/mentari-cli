import 'dotenv/config';

const BASE_URL = "https://mentari.unpam.ac.id/api";

/**
 * Fungsi inti untuk melakukan request ke API Mentari
 */
export async function fetchMentari(endpoint, method = "GET", payload = null) {
    const headers = {
        "Authorization": `Bearer ${process.env.BEARER_TOKEN}`,
        "Cookie": `cf_clearance=${process.env.CF_CLEARANCE}`,
        "Content-Type": "application/json",
        // Menyamar sebagai browser Chrome
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
    };

    const options = { method, headers };
    
    // Jika ada payload (untuk metode POST), ubah menjadi JSON string
    if (payload) {
        options.body = JSON.stringify(payload);
    }

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, options);
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} pada ${endpoint}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`\n🚨 [API ERROR] Gagal mengakses ${endpoint}`);
        console.error(`Pesan Error:`, error.message);
        throw error; // Lemparkan error agar bisa ditangkap oleh fungsi pemanggil
    }
}