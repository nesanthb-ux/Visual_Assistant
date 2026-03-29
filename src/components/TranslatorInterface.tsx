import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Mic, Volume2 } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { generateTranslation, speakResponse } from '../services/aiService';

export const TranslatorInterface: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [targetLanguage, setTargetLanguage] = useState('Spanish');
    const [isTranslating, setIsTranslating] = useState(false);
    const [translationResult, setTranslationResult] = useState('');
    const [userResponse, setUserResponse] = useState('');

    const { startListening, stopListening, transcript, isListening } = useSpeechRecognition(() => {});

    // Listen for silence to auto-translate, similar to AssistantInterface
    useEffect(() => {
        if (isListening && transcript.length > 5) {
            const timeoutId = setTimeout(async () => {
                stopListening();
                setIsTranslating(true);
                const translated = await generateTranslation(transcript, targetLanguage);
                setTranslationResult(translated);
                setIsTranslating(false);
            }, 2500); // 2.5 seconds of silence

            return () => clearTimeout(timeoutId);
        }
    }, [transcript, isListening, targetLanguage, stopListening]);

    const handleSendResponse = () => {
        if (userResponse.trim()) {
            speakResponse(userResponse);
            setUserResponse('');
        }
    };

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center text-white font-sans">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-black to-purple-900/30 opacity-90" />
            
            {/* Controls */}
            <div className="absolute top-8 left-8 z-50">
                <button
                    onClick={onBack}
                    className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10"
                >
                    <ChevronLeft />
                </button>
            </div>

            <div className="z-10 flex flex-col items-center gap-8 max-w-2xl w-full px-4 w-full">
                
                {/* Language Selector */}
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 w-full flex justify-between items-center px-6">
                    <span className="text-gray-300 font-medium tracking-wide">Translate to:</span>
                    <select 
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        className="bg-black/50 text-white border border-white/20 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                        <option value="Italian">Italian</option>
                        <option value="Japanese">Japanese</option>
                        <option value="Chinese (Simplified)">Chinese</option>
                        <option value="Hindi">Hindi</option>
                    </select>
                </div>

                {/* Transcription & Translation Display */}
                <div className="flex flex-col w-full gap-4">
                    <div className="h-32 w-full overflow-y-auto bg-black/40 backdrop-blur-md rounded-lg p-6 border border-white/10 relative">
                        <div className="absolute top-3 left-4 text-xs tracking-widest text-gray-500 uppercase font-bold">They Said</div>
                        <p className="mt-4 text-lg text-gray-300">
                            {transcript || <span className="text-gray-600 italic">Listening...</span>}
                        </p>
                    </div>

                    <div className="h-40 w-full overflow-y-auto bg-purple-900/20 backdrop-blur-md rounded-lg p-6 border border-purple-500/30 relative">
                        <div className="absolute top-3 left-4 text-xs tracking-widest text-purple-400 uppercase font-bold">Translation</div>
                        {isTranslating ? (
                            <p className="mt-4 text-lg text-purple-300 animate-pulse">Translating...</p>
                        ) : (
                            <p className="mt-4 text-xl text-white font-medium">
                                {translationResult || <span className="text-purple-300/50 italic">Waiting to translate...</span>}
                            </p>
                        )}
                    </div>
                </div>

                {/* Input for user response */}
                <div className="w-full flex gap-3 mt-4">
                    <input 
                        type="text"
                        value={userResponse}
                        onChange={(e) => setUserResponse(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendResponse()}
                        placeholder="Type a response to speak aloud..."
                        className="flex-1 bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-pink-500 outline-none"
                    />
                    <button 
                        onClick={handleSendResponse}
                        disabled={!userResponse.trim()}
                        className="p-3 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:bg-gray-600 rounded-xl transition-colors flex items-center justify-center group"
                    >
                        <Volume2 className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                    </button>
                </div>

                {/* Main Mic Button to manually restart listening after a translation */}
                <motion.button
                    animate={{
                        scale: isListening ? [1, 1.1, 1] : 1,
                        boxShadow: isListening ? "0 0 20px #a855f7" : "0 0 0px transparent"
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    onClick={() => isListening ? stopListening() : startListening()}
                    className={`mt-4 p-5 rounded-full backdrop-blur-md transition-colors ${
                        isListening 
                        ? 'bg-purple-600/30 border border-purple-500/50' 
                        : 'bg-white/10 border border-white/20 hover:bg-white/20'
                    }`}
                >
                    <Mic className={`w-8 h-8 ${isListening ? 'text-purple-400' : 'text-gray-400'}`} />
                </motion.button>
                <span className="text-xs text-gray-500 uppercase tracking-widest -mt-4">
                    {isListening ? 'Listening' : 'Tap Mic to Listen'}
                </span>

            </div>
        </div>
    );
};
