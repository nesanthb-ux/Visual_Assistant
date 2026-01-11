import { useState, useCallback, useRef } from 'react';

// Extend Window interface for Web Speech API
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export const useSpeechRecognition = (onWakeWord: () => void) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);

    const startListening = useCallback(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setError('Speech recognition not supported in this browser.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            if (event.error === 'not-allowed') {
                setError('Microphone permission denied.');
                setIsListening(false);
            }
        };

        recognition.onend = () => {
            // Auto-restart if it stops unexpected, unless explicitly stopped
            if (isListening) {
                // recognition.start(); // Be careful with loops
                setIsListening(false);
            }
        };

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }

            const lowerTranscript = finalTranscript.toLowerCase();
            if (lowerTranscript.includes("hey buddy") || lowerTranscript.includes("hey, buddy")) {
                console.log("Wake word detected!");
                onWakeWord();
                // clear detected wake word to avoid multi-trigger? 
                // Or just let the parent handle the state change.
            }

            setTranscript(lowerTranscript);
        };

        try {
            recognition.start();
        } catch (e) {
            console.error(e);
        }
    }, [isListening, onWakeWord]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, []);

    return { isListening, transcript, startListening, stopListening, error };
};
