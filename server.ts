import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { LlmAgent, InMemorySessionService, Runner, isFinalResponse, BaseLlm, LlmRequest, LlmResponse, BaseLlmConnection } from '@google/adk';

// Ensure Google SDK can find the key (it natively uses GEMINI_API_KEY)
if (process.env.VITE_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' })); // allow large base64 image payloads

const PORT = 3001;

// ─── Local Model Config (LM Studio / Ollama OpenAI-compatible API) ────────────
const LOCAL_API_URL = process.env.LOCAL_MODEL_URL || 'http://localhost:11434/v1';
// const LOCAL_MODEL_NAME = process.env.LOCAL_MODEL_NAME || 'gemma4:e2b';
const LOCAL_MODEL_NAME = 'gemma4:e2b';

// ─── Startup: Check if local LLM is reachable ────────────────────────────────
async function checkLocalLlmOnStartup() {
    try {
        const urlObj = new URL(LOCAL_API_URL);
        const modelsUrl = `${urlObj.protocol}//${urlObj.host}/v1/models`;
        const res = await fetch(modelsUrl, { method: 'GET', signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            const data = await res.json() as any;
            const models = data.data?.map((m: any) => m.id).join(', ') || 'unknown';
            console.log(`✅ [Local LLM] Connected to ${LOCAL_API_URL}`);
            console.log(`   Available models: ${models}`);
            console.log(`   Configured model: ${LOCAL_MODEL_NAME}`);
        } else {
            console.warn(`⚠️  [Local LLM] Server responded with ${res.status} at ${LOCAL_API_URL}`);
        }
    } catch (e: any) {
        console.warn(`❌ [Local LLM] Not reachable at ${LOCAL_API_URL} — ${e.message}`);
        console.warn(`   To use local models, start Ollama: ollama serve`);
    }
}
checkLocalLlmOnStartup();

// ─── Shared system prompts ────────────────────────────────────────────────────
const BUDDY_SYSTEM_PROMPT = `You are a helpful assistant to a blind person. When he asks a question, respond as if you are a companion, concise but not lacking information. 
IMPORTANT: You must ask clarifying questions to help you come to a conclusive answer if the user's prompt is vague. Use your memory of past turns in this conversation to understand what the user wants.`;

const TRANSLATOR_SYSTEM_PROMPT = `You are a highly accurate live translator. The user wants to translate whatever you hear into the target language specified by the user. ONLY return the translated text. Do not add any conversational filler or notes. If the input is already in the target language, just return the text as is.`;

// ─── Session Service & ADK Agents (Gemini path) ───────────────────────────────
const sessionService = new InMemorySessionService();

const BUDDY_APP = "hey_buddy_app";
const TRANSLATOR_APP = "live_translator_app";
const USER_ID = "local_user";

async function ensureSession(appName: string, sessionId: string) {
    const existing = await sessionService.getSession({ appName, userId: USER_ID, sessionId });
    if (!existing) {
        await sessionService.createSession({ appName, userId: USER_ID, sessionId });
    }
}

class LocalOpenAILlm extends BaseLlm {
    constructor(private apiUrl: string, modelName: string) {
        super({ model: modelName });
    }

    async *generateContentAsync(llmRequest: LlmRequest, stream?: boolean): AsyncGenerator<LlmResponse, void> {
        const messages: any[] = [];

        if (llmRequest.config?.systemInstruction) {
            const sysInst = llmRequest.config.systemInstruction as any;
            let sysText = '';
            if (typeof sysInst === 'string') {
                sysText = sysInst;
            } else if (Array.isArray(sysInst)) {
                sysText = sysInst.map(s => s.parts?.[0]?.text || '').join('\n');
            } else if (sysInst.parts) {
                sysText = sysInst.parts.map((p: any) => p.text || '').join('\n');
            }
            if (sysText) {
                messages.push({ role: 'system', content: sysText });
            }
        }

        for (const msg of llmRequest.contents || []) {
            const role = (msg.role === 'model' || msg.role === 'assistant') ? 'assistant' : 'user';
            const content: any[] = [];
            for (const part of msg.parts || []) {
                if (part.text) {
                    content.push({ type: 'text', text: part.text });
                }
                if (part.inlineData) {
                    const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    content.push({ type: 'image_url', image_url: { url: dataUrl } });
                }
            }
            if (content.length > 0) {
                messages.push({ role, content });
            }
        }

        console.log(`[LocalLLM] Sending request to ${this.apiUrl}/chat/completions (model: ${this.model}, messages: ${messages.length})`);

        const response = await fetch(`${this.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                messages,
                temperature: 0.7,
                max_tokens: 1024,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[LocalLLM] Error response (${response.status}): ${errText}`);
            throw new Error(`Local model error (${response.status}): ${errText}`);
        }

        const data = await response.json() as any;
        const textResponse = data.choices?.[0]?.message?.content?.trim() || 'No response from local model.';
        console.log(`[LocalLLM] ✅ Got response (${textResponse.length} chars): "${textResponse.substring(0, 100)}..."`);

        yield {
            content: {
                role: 'model',
                parts: [{ text: textResponse }]
            }
        };
    }

    async connect(llmRequest: LlmRequest): Promise<BaseLlmConnection> {
        throw new Error('Live connect not implemented');
    }
}

function getRunner(appName: string, agentName: string, instruction: string, modelProvider: string, localApiUrl?: string, localModelName?: string): Runner {
    const url = localApiUrl || LOCAL_API_URL;
    const modelStr = localModelName || LOCAL_MODEL_NAME;
    const model = modelProvider === 'local'
        ? new LocalOpenAILlm(url, modelStr)
        : "gemini-3.1-flash-lite-preview";

    const agent = new LlmAgent({
        name: agentName,
        model,
        description: agentName,
        instruction
    });
    return new Runner({ agent, appName, sessionService });
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.post('/api/buddy', async (req, res) => {
    try {
        const { prompt, imageBase64, modelProvider = 'gemini', localApiUrl, localModelName } = req.body;
        const sessionId = req.body.sessionId || "default_buddy_session";

        console.log(`[buddy] provider=${modelProvider}, hasImage=${!!imageBase64}`);

        // ── ADK Execution path ─────────────────────────────────────────────────
        if (modelProvider !== 'local' && !process.env.GEMINI_API_KEY) {
            return res.status(401).json({ error: "Missing Gemini API Key. Please check your .env file." });
        }

        await ensureSession(BUDDY_APP, sessionId);
        const buddyRunner = getRunner(BUDDY_APP, "hey_buddy", BUDDY_SYSTEM_PROMPT, modelProvider, localApiUrl, localModelName);

        const parts: any[] = [{ text: prompt }];
        if (imageBase64) {
            const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
            const mimeMatch = imageBase64.match(/data:([^;]+);base64,/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            parts.push({ inlineData: { mimeType, data: base64Data } });
            console.log(`[buddy] image attached (${mimeType}, ~${base64Data.length} chars)`);
        }

        const events = await buddyRunner.runAsync({
            userId: USER_ID,
            sessionId,
            newMessage: { role: "user", parts } as any
        });

        let finalResponse = "No response generated.";
        for await (const event of events) {
            const ev = event as any;
            // Debug logging for local model path
            if (modelProvider === 'local') {
                console.log(`[buddy:local] event author=${ev.author}, isFinal=${isFinalResponse(ev)}, hasParts=${!!ev.content?.parts}, keys=${Object.keys(ev).join(',')}`);
            }
            if (isFinalResponse(ev) && ev.content?.parts) {
                finalResponse = ev.content.parts[0].text || finalResponse;
            }
            // Fallback: capture any agent response with text (covers local wrapper edge case)
            else if (ev.content?.parts?.[0]?.text && ev.author && ev.author !== 'user') {
                finalResponse = ev.content.parts[0].text;
            }
        }
        console.log(`[buddy] Final response (${modelProvider}): "${finalResponse.substring(0, 100)}..."`);
        res.json({ text: finalResponse });

    } catch (err: any) {
        console.error("Buddy API Error:", err);
        let errorMessage = err instanceof Error ? err.message : String(err);

        if (errorMessage.toLowerCase().includes('econnrefused') || errorMessage.includes('fetch failed')) {
            errorMessage = "Cannot reach local model. Is Ollama/LM Studio running with a model loaded?";
        } else if (errorMessage.toLowerCase().includes('quota') || errorMessage.includes('429')) {
            errorMessage = "Looks like I'm out of brain power (credits) right now! Try again later.";
        } else if (errorMessage.toLowerCase().includes('api key not valid') || errorMessage.includes('400') || errorMessage.includes('403')) {
            errorMessage = "My brain key (API Key) is invalid! Please update the settings.";
        }

        res.status(500).json({ error: errorMessage });
    }
});

app.post('/api/translator', async (req, res) => {
    try {
        const { text, targetLanguage, modelProvider = 'gemini', localApiUrl, localModelName } = req.body;
        const sessionId = req.body.sessionId || "default_translator_session";
        const userText = `[TARGET LANGUAGE: ${targetLanguage}]\n${text}`;

        console.log(`[translator] provider=${modelProvider}, lang=${targetLanguage}`);

        // ── ADK Execution path ─────────────────────────────────────────────────
        if (modelProvider !== 'local' && !process.env.GEMINI_API_KEY) {
            return res.status(401).json({ error: "Missing Gemini API Key. Please check your .env file." });
        }

        await ensureSession(TRANSLATOR_APP, sessionId);
        const translatorRunner = getRunner(TRANSLATOR_APP, "live_translator", TRANSLATOR_SYSTEM_PROMPT, modelProvider, localApiUrl, localModelName);

        const events = await translatorRunner.runAsync({
            userId: USER_ID,
            sessionId,
            newMessage: { role: "user", parts: [{ text: userText }] } as any
        });

        let finalResponse = "Translation failed.";
        for await (const event of events) {
            const ev = event as any;
            if (modelProvider === 'local') {
                console.log(`[translator:local] event author=${ev.author}, isFinal=${isFinalResponse(ev)}, hasParts=${!!ev.content?.parts}`);
            }
            if (isFinalResponse(ev) && ev.content?.parts) {
                finalResponse = ev.content.parts[0].text || finalResponse;
            }
            // Fallback: capture any agent response with text
            else if (ev.content?.parts?.[0]?.text && ev.author && ev.author !== 'user') {
                finalResponse = ev.content.parts[0].text;
            }
        }
        console.log(`[translator] Final response (${modelProvider}): "${finalResponse.substring(0, 100)}..."`);
        res.json({ text: finalResponse });

    } catch (err: any) {
        console.error("Translator API Error:", err);
        let errorMessage = err instanceof Error ? err.message : String(err);

        if (errorMessage.toLowerCase().includes('econnrefused') || errorMessage.includes('fetch failed')) {
            errorMessage = "Cannot reach local model. Is Ollama/LM Studio running with a model loaded?";
        } else if (errorMessage.toLowerCase().includes('quota') || errorMessage.includes('429')) {
            errorMessage = "Translations are paused: out of credits! Please check your Google Cloud billing.";
        } else if (errorMessage.toLowerCase().includes('api key not valid') || errorMessage.includes('400') || errorMessage.includes('403')) {
            errorMessage = "The Translator is offline due to an invalid API Key. Please update your .env file.";
        }

        res.status(500).json({ error: errorMessage });
    }
});

// Health + model info endpoint (useful for debugging)
app.post('/api/status', async (req, res) => {
    const { localApiUrl, localModelName } = req.body || {};
    const url = localApiUrl || LOCAL_API_URL;
    const model = localModelName || LOCAL_MODEL_NAME;

    let localOk = false;
    try {
        // Simple test fetch to the local provider's models endpoint or just check localhost connectivity
        // For Ollama/LMStudio, /models usually lists models
        const urlObj = new URL(url);
        const hostUrl = `${urlObj.protocol}//${urlObj.host}/v1/models`;

        const testReq = await fetch(hostUrl, { method: 'GET', signal: AbortSignal.timeout(2000) }).catch(() => null);
        if (testReq && testReq.ok) {
            localOk = true;
        }
    } catch (e) {
        // ignore
    }

    res.json({
        geminiAvailable: !!process.env.GEMINI_API_KEY,
        localModelUrl: url,
        localModelName: model,
        localConnected: localOk
    });
});

app.listen(PORT, () => console.log(`Backend server running on http://localhost:${PORT}`));
