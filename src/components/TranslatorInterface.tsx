import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Mic, MicOff, Volume2, Copy, Check, RotateCcw, Zap, Cloud, Cpu, Settings } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { generateTranslation, speakResponse, checkLocalStatus, type ModelProvider } from '../services/aiService';

/* ─── Data ─────────────────────────────────────────────── */
const LANGUAGES = [
  { code: 'Spanish',              label: 'Spanish',    flag: '🇪🇸' },
  { code: 'French',               label: 'French',     flag: '🇫🇷' },
  { code: 'German',               label: 'German',     flag: '🇩🇪' },
  { code: 'Italian',              label: 'Italian',    flag: '🇮🇹' },
  { code: 'Japanese',             label: 'Japanese',   flag: '🇯🇵' },
  { code: 'Chinese (Simplified)', label: 'Chinese',    flag: '🇨🇳' },
  { code: 'Hindi',                label: 'Hindi',      flag: '🇮🇳' },
  { code: 'Arabic',               label: 'Arabic',     flag: '🇸🇦' },
  { code: 'Portuguese',           label: 'Portuguese', flag: '🇧🇷' },
  { code: 'Korean',               label: 'Korean',     flag: '🇰🇷' },
];

/* ─── Gradient-border panel wrapper ────────────────────── */
function GlassPanel({
  children,
  style,
  borderGradient = 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))',
  glow,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  borderGradient?: string;
  glow?: string;
}) {
  return (
    <div style={{
      position: 'relative',
      borderRadius: 20,
      padding: 1.5,              // gives the border thickness
      background: borderGradient,
      boxShadow: glow ?? 'none',
      ...style,
    }}>
      <div style={{
        borderRadius: 18.5,
        background: 'linear-gradient(160deg, rgba(14,13,28,0.95) 0%, rgba(9,8,20,0.98) 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
}

/* ─── Sound bars ────────────────────────────────────────── */
function SoundBars({ active }: { active: boolean }) {
  const hs = [0.45, 0.8, 1, 0.6, 0.9, 0.35, 0.75, 0.5, 0.85, 0.4, 0.65, 0.95];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2.5, height: 20 }}>
      {hs.map((h, i) => (
        <motion.div
          key={i}
          animate={active
            ? { scaleY: [h * 0.2, h, h * 0.45, h * 0.85, h * 0.1, h * 0.95] }
            : { scaleY: 0.12 }}
          transition={{ duration: 1.1 + i * 0.04, repeat: Infinity, ease: 'easeInOut', delay: i * 0.07 }}
          style={{ width: 3, height: '100%', borderRadius: 2, background: '#a78bfa', transformOrigin: '50% 100%', opacity: active ? 0.9 : 0.18 }}
        />
      ))}
    </div>
  );
}

/* ─── Pulsing mic button ────────────────────────────────── */
function MicButton({ isListening, onClick }: { isListening: boolean; onClick: () => void }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {isListening && [0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{ scale: [1, 2.8 + i * 0.45], opacity: [0.5, 0] }}
          transition={{ duration: 1.9, repeat: Infinity, delay: i * 0.63, ease: 'easeOut' }}
          style={{ position: 'absolute', width: 64, height: 64, borderRadius: '50%', border: '1.5px solid rgba(139,92,246,0.55)' }}
        />
      ))}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={onClick}
        style={{
          position: 'relative', zIndex: 1, width: 64, height: 64, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          background: isListening
            ? 'linear-gradient(145deg, #7c3aed, #4338ca)'
            : 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
          border: `1.5px solid ${isListening ? 'rgba(167,139,250,0.7)' : 'rgba(255,255,255,0.1)'}`,
          boxShadow: isListening ? '0 0 30px rgba(124,58,237,0.6), 0 0 60px rgba(124,58,237,0.2)' : '0 2px 12px rgba(0,0,0,0.4)',
          transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {isListening
          ? <MicOff style={{ width: 24, height: 24, color: '#fff' }} />
          : <Mic style={{ width: 24, height: 24, color: '#9ca3af' }} />
        }
      </motion.button>
    </div>
  );
}

/* ─── Panel label ────────────────────────────────────────── */
function PanelLabel({ children, color = '#6b7280' }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 8,
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
      fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color,
    }}>
      {children}
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────── */
export const TranslatorInterface: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [targetLanguage, setTargetLanguage] = useState('Hindi');
  const [isTranslating, setIsTranslating]   = useState(false);
  const [translationResult, setTranslation] = useState('');
  const [errorMsg, setErrorMsg]             = useState('');
  const [copied, setCopied]                 = useState(false);
  const [isSpeaking, setIsSpeaking]         = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  
  const [modelProvider, setModelProvider]   = useState<ModelProvider>('gemini');
  const [localUrl, setLocalUrl]             = useState<string>('http://localhost:11434/v1');
  const [localStatus, setLocalStatus]       = useState<'checking'|'connected'|'error'|'idle'>('idle');

  const stRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { startListening, stopListening, transcript, isListening } = useSpeechRecognition(() => {});
  const lang = LANGUAGES.find(l => l.code === targetLanguage)!;

  // Check Local connectivity
  useEffect(() => {
    if (modelProvider === 'local') {
      setLocalStatus('checking');
      checkLocalStatus(localUrl).then(isConnected => {
        setLocalStatus(isConnected ? 'connected' : 'error');
      });
    } else {
      setLocalStatus('idle');
    }
  }, [modelProvider, localUrl]);

  const doTranslate = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setLastTranscript(text);
    setIsTranslating(true); setErrorMsg('');
    const result = await generateTranslation(text, targetLanguage, 'default_translator_session', modelProvider, localUrl);
    const isErr = ['error:', 'invalid', 'offline', 'failed', 'paused', 'backend'].some(k => result.toLowerCase().includes(k));
    if (isErr) { setErrorMsg(result); setTranslation(''); }
    else        { setTranslation(result); }
    setIsTranslating(false);
  }, [targetLanguage, modelProvider, localUrl]);

  const handleConfigurePort = () => {
    const currentUrl = localUrl || 'http://localhost:11434/v1';
    const newUrl = window.prompt("Enter Local API URL:", currentUrl);
    if (newUrl && newUrl.trim() !== '') {
        setLocalUrl(newUrl.trim());
    }
  };

  useEffect(() => {
    if (stRef.current) clearTimeout(stRef.current);
    if (isListening && transcript.length > 3) {
      stRef.current = setTimeout(() => { stopListening(); doTranslate(transcript); }, 2500);
    }
    return () => { if (stRef.current) clearTimeout(stRef.current); };
  }, [transcript, isListening, doTranslate]);

  const handleCopy = () => {
    if (!translationResult) return;
    navigator.clipboard.writeText(translationResult);
    setCopied(true); setTimeout(() => setCopied(false), 2200);
  };

  const handleSpeak = async () => {
    if (!translationResult || isSpeaking) return;
    setIsSpeaking(true);
    await speakResponse(translationResult, targetLanguage);
    setTimeout(() => setIsSpeaking(false), 1000 + translationResult.length * 60);
  };

  const handleClear = () => {
    setTranslation(''); setLastTranscript(''); setErrorMsg('');
    window.speechSynthesis.cancel(); setIsSpeaking(false);
  };

  const hasText = !!(transcript || lastTranscript);

  return (
    <div style={{
      width: '100%', height: '100vh',
      background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #120d2a 0%, #08070f 50%, #070610 100%)',
      display: 'flex', flexDirection: 'column', color: '#fff', overflow: 'hidden', position: 'relative',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ── Deep glow orbs ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-20%', width: '70vw', height: '70vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,40,217,0.16) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-15%', width: '65vw', height: '65vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(67,56,202,0.12) 0%, transparent 70%)' }} />
      </div>

      {/* ── Header ── */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 20px 8px' }}>
        <button onClick={onBack} style={{
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
          padding: '9px 12px', cursor: 'pointer', color: '#ccc', display: 'flex', backdropFilter: 'blur(8px)',
          marginTop: '2px'
        }}>
          <ChevronLeft style={{ width: 18, height: 18 }} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Zap style={{ width: 14, height: 14, color: '#a78bfa' }} />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#d1d5db' }}>Live Translator</span>
          </div>
          
          {/* Model Toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
            padding: '4px 8px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.1)',
            marginTop: '8px'
          }}>
            <button
                onClick={() => setModelProvider('gemini')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: 999,
                  transition: 'all 0.3s', cursor: 'pointer', border: 'none',
                  background: modelProvider === 'gemini' ? 'rgba(59,130,246,0.2)' : 'transparent',
                  boxShadow: modelProvider === 'gemini' ? '0 0 12px rgba(59,130,246,0.3)' : 'none',
                  opacity: modelProvider === 'gemini' ? 1 : 0.5
                }}
            >
                <Cloud style={{ width: 14, height: 14, color: modelProvider === 'gemini' ? '#60a5fa' : '#9ca3af' }} />
                <span style={{ color: modelProvider === 'gemini' ? '#93c5fd' : '#9ca3af', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em' }}>Gemini</span>
            </button>
            <button
                onClick={() => setModelProvider('local')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: 999,
                  transition: 'all 0.3s', cursor: 'pointer', border: 'none',
                  background: modelProvider === 'local' ? 'rgba(34,197,94,0.2)' : 'transparent',
                  boxShadow: modelProvider === 'local' ? '0 0 12px rgba(34,197,94,0.3)' : 'none',
                  opacity: modelProvider === 'local' ? 1 : 0.5
                }}
            >
                <Cpu style={{ width: 14, height: 14, color: modelProvider === 'local' ? '#4ade80' : '#9ca3af' }} />
                <span style={{ color: modelProvider === 'local' ? '#86efac' : '#9ca3af', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em' }}>Local</span>
            </button>
            
            {/* Local Status Indicator inline */}
            {modelProvider === 'local' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '8px' }}>
                    <div style={{ position: 'relative', width: '8px', height: '8px' }}>
                        {localStatus === 'checking' && <span style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', background: '#fbbf24', animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' }} />}
                        <span style={{ 
                            position: 'absolute', width: '8px', height: '8px', borderRadius: '50%',
                            background: localStatus === 'checking' ? '#f59e0b' : localStatus === 'connected' ? '#22c55e' : '#ef4444',
                            boxShadow: localStatus === 'connected' ? '0 0 8px #22c55e' : 'none'
                        }} />
                    </div>
                    <button onClick={handleConfigurePort} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }} title="Configure Local URL">
                        <Settings style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.5)' }} />
                    </button>
                </div>
            )}
          </div>
        </div>

        <button onClick={handleClear} style={{
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
          padding: '9px 12px', cursor: 'pointer', color: '#9ca3af', display: 'flex', backdropFilter: 'blur(8px)',
          marginTop: '2px'
        }}>
          <RotateCcw style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* ── Language strip ── */}
      <div style={{ position: 'relative', zIndex: 10, overflowX: 'auto', padding: '6px 20px', scrollbarWidth: 'none' }}>
        <div style={{ display: 'flex', gap: 7 }}>
          {LANGUAGES.map(l => {
            const sel = l.code === targetLanguage;
            return (
              <motion.button
                key={l.code}
                whileTap={{ scale: 0.93 }}
                onClick={() => { setTargetLanguage(l.code); setTranslation(''); setErrorMsg(''); }}
                style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 600,
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
                  background: sel ? 'linear-gradient(135deg, #6d28d9, #4338ca)' : 'rgba(255,255,255,0.05)',
                  border: sel ? '1px solid rgba(167,139,250,0.6)' : '1px solid rgba(255,255,255,0.08)',
                  color: sel ? '#fff' : '#6b7280',
                  boxShadow: sel ? '0 0 16px rgba(109,40,217,0.4)' : 'none',
                }}
              >
                <span style={{ fontSize: 15 }}>{l.flag}</span>
                <span>{l.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Direction bar ── */}
      <div style={{ position: 'relative', zIndex: 10, padding: '8px 20px 0' }}>
        <GlassPanel
          borderGradient="linear-gradient(135deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03))"
          style={{ borderRadius: 18 }}
        >
          <div style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: 20 }}>🇺🇸</span>
              <div>
                <div style={{ fontSize: 9, color: '#4b5563', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>From</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb', marginTop: 1 }}>English</div>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.4))' }} />
              <div style={{
                padding: '5px 12px', borderRadius: 9,
                background: 'linear-gradient(135deg, rgba(109,40,217,0.3), rgba(67,56,202,0.2))',
                border: '1px solid rgba(139,92,246,0.35)',
                fontSize: 12, fontWeight: 700, color: '#c4b5fd', letterSpacing: '0.04em',
              }}>
                {lang.flag}  {lang.label} →
              </div>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(124,58,237,0.4), transparent)' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexDirection: 'row-reverse' }}>
              <span style={{ fontSize: 20 }}>{lang.flag}</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, color: '#4b5563', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>To</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#a78bfa', marginTop: 1 }}>{lang.label}</div>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* ── Main panels ── */}
      <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 20px 0', minHeight: 0 }}>

        {/* INPUT */}
        <GlassPanel
          style={{ flex: 1, minHeight: 0 }}
          borderGradient={isListening
            ? 'linear-gradient(135deg, rgba(167,139,250,0.5), rgba(109,40,217,0.2), rgba(167,139,250,0.15))'
            : 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03), rgba(139,92,246,0.06))'}
          glow={isListening ? '0 0 30px rgba(124,58,237,0.18)' : undefined}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 16px', minHeight: 0 }}>

            {/* Label row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <PanelLabel color={isListening ? '#a78bfa' : '#4b5563'}>
                <span style={{
                  display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                  background: isListening ? '#a78bfa' : '#374151',
                  boxShadow: isListening ? '0 0 6px #a78bfa' : 'none',
                  transition: 'all 0.3s',
                }} />
                🎙 Original
              </PanelLabel>
              {isListening && <SoundBars active />}
            </div>

            {/* Text zone */}
            <div style={{
              flex: 1, overflowY: 'auto', borderRadius: 12,
              background: hasText
                ? 'linear-gradient(150deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.2) 100%)'
                : 'rgba(0,0,0,0.15)',
              border: hasText ? '1px solid rgba(255,255,255,0.07)' : '1px dashed rgba(255,255,255,0.055)',
              padding: '14px 16px', display: 'flex', alignItems: hasText ? 'flex-start' : 'center',
            }}>
              <AnimatePresence mode="wait">
                {hasText ? (
                  <motion.p key="t" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    style={{ margin: 0, fontSize: 17, lineHeight: 1.65, color: '#e5e7eb', fontWeight: 400 }}>
                    {transcript || lastTranscript}
                  </motion.p>
                ) : (
                  <motion.div key="ph" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ width: '100%', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🎙</div>
                    <p style={{ margin: 0, fontSize: 14, color: '#374151', fontStyle: 'italic' }}>
                      {isListening ? 'Speak now…' : 'Tap the mic to start listening'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </GlassPanel>

        {/* OUTPUT */}
        <GlassPanel
          style={{ flex: 1.45, minHeight: 0 }}
          borderGradient={translationResult
            ? 'linear-gradient(135deg, rgba(139,92,246,0.65), rgba(67,56,202,0.3), rgba(139,92,246,0.2))'
            : 'linear-gradient(135deg, rgba(109,40,217,0.25), rgba(67,56,202,0.1), rgba(109,40,217,0.08))'}
          glow={translationResult ? '0 0 40px rgba(109,40,217,0.25)' : undefined}
        >
          {/* Shimmer top line */}
          <div style={{
            height: 2, flexShrink: 0,
            background: translationResult
              ? 'linear-gradient(90deg, transparent, #7c3aed, #4f46e5, #7c3aed, transparent)'
              : 'linear-gradient(90deg, transparent, rgba(109,40,217,0.35), transparent)',
          }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 16px', minHeight: 0 }}>
            {/* Label row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <PanelLabel color="#7c3aed">
                {lang.flag} {lang.label} Translation
              </PanelLabel>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 6 }}>
                <AnimatePresence>
                  {translationResult && (
                    <>
                      <motion.button key="c" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
                        onClick={handleCopy} title="Copy"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '7px 8px', cursor: 'pointer', display: 'flex' }}>
                        {copied ? <Check style={{ width: 13, height: 13, color: '#34d399' }} /> : <Copy style={{ width: 13, height: 13, color: '#9ca3af' }} />}
                      </motion.button>
                      <motion.button key="s" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
                        onClick={handleSpeak} disabled={isSpeaking} title="Speak"
                        style={{
                          background: isSpeaking ? 'rgba(109,40,217,0.3)' : 'rgba(255,255,255,0.07)',
                          border: isSpeaking ? '1px solid rgba(139,92,246,0.55)' : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 9, padding: '7px 8px', cursor: isSpeaking ? 'default' : 'pointer', display: 'flex',
                          boxShadow: isSpeaking ? '0 0 10px rgba(124,58,237,0.4)' : 'none',
                        }}>
                        <Volume2 style={{ width: 13, height: 13, color: isSpeaking ? '#a78bfa' : '#9ca3af' }} />
                      </motion.button>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Text zone */}
            <div style={{
              flex: 1, overflowY: 'auto', borderRadius: 12,
              background: translationResult
                ? 'linear-gradient(150deg, rgba(109,40,217,0.08) 0%, rgba(0,0,0,0.25) 100%)'
                : 'rgba(0,0,0,0.15)',
              border: translationResult
                ? '1px solid rgba(109,40,217,0.22)'
                : '1px dashed rgba(109,40,217,0.15)',
              padding: '14px 16px',
              display: 'flex', alignItems: translationResult ? 'flex-start' : 'center',
              flexDirection: 'column', justifyContent: translationResult ? 'flex-start' : 'center',
            }}>
              <AnimatePresence mode="wait">
                {isTranslating ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {[0, 1, 2].map(i => (
                        <motion.div key={i}
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.13 }}
                          style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #4338ca)' }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 13, color: '#7c3aed', fontStyle: 'italic' }}>Translating…</span>
                  </motion.div>
                ) : errorMsg ? (
                  <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{
                      display: 'flex', gap: 9, alignItems: 'flex-start',
                      background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: 10, padding: '12px 14px', color: '#f87171', fontSize: 13, width: '100%',
                    }}>
                    <span>⚠️</span><span>{errorMsg}</span>
                  </motion.div>
                ) : translationResult ? (
                  <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%' }}>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 600, color: '#fff', lineHeight: 1.55, letterSpacing: '0.01em' }}>
                      {translationResult}
                    </p>
                    <AnimatePresence>
                      {isSpeaking && (
                        <motion.div key="wv" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <SoundBars active />
                          <span style={{ fontSize: 11, color: '#7c3aed', fontStyle: 'italic', letterSpacing: '0.05em' }}>Speaking…</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{lang.flag}</div>
                    <p style={{ margin: 0, fontSize: 14, color: '#5b21b6', fontStyle: 'italic' }}>
                      Translation will appear here…
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* ── Mic dock ── */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 20px 18px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={isListening ? 'live' : 'idle'}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            style={{
              padding: '4px 14px', borderRadius: 999, marginBottom: 6,
              background: isListening ? 'rgba(109,40,217,0.2)' : 'rgba(255,255,255,0.04)',
              border: isListening ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.07)',
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const,
              color: isListening ? '#a78bfa' : '#374151',
              boxShadow: isListening ? '0 0 14px rgba(109,40,217,0.3)' : 'none',
            }}
          >
            {isListening ? '● LIVE — silence auto-translates' : 'Tap to start'}
          </motion.div>
        </AnimatePresence>

        <MicButton isListening={isListening} onClick={() => isListening ? stopListening() : startListening()} />

        <p style={{ margin: '4px 0 0', fontSize: 10, color: '#1f2937', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
          {isListening ? 'mic active' : 'mic off'}
        </p>
      </div>
    </div>
  );
};
