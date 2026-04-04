'use client';

import { useEffect, useRef } from 'react';
import { useJarvisStore } from '@/store/jarvis-state';
import TopBar from '@/components/TopBar';
import SuitStatus from '@/components/panels/SuitStatus';
import ThreatRadar from '@/components/panels/ThreatRadar';
import WaveformCore from '@/components/panels/WaveformCore';
import StarkAnalytics from '@/components/panels/StarkAnalytics';
import CommsLog from '@/components/panels/CommsLog';
import VoiceController from '@/components/VoiceController';
import ParticleField from '@/components/animations/ParticleField';

export default function JarvisLayout() {
  const easterEggs = useJarvisStore((s) => s.easterEggs);
  const clearEasterEgg = useJarvisStore((s) => s.clearEasterEgg);
  const containerRef = useRef<HTMLDivElement>(null);

  // Apply easter egg classes to root
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (easterEggs.ironManFlash) {
      el.classList.add('iron-man-flash');
      const t = setTimeout(() => { el.classList.remove('iron-man-flash'); clearEasterEgg('ironMan'); }, 1600);
      return () => clearTimeout(t);
    }
  }, [easterEggs.ironManFlash, clearEasterEgg]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (easterEggs.avengersAssemble) {
      // Flash all panels
      el.querySelectorAll('.panel').forEach((p) => {
        p.classList.add('avengers-pulse');
        setTimeout(() => p.classList.remove('avengers-pulse'), 1400);
      });
    }
  }, [easterEggs.avengersAssemble]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (easterEggs.fridayMode) {
      el.classList.add('friday-mode');
      return () => el.classList.remove('friday-mode');
    }
  }, [easterEggs.fridayMode]);

  return (
    <div
      ref={containerRef}
      className="scanlines"
      style={{
        position: 'relative',
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg)',
        zIndex: 1,
      }}
    >
      <ParticleField />

      {/* Non-visual voice orchestrator */}
      <VoiceController />

      {/* Top bar */}
      <TopBar />

      {/* Body — fills remaining height */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Top row — 70% */}
        <div style={{ flex: '0 0 70%', display: 'flex', minHeight: 0 }}>
          <div style={{ flex: '0 0 30%', minWidth: 0 }}>
            <SuitStatus />
          </div>
          <div style={{ flex: '0 0 35%', minWidth: 0, borderLeft: '1px solid var(--border)' }}>
            <ThreatRadar />
          </div>
          <div style={{ flex: '0 0 35%', minWidth: 0, borderLeft: '1px solid var(--border)' }}>
            <WaveformCore />
          </div>
        </div>

        {/* Bottom row — 30% */}
        <div style={{ flex: '0 0 30%', display: 'flex', minHeight: 0, borderTop: '1px solid var(--border)' }}>
          <div style={{ flex: '0 0 60%', minWidth: 0 }}>
            <StarkAnalytics />
          </div>
          <div style={{ flex: '0 0 40%', minWidth: 0, borderLeft: '1px solid var(--border)' }}>
            <CommsLog />
          </div>
        </div>
      </div>
    </div>
  );
}
