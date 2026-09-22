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

function MicGlyph() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </svg>
  );
}

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

  const statusLabel =
    voiceStatus === 'listening' ? 'LISTENING' :
    voiceStatus === 'processing' ? 'PROCESSING' :
    voiceStatus === 'responding' ? 'RESPONDING' :
    'STANDBY';

  const busy = voiceStatus === 'processing' || voiceStatus === 'responding';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        width: '100%',
        maxWidth: 440,
        margin: '0 auto',
      }}
    >
      {/* Mic orb + hint */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        {hasVoiceSupport ? (
          <button
            type="button"
            aria-label="Hold to speak to JARVIS"
            className={`mic-orb ${voiceStatus}`}
            onMouseDown={startListening}
            onMouseUp={stopListening}
            onMouseLeave={stopListening}
            onTouchStart={(e) => { e.preventDefault(); startListening(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopListening(); }}
            disabled={busy}
          >
            <span className="mic-ripple" />
            <MicGlyph />
          </button>
        ) : (
          <div
            className="mic-orb"
            style={{ cursor: 'default', opacity: 0.6 }}
            aria-hidden="true"
          >
            <MicGlyph />
          </div>
        )}

        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 8,
            letterSpacing: '0.28em',
            color: voiceStatus === 'standby' ? 'var(--text-dim)' : 'var(--core-bright)',
            textTransform: 'uppercase',
          }}
        >
          {hasVoiceSupport
            ? (voiceStatus === 'standby' ? 'HOLD TO SPEAK' : statusLabel)
            : 'TEXT MODE'}
        </div>
      </div>

      {/* Text input row */}
      <form onSubmit={handleTextSubmit} style={{ display: 'flex', gap: 8, width: '100%', alignItems: 'center' }}>
        <input
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Type a command for JARVIS…"
          className="console-input"
          aria-label="Type a command for JARVIS"
        />
        <button type="submit" className="console-send" aria-label="Send command">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </form>

      {/* Always-listening toggle */}
      {hasVoiceSupport && (
        <button
          type="button"
          onClick={toggleAlwaysListening}
          className="mode-chip"
          style={{
            border: `1px solid ${isAlwaysListening ? 'rgba(255,158,44,0.55)' : 'var(--border)'}`,
            color: isAlwaysListening ? 'var(--core-bright)' : 'var(--text-dim)',
            background: isAlwaysListening ? 'rgba(255,158,44,0.10)' : 'transparent',
          }}
        >
          {isAlwaysListening ? '● Always Listening' : '○ Push To Talk'}
        </button>
      )}
    </div>
  );
}
