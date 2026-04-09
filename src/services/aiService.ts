interface AIResponse {
    text: string;
    action?: string;
}

export type ModelProvider = 'gemini' | 'local';

export const API_BASE = "http://localhost:3001/api";

export const checkLocalStatus = async (localApiUrl: string): Promise<boolean> => {
    try {
        const res = await fetch(`${API_BASE}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ localApiUrl })
        });
        const data = await res.json();
        return !!data.localConnected;
    } catch {
        return false;
    }
};

export const generateResponse = async (
    prompt: string,
    imageBase64: string | null = null,
    sessionId: string = "default_buddy_session",
    modelProvider: ModelProvider = 'gemini',
    localApiUrl?: string
): Promise<AIResponse> => {
    try {
        console.log("Generating response for:", prompt);
        console.log("Model provider:", modelProvider);
        console.log("Has image:", !!imageBase64);

        const response = await fetch(`${API_BASE}/buddy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, sessionId, imageBase64, modelProvider, localApiUrl })
        });

        let data;
        try {
            data = await response.json();
        } catch (e) {
            throw new Error(`Server error: ${response.statusText}`);
        }

        if (!response.ok) {
            throw new Error(data?.error || `Server error: ${response.statusText}`);
        }

        return { text: data.text || "No response received." };
    } catch (error: any) {
        console.error("Error generating response:", error);
        return { text: error?.message || "I'm having trouble connecting to my brain right now." };
    }
};

export const generateTranslation = async (
    text: string,
    targetLanguage: string,
    sessionId: string = "default_translator_session",
    modelProvider: ModelProvider = 'gemini',
    localApiUrl?: string
): Promise<string> => {
    try {
        console.log(`Translating to ${targetLanguage} (${modelProvider})...`);

        const response = await fetch(`${API_BASE}/translator`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, targetLanguage, sessionId, modelProvider, localApiUrl })
        });

        let data;
        try {
            data = await response.json();
        } catch (e) {
            throw new Error(`Server error: ${response.statusText}`);
        }

        if (!response.ok) {
            throw new Error(data?.error || `Server error: ${response.statusText}`);
        }

        return data.text || "Translation failed.";
    } catch (error: any) {
        console.error("Error generating translation:", error);
        return error?.message || 'Is the backend server running?';
    }
};

const getVoicesAsync = (): Promise<SpeechSynthesisVoice[]> =>
    new Promise((resolve) => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) { resolve(voices); return; }
        const handler = () => { resolve(window.speechSynthesis.getVoices()); };
        window.speechSynthesis.addEventListener('voiceschanged', handler, { once: true });
        // Fallback if event never fires
        setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
    });

const LANG_LOCALE_MAP: Record<string, string> = {
    'Spanish': 'es',
    'French': 'fr',
    'German': 'de',
    'Italian': 'it',
    'Japanese': 'ja',
    'Chinese (Simplified)': 'zh',
    'Hindi': 'hi',
    'Arabic': 'ar',
    'Portuguese': 'pt',
    'Korean': 'ko',
};

export const speakResponse = async (text: string, targetLanguage?: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = await getVoicesAsync();

    if (targetLanguage && LANG_LOCALE_MAP[targetLanguage]) {
        const locale = LANG_LOCALE_MAP[targetLanguage];
        const langVoice = voices.find(v => v.lang.startsWith(locale));
        if (langVoice) { utterance.voice = langVoice; utterance.lang = langVoice.lang; }
    } else {
        const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha')) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;
    }
    utterance.rate = 0.95;
    utterance.volume = 1;

    utterance.onerror = (e) => console.error('SpeechSynthesis error:', e.error);

    // Chrome bug workaround: speechSynthesis pauses on long text.
    // Keep it alive by calling resume() periodically.
    const keepAlive = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
            clearInterval(keepAlive);
        } else {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
        }
    }, 10000);

    utterance.onend = () => clearInterval(keepAlive);

    window.speechSynthesis.speak(utterance);
};
