'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useJarvisStore } from '@/store/jarvis-state';

interface SpeechRecognitionResultLike {
  readonly 0: { transcript: string };
}
interface SpeechRecognitionEventLike extends Event {
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event?: Event) => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type ExtWindow = Window & {
  _jarvisCall?: (msg: string) => void;
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function MicGlyph() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

  const [supported, setSupported] = useState(true);
  const [pressed, setPressed] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef('');
  const activeRef = useRef(false);

  useEffect(() => {
    const w = window as ExtWindow;
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const stopRecognition = useCallback(() => {
    activeRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
    setPressed(false);
  }, []);

  const startRecognition = useCallback(() => {
    if (activeRef.current) return;

    const w = window as ExtWindow;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    transcriptRef.current = '';
    setTranscript('');
    activeRef.current = true;
    setPressed(true);

    recognition.onstart = () => setVoiceStatus('listening');

    recognition.onresult = (event) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      transcriptRef.current = text;
      setTranscript(text);
    };

    recognition.onerror = () => {
      activeRef.current = false;
      setPressed(false);
      setVoiceStatus('standby');
    };

    recognition.onend = () => {
      const finalText = transcriptRef.current.trim();
      const call = (window as ExtWindow)._jarvisCall;

      activeRef.current = false;
      setPressed(false);

      if (finalText && call) {
        setVoiceStatus('processing');
        call(finalText);
      } else {
        setVoiceStatus('standby');
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      activeRef.current = false;
      setPressed(false);
      setVoiceStatus('standby');
    }
  }, [setTranscript, setVoiceStatus]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      try { recognitionRef.current?.stop(); } catch {}
    };
  }, []);

  const statusLabel =
    voiceStatus === 'listening' ? 'LISTENING' :
    voiceStatus === 'processing' ? 'PROCESSING' :
    voiceStatus === 'responding' ? 'RESPONDING' :
    supported ? 'HOLD TO SPEAK' : 'TEXT MODE';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%', maxWidth: 440, margin: '0 auto' }}>
      {supported ? (
        <button
          type="button"
          aria-label="Hold to speak to JARVIS"
          className={`mic-orb ${voiceStatus}${pressed ? ' is-pressed' : ''}`}
          style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture?.(e.pointerId);
            startRecognition();
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            stopRecognition();
          }}
          onPointerCancel={(e) => {
            e.preventDefault();
            stopRecognition();
          }}
          onLostPointerCapture={stopRecognition}
          disabled={voiceStatus === 'processing' || voiceStatus === 'responding'}
        >
          <span className="mic-ripple" />
          <MicGlyph />
        </button>
      ) : (
        <div className="mic-orb" aria-hidden="true" style={{ opacity: 0.55 }}>
          <MicGlyph />
        </div>
      )}

      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 8,
        letterSpacing: '0.28em',
        color: voiceStatus === 'standby' ? 'var(--text-dim)' : 'var(--core-bright)',
        textTransform: 'uppercase'
      }}>
        {statusLabel}
      </div>

      {supported && (
        <button
          type="button"
          onClick={toggleAlwaysListening}
          className="mode-chip"
          aria-pressed={isAlwaysListening}
        >
          {isAlwaysListening ? '◉ ALWAYS LISTENING' : '▷ PUSH TO TALK'}
        </button>
      )}
    </div>
  );
}
