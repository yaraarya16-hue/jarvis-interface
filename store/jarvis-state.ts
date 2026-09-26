import { create } from 'zustand';

export type VoiceStatus = 'standby' | 'listening' | 'processing' | 'responding';
export type JarvisMood = 'neutral' | 'concerned' | 'urgent' | 'sardonic' | 'alarmed';

export interface JarvisApiResponse {
  response: string;
  voiceText: string;
  mood: JarvisMood;
}

interface JarvisStore {
  bootPhase: 'boot' | 'initializing' | 'ready';
  chatHistory: { role: 'user' | 'assistant'; content: string }[];
  waveform: { voiceStatus: VoiceStatus; transcript: string; jarvisResponse: string; mood: JarvisMood };
  voiceStatus: VoiceStatus;
  isAlwaysListening: boolean;
  completeBootSequence: () => void;
  setVoiceStatus: (status: VoiceStatus) => void;
  setTranscript: (text: string) => void;
  toggleAlwaysListening: () => void;
  processJarvisResponse: (response: JarvisApiResponse) => void;
  addUserToHistory: (content: string) => void;
}

export const useJarvisStore = create<JarvisStore>((set) => ({
  bootPhase: 'boot',
  chatHistory: [],
  waveform: { voiceStatus: 'standby', transcript: '', jarvisResponse: '', mood: 'neutral' },
  voiceStatus: 'standby',
  isAlwaysListening: false,
  completeBootSequence: () => set({ bootPhase: 'ready' }),
  setVoiceStatus: (status) => set((s) => ({ voiceStatus: status, waveform: { ...s.waveform, voiceStatus: status } })),
  setTranscript: (text) => set((s) => ({ waveform: { ...s.waveform, transcript: text } })),
  toggleAlwaysListening: () => set((s) => ({ isAlwaysListening: !s.isAlwaysListening })),
  addUserToHistory: (content) => set((s) => ({ chatHistory: [...s.chatHistory, { role: 'user', content }].slice(-20) })),
  processJarvisResponse: (response) => set((s) => ({
    waveform: { ...s.waveform, jarvisResponse: response.voiceText || response.response, mood: response.mood || 'neutral' },
    chatHistory: [...s.chatHistory, { role: 'assistant', content: response.response }].slice(-20),
  })),
}));
