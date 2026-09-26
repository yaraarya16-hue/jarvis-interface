'use client';

import { useEffect, useRef } from 'react';
import { useJarvisStore } from '@/store/jarvis-state';
import VoiceController from '@/components/VoiceController';
import SpeakerVerification from '@/components/SpeakerVerification';
import AICore from '@/components/animations/AICore';
import CoreHeader from '@/components/CoreHeader';
import CoreTranscript from '@/components/CoreTranscript';
import MicButton from '@/components/MicButton';

export default function JarvisLayout() {
  const easterEggs = useJarvisStore((s) => s.easterEggs);
  const clearEasterEgg = useJarvisStore((s) => s.clearEasterEgg);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (easterEggs.fridayMode) {
      el.classList.add('friday-mode');
      return () => el.classList.remove('friday-mode');
    }
  }, [easterEggs.fridayMode]);

  return (
    <div ref={containerRef} className="scanlines" style={{ position: 'relative', height: '100dvh', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      <div className="env-vignette" />
      <VoiceController />
      <SpeakerVerification />
      <AICore />
      <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <CoreHeader />
        <div style={{ flex: 1, minHeight: 0 }} />
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16, padding: '10px 18px calc(20px + env(safe-area-inset-bottom))', background: 'linear-gradient(to top, rgba(4,3,2,0.92) 40%, rgba(4,3,2,0.4) 78%, transparent)' }}>
          <CoreTranscript />
          <MicButton />
        </div>
      </div>
    </div>
  );
}
