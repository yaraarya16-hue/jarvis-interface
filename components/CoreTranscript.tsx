'use client';

import { useEffect, useRef, useState } from 'react';
import { useJarvisStore } from '@/store/jarvis-state';

export default function CoreTranscript() {
  const transcript = useJarvisStore((s) => s.waveform.transcript);
  const jarvisResponse = useJarvisStore((s) => s.waveform.jarvisResponse);
  const voiceStatus = useJarvisStore((s) => s.voiceStatus);

  const [typed, setTyped] = useState('');
  const typeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Compute the time-based greeting only after mount to avoid SSR/client mismatch.
  const [timeOfDay, setTimeOfDay] = useState<string | null>(null);
  useEffect(() => {
    setTimeOfDay(getTimeOfDay());
  }, []);

  // Typewriter effect for the latest JARVIS response
  useEffect(() => {
    if (!jarvisResponse) return;
    if (typeRef.current) clearInterval(typeRef.current);
    let i = 0;
    setTyped('');
    typeRef.current = setInterval(() => {
      i++;
      setTyped(jarvisResponse.slice(0, i));
      if (i >= jarvisResponse.length && typeRef.current) clearInterval(typeRef.current);
    }, 16);
    return () => { if (typeRef.current) clearInterval(typeRef.current); };
  }, [jarvisResponse]);

  const showUser = transcript && (voiceStatus === 'listening' || voiceStatus === 'processing' || !typed);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 440,
        margin: '0 auto',
        minHeight: 66,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        gap: 8,
        padding: '0 4px',
      }}
    >
      {showUser && (
        <div style={{ animation: 'rise 0.3s ease-out', textAlign: 'center' }}>
          <span style={{ fontSize: 8, letterSpacing: '0.24em', color: 'var(--text-dim)', fontFamily: 'var(--font-display)' }}>
            YOU
          </span>
          <p style={{ fontSize: 13, color: 'var(--core-bright)', fontStyle: 'italic', marginTop: 3, lineHeight: 1.4 }}>
            &ldquo;{transcript}&rdquo;
          </p>
        </div>
      )}

      {typed && !showUser && (
        <div style={{ animation: 'rise 0.3s ease-out', textAlign: 'center', maxHeight: 118, overflowY: 'auto' }}>
          <span style={{ fontSize: 8, letterSpacing: '0.24em', color: 'var(--gold-dim)', fontFamily: 'var(--font-display)' }}>
            J.A.R.V.I.S.
          </span>
          <p style={{ fontSize: 13, color: 'var(--text)', marginTop: 3, lineHeight: 1.55 }}>
            {typed}
            {typed.length < jarvisResponse.length && (
              <span style={{ color: 'var(--core)', animation: 'blink 0.8s step-end infinite' }}>▌</span>
            )}
          </p>
        </div>
      )}

      {!transcript && !typed && (
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em', lineHeight: 1.6 }}>
          Good {timeOfDay ?? 'day'}, Mr. Stark.<br />
          All systems nominal — awaiting your command.
        </p>
      )}
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
