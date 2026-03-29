import express from 'express';
import cors from 'cors';
import { LlmAgent, InMemorySessionService, Runner, isFinalResponse } from '@google/adk';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// API Key comes from the environment or .env file
// The adk uses GEMINI_API_KEY natively if we don't pass it, but Vite might use VITE_GEMINI_API_KEY
// Assuming the user has VITE_GEMINI_API_KEY in their .env
import dotenv from 'dotenv';
dotenv.config();

// Ensure Google SDK has the key available (it looks for GEMINI_API_KEY)
if (process.env.VITE_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;
}

const sessionService = new InMemorySessionService();

const buddyAgent = new LlmAgent({
    name: "hey_buddy",
    model: "gemini-3.0-flash",
    description: "A helpful companion.",
    instruction: `You are a helpful assistant to a blind person. When he asks a question, respond as if you are a companion, concise but not lacking information. 
IMPORTANT: You must ask clarifying questions to help you come to a conclusive answer if the user's prompt is vague. Use your memory of past turns in this conversation to understand what the user wants.`,
});

const translatorAgent = new LlmAgent({
    name: "live_translator",
    model: "gemini-3.0-flash",
    description: "A live translator.",
    instruction: "You are a highly accurate live translator. The user wants to translate whatever you hear into the target language specified by the user. ONLY return the translated text. Do not add any conversational filler or notes. If the input is already in the target language, just return the text as is. Use your past memory to maintain context of what was previously said.",
});

const buddyRunner = new Runner({ agent: buddyAgent, appName: "hey_buddy_app", sessionService });
const translatorRunner = new Runner({ agent: translatorAgent, appName: "live_translator_app", sessionService });

app.post('/api/buddy', async (req, res) => {
    try {
        const { prompt, sessionId } = req.body;
        const events = await buddyRunner.runAsync({
            userId: "local_user",
            sessionId: sessionId || "default_buddy_session",
            newMessage: { role: "user", parts: [{ text: prompt }] } as any
        });

        let finalResponse = "No response generated.";
        for await (const event of events) {
            if (isFinalResponse(event as any) && (event as any).content?.parts) {
                finalResponse = (event as any).content.parts[0].text || finalResponse;
            }
        }
        res.json({ text: finalResponse });
    } catch (err) {
        console.error("Buddy API Error:", err);
        res.status(500).json({ error: "Failed to process buddy request" });
    }
});

app.post('/api/translator', async (req, res) => {
    try {
        const { text, targetLanguage, sessionId } = req.body;
        const content = { role: "user", parts: [{ text: `[TARGET LANGUAGE: ${targetLanguage}]\n${text}` }] };
        
        const events = await translatorRunner.runAsync({
            userId: "local_user",
            sessionId: sessionId || "default_translator_session",
            newMessage: content as any
        });

        let finalResponse = "Translation failed.";
        for await (const event of events) {
            if (isFinalResponse(event as any) && (event as any).content?.parts) {
                finalResponse = (event as any).content.parts[0].text || finalResponse;
            }
        }
        res.json({ text: finalResponse });
    } catch (err) {
        console.error("Translator API Error:", err);
        res.status(500).json({ error: "Failed to process translation request" });
    }
});

app.listen(PORT, () => console.log(`Backend server running on http://localhost:${PORT}`));
