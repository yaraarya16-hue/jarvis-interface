import { create } from 'zustand';

// ── Types ─────────────────────────────────────────────────────────

export type VoiceStatus = 'standby' | 'listening' | 'processing' | 'responding';

export interface SuitData {
  arcReactorOutput: number;
  repulsorLeft: number;
  repulsorRight: number;
  flightSystem: 'offline' | 'standby' | 'online' | 'max-thrust';
  structuralIntegrity: {
    head: number;
    chest: number;
    leftArm: number;
    rightArm: number;
    leftLeg: number;
    rightLeg: number;
  };
  suitMark: number;
  shieldsOnline: boolean;
  weaponSystemsArmed: boolean;
}

export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';
export type AlertLevel = 'green' | 'yellow' | 'red' | 'critical';

export interface RadarEntity {
  id: string;
  name: string;
  bearing: number;
  distance: number;
  threat: ThreatLevel;
}

export interface RadarData {
  entities: RadarEntity[];
  alertLevel: AlertLevel;
  scanPulseIntensity: number;
  radarMode: 'passive' | 'active' | 'focused';
}

export type AnalyticsLineType = 'system' | 'data' | 'analysis' | 'warning' | 'ascii' | 'code';

export interface AnalyticsLine {
  id: string;
  text: string;
  type: AnalyticsLineType;
  timestamp: number;
}

export interface AnalyticsData {
  lines: AnalyticsLine[];
  isAnalyzing: boolean;
}

export interface CommsMessage {
  id: string;
  sender: string;
  channel: string;
  content: string;
  timestamp: number;
  priority: 'routine' | 'urgent' | 'critical';
  isNew: boolean;
}

export interface MissionLogEntry {
  id: string;
  text: string;
  timestamp: number;
}

export interface CommsData {
  messages: CommsMessage[];
  missionLog: MissionLogEntry[];
}

export type JarvisMood = 'neutral' | 'concerned' | 'urgent' | 'sardonic' | 'alarmed';

export interface WaveformData {
  voiceStatus: VoiceStatus;
  transcript: string;
  jarvisResponse: string;
  mood: JarvisMood;
}

export type EasterEggType = 'ironMan' | 'avengersAssemble' | 'thanos' | 'friday';

export interface JarvisApiResponse {
  response: string;
  voiceText: string;
  mood: JarvisMood;
  panelUpdates: {
    suit?: Partial<SuitData>;
    radar?: {
      entities?: Omit<RadarEntity, 'id'>[];
      alertLevel?: AlertLevel;
      scanPulseIntensity?: number;
    };
    analytics?: {
      lines: { text: string; type: AnalyticsLineType }[];
    };
    comms?: {
      messages?: { sender: string; channel: string; content: string; priority: CommsMessage['priority'] }[];
    };
  };
  easterEgg?: EasterEggType | null;
}

// ── Initial state ─────────────────────────────────────────────────

const INITIAL_SUIT: SuitData = {
  arcReactorOutput: 94,
  repulsorLeft: 80,
  repulsorRight: 80,
  flightSystem: 'standby',
  structuralIntegrity: {
    head: 100,
    chest: 100,
    leftArm: 100,
    rightArm: 100,
    leftLeg: 100,
    rightLeg: 100,
  },
  suitMark: 50,
  shieldsOnline: false,
  weaponSystemsArmed: false,
};

const INITIAL_RADAR: RadarData = {
  entities: [
    { id: '1', name: 'CHITAURI DRONE-7', bearing: 45,  distance: 0.6, threat: 'low' },
    { id: '2', name: 'AIM DRONE-3',      bearing: 190, distance: 0.75, threat: 'low' },
    { id: '3', name: 'UNKNOWN SIGNAL',   bearing: 310, distance: 0.85, threat: 'medium' },
  ],
  alertLevel: 'green',
  scanPulseIntensity: 0.3,
  radarMode: 'passive',
};

const INITIAL_COMMS_MESSAGES: CommsMessage[] = [
  {
    id: 'c1',
    sender: 'POTTS, VIRGINIA',
    channel: 'PERSONAL-1',
    content: "Tony, please don't blow up any buildings today. Also — board meeting at 3PM. I scheduled it twice so you'd actually see it.",
    timestamp: Date.now() - 300000,
    priority: 'routine',
    isNew: false,
  },
  {
    id: 'c2',
    sender: 'COL. J. RHODES',
    channel: 'WAR MACHINE FREQ',
    content: "Stark — Fury wants a debrief on the Sokovia incident. Call me when you resurface from whatever cave you've been tinkering in.",
    timestamp: Date.now() - 120000,
    priority: 'urgent',
    isNew: true,
  },
  {
    id: 'c3',
    sender: 'FURY, NICHOLAS',
    channel: 'SHIELD SEC-7',
    content: 'We have a situation in Eastern Europe. Not asking, Stark. Report to the helicarrier.',
    timestamp: Date.now() - 60000,
    priority: 'critical',
    isNew: true,
  },
];

const INITIAL_MISSION_LOG: MissionLogEntry[] = [
  { id: 'l1', text: 'SESSION INITIATED — STARK TOWER, NEW YORK', timestamp: Date.now() - 600000 },
  { id: 'l2', text: 'MARK L ARMOR ONLINE — SYSTEMS NOMINAL', timestamp: Date.now() - 500000 },
  { id: 'l3', text: 'THREAT DETECTION ARRAY CALIBRATED', timestamp: Date.now() - 400000 },
  { id: 'l4', text: 'VOICE INTERFACE READY', timestamp: Date.now() - 100000 },
];

const INITIAL_ANALYTICS_LINES: AnalyticsLine[] = [
  { id: 'a1', text: 'J.A.R.V.I.S. v7.0 — STARK INDUSTRIES PROPRIETARY', type: 'system', timestamp: Date.now() - 800 },
  { id: 'a2', text: '▸ Arc Reactor: Palladium-free Mk.III — Output nominal', type: 'data', timestamp: Date.now() - 700 },
  { id: 'a3', text: '▸ Neural interface link: ESTABLISHED', type: 'data', timestamp: Date.now() - 600 },
  { id: 'a4', text: '▸ SHIELD threat index: AMBER (post-Sokovia protocol)', type: 'warning', timestamp: Date.now() - 500 },
  { id: 'a5', text: '▸ 3 ambient signals detected in perimeter range', type: 'data', timestamp: Date.now() - 400 },
  { id: 'a6', text: 'SYSTEM READY — AWAITING INPUT FROM MR. STARK', type: 'system', timestamp: Date.now() - 200 },
];

// ── Store ─────────────────────────────────────────────────────────

interface JarvisStore {
  bootPhase: 'boot' | 'initializing' | 'ready';
  chatHistory: { role: 'user' | 'assistant'; content: string }[];

  suit: SuitData;
  radar: RadarData;
  waveform: WaveformData;
  analytics: AnalyticsData;
  comms: CommsData;

  voiceStatus: VoiceStatus;
  isAlwaysListening: boolean;

  easterEggs: {
    ironManFlash: boolean;
    avengersAssemble: boolean;
    fridayMode: boolean;
  };

  // Actions
  setBoot: (phase: JarvisStore['bootPhase']) => void;
  completeBootSequence: () => void;
  setVoiceStatus: (status: VoiceStatus) => void;
  setTranscript: (text: string) => void;
  toggleAlwaysListening: () => void;
  processJarvisResponse: (response: JarvisApiResponse) => void;
  addAnalyticsLine: (line: Omit<AnalyticsLine, 'id' | 'timestamp'>) => void;
  addMissionLog: (text: string) => void;
  triggerEasterEgg: (egg: EasterEggType) => void;
  clearEasterEgg: (egg: EasterEggType) => void;
  addUserToHistory: (content: string) => void;
  setAnalyzing: (value: boolean) => void;
  updateSuit: (partial: Partial<SuitData>) => void;
}

export const useJarvisStore = create<JarvisStore>((set) => ({
  bootPhase: 'boot',
  chatHistory: [],

  suit: INITIAL_SUIT,
  radar: INITIAL_RADAR,
  waveform: {
    voiceStatus: 'standby',
    transcript: '',
    jarvisResponse: '',
    mood: 'neutral',
  },
  analytics: {
    lines: INITIAL_ANALYTICS_LINES,
    isAnalyzing: false,
  },
  comms: {
    messages: INITIAL_COMMS_MESSAGES,
    missionLog: INITIAL_MISSION_LOG,
  },

  voiceStatus: 'standby',
  isAlwaysListening: false,

  easterEggs: {
    ironManFlash: false,
    avengersAssemble: false,
    fridayMode: false,
  },

  setBoot: (phase) => set({ bootPhase: phase }),

  completeBootSequence: () => set({ bootPhase: 'ready' }),

  setVoiceStatus: (status) =>
    set((s) => ({
      voiceStatus: status,
      waveform: { ...s.waveform, voiceStatus: status },
    })),

  setTranscript: (text) =>
    set((s) => ({ waveform: { ...s.waveform, transcript: text } })),

  toggleAlwaysListening: () =>
    set((s) => ({ isAlwaysListening: !s.isAlwaysListening })),

  addAnalyticsLine: (line) =>
    set((s) => ({
      analytics: {
        ...s.analytics,
        lines: [
          ...s.analytics.lines,
          { ...line, id: Math.random().toString(36).slice(2), timestamp: Date.now() },
        ].slice(-200),
      },
    })),

  addMissionLog: (text) =>
    set((s) => ({
      comms: {
        ...s.comms,
        missionLog: [
          ...s.comms.missionLog,
          { id: Math.random().toString(36).slice(2), text, timestamp: Date.now() },
        ].slice(-100),
      },
    })),

  setAnalyzing: (value) =>
    set((s) => ({ analytics: { ...s.analytics, isAnalyzing: value } })),

  addUserToHistory: (content) =>
    set((s) => ({
      chatHistory: [
        ...s.chatHistory,
        { role: 'user' as const, content },
      ].slice(-20),
    })),

  processJarvisResponse: (response) =>
    set((s) => {
      const updates: Partial<JarvisStore> = {};

      // Waveform update
      updates.waveform = {
        ...s.waveform,
        jarvisResponse: response.voiceText,
        mood: response.mood,
      };

      // Suit update
      if (response.panelUpdates.suit) {
        updates.suit = {
          ...s.suit,
          ...response.panelUpdates.suit,
          structuralIntegrity: {
            ...s.suit.structuralIntegrity,
            ...(response.panelUpdates.suit.structuralIntegrity ?? {}),
          },
        };
      }

      // Radar update
      if (response.panelUpdates.radar) {
        const ru = response.panelUpdates.radar;
        updates.radar = {
          ...s.radar,
          ...(ru.alertLevel ? { alertLevel: ru.alertLevel } : {}),
          ...(ru.scanPulseIntensity !== undefined ? { scanPulseIntensity: ru.scanPulseIntensity } : {}),
          ...(ru.entities ? {
            entities: ru.entities.map((e, i) => ({
              ...e,
              id: `r-${Date.now()}-${i}`,
            })),
          } : {}),
        };
      }

      // Analytics update
      if (response.panelUpdates.analytics) {
        const newLines = response.panelUpdates.analytics.lines.map((l) => ({
          ...l,
          id: Math.random().toString(36).slice(2),
          timestamp: Date.now(),
        }));
        updates.analytics = {
          lines: [...s.analytics.lines, ...newLines].slice(-200),
          isAnalyzing: false,
        };
      }

      // Comms update
      if (response.panelUpdates.comms?.messages) {
        const newMsgs = response.panelUpdates.comms.messages.map((m) => ({
          ...m,
          id: Math.random().toString(36).slice(2),
          timestamp: Date.now(),
          isNew: true,
        }));
        updates.comms = {
          ...s.comms,
          messages: [...s.comms.messages, ...newMsgs].slice(-50),
        };
      }

      // Chat history
      updates.chatHistory = [
        ...s.chatHistory,
        { role: 'assistant' as const, content: response.response },
      ].slice(-20);

      return updates;
    }),

  triggerEasterEgg: (egg) =>
    set((s) => ({
      easterEggs: {
        ...s.easterEggs,
        ...(egg === 'ironMan'         ? { ironManFlash: true } : {}),
        ...(egg === 'avengersAssemble'? { avengersAssemble: true } : {}),
        ...(egg === 'friday'          ? { fridayMode: true } : {}),
      },
    })),

  clearEasterEgg: (egg) =>
    set((s) => ({
      easterEggs: {
        ...s.easterEggs,
        ...(egg === 'ironMan'         ? { ironManFlash: false } : {}),
        ...(egg === 'avengersAssemble'? { avengersAssemble: false } : {}),
        ...(egg === 'friday'          ? { fridayMode: false } : {}),
      },
    })),

  updateSuit: (partial) =>
    set((s) => ({ suit: { ...s.suit, ...partial } })),
}));
