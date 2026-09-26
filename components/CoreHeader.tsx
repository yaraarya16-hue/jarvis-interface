'use client';

import { useEffect, useState } from 'react';
import { useJarvisStore } from '@/store/jarvis-state';

export default function CoreHeader() {
  const [time, setTime] = useState('');
  const voiceStatus = useJarvisStore((s) => s.voiceStatus);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '18px 16px 4px' }}>
      <span className="text-glow-gold" style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 900, letterSpacing: '0.42em', color: 'var(--gold)', paddingLeft: '0.42em' }}>J.A.R.V.I.S.</span>
      <span style={{ fontSize: 8, letterSpacing: '0.34em', color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: -4 }}>PERSONAL AI ASSISTANT · v7.0</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '7px 20px', borderRadius: 999, border: '1px solid var(--border)', background: 'rgba(255,158,44,0.03)', backdropFilter: 'blur(2px)' }}>
        <Stat label="SYSTEM" value="ONLINE" color="var(--ok)" />
        <Divider />
        <Stat label="VOICE" value={voiceStatus.toUpperCase()} color={voiceStatus === 'standby' ? 'var(--text)' : 'var(--core-bright)'} />
        <Divider />
        <Stat label="TIME" value={time} color="var(--text)" />
      </div>
      <span style={{ fontSize: 8, letterSpacing: '0.24em', color: voiceStatus === 'standby' ? 'var(--text-dim)' : 'var(--core-bright)', fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>◦ {voiceStatus}</span>
    </header>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 20, background: 'var(--border)' }} />;
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ fontSize: 7.5, letterSpacing: '0.16em', color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>{value}</span>
    </div>
  );
}
