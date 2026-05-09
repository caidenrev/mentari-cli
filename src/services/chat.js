import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';
import { SYMBOLS, colorize } from '../utils/ui.js';

// Inisialisasi Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const SYSTEM_PROMPT = `Kamu adalah asisten AI yang membantu mahasiswa dalam menggunakan Mentari LMS Auto-Pilot CLI. 
Kamu bisa membantu dengan:
- Menjawab pertanyaan tentang cara menggunakan CLI
- Memberikan tips untuk kuliah online
- Menjawab pertanyaan umum mahasiswa
- Memberikan motivasi belajar

Berikan jawaban yang singkat, jelas, dan menggunakan bahasa Indonesia yang sopan.
Hindari jawaban yang terlalu panjang. Maksimal 3-4 kalimat per respons.`;

let conversationHistory = [];

export async function chatWithAI(userMessage) {
    try {
        // Tambah pesan user ke history
        conversationHistory.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });

        // Build conversation context
        const messages = conversationHistory.map(msg => ({
            role: msg.role,
            parts: msg.parts
        }));

        // Generate response
        const chat = model.startChat({
            history: messages.slice(0, -1), // Semua history kecuali pesan terakhir
            generationConfig: {
                maxOutputTokens: 1024,
            }
        });

        const result = await chat.sendMessage(userMessage);
        const responseText = result.response.text();

        // Tambah respons ke history
        conversationHistory.push({
            role: 'model',
            parts: [{ text: responseText }]
        });

        // Batasi history untuk efisiensi token
        if (conversationHistory.length > 10) {
            conversationHistory = conversationHistory.slice(-10);
        }

        return responseText;
    } catch (error) {
        console.error(`${colorize(SYMBOLS.error, 'red')} AI Error: ${error.message}`);
        return null;
    }
}

export function resetConversation() {
    conversationHistory = [];
}

export function getConversationHistory() {
    return conversationHistory;
}
