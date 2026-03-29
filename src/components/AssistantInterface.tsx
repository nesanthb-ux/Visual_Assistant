import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mic, Video, VideoOff, Activity, ChevronLeft } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { generateResponse, speakResponse } from '../services/aiService';

type AssistantState = 'idle' | 'listening' | 'processing' | 'speaking';

export const AssistantInterface: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [state, setState] = useState<AssistantState>('idle');
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);

    const { videoRef, startCamera, stopCamera, captureFrame, hasPermission: cameraActive } = useCamera();

    const handleWakeWord = useCallback(() => {
        if (state === 'idle' || state === 'listening') {
            setState('listening');
            // Play a small sound or visual cue
        }
    }, [state]);

    const { startListening, transcript } = useSpeechRecognition(handleWakeWord);

    // Auto-start camera and mic on mount
    useEffect(() => {
        startCamera();
        startListening();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Effect to handle conversation flow after wake word
    useEffect(() => {
        if (state === 'listening' && transcript) {
            // This is a naive check; in reality we need silence detection or a "stop command"
            // For demo, let's say after 3 seconds of silence or if transcript is long enough?
            // Actually, let's just use a manual "I'm done" or relying on the user pausing
            // For this MVP, let's trigger processing if the user pauses for 2 seconds.

            const timeoutId = setTimeout(async () => {
                if (transcript.length > 5) { // minimal length
                    setState('processing');
                    const frame = captureFrame();
                    const response = await generateResponse(transcript, frame);

                    setMessages(prev => [...prev, { role: 'user', content: transcript }, { role: 'assistant', content: response.text }]);

                    setState('speaking');
                    speakResponse(response.text);

                    // Wait for speech to end? Web Speech API doesn't easily give "onend" for synthesis without wrapper.
                    // Just reset to idle after some time for demo.
                    setTimeout(() => {
                        setState('idle');
                    }, 5000);
                }
            }, 2000);

            return () => clearTimeout(timeoutId);
        }
    }, [transcript, state, captureFrame]);

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center text-white font-sans">
            {/* Background Video Feed */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${cameraActive ? 'opacity-60' : 'opacity-0'}`}
            />

            {!cameraActive && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 opacity-90" />
            )}

            {/* HUD Overlay */}
            <div className="z-10 flex flex-col items-center gap-8 max-w-2xl w-full px-4 text-center">

                {/* Status Visualizer */}
                <div className="relative">
                    <motion.div
                        animate={{
                            scale: state === 'listening' ? [1, 1.2, 1] : 1,
                            borderColor: state === 'processing' ? '#3b82f6' : state === 'speaking' ? '#10b981' : '#ef4444',
                            boxShadow: state === 'listening' ? "0 0 20px #ef4444" : "0 0 0px transparent"
                        }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="w-32 h-32 rounded-full border-4 border-red-500 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    >
                        {state === 'processing' && <Activity className="w-12 h-12 text-blue-500 animate-pulse" />}
                        {state === 'speaking' && <div className="w-16 h-1 bg-green-500 animate-[bounce_1s_infinite]" />}
                        {state === 'listening' && <Mic className="w-12 h-12 text-red-500" />}
                        {state === 'idle' && <div className="w-4 h-4 bg-gray-500 rounded-full" />}
                    </motion.div>

                    {/* Status Text */}
                    <motion.p
                        key={state}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 text-xl font-light uppercase tracking-widest"
                    >
                        {state}
                    </motion.p>
                </div>

                {/* Conversation/Transcript */}
                <div className="h-48 w-full overflow-y-auto bg-black/30 backdrop-blur-md rounded-lg p-4 border border-white/10">
                    {messages.length === 0 && <p className="text-gray-400 italic">Say "Hey Buddy" to start...</p>}
                    {messages.map((msg, i) => (
                        <div key={i} className={`mb-2 text-left ${msg.role === 'user' ? 'text-blue-300' : 'text-green-300'}`}>
                            <strong>{msg.role === 'user' ? 'You' : 'Buddy'}:</strong> {msg.content}
                        </div>
                    ))}
                    {state === 'listening' && transcript && (
                        <div className="text-left text-gray-300 animate-pulse">
                            ... {transcript}
                        </div>
                    )}
                </div>

            </div>

            {/* Controls */}
            <div className="absolute top-8 left-8 z-50">
                <button
                    onClick={onBack}
                    className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10"
                >
                    <ChevronLeft />
                </button>
            </div>

            <div className="absolute bottom-8 flex gap-4 z-50">
                <button
                    onClick={() => cameraActive ? stopCamera() : startCamera()}
                    className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10"
                >
                    {cameraActive ? <Video /> : <VideoOff />}
                </button>
            </div>

        </div>
    );
};


