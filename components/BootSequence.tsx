'use client';

import { useEffect, useState, useRef } from 'react';
import { useJarvisStore } from '@/store/jarvis-state';

type LineType = 'gold' | 'system' | 'ok' | 'warning' | 'arc' | 'dim';

interface BootLine {
  text: string;
  delay: number;
  type: LineType;
}

const BOOT_LINES: BootLine[] = [
  { text: '', delay: 200, type: 'dim' },
  { text: '╔═══════════════════════════════════════════════╗', delay: 100, type: 'gold' },
  { text: '║            J . A . R . V . I . S .            ║', delay: 50,  type: 'gold' },
  { text: '║        MALIBU, CA  —  CLASSIFIED SYSTEMS       ║', delay: 50,  type: 'gold' },
  { text: '╚═══════════════════════════════════════════════╝', delay: 100,  type: 'gold' },
  { text: '', delay: 250, type: 'dim' },
  { text: 'Initializing J.A.R.V.I.S. v7.0...', delay: 500, type: 'system' },
  { text: '', delay: 150, type: 'dim' },
  { text: 'Arc Reactor Interface ................. [CONNECTED]', delay: 350, type: 'ok' },
  { text: 'Repulsor Calibration Systems .......... [ONLINE]',   delay: 280, type: 'ok' },
  { text: 'Mark L Armor Bus ...................... [READY]',     delay: 300, type: 'ok' },
  { text: 'Threat Detection Array ................ [ACTIVE]',   delay: 320, type: 'ok' },
  { text: 'Core Analytics Engine ................. [RUNNING]',  delay: 260, type: 'ok' },
  { text: 'Communications Relay .................. [OPEN]',     delay: 240, type: 'ok' },
  { text: 'Neural Interface Link ................. [ESTABLISHED]', delay: 300, type: 'ok' },
  { text: 'Voice Synthesis Module ................ [ONLINE]',   delay: 220, type: 'ok' },
  { text: '', delay: 300, type: 'dim' },
  { text: '⚠ SOKOVIA ACCORD STATUS: PENDING REVIEW',           delay: 200, type: 'warning' },
  { text: '⚠ Mark L structural integrity at 94% — routine wear', delay: 150, type: 'warning' },
  { text: '', delay: 300, type: 'dim' },
  { text: 'Good morning, Sir.',     delay: 500, type: 'arc' },
  { text: 'All systems nominal.', delay: 250, type: 'arc' },
  { text: '', delay: 200, type: 'dim' },
  { text: 'Voice interface ready. Say "Hey JARVIS" or use the microphone.', delay: 100, type: 'dim' },
];

const LINE_COLORS: Record<LineType, string> = {
  gold:    'var(--gold)',
  system:  'var(--arc)',
  ok:      'var(--ok)',
  warning: 'var(--warning)',
  arc:     'var(--arc)',
  dim:     'var(--text-dim)',
};

export default function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [visibleLines, setVisibleLines] = useState<BootLine[]>([]);
  const [fading, setFading] = useState(false);
  const completeBootSequence = useJarvisStore((s) => s.completeBootSequence);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;

    const showLines = async () => {
      let accumulated: BootLine[] = [];
      for (const line of BOOT_LINES) {
        if (cancelled) return;
        await new Promise<void>((res) => { timeout = setTimeout(res, line.delay); });
        if (cancelled) return;
        accumulated = [...accumulated, line];
        setVisibleLines([...accumulated]);
        // Auto-scroll
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }

      // Speak welcome
      if (!cancelled && typeof window !== 'undefined' && window.speechSynthesis) {
        const utt = new SpeechSynthesisUtterance('Good morning, Sir. All systems nominal.');
        utt.rate = 0.92;
        utt.pitch = 0.82;
        const voices = speechSynthesis.getVoices();
        const british = voices.find((v) => v.lang === 'en-GB' && v.name.includes('Daniel'))
          ?? voices.find((v) => v.lang.startsWith('en-GB'));
        if (british) utt.voice = british;
        speechSynthesis.speak(utt);
      }

      // Fade out after delay
      await new Promise<void>((res) => { timeout = setTimeout(res, 1400); });
      if (!cancelled) {
        setFading(true);
        await new Promise<void>((res) => { timeout = setTimeout(res, 800); });
        if (!cancelled) {
          completeBootSequence();
          onComplete();
        }
      }
    };

    showLines();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [completeBootSequence, onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.8s ease-out',
      }}
    >
      <div
        ref={scrollRef}
        style={{
          width: '100%',
          maxWidth: 600,
          maxHeight: '80vh',
          overflowY: 'hidden',
          padding: '0 24px',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          lineHeight: 1.8,
        }}
      >
        {visibleLines.map((line, i) => (
          <div
            key={i}
            style={{
              color: LINE_COLORS[line.type],
              textShadow: line.type === 'gold' ? '0 0 8px var(--gold)' :
                          line.type === 'arc'  ? '0 0 8px var(--arc)' :
                          line.type === 'ok'   ? '0 0 6px var(--ok)' : 'none',
              fontFamily: line.type === 'gold' ? 'var(--font-display)' : 'var(--font-mono)',
              letterSpacing: line.type === 'gold' ? '0.15em' : '0.05em',
              animation: 'bootFadeIn 0.3s ease-out',
              minHeight: line.text === '' ? '0.5em' : undefined,
            }}
          >
            {line.text || '\u00A0'}
          </div>
        ))}

        {/* Blinking cursor at end */}
        <div style={{ color: 'var(--arc)', animation: 'blink 1s step-end infinite' }}>▌</div>
      </div>
    </div>
  );
}
