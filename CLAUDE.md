@AGENTS.md

# J.A.R.V.I.S. Interface — Developer Guide

**Premise:** "Tony Stark was just a vibe coder." Users speak (or type) to JARVIS, and 5 HUD panels react in real time. Claude Haiku powers the AI responses; the Web Speech API handles voice in/out.

---

## Tech Stack

- **Next.js 16** (App Router, no `src/` dir — files live in `app/`, `components/`, `store/`)
- **React 19** + **TypeScript**
- **Tailwind CSS 4** + custom CSS variables in `app/globals.css`
- **Zustand 5** — all shared state in `store/jarvis-state.ts`
- **Claude Haiku** (`claude-haiku-4-5-20251001`) via `app/api/jarvis/route.ts`
- **Web Speech API** — `SpeechRecognition` (voice in) + `SpeechSynthesis` (voice out)
- **Fonts:** Orbitron (headers) + Share Tech Mono (data/terminal text)

---

## Environment

```
ANTHROPIC_API_KEY=sk-ant-...   # Required — add to .env.local
```

---

## Project Structure

```
jarvis-interface/
├── app/
│   ├── globals.css              # Design tokens, CRT effects, keyframes
│   ├── layout.tsx               # Font loading (Orbitron + Share Tech Mono)
│   ├── page.tsx                 # Boot sequence → main layout
│   └── api/jarvis/route.ts      # Claude Haiku API endpoint
├── components/
│   ├── JarvisLayout.tsx         # Master 5-panel layout + easter egg orchestration
│   ├── BootSequence.tsx         # Full-screen boot animation on page load
│   ├── TopBar.tsx               # Header: branding, arc reactor %, threat level, clock
│   ├── MicButton.tsx            # Hold-to-talk mic + always-listening toggle + text fallback
│   ├── VoiceController.tsx      # Non-visual: Web Speech API + fetch to /api/jarvis
│   ├── panels/
│   │   ├── SuitStatus.tsx       # Panel 1: Iron Man armor systems
│   │   ├── ThreatRadar.tsx      # Panel 2: Canvas sonar with entity blips
│   │   ├── WaveformCore.tsx     # Panel 3: Canvas waveform + mic button
│   │   ├── StarkAnalytics.tsx   # Panel 4: Scrolling terminal output
│   │   └── CommsLog.tsx         # Panel 5: Incoming comms + mission log
│   └── animations/
│       ├── ArcReactor.tsx       # SVG arc reactor (output-driven glow)
│       └── ParticleField.tsx    # Canvas background particle drift
└── store/
    └── jarvis-state.ts          # Zustand store — all state + actions
```

---

## Layout

Fixed `100dvh`, no scrolling. Flex column:

```
┌──────────────────────────────────────────────────────────┐
│  TOP BAR — STARK INDUSTRIES | J.A.R.V.I.S. v7.0 | clock │
├──────────────┬──────────────────┬────────────────────────┤
│ SUIT SYSTEMS │  THREAT RADAR    │  WAVEFORM CORE         │
│    30%       │     35%          │      35%               │
│              │                  │                        │
│           ── 70% of body height ──                       │
├──────────────────────────────┬───────────────────────────┤
│  STARK ANALYTICS  60%        │  COMMS & MISSION LOG  40% │
│           ── 30% of body height ──                       │
└──────────────────────────────┴───────────────────────────┘
```

---

## The 5 Panels

### Panel 1 — SUIT SYSTEMS (`components/panels/SuitStatus.tsx`)

Displays Iron Man armor status. Uses `ArcReactor.tsx` SVG at center.

**State slice:** `store.suit` (`SuitData`)
- `arcReactorOutput` (0–100) — drives ArcReactor glow intensity
- `repulsorLeft` / `repulsorRight` (0–100)
- `flightSystem`: `'offline' | 'standby' | 'online' | 'max-thrust'`
- `structuralIntegrity`: per-zone percentages (head/chest/arms/legs)
- `suitMark` (number) — rendered as Roman numeral (Mark L = Mark 50)
- `shieldsOnline` / `weaponSystemsArmed` (boolean)

**Progress bar colors:** green >60%, amber 30–60%, red <30% — CSS transition on width change.

**JARVIS updates suit when user mentions:** suit, armor, repulsors, flight, shields, weapons, reactor, "Mark [number]".

---

### Panel 2 — THREAT RADAR (`components/panels/ThreatRadar.tsx`)

Canvas-based circular sonar. Runs a `requestAnimationFrame` loop.

**State slice:** `store.radar` (`RadarData`)
- `entities[]` — each has `name`, `bearing` (0–360°), `distance` (0–1), `threat` level
- `alertLevel`: `'green' | 'yellow' | 'red' | 'critical'`
- `scanPulseIntensity` (0–1) — unused visually but available for future use

**How it draws:**
- 3 dashed distance rings + N/S/E/W cardinal labels
- Rotating sweep line — speed doubles on `alertLevel: 'critical'`
- Sweep trail rendered as arc segments with fading opacity
- Entity blips: diamond shapes, color by threat level (green/amber/orange/red)
- Blip flashes bright when the sweep line passes its bearing
- Iron Man helm silhouette drawn at center with canvas paths

**JARVIS updates radar when user mentions:** scan, threat, perimeter, Thanos, Loki, Hydra, AIM, Chitauri, attack.

---

### Panel 3 — WAVEFORM CORE (`components/panels/WaveformCore.tsx`)

The hero panel. Canvas waveform + mic button + typewriter JARVIS response.

**State slice:** `store.waveform` + `store.voiceStatus`
- `voiceStatus`: `'standby' | 'listening' | 'processing' | 'responding'`
- `transcript` — last user speech
- `jarvisResponse` — JARVIS reply text (rendered with typewriter effect)

**Waveform states:**

| Status | Amplitude | Frequency | Speed | Color |
|--------|-----------|-----------|-------|-------|
| standby | 4 | 0.030 | 0.025 | `#0080cc` (dim blue) |
| listening | 22 | 0.045 | 0.12 | `#00d4ff` (arc blue) |
| processing | 14 | 0.060 | 0.20 | `#ffd700` (gold) |
| responding | 18 | 0.035 | 0.08 | `#00ff88` (green) |

**MicButton** is rendered at the bottom of this panel. It holds the speech recognition logic for push-to-talk, and exposes `window._jarvisCall` so `VoiceController` can trigger calls from always-listening mode too.

---

### Panel 4 — STARK ANALYTICS (`components/panels/StarkAnalytics.tsx`)

Scrolling terminal output. Auto-scrolls to bottom on new lines. Max 200 lines.

**State slice:** `store.analytics`
- `lines[]` — each has `text`, `type`, `id`, `timestamp`
- `isAnalyzing` — shows gold progress bar while waiting for API

**Line types and colors:**

| Type | Color | Usage |
|------|-------|-------|
| `system` | `#00d4ff` bold | Headers, "ANALYZING: …" |
| `data` | `#a8c8e8` | Bullet findings |
| `analysis` | `#0080cc` | Conclusions |
| `warning` | `#ff8800` | Risks, left-bordered |
| `ascii` | `#00d4ff` | `<pre>` ASCII art/diagrams |
| `code` | `#4a6a88` | Code snippets, formulas |

**JARVIS always returns 3–8 analytics lines** relevant to the query. This panel is where the "thinking" is displayed.

---

### Panel 5 — COMMS & MISSION LOG (`components/panels/CommsLog.tsx`)

Top 60%: incoming transmissions. Bottom 40%: timestamped event log.

**State slice:** `store.comms`
- `messages[]` — sender, channel, content, priority, timestamp
- `missionLog[]` — short event strings with timestamps

**Priority colors:** routine = dim gray, urgent = gold, critical = red.

**New messages** animate in with a `commsBlip` box-shadow glow.

**Pre-seeded on boot** with messages from Pepper Potts, Col. Rhodes, Nick Fury.

**JARVIS adds comms messages** when contextually appropriate (e.g., mention Pepper → she messages back).

---

## Data Flow

```
User speaks / types
        ↓
  MicButton.tsx
  (SpeechRecognition → transcript)
        ↓
  window._jarvisCall(userMessage)
        ↓
  VoiceController.tsx
  - setVoiceStatus('processing')
  - setAnalyzing(true)
  - addAnalyticsLine({ text: 'ANALYZING: ...', type: 'system' })
  - POST /api/jarvis
        ↓
  app/api/jarvis/route.ts
  - Claude Haiku (claude-haiku-4-5-20251001)
  - Returns structured JSON
        ↓
  store.processJarvisResponse(data)
  - Updates: waveform, suit, radar, analytics, comms
  - Each panel re-renders via Zustand subscription
        ↓
  SpeechSynthesis.speak(data.voiceText)
  - Prefers en-GB voice (Daniel or Google)
```

---

## API Response Structure (`/api/jarvis`)

Claude is prompted to always return JSON inside a ` ```json ``` ` code fence:

```typescript
{
  response: string;        // Full text (for chat history)
  voiceText: string;       // Clean text for speech synthesis (no markdown)
  mood: 'neutral' | 'concerned' | 'urgent' | 'sardonic' | 'alarmed';
  panelUpdates: {
    suit?: {               // Only fields being updated
      arcReactorOutput?: number;
      repulsorLeft?: number;
      repulsorRight?: number;
      flightSystem?: 'offline' | 'standby' | 'online' | 'max-thrust';
      structuralIntegrity?: { head?, chest?, leftArm?, rightArm?, leftLeg?, rightLeg? };
      shieldsOnline?: boolean;
      weaponSystemsArmed?: boolean;
      suitMark?: number;
    };
    radar?: {
      entities?: { name, bearing, distance, threat }[];
      alertLevel?: 'green' | 'yellow' | 'red' | 'critical';
      scanPulseIntensity?: number;
    };
    analytics?: {
      lines: { text: string; type: 'system'|'data'|'analysis'|'warning'|'ascii'|'code' }[];
    };
    comms?: {
      messages?: { sender, channel, content, priority }[];
    };
  };
  easterEgg?: 'ironMan' | 'avengersAssemble' | 'thanos' | 'friday' | null;
}
```

If Claude returns malformed JSON, `parseJarvisResponse()` falls back to using the raw text as the response with empty panel updates.

---

## Zustand Store (`store/jarvis-state.ts`)

All state is here. Components subscribe with `useJarvisStore((s) => s.slice)`.

Canvas components (ThreatRadar, WaveformCore, ParticleField) read state via `useJarvisStore.getState()` inside their `requestAnimationFrame` loops — this bypasses React's scheduler and prevents dropped frames.

**Key actions:**
- `processJarvisResponse(data)` — fan-out to all panels from one API response
- `setVoiceStatus(status)` — updates both `voiceStatus` and `waveform.voiceStatus`
- `addAnalyticsLine(line)` — appends to analytics, caps at 200 lines
- `addMissionLog(text)` — appends to comms.missionLog
- `triggerEasterEgg(egg)` / `clearEasterEgg(egg)` — boolean flags consumed by JarvisLayout
- `updateSuit(partial)` — direct suit data override

---

## Easter Eggs

Handled in `VoiceController.tsx` after receiving the API response. `JarvisLayout.tsx` watches the `easterEggs` flags in the store and applies CSS classes.

| Phrase | `easterEgg` value | Effect |
|--------|-------------------|--------|
| "I am Iron Man" | `'ironMan'` | `.iron-man-flash` on layout div (gold flash), reactor → 100% |
| "Avengers assemble" | `'avengersAssemble'` | ASCII Avengers A in analytics, `.avengers-pulse` on all panels |
| "Thanos" | `'thanos'` | Radar goes critical, Infinity Gauntlet entity appears |
| "FRIDAY" | `'friday'` | `.friday-mode` on layout (hue-rotate 18deg for 8s) |

---

## Design Tokens (`app/globals.css`)

```css
--bg:        #05080f   /* deep space black */
--arc:       #00d4ff   /* arc reactor blue — primary */
--arc-dim:   #0080cc   /* secondary blue */
--arc-dark:  #001a33   /* panel borders */
--gold:      #ffd700   /* Stark gold */
--danger:    #ff2244   /* threats, critical */
--warning:   #ff8800   /* caution */
--ok:        #00ff88   /* systems online */
--text:      #a8c8e8   /* default text */
--text-dim:  #4a6a88   /* secondary text */
```

Glow utilities: `.text-glow`, `.text-glow-gold`, `.text-glow-danger`, `.text-glow-ok`

Panel chrome: `.panel` class adds dark bg, border, and corner decoration `::before`/`::after` pseudo-elements.

---

## Voice Notes

- **Chrome/Edge only** for `SpeechRecognition`. Firefox shows a text input fallback automatically.
- **Push-to-talk:** hold the mic button → release → JARVIS responds.
- **Always-listening:** toggle the button below the mic → say "Hey JARVIS, [command]" or "JARVIS, [command]".
- `SpeechSynthesis` prefers `en-GB Daniel` voice. If unavailable, falls back to any `en-GB` voice.
- `speechSynthesis.getVoices()` is async in Chrome — loaded via `voiceschanged` event in `VoiceController`.
- Speech requires HTTPS in production. `localhost` works fine for dev.
