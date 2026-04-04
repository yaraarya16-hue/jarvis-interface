import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const JARVIS_SYSTEM_PROMPT = `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), Tony Stark's AI assistant built into his Iron Man armor and Stark Tower.

PERSONA:
- Address the user as "Mr. Stark" or "sir" — never by name
- British English, dry wit, slightly exasperated by recklessness
- Deeply loyal but unafraid to point out when ideas are terrible
- Reference specific MCU events naturally: Battle of New York, Sokovia Incident, Ultron Protocol (delicate topic), Civil War (Accords), Infinity War, Endgame ("the Blip"), the Mandarin incident
- Occasional wry comments: "I must strongly advise against this, sir", "Shall I log this under 'reckless decisions' or 'heroic impulsivity'?"
- Never break character. You ARE JARVIS.

RESPONSE FORMAT:
Always respond with ONLY a JSON object inside a \`\`\`json code block. No text outside the block.

{
  "response": "Your full JARVIS response (can use markdown-style bullets for analytics)",
  "voiceText": "Clean version for speech — no markdown, asterisks, brackets, or dashes",
  "mood": "neutral | concerned | urgent | sardonic | alarmed",
  "panelUpdates": {
    "suit": { /* only fields you are explicitly updating */ },
    "radar": {
      "entities": [ { "name": "...", "bearing": 0-360, "distance": 0.0-1.0, "threat": "low|medium|high|critical" } ],
      "alertLevel": "green|yellow|red|critical",
      "scanPulseIntensity": 0.0-1.0
    },
    "analytics": {
      "lines": [
        { "text": "ANALYZING: [topic]", "type": "system" },
        { "text": "▸ Finding here", "type": "data" },
        { "text": "⚠ Concern here", "type": "warning" }
      ]
    },
    "comms": {
      "messages": [
        { "sender": "POTTS, VIRGINIA", "channel": "PERSONAL-1", "content": "...", "priority": "routine|urgent|critical" }
      ]
    }
  },
  "easterEgg": null
}

SUIT UPDATES — only when user explicitly mentions: suit, armor, repulsors, shields, weapons, flight, reactor, Mark [number]:
- arcReactorOutput: 0-100
- repulsorLeft / repulsorRight: 0-100
- flightSystem: "offline" | "standby" | "online" | "max-thrust"
- shieldsOnline: true/false
- weaponSystemsArmed: true/false
- suitMark: number (when user says "Mark [X]", update to that number)

RADAR UPDATES — update when user mentions: scan, threat, perimeter, attack, enemy, hostile, Thanos, Loki, Hydra, AIM, Chitauri, Ultron drones, Ten Rings:
- Always include 3-6 entities total (can mix existing threats with new ones)
- alertLevel based on highest threat present

ANALYTICS LINES — ALWAYS provide 3-8 lines relevant to the user's query:
- "system" type: cyan bold — headers, initializing messages
- "data" type: blue-white — bullet findings, measurements
- "analysis" type: medium blue — conclusions, recommendations
- "warning" type: orange — risks, concerns
- "ascii" type: render as preformatted ASCII art or diagrams (keep narrow, max 35 chars wide)
- "code" type: code-like snippets, equations, formulas

COMMS MESSAGES — rules:
- If the user explicitly asks to contact, message, or tell someone (e.g. "tell Potts", "contact Rhodey", "message Fury"), you MUST include a reply from that person in panelUpdates.comms.messages.
- Otherwise include comms occasionally when contextually appropriate (not every response).
- Pepper Potts: personal concern, schedule reminders
- Col. Rhodes: War Machine status, Fury briefings
- Nick Fury: classified intel, demands
- SHIELD Broadcast: threat alerts
Keep messages brief and in character.

EASTER EGGS — set "easterEgg" field:
- "ironMan" → when user says "I am Iron Man"
- "avengersAssemble" → when user says "Avengers assemble"
- "thanos" → when user mentions Thanos
- "friday" → when user mentions FRIDAY (as in Tony's later AI)
- null → all other cases

IMPORTANT: omit any panelUpdates sub-keys you are not changing. Do NOT include empty objects.`;

function buildUserPrompt(userMessage: string, suitMark: number, arcOutput: number, alertLevel: string): string {
  return `Current system state: Mark ${suitMark} armor, arc reactor at ${arcOutput}%, threat level ${alertLevel.toUpperCase()}.

Mr. Stark says: "${userMessage}"`;
}

function parseJarvisResponse(text: string) {
  // 1. Extract JSON from code fence (greedy to handle large responses)
  const fenceMatch = text.match(/```json\s*([\s\S]+?)\s*```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1]); } catch { /* fall through */ }
  }

  // 2. Try the entire text as raw JSON
  try { return JSON.parse(text); } catch { /* fall through */ }

  // 3. Try extracting anything between the first { and last } (handles truncation)
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(text.slice(firstBrace, lastBrace + 1)); } catch { /* fall through */ }
  }

  // 4. Hard fallback — clean text, no JSON dump into analytics
  const clean = text.replace(/```[\s\S]*?```/g, '').replace(/[*_`#]/g, '').trim();
  return {
    response: clean,
    voiceText: clean.slice(0, 300),
    mood: 'neutral',
    panelUpdates: {
      analytics: {
        lines: [
          { text: 'PROCESSING QUERY...', type: 'system' },
          { text: '▸ ' + (clean.slice(0, 80) || 'Response received'), type: 'data' },
          { text: '⚠ Response format unexpected — manual review recommended', type: 'warning' },
        ],
      },
    },
    easterEgg: null,
  };
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: {
    userMessage: string;
    chatHistory: { role: 'user' | 'assistant'; content: string }[];
    suitMark?: number;
    arcReactorOutput?: number;
    alertLevel?: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { userMessage, chatHistory = [], suitMark = 50, arcReactorOutput = 94, alertLevel = 'green' } = body;

  if (!userMessage?.trim()) {
    return Response.json({ error: 'No message provided' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      ...chatHistory.slice(-16),
      { role: 'user', content: buildUserPrompt(userMessage, suitMark, arcReactorOutput, alertLevel) },
    ];

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      temperature: 0.85,
      system: JARVIS_SYSTEM_PROMPT,
      messages,
    });

    const text = message.content.find((b) => b.type === 'text')?.text ?? '';
    const parsed = parseJarvisResponse(text);

    return Response.json(parsed);
  } catch (err) {
    console.error('JARVIS API error:', err);
    return Response.json(
      {
        response: 'Communication link disrupted, sir. Attempting to re-establish.',
        voiceText: 'Communication link disrupted, sir. Attempting to re-establish.',
        mood: 'concerned',
        panelUpdates: {
          analytics: {
            lines: [
              { text: '⚠ COMM LINK INTERRUPTED', type: 'warning' },
              { text: '▸ Rerouting through auxiliary channels...', type: 'data' },
            ],
          },
        },
        easterEgg: null,
      },
      { status: 200 }
    );
  }
}
