import { GoogleGenerativeAI } from "@google/generative-ai";

interface AIResponse {
    text: string;
    action?: string;
}

// Access API key from environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
    // Use a model that supports vision, e.g., gemini-1.5-flash
    model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: "You are a helpful assistant to a blind person. When he asks the question with image respond as if you are a companion, concise but not lacking information.",
    });
} else {
    console.warn("VITE_GEMINI_API_KEY is missing in .env");
}

export const generateResponse = async (
    prompt: string,
    imageBase64: string | null
): Promise<AIResponse> => {
    if (!model) {
        return {
            text: "I'm sorry, I don't have an API key configured. Please check your .env file.",
        };
    }

    try {
        console.log("Generating response for:", prompt);

        let result;
        if (imageBase64) {
            // Clean base64 string (remove data:image/jpeg;base64, prefix if present)
            const cleanBase64 = imageBase64.split(',')[1] || imageBase64;

            const imagePart = {
                inlineData: {
                    data: cleanBase64,
                    mimeType: "image/jpeg",
                },
            };

            console.log("Sending prompt + image to Gemini...");
            result = await model.generateContent([prompt, imagePart]);
        } else {
            console.log("Sending text-only prompt to Gemini...");
            result = await model.generateContent(prompt);
        }

        const response = await result.response;
        const text = response.text();

        return {
            text: text,
        };
    } catch (error) {
        console.error("Error generating response:", error);
        return {
            text: "I'm having trouble connecting to my brain right now. Please try again.",
        };
    }
};

export const speakResponse = (text: string) => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Samantha")) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    window.speechSynthesis.speak(utterance);
};
