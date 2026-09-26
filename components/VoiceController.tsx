'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useJarvisStore, JarvisApiResponse } from '@/store/jarvis-state';

interface SpeechRecognitionResultLike { readonly 0: { transcript: string }; }
interface SpeechRecognitionEventLike extends Event { readonly results: ArrayLike<SpeechRecognitionResultLike>; }
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onstart: (() => void) | null; onend: (() => void) | null; onerror: (() => void) | null;
  start(): void; stop(): void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type ExtWindow = Window & { _jarvisCall?: (message: string) => void; _jarvisSpeak?: (text: string) => void; SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor; };

const audioPlayer = typeof Audio !== 'undefined' ? new Audio() : null;
let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked || !audioPlayer) return;
  audioPlayer.muted = true;
  audioPlayer.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';
  void audioPlayer.play().then(() => {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    audioUnlocked = true;
  }).catch(() => {});
}

function browserSpeechFallback(text: string, onStart: () => void, onEnd: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.92;
  utterance.pitch = 0.9;
  utterance.onstart = onStart;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
}

async function playFishAudio(text: string, onStart: () => void, onEnd: () => void) {
  try {
    if (!audioPlayer) throw new Error('Audio playback unavailable');
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      cache: 'no-store',
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error('Fish Audio HTTP ' + response.status);
    const type = response.headers.get('content-type') || '';
    if (!type.startsWith('audio/')) throw new Error('TTS returned ' + type);
    const blob = await response.blob();
    if (!blob.size) throw new Error('TTS returned empty audio');

    const url = URL.createObjectURL(blob);
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    audioPlayer.src = url;
    audioPlayer.preload = 'auto';
    audioPlayer.muted = false;
    audioPlayer.onplay = onStart;
    audioPlayer.onended = () => { onEnd(); URL.revokeObjectURL(url); };
    audioPlayer.onerror = () => { URL.revokeObjectURL(url); browserSpeechFallback(text, onStart, onEnd); };
    await audioPlayer.play();
  } catch (error) {
    console.error('Fish Audio playback failed:', error);
    browserSpeechFallback(text, onStart, onEnd);
  }
}

export default function VoiceController() {
  const setVoiceStatus = useJarvisStore((s) => s.setVoiceStatus);
  const setTranscript = useJarvisStore((s) => s.setTranscript);
  const isAlwaysListening = useJarvisStore((s) => s.isAlwaysListening);
  const addUserToHistory = useJarvisStore((s) => s.addUserToHistory);
  const processJarvisResponse = useJarvisStore((s) => s.processJarvisResponse);
  const chatHistory = useJarvisStore((s) => s.chatHistory);
  const callingRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  const speakJarvis = useCallback((text: string) => {
    if (!text.trim()) return;
    setVoiceStatus('responding');
    void playFishAudio(text.slice(0, 3000), () => setVoiceStatus('responding'), () => setVoiceStatus('standby'));
  }, [setVoiceStatus]);

  const callJarvis = useCallback(async (userMessage: string) => {
    if (callingRef.current || !userMessage.trim()) return;
    callingRef.current = true;
    setVoiceStatus('processing');
    addUserToHistory(userMessage);
    try {
      const response = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage, chatHistory: chatHistory.slice(-16) }),
      });
      if (!response.ok) throw new Error('AI HTTP ' + response.status);
      const data = await response.json() as JarvisApiResponse;
      processJarvisResponse(data);
      speakJarvis(data.voiceText || data.response || '');
    } catch (error) {
      console.error('JARVIS call failed:', error);
      setVoiceStatus('standby');
    } finally {
      callingRef.current = false;
    }
  }, [addUserToHistory, chatHistory, processJarvisResponse, setVoiceStatus, speakJarvis]);

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
    recognition.onstart = () => setVoiceStatus('listening');
    recognition.onend = () => {
      if (useJarvisStore.getState().isAlwaysListening) { try { recognition.start(); } catch {} }
      else if (!callingRef.current) setVoiceStatus('standby');
    };
    recognition.onerror = () => { if (!callingRef.current) setVoiceStatus('standby'); };
    recognitionRef.current = recognition;
    if (isAlwaysListening) { try { recognition.start(); } catch {} }
    return () => { try { recognition.stop(); } catch {} recognitionRef.current = null; };
  }, [callJarvis, isAlwaysListening, setTranscript, setVoiceStatus]);

  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (isAlwaysListening) { try { recognition.start(); } catch {} }
    else { try { recognition.stop(); } catch {} }
  }, [isAlwaysListening]);

  return null;
}
