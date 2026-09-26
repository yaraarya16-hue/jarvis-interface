'use client';

import VoiceController from '@/components/VoiceController';
import SpeakerVerification from '@/components/SpeakerVerification';
import AICore from '@/components/animations/AICore';
import CoreHeader from '@/components/CoreHeader';
import CoreTranscript from '@/components/CoreTranscript';
import MicButton from '@/components/MicButton';

export default function JarvisLayout() {
  return (
    <div className="scanlines" style={{ position: 'relative', height: '100dvh', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
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
