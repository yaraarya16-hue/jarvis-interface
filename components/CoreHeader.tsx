'use client';

import { useState, useEffect } from 'react';
import { useJarvisStore } from '@/store/jarvis-state';

const ALERT_COLORS: Record<string, string> = {
  green:    '#ffb454',
  yellow:   '#ffce7a',
  red:      '#ff8a1e',
  critical: '#ff3b2f',
};

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ fontSize: 7.5, letterSpacing: '0.16em', color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>{value}</span>
    </div>
  );
}

export default function CoreHeader() {
  const [time, setTime] = useState('');
  const arcOutput = useJarvisStore((s) => s.suit.arcReactorOutput);
  const alertLevel = useJarvisStore((s) => s.radar.alertLevel);
  const voiceStatus = useJarvisStore((s) => s.voiceStatus);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const alertColor = ALERT_COLORS[alertLevel] ?? '#ffb454';

  return (
    <header
      style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        padding: '18px 16px 4px',
      }}
    >
      {/* Wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          className="text-glow-gold"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: '0.42em',
            color: 'var(--gold)',
            paddingLeft: '0.42em',
          }}
        >
          J.A.R.V.I.S.
        </span>
      </div>
      <span
        style={{
          fontSize: 8,
          letterSpacing: '0.34em',
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          marginTop: -4,
        }}
      >
        Stark Industries · v7.0
      </span>

      {/* Status row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          padding: '7px 20px',
          borderRadius: 999,
          border: '1px solid var(--border)',
          background: 'rgba(255,158,44,0.03)',
          backdropFilter: 'blur(2px)',
        }}
      >
        <Stat label="REACTOR" value={`${arcOutput}%`} color={arcOutput > 30 ? 'var(--ok)' : 'var(--danger)'} />
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{ fontSize: 7.5, letterSpacing: '0.16em', color: 'var(--text-dim)' }}>THREAT</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: alertColor, fontFamily: 'var(--font-display)' }}>
            <span
              style={{
                width: 5, height: 5, borderRadius: '50%', background: alertColor,
                boxShadow: `0 0 6px ${alertColor}`,
                animation: alertLevel !== 'green' ? 'statusDot 1s ease-in-out infinite' : 'none',
              }}
            />
            {alertLevel.toUpperCase()}
          </span>
        </div>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <Stat label="TIME" value={time} color="var(--text)" />
      </div>

      {/* Voice status ping */}
      <span
        style={{
          fontSize: 8,
          letterSpacing: '0.24em',
          color: voiceStatus === 'standby' ? 'var(--text-dim)' : 'var(--core-bright)',
          fontFamily: 'var(--font-display)',
          textTransform: 'uppercase',
        }}
      >
        ◦ {voiceStatus}
      </span>
    </header>
  );
}
