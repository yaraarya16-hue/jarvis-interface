# J.A.R.V.I.S. Interface

> *"Tony Stark was just a vibe coder."*

A real-time AI assistant interface styled as the Iron Man HUD. Speak or type to JARVIS — five reactive panels update live with suit telemetry, threat radar, waveform visualization, analytics, and comms. Powered by Claude Haiku and the Web Speech API.

---

## Features

- **Voice-first** — hold-to-talk or always-listening mode with wake phrase detection ("Hey JARVIS, ...")
- **5 live HUD panels** — each responds contextually to what you say
- **Typed text fallback** — works in Firefox and any browser without `SpeechRecognition`
- **Boot sequence** — full-screen JARVIS initialization animation on load
- **Easter eggs** — say *"I am Iron Man"*, *"Avengers assemble"*, *"Thanos"*, or *"FRIDAY"*
- **CRT aesthetic** — scan lines, glow effects, Orbitron + Share Tech Mono fonts

---

## HUD Layout

```
┌──────────────────────────────────────────────────────────┐
│  TOP BAR — STARK INDUSTRIES | J.A.R.V.I.S. v7.0 | clock │
├──────────────┬──────────────────┬────────────────────────┤
│ SUIT SYSTEMS │  THREAT RADAR    │  WAVEFORM CORE         │
│   Arc reactor│  Canvas sonar    │  Mic + AI response     │
│   Repulsors  │  Entity blips    │  Typewriter output     │
├──────────────────────────────┬───────────────────────────┤
│  STARK ANALYTICS             │  COMMS & MISSION LOG      │
│  Scrolling terminal          │  Transmissions + log      │
└──────────────────────────────┴───────────────────────────┘
```

---

## Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)
- Chrome or Edge for voice input (Firefox gets a text input fallback)

---

## Setup

```bash
git clone https://github.com/your-username/jarvis-interface.git
cd jarvis-interface
npm install
```

Create `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Usage

### Voice (Chrome/Edge)

- **Push-to-talk** — hold the mic button, speak, release
- **Always-listening** — toggle the listen button, then say *"Hey JARVIS, [command]"* or *"JARVIS, [command]"*

### Text

Click the text input icon next to the mic for a typed prompt (works in all browsers).

### Example commands

| What you say | What happens |
|---|---|
| *"Run a full suit diagnostic"* | Suit panel updates all systems |
| *"Scan the perimeter for threats"* | Radar adds entities, alert level changes |
| *"Deploy repulsors"* | Repulsor charge goes to max |
| *"Patch me through to Pepper"* | Comms panel gets a new message |
| *"What's the arc reactor output?"* | Analytics panel shows reactor data |
| *"I am Iron Man"* | Gold flash + reactor → 100% |
| *"Avengers assemble"* | ASCII Avengers logo in analytics |
| *"Thanos"* | Radar goes critical |
| *"FRIDAY"* | UI hue-shifts for 8 seconds |

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, TypeScript, Tailwind CSS 4 |
| State | Zustand 5 |
| AI | Claude Haiku (`claude-haiku-4-5-20251001`) via Anthropic SDK |
| Voice | Web Speech API (`SpeechRecognition` + `SpeechSynthesis`) |
| Fonts | Orbitron, Share Tech Mono (Google Fonts) |

---

## Project Structure

```
jarvis-interface/
├── app/
│   ├── globals.css              # Design tokens, CRT effects, keyframes
│   ├── layout.tsx               # Font loading
│   ├── page.tsx                 # Boot sequence → main layout
│   └── api/jarvis/route.ts      # Claude Haiku API endpoint
├── components/
│   ├── JarvisLayout.tsx         # Master 5-panel layout + easter eggs
│   ├── BootSequence.tsx         # Boot animation
│   ├── TopBar.tsx               # Header bar
│   ├── MicButton.tsx            # Push-to-talk + always-listening
│   ├── VoiceController.tsx      # Web Speech API orchestration
│   ├── panels/
│   │   ├── SuitStatus.tsx       # Panel 1: armor systems
│   │   ├── ThreatRadar.tsx      # Panel 2: canvas sonar
│   │   ├── WaveformCore.tsx     # Panel 3: waveform + mic
│   │   ├── StarkAnalytics.tsx   # Panel 4: terminal output
│   │   └── CommsLog.tsx         # Panel 5: comms + mission log
│   └── animations/
│       ├── ArcReactor.tsx       # SVG arc reactor
│       └── ParticleField.tsx    # Canvas background particles
└── store/
    └── jarvis-state.ts          # Zustand store — all shared state
```

---

## Voice Notes

- `SpeechRecognition` is Chrome/Edge only. Firefox renders a text input automatically.
- `SpeechSynthesis` prefers the `en-GB Daniel` voice; falls back to any available `en-GB` voice.
- Voice input requires HTTPS in production. `localhost` works fine in development.

---

## License

MIT
