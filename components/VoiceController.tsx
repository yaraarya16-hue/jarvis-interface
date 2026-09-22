'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useJarvisStore, JarvisApiResponse } from '@/store/jarvis-state';

interface ISpeechRecognitionResult { readonly 0: { transcript: string }; }
interface ISpeechRecognitionEvent extends Event {
  results: ISpeechRecognitionResult[] & { length: number };
}
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

type ExtWindow = Window & typeof globalThis & {
  _jarvisCall?: (msg: string) => void;
  _jarvisSpeak?: (text: string) => void;
  SpeechRecognition?: new () => ISpeechRecognition;
  webkitSpeechRecognition?: new () => ISpeechRecognition;
};

// Choose the deepest, calmest English male voice the device offers, with a
// graceful fallback to any English voice, then any voice at all.
export function pickJarvisVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const pool = english.length ? english : voices;

  // Named voices known to be low, clear and mature — British-leaning first.
  const preferred = [
    'google uk english male',
    'microsoft ryan', 'microsoft guy', 'microsoft george', 'microsoft davis',
    'daniel', 'arthur', 'oliver', 'rishi', 'alex', 'aaron', 'fred', 'thomas',
  ];
  for (const name of preferred) {
    const match = pool.find((v) => v.name.toLowerCase().includes(name));
    if (match) return match;
  }

  const femaleHint = /female|woman|zira|samantha|victoria|karen|moira|tessa|fiona|susan|hazel|catherine|serena|amelie|joana|luciana|paulina|allison|ava|nicky/i;
  const maleHint = /male|\bman\b|david|james|george|guy|ryan|daniel|arthur|oliver|alex|fred|aaron|rishi|thomas|mark|paul/i;

  // Prefer an explicitly male voice, biasing toward en-GB for a cinematic tone.
  const gb = pool.filter((v) => v.lang.toLowerCase() === 'en-gb');
  const male =
    gb.find((v) => maleHint.test(v.name)) ??
    pool.find((v) => maleHint.test(v.name)) ??
    pool.find((v) => !femaleHint.test(v.name));

  return male ?? pool[0];
}

export default function VoiceController() {
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const isCallingRef = useRef(false);

  const setVoiceStatus = useJarvisStore((s) => s.setVoiceStatus);
  const setTranscript = useJarvisStore((s) => s.setTranscript);
  const isAlwaysListening = useJarvisStore((s) => s.isAlwaysListening);

  // Load voices
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const loadVoices = () => { voicesRef.current = speechSynthesis.getVoices(); };
    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const speakJarvis = useCallback((text: string) => {
    if (typeof window === 'undefined' || !text) return;
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    // Measured, calm, cinematic delivery — slightly slower with a natural pitch.
    utt.rate = 0.9;
    utt.pitch = 0.9;
    utt.volume = 1;
    const voice = pickJarvisVoice(voicesRef.current);
    if (voice) utt.voice = voice;
    utt.onstart = () => setVoiceStatus('responding');
    utt.onend = () => setVoiceStatus('standby');
    utt.onerror = () => setVoiceStatus('standby');
    speechSynthesis.speak(utt);
  }, [setVoiceStatus]);

  const callJarvis = useCallback(async (userMessage: string) => {
    if (isCallingRef.current || !userMessage.trim()) return;
    isCallingRef.current = true;

    const store = useJarvisStore.getState();
    store.setVoiceStatus('processing');
    store.setAnalyzing(true);
    store.addAnalyticsLine({ text: `ANALYZING: ${userMessage.toUpperCase()}`, type: 'system' });
    store.addUserToHistory(userMessage);
    store.addMissionLog(`QUERY: "${userMessage.slice(0, 50)}"`);

    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage,
          chatHistory: store.chatHistory.slice(-16),
          suitMark: store.suit.suitMark,
          arcReactorOutput: store.suit.arcReactorOutput,
          alertLevel: store.radar.alertLevel,
        }),
      });

      const data: JarvisApiResponse = await res.json();
      store.processJarvisResponse(data);
      store.addMissionLog('JARVIS RESPONSE DELIVERED');

      speakJarvis(data.voiceText);
    } catch (err) {
      console.error('Jarvis call failed:', err);
      store.addAnalyticsLine({ text: '⚠ COMM LINK ERROR — check API key configuration', type: 'warning' });
      store.setVoiceStatus('standby');
      store.setAnalyzing(false);
    } finally {
      isCallingRef.current = false;
    }
  }, [speakJarvis]);

  // Expose on window for MicButton
  useEffect(() => {
    const w = window as ExtWindow;
    w._jarvisCall = callJarvis;
    w._jarvisSpeak = speakJarvis;
  }, [callJarvis, speakJarvis]);

  // Always-listening mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as ExtWindow;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR || !isAlwaysListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      const transcript = Array.from({ length: event.results.length }, (_, i) => event.results[i][0].transcript).join('');
      setTranscript(transcript);

      const isFinal = !!(event.results[event.results.length - 1] as unknown as { isFinal: boolean }).isFinal;
      if (isFinal) {
        const lower = transcript.toLowerCase();
        if (lower.includes('hey jarvis') || lower.includes('jarvis')) {
          const clean = transcript.replace(/hey jarvis[,.]?\s*/i, '').replace(/^jarvis[,.]?\s*/i, '').trim();
          if (clean) callJarvis(clean);
        }
      }
    };

    recognition.onstart = () => setVoiceStatus('listening');
    recognition.onend = () => {
      if (isAlwaysListening) {
        try { recognition.start(); } catch { /* already started */ }
      } else {
        setVoiceStatus('standby');
      }
    };
    recognition.onerror = () => setVoiceStatus('standby');

    try { recognition.start(); } catch { /* ignore */ }
    recognitionRef.current = recognition;

    return () => { recognition.stop(); };
  }, [isAlwaysListening, callJarvis, setTranscript, setVoiceStatus]);

  return null;
}
