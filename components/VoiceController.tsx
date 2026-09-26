'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useJarvisStore } from '@/store/jarvis-state';

interface SpeechRecognitionResultLike { readonly 0: { transcript: string }; }
interface SpeechRecognitionEventLike extends Event { readonly results: ArrayLike<SpeechRecognitionResultLike>; }
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onstart: (() => void) | null; onend: (() => void) | null; onerror: (() => void) | null;
  start(): void; stop(): void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type ExtWindow = Window & {
  _jarvisCall?: (message: string) => void;
  _jarvisSpeak?: (text: string) => void;
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

async function playFishAudio(text: string, onStart: () => void, onEnd: () => void, onError: () => void) {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error('Fish Audio request failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onplay = onStart;
    audio.onended = () => { onEnd(); URL.revokeObjectURL(url); };
    audio.onerror = () => { onError(); URL.revokeObjectURL(url); };
    await audio.play();
  } catch (error) {
    console.error('Fish Audio playback failed:', error);
    onError();
  }
}

export default function VoiceController() {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const callingRef = useRef(false);
  const setVoiceStatus = useJarvisStore((s) => s.setVoiceStatus);
  const setTranscript = useJarvisStore((s) => s.setTranscript);
  const isAlwaysListening = useJarvisStore((s) => s.isAlwaysListening);
  const setAnalyzing = useJarvisStore((s) => s.setAnalyzing);
  const setIsListening = useJarvisStore((s) => s.setIsListening);
  const addUserToHistory = useJarvisStore((s) => s.addUserToHistory);
  const processJarvisResponse = useJarvisStore((s) => s.processJarvisResponse);
  const chatHistory = useJarvisStore((s) => s.chatHistory);
  const suit = useJarvisStore((s) => s.suit);
  const radar = useJarvisStore((s) => s.radar);

  const speakJarvis = useCallback((text: string) => {
    if (!text?.trim()) return;
    setVoiceStatus('responding');
    void playFishAudio(text.slice(0, 3000), () => setVoiceStatus('responding'), () => setVoiceStatus('standby'), () => setVoiceStatus('standby'));
  }, [setVoiceStatus]);

  const callJarvis = useCallback(async (userMessage: string) => {
    if (callingRef.current || !userMessage.trim()) return;
    callingRef.current = true;
    setVoiceStatus('processing');
    setAnalyzing(true);
    addUserToHistory(userMessage);
    try {
      const response = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage,
          chatHistory: chatHistory.slice(-16),
          suitMark: suit.suitMark,
          arcReactorOutput: suit.arcReactorOutput,
          alertLevel: radar.alertLevel,
        }),
      });
      const data = await response.json() as { voiceText?: string; response?: string };
      processJarvisResponse(data);
      speakJarvis(data.voiceText || data.response || '');
    } catch (error) {
      console.error('JARVIS call failed:', error);
      setVoiceStatus('standby');
    } finally {
      setAnalyzing(false);
      callingRef.current = false;
    }
  }, [addUserToHistory, chatHistory, processJarvisResponse, radar.alertLevel, setAnalyzing, setVoiceStatus, speakJarvis, suit.arcReactorOutput, suit.suitMark]);

  useEffect(() => {
    const w = window as ExtWindow;
    w._jarvisCall = callJarvis;
    w._jarvisSpeak = speakJarvis;
    return () => { delete w._jarvisCall; delete w._jarvisSpeak; };
  }, [callJarvis, speakJarvis]);

  useEffect(() => {
    const w = window as ExtWindow;
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      setTranscript(transcript);
      const lower = transcript.toLowerCase();
      if (lower.includes('hey jarvis') || lower.includes('jarvis')) {
        const clean = transcript.replace(/hey jarvis[,.]?/gi, '').replace(/jarvis[,.]?/gi, '').trim();
        if (clean) void callJarvis(clean);
      }
    };
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      if (useJarvisStore.getState().isAlwaysListening) { try { recognition.start(); } catch {} }
      else setVoiceStatus('standby');
    };
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    if (isAlwaysListening) { try { recognition.start(); } catch {} }
    return () => { try { recognition.stop(); } catch {} recognitionRef.current = null; };
  }, [callJarvis, isAlwaysListening, setIsListening, setTranscript, setVoiceStatus]);

  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (isAlwaysListening) { try { recognition.start(); } catch {} }
    else { try { recognition.stop(); } catch {} }
  }, [isAlwaysListening]);

  return null;
}
