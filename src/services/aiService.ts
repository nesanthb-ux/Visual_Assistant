interface AIResponse {
    text: string;
    action?: string;
}

const API_BASE = "http://localhost:3001/api";

export const generateResponse = async (
    prompt: string,
    imageBase64: string | null = null,
    sessionId: string = "default_buddy_session"
): Promise<AIResponse> => {
    try {
        console.log("Generating response for:", prompt);
        
        const response = await fetch(`${API_BASE}/buddy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, sessionId, imageBase64 })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }
        
        const data = await response.json();
        return { text: data.text || "No response received." };
    } catch (error) {
        console.error("Error generating response:", error);
        return { text: "I'm having trouble connecting to my brain right now. Please make sure the backend server and npm run dev are both running." };
    }
};

export const generateTranslation = async (
    text: string,
    targetLanguage: string,
    sessionId: string = "default_translator_session"
): Promise<string> => {
    try {
        console.log(`Translating to ${targetLanguage}...`);
        
        const response = await fetch(`${API_BASE}/translator`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, targetLanguage, sessionId })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.text || "Translation failed.";
    } catch (error) {
        console.error("Error generating translation:", error);
        return "Translation failed. Is the backend server running?";
    }
};

export const speakResponse = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Samantha")) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
    window.speechSynthesis.speak(utterance);
};
