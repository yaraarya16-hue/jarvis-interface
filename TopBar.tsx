'use client';

import { useState, useEffect } from 'react';
import { useJarvisStore } from '@/store/jarvis-state';

const ALERT_COLORS = {
  green:    '#00ff88',
  yellow:   '#ffd700',
  red:      '#ff8800',
  critical: '#ff2244',
};

export default function TopBar() {
  const [time, setTime] = useState('');
  const arcOutput = useJarvisStore((s) => s.suit.arcReactorOutput);
  const alertLevel = useJarvisStore((s) => s.radar.alertLevel);
  const voiceStatus = useJarvisStore((s) => s.voiceStatus);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false }) + ' UTC');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const alertColor = ALERT_COLORS[alertLevel];

  return (
    <div style={{
      flexShrink: 0,
      height: 38,
      background: 'rgba(5,8,15,0.97)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 0,
      zIndex: 10,
      position: 'relative',
    }}>
      {/* Left: Stark Industries branding */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        {/* Arc reactor mini icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" fill="none" stroke="#00d4ff" strokeWidth="1" opacity="0.6"
            style={{ transformOrigin: '12px 12px', animation: 'spin 8s linear infinite' }} />
          <polygon points="12,5 17,8.5 17,15.5 12,19 7,15.5 7,8.5"
            fill="none" stroke="#00d4ff" strokeWidth="1.2" opacity="0.9" />
          <circle cx="12" cy="12" r="3" fill="#00d4ff" opacity="0.8" />
        </svg>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.25em',
          color: 'var(--gold)',
        }}>
          AUTONOMOUS AI CORE
        </span>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 9,
          color: 'var(--text-dim)',
          letterSpacing: '0.12em',
        }}>
          J.A.R.V.I.S. v7.0
        </span>
      </div>

      {/* Center: status indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color: 'var(--text-dim)', fontSize: 9, letterSpacing: '0.1em' }}>ARC REACTOR</span>
          <span style={{ color: arcOutput > 30 ? 'var(--ok)' : 'var(--danger)', fontSize: 10, fontWeight: 'bold' }}>
            {arcOutput}%
          </span>
        </div>

        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color: 'var(--text-dim)', fontSize: 9, letterSpacing: '0.1em' }}>THREAT</span>
          <span style={{ color: alertColor, fontSize: 10, fontWeight: 'bold' }}>
            {alertLevel.toUpperCase()}
          </span>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: alertColor,
            boxShadow: `0 0 5px ${alertColor}`,
            animation: alertLevel !== 'green' ? 'blink 1s step-end infinite' : 'none',
          }} />
        </div>

        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color: 'var(--text-dim)', fontSize: 9, letterSpacing: '0.1em' }}>VOICE</span>
          <span style={{ color: voiceStatus === 'standby' ? 'var(--text-dim)' : 'var(--arc)', fontSize: 10 }}>
            {voiceStatus.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Right: clock */}
      <div style={{ flex: 1, textAlign: 'right' }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 10,
          color: 'var(--text-dim)',
          letterSpacing: '0.1em',
        }}>
          {time}
        </span>
      </div>
    </div>
  );
}
