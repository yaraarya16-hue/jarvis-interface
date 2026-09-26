'use client';

import { useEffect, useState } from 'react';
import { Eagle, EagleProfiler, type EagleProfile } from '@picovoice/eagle-web';
import { WebVoiceProcessor } from '@picovoice/web-voice-processor';

const PROFILE_KEY = 'jarvis-speaker-profile-v1';
const MODEL = { publicPath: '/eagle_params.pv', customWritePath: 'jarvis-eagle-model', version: 1 };
const THRESHOLD = 0.55;

type AudioEngine = { onmessage: (event: { data: { command: string; inputFrame: Int16Array } }) => void };
let eagle: Eagle | null = null;
let profiler: EagleProfiler | null = null;
let audioEngine: AudioEngine | null = null;
let captureActive = false;
let bestScore = 0;

function key() { return process.env.NEXT_PUBLIC_PICOVOICE_ACCESS_KEY || ''; }

function loadProfile(): EagleProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return { bytes: Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)) };
  } catch { return null; }
}

function saveProfile(profile: EagleProfile) {
  let binary = '';
  for (const byte of profile.bytes) binary += String.fromCharCode(byte);
  localStorage.setItem(PROFILE_KEY, btoa(binary));
}

export function hasSpeakerProfile() {
  return typeof window !== 'undefined' && Boolean(localStorage.getItem(PROFILE_KEY));
}

export async function beginSpeakerCapture() {
  const profile = loadProfile();
  if (!profile || !key()) return { locked: false };

  eagle = eagle || await Eagle.create(key(), MODEL, { voiceThreshold: 0.3 });
  bestScore = 0;
  captureActive = true;

  audioEngine = {
    onmessage: (event) => {
      if (!captureActive || event.data?.command !== 'process' || !eagle) return;
      void eagle.process(event.data.inputFrame, profile).then((scores) => {
        if (captureActive && scores?.length) bestScore = Math.max(bestScore, ...scores);
      }).catch(() => {});
    },
  };

  WebVoiceProcessor.setOptions({ frameLength: eagle.minProcessSamples, outputSampleRate: eagle.sampleRate });
  await WebVoiceProcessor.subscribe(audioEngine);
  return { locked: true };
}

export async function endSpeakerCapture() {
  if (!captureActive || !audioEngine) return { verified: true, score: 1 };
  captureActive = false;
  try { await WebVoiceProcessor.unsubscribe(audioEngine); } catch {}
  audioEngine = null;
  return { verified: bestScore >= THRESHOLD, score: bestScore };
}

async function runEnrollment(setProgress: (value: number) => void) {
  if (!key()) throw new Error('Picovoice AccessKey is not configured.');
  await WebVoiceProcessor.reset();
  profiler = await EagleProfiler.create(key(), MODEL, { minEnrollmentChunks: 8, voiceThreshold: 0.3 });

  audioEngine = {
    onmessage: (event) => {
      if (event.data?.command !== 'process' || !profiler) return;
      void profiler.enroll(event.data.inputFrame).then((result: any) => {
        const percent = typeof result === 'number' ? result : result?.percentage ?? 0;
        setProgress(percent);
        if (percent >= 100) captureActive = false;
      }).catch(() => {});
    },
  };

  captureActive = true;
  WebVoiceProcessor.setOptions({ frameLength: profiler.frameLength, outputSampleRate: profiler.sampleRate });
  await WebVoiceProcessor.subscribe(audioEngine);

  while (captureActive) await new Promise((resolve) => setTimeout(resolve, 100));
  const profile = await profiler.export();
  saveProfile(profile);
  await WebVoiceProcessor.reset();
  await profiler.release();
  profiler = null;
  audioEngine = null;
}

export default function SpeakerVerification() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => setReady(hasSpeakerProfile()), []);

  const enroll = async () => {
    setBusy(true);
    setProgress(0);
    setMessage('Speak normally — quiet room recommended');
    try {
      await runEnrollment(setProgress);
      setReady(true);
      setMessage('VOICE LOCK READY');
    } catch (error) {
      captureActive = false;
      await WebVoiceProcessor.reset().catch(() => {});
      try { await profiler?.release(); } catch {}
      profiler = null;
      audioEngine = null;
      setMessage(error instanceof Error ? error.message : 'Enrollment failed');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    localStorage.removeItem(PROFILE_KEY);
    setReady(false);
    setMessage('VOICE LOCK CLEARED');
  };

  return (
    <div style={{ position: 'absolute', top: 72, right: 16, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7 }}>
      <div style={{ display: 'flex', gap: 7 }}>
        <button type="button" className="mode-chip" onClick={() => void enroll()} disabled={busy}>
          {busy ? `VOICE ENROLL ${Math.round(progress)}%` : ready ? '◉ VOICE LOCK ON' : '◇ ENROLL MY VOICE'}
        </button>
        {ready && !busy && <button type="button" className="mode-chip" onClick={reset}>RESET</button>}
      </div>
      {message && <div style={{ fontFamily: 'var(--font-display)', fontSize: 8, letterSpacing: '0.14em', color: 'var(--core-bright)', textTransform: 'uppercase' }}>{message}</div>}
    </div>
  );
}
