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
    utt.rate = 0.92;
    utt.pitch = 0.82;
    utt.volume = 0.9;
    const britishVoice = voicesRef.current.find(
      (v) => v.lang === 'en-GB' && (v.name.includes('Daniel') || v.name.toLowerCase().includes('google'))
    ) ?? voicesRef.current.find((v) => v.lang.startsWith('en-GB'));
    if (britishVoice) utt.voice = britishVoice;
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

      // Easter eggs
      if (data.easterEgg) {
        store.triggerEasterEgg(data.easterEgg);

        if (data.easterEgg === 'ironMan') {
          store.updateSuit({ arcReactorOutput: 100 });
          setTimeout(() => store.clearEasterEgg('ironMan'), 1600);
        }
        if (data.easterEgg === 'avengersAssemble') {
          store.addAnalyticsLine({
            text: '    /\\      \n   /  \\     \n  / /\\ \\    \n /_/__\\_\\   \n  AVENGERS  ',
            type: 'ascii',
          });
          setTimeout(() => store.clearEasterEgg('avengersAssemble'), 2000);
        }
        if (data.easterEgg === 'friday') {
          setTimeout(() => store.clearEasterEgg('friday'), 8000);
        }
        if (data.easterEgg === 'thanos') {
          store.addMissionLog('⚠ INFINITY GAUNTLET SIGNATURE DETECTED');
        }
      }

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
