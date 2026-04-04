'use client';

import { useRef, useState, useEffect } from 'react';
import { useJarvisStore } from '@/store/jarvis-state';

// Speech API types (not in TS DOM lib by default in some configs)
interface ISpeechRecognitionResult { readonly 0: { transcript: string }; }
interface ISpeechRecognitionEvent extends Event {
  results: ISpeechRecognitionResult[] & { length: number };
}
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

type ExtWindow = Window & typeof globalThis & {
  _jarvisCall?: (msg: string) => void;
  SpeechRecognition?: new () => ISpeechRecognition;
  webkitSpeechRecognition?: new () => ISpeechRecognition;
};

export default function MicButton() {
  const voiceStatus = useJarvisStore((s) => s.voiceStatus);
  const isAlwaysListening = useJarvisStore((s) => s.isAlwaysListening);
  const toggleAlwaysListening = useJarvisStore((s) => s.toggleAlwaysListening);
  const setTranscript = useJarvisStore((s) => s.setTranscript);
  const setVoiceStatus = useJarvisStore((s) => s.setVoiceStatus);

  const [hasVoiceSupport, setHasVoiceSupport] = useState(true);
  const [textInput, setTextInput] = useState('');
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    const w = window as ExtWindow;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    setHasVoiceSupport(!!SR);
  }, []);

  const startListening = () => {
    const w = window as ExtWindow;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    transcriptRef.current = '';
    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      const t = Array.from({ length: event.results.length }, (_, i) => event.results[i][0].transcript).join('');
      transcriptRef.current = t;
      setTranscript(t);
    };

    recognition.onstart = () => setVoiceStatus('listening');

    recognition.onend = () => {
      const final = transcriptRef.current.trim();
      if (final && w._jarvisCall) {
        w._jarvisCall(final);
      } else {
        setVoiceStatus('standby');
      }
    };

    recognition.onerror = () => setVoiceStatus('standby');

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = textInput.trim();
    if (!val) return;
    setTranscript(val);
    setTextInput('');
    const w = window as ExtWindow;
    if (w._jarvisCall) w._jarvisCall(val);
  };

  const isActive = voiceStatus === 'listening' || voiceStatus === 'processing';
  void isActive; // used for className

  if (!hasVoiceSupport) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
        <div style={{
          fontSize: 9, color: 'var(--warning)', letterSpacing: '0.1em',
          padding: '4px 8px', border: '1px solid var(--warning)', textAlign: 'center',
        }}>
          ⚠ VOICE REQUIRES CHROME — TEXT MODE ACTIVE
        </div>
        <form onSubmit={handleTextSubmit} style={{ display: 'flex', gap: 6 }}>
          <input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Speak to JARVIS..."
            style={{
              flex: 1,
              background: 'rgba(0,212,255,0.06)',
              border: '1px solid var(--arc-dark)',
              color: 'var(--text)',
              padding: '6px 10px',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={voiceStatus === 'processing'}
            style={{
              background: 'rgba(0,212,255,0.1)',
              border: '1px solid var(--arc)',
              color: 'var(--arc)',
              padding: '6px 12px',
              fontFamily: 'var(--font-display)',
              fontSize: 9,
              letterSpacing: '0.1em',
              cursor: 'pointer',
            }}
          >
            SEND
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* Main mic button */}
      <button
        className={`mic-btn ${voiceStatus === 'listening' ? 'listening' : ''} ${voiceStatus === 'processing' ? 'processing' : ''}`}
        onMouseDown={startListening}
        onMouseUp={stopListening}
        onTouchStart={startListening}
        onTouchEnd={stopListening}
        disabled={voiceStatus === 'processing' || voiceStatus === 'responding'}
        title="Hold to speak to JARVIS"
      >
        {voiceStatus === 'processing' ? (
          <span style={{ fontSize: 18, animation: 'arcPulse 0.5s ease-in-out infinite' }}>◌</span>
        ) : voiceStatus === 'responding' ? (
          <span style={{ fontSize: 18 }}>◉</span>
        ) : (
          <span style={{ fontSize: 20 }}>🎙</span>
        )}
      </button>

      <div style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: '0.1em', textAlign: 'center' }}>
        {voiceStatus === 'standby' && 'HOLD TO SPEAK'}
        {voiceStatus === 'listening' && '● RECORDING...'}
        {voiceStatus === 'processing' && '◌ PROCESSING...'}
        {voiceStatus === 'responding' && '◉ JARVIS RESPONDING'}
      </div>

      {/* Always-listening toggle */}
      <button
        onClick={toggleAlwaysListening}
        style={{
          background: isAlwaysListening ? 'rgba(0,212,255,0.12)' : 'transparent',
          border: `1px solid ${isAlwaysListening ? 'var(--arc)' : 'var(--border)'}`,
          color: isAlwaysListening ? 'var(--arc)' : 'var(--text-dim)',
          padding: '3px 8px',
          fontFamily: 'var(--font-display)',
          fontSize: 8,
          letterSpacing: '0.1em',
          cursor: 'pointer',
          textTransform: 'uppercase',
        }}
      >
        {isAlwaysListening ? '● ALWAYS LISTENING' : '○ PUSH TO TALK'}
      </button>

      {/* Text fallback always available */}
      <form onSubmit={handleTextSubmit} style={{ display: 'flex', gap: 4, width: '100%' }}>
        <input
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Or type here..."
          style={{
            flex: 1,
            background: 'rgba(0,212,255,0.04)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            padding: '4px 8px',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            outline: 'none',
            minWidth: 0,
          }}
        />
        <button
          type="submit"
          style={{
            background: 'transparent',
            border: '1px solid var(--arc-dark)',
            color: 'var(--arc-dim)',
            padding: '4px 8px',
            fontFamily: 'var(--font-display)',
            fontSize: 8,
            letterSpacing: '0.08em',
            cursor: 'pointer',
          }}
        >
          ▶
        </button>
      </form>
    </div>
  );
}
