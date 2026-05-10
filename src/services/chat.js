import { getGeminiModel, getActiveModelName, fallbackToNextModel } from './gemini.js';
import { SYMBOLS, colorize, warning, info } from '../utils/ui.js';

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
        const model = getGeminiModel();

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
            history: messages.slice(0, -1),
            systemInstruction: {
                parts: [{ text: SYSTEM_PROMPT }]
            },
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
    } catch (err) {
        const msg = err.message || '';
        if (msg.includes('429')) {
            console.log(warning('Quota model habis, mencoba model lain...'));
            const newModel = await fallbackToNextModel();
            if (newModel) {
                console.log(info(`Beralih ke model: ${newModel}`));
                // Hapus pesan user terakhir dari history supaya tidak duplikat
                conversationHistory.pop();
                // Retry SEKALI dengan model baru — tanpa rekursi
                try {
                    const retryModel = getGeminiModel();
                    const retryChat = retryModel.startChat({
                        history: conversationHistory.map(m => ({ role: m.role, parts: m.parts })),
                        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                        generationConfig: { maxOutputTokens: 1024 }
                    });
                    const retryResult = await retryChat.sendMessage(userMessage);
                    const retryText = retryResult.response.text();
                    conversationHistory.push({ role: 'user',  parts: [{ text: userMessage }] });
                    conversationHistory.push({ role: 'model', parts: [{ text: retryText }] });
                    if (conversationHistory.length > 10) conversationHistory = conversationHistory.slice(-10);
                    return retryText;
                } catch {
                    return null;
                }
            }
            console.log(warning('Semua model quota habis. Coba lagi nanti.'));
            return null;
        }
        console.log(`${colorize(SYMBOLS.error, 'red')} AI Error: ${msg.substring(0, 120)}`);
        return null;
    }
}

export function resetConversation() {
    conversationHistory = [];
}

export function getConversationHistory() {
    return conversationHistory;
}
