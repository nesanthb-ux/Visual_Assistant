import React, { useEffect, useState, useCallback, useRef } from 'react';

import { motion } from 'framer-motion';
import { Mic, Video, VideoOff, Activity, ChevronLeft, Cpu, Cloud, Zap } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { generateResponse, speakResponse, checkLocalStatus, type ModelProvider } from '../services/aiService';

type AssistantState = 'idle' | 'listening' | 'processing' | 'speaking';

export const AssistantInterface: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [state, setState] = useState<AssistantState>('idle');
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [started, setStarted] = useState(false);
    const [modelProvider, setModelProvider] = useState<ModelProvider>('gemini');
    const [localUrl, setLocalUrl] = useState<string>('http://localhost:11434/v1');
    const [localStatus, setLocalStatus] = useState<'checking' | 'connected' | 'error' | 'idle'>('idle');

    const { videoRef, startCamera, stopCamera, captureFrame, hasPermission: cameraActive } = useCamera();

    const handleWakeWord = useCallback(() => {
        if (state === 'idle' || state === 'listening') {
            setState('listening');
        }
    }, [state]);

    const { startListening, transcript } = useSpeechRecognition(handleWakeWord);

    useEffect(() => {
        if (!started) return;
        startCamera();
        startListening();
    }, [started]);

    // // Check Local connectivity (debounced to prevent flashing)
    // const localCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // useEffect(() => {
    //     if (localCheckTimer.current) clearTimeout(localCheckTimer.current);
    //     if (modelProvider === 'local') {
    //         setLocalStatus('checking');
    //         localCheckTimer.current = setTimeout(() => {
    //             checkLocalStatus(localUrl).then(isConnected => {
    //                 setLocalStatus(isConnected ? 'connected' : 'error');
    //             });
    //         }, 300);
    //     } else {
    //         setLocalStatus('idle');
    //     }
    //     return () => { if (localCheckTimer.current) clearTimeout(localCheckTimer.current); };
    // }, [modelProvider, localUrl]);
    // Check Local connectivity
    const localCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (modelProvider !== 'local') {
            setLocalStatus('idle');
            return;
        }

        // Set to checking only after a short delay to prevent "flashing" on fast responses
        const timer = setTimeout(async () => {
            setLocalStatus('checking');
            const isConnected = await checkLocalStatus(localUrl);
            setLocalStatus(isConnected ? 'connected' : 'error');
        }, 500); // 500ms delay gives the UI time to breathe

        return () => clearTimeout(timer);
    }, [modelProvider, localUrl]);



    // Effect to handle conversation flow after wake word
    useEffect(() => {
        if (state === 'listening' && transcript) {
            const timeoutId = setTimeout(async () => {
                if (transcript.length > 5) { // minimal length
                    setState('processing');
                    const frame = captureFrame();
                    const response = await generateResponse(transcript, frame, 'default_buddy_session', modelProvider, localUrl);

                    setMessages(prev => [...prev, { role: 'user', content: transcript }, { role: 'assistant', content: response.text }]);

                    setState('speaking');
                    speakResponse(response.text);

                    // Revert to idle
                    setTimeout(() => {
                        setState('idle');
                    }, 5000);
                }
            }, 2000);

            return () => clearTimeout(timeoutId);
        }
    }, [transcript, state, captureFrame, modelProvider, localUrl]);

    const handleConfigurePort = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newUrl = window.prompt("Enter Local Model API URL:", localUrl);
        // if (newUrl) setLocalUrl(newUrl);
        // Only update if the value actually changed and isn't null
        if (newUrl && newUrl !== localUrl) {
            setLocalStatus('checking'); // Set it once manually
            setLocalUrl(newUrl);
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100dvh', background: '#000', overflow: 'hidden', display: 'flex', flexDirection: 'column', color: '#fff', fontFamily: 'sans-serif' }}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 1s', opacity: cameraActive && started ? 0.6 : 0 }}
            />

            {!cameraActive && (
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, #111827, #000, #111827)', opacity: 0.9 }} />
            )}

            {/* TOP BAR: Navigation & Model Selector */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 110, boxSizing: 'border-box' }}>
                <button
                    onClick={onBack}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '9px 12px', cursor: 'pointer', color: '#ccc', display: 'flex', backdropFilter: 'blur(8px)', marginTop: '2px', transition: 'background 0.3s' }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                >
                    <ChevronLeft style={{ width: 18, height: 18 }} />
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <Zap style={{ width: 14, height: 14, color: '#60a5fa' }} />
                        <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#d1d5db' }}>Visual Assistant</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', padding: '4px 8px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.1)', marginTop: '8px' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setModelProvider('gemini'); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: 999, transition: 'all 0.3s', cursor: 'pointer', border: 'none', background: modelProvider === 'gemini' ? 'rgba(59,130,246,0.2)' : 'transparent', boxShadow: modelProvider === 'gemini' ? '0 0 12px rgba(59,130,246,0.3)' : 'none', opacity: modelProvider === 'gemini' ? 1 : 0.5 }}
                        >
                            <Cloud style={{ width: 14, height: 14, color: modelProvider === 'gemini' ? '#60a5fa' : '#9ca3af' }} />
                            <span style={{ color: modelProvider === 'gemini' ? '#93c5fd' : '#9ca3af', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em' }}>Gemini</span>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setModelProvider('local'); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: 999, transition: 'all 0.3s', cursor: 'pointer', border: 'none', background: modelProvider === 'local' ? 'rgba(34,197,94,0.2)' : 'transparent', boxShadow: modelProvider === 'local' ? '0 0 12px rgba(34,197,94,0.3)' : 'none', opacity: modelProvider === 'local' ? 1 : 0.5 }}
                        >
                            <Cpu style={{ width: 14, height: 14, color: modelProvider === 'local' ? '#4ade80' : '#9ca3af' }} />
                            <span style={{ color: modelProvider === 'local' ? '#86efac' : '#9ca3af', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em' }}>Local</span>
                        </button>

                        {/* Local Status Indicator & Config inline */}
                        {modelProvider === 'local' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '8px' }}>
                                <div style={{ position: 'relative', width: '8px', height: '8px' }}>
                                    {localStatus === 'checking' && <span style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', background: '#fbbf24', animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' }} />}
                                    <span style={{ position: 'absolute', width: '8px', height: '8px', borderRadius: '50%', background: localStatus === 'checking' ? '#f59e0b' : localStatus === 'connected' ? '#22c55e' : '#ef4444', boxShadow: localStatus === 'connected' ? '0 0 8px #22c55e' : 'none' }} />
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); handleConfigurePort(e); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }} title="Configure Local URL">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.5)' }}>
                                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ width: 42 }} /> {/* Empty div to balance space-between */}
            </div>

            {/* Tap to Begin Overlay */}
            {!started && (
                <div
                    style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', cursor: 'pointer' }}
                    onClick={() => {
                        // Prime speech synthesis with a silent utterance (user gesture unlock)
                        const primer = new SpeechSynthesisUtterance(' ');
                        primer.volume = 0;
                        window.speechSynthesis.speak(primer);
                        setStarted(true);
                    }}
                >
                    <div style={{ width: '96px', height: '96px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                        <Mic style={{ width: 40, height: 40, color: 'rgba(255,255,255,0.6)' }} />
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '20px', fontWeight: 300, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Tap to Begin</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginTop: '8px', margin: 0 }}>Camera & mic will activate</p>
                </div>
            )}

            {/* HUD Overlay */}
            {started && (
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '32px', maxWidth: '42rem', margin: '0 auto', width: '100%', padding: '0 16px', textAlign: 'center', border: 'none', paddingBottom: '96px', boxSizing: 'border-box' }}>

                    {/* Status Visualizer */}
                    <div style={{ position: 'relative', marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <motion.div
                            animate={{
                                scale: state === 'listening' ? [1, 1.2, 1] : 1,
                                borderColor: state === 'processing' ? '#3b82f6' : state === 'speaking' ? '#10b981' : state === 'listening' ? '#ef4444' : 'rgba(255,255,255,0.1)',
                                boxShadow: state === 'listening' ? "0 0 20px #ef4444" : "0 0 0px transparent"
                            }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            style={{ width: '8rem', height: '8rem', borderRadius: '50%', border: '4px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
                        >
                            {state === 'processing' && <Activity style={{ width: '3rem', height: '3rem', color: '#3b82f6', animation: 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />}
                            {state === 'speaking' && <div style={{ width: '4rem', height: '4px', background: '#22c55e', animation: 'bounce 1s infinite' }} />}
                            {state === 'listening' && <Mic style={{ width: '3rem', height: '3rem', color: '#ef4444' }} />}
                            {state === 'idle' && <div style={{ width: '1rem', height: '1rem', background: '#6b7280', borderRadius: '50%' }} />}
                        </motion.div>

                        {/* Status Text */}
                        <motion.p
                            key={state}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ marginTop: '1rem', fontSize: '1.25rem', fontWeight: 300, textTransform: 'uppercase', letterSpacing: '0.1em', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                        >
                            {state}
                        </motion.p>
                    </div>

                    {/* Conversation/Transcript */}
                    <div style={{ flex: 1, width: '100%', maxHeight: '16rem', overflowY: 'auto', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', borderRadius: '1rem', padding: '24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', boxSizing: 'border-box' }}>
                        {messages.length === 0 && <p style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '1.125rem' }}>Say "Hey Buddy" to start...</p>}
                        {messages.map((msg, i) => (
                            <div key={i} style={{ marginBottom: '12px', textAlign: 'left', color: msg.role === 'user' ? '#93c5fd' : '#86efac' }}>
                                <strong style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', opacity: 0.6, marginRight: '8px' }}>{msg.role === 'user' ? 'You' : 'Buddy'}</strong>
                                <span style={{ fontSize: '1.125rem' }}>{msg.content}</span>
                            </div>
                        ))}
                        {state === 'listening' && transcript && (
                            <div style={{ textAlign: 'left', color: '#d1d5db', marginTop: '8px', fontSize: '1.125rem' }}>
                                "{transcript}"
                            </div>
                        )}
                        {/* Auto-scroll anchor */}
                        {messages.length > 0 && <div ref={el => el?.scrollIntoView({ behavior: 'smooth' })} />}
                    </div>
                </div>
            )}

            {/* Bottom Controls */}
            {started && (
                <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '24px', zIndex: 60 }}>
                    <button
                        onClick={() => cameraActive ? stopCamera() : startCamera()}
                        style={{ padding: '16px', borderRadius: '50%', transition: 'all 0.3s', backdropFilter: 'blur(12px)', border: cameraActive ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(239,68,68,0.5)', background: cameraActive ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.2)', color: cameraActive ? 'inherit' : '#f87171', cursor: 'pointer' }}
                        onMouseOver={(e) => {
                            if (cameraActive) e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                            else e.currentTarget.style.background = 'rgba(239,68,68,0.3)';
                        }}
                        onMouseOut={(e) => {
                            if (cameraActive) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                            else e.currentTarget.style.background = 'rgba(239,68,68,0.2)';
                        }}
                    >
                        {cameraActive ? <Video style={{ width: 24, height: 24 }} /> : <VideoOff style={{ width: 24, height: 24 }} />}
                    </button>
                    {/* Add manual push-to-talk block if needed, but hey buddy works */}
                </div>
            )}
        </div>
    );
};


