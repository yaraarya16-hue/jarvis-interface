import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type Provider = 'claude-sonnet' | 'claude-haiku' | 'groq' | 'gemini' | 'openrouter';

const FALLBACK_ORDER: Provider[] = ['claude-sonnet', 'claude-haiku', 'groq', 'gemini', 'openrouter'];

const JARVIS_SYSTEM_PROMPT = `You are J.A.R.V.I.S., a calm, capable AI assistant. Address the user as "Sir".
Return ONLY one JSON object with these keys:
{
  "response": "full answer for the user",
  "voiceText": "clean speech version",
  "mood": "neutral | concerned | urgent | sardonic | alarmed",
  "panelUpdates": {
    "suit": {},
    "radar": { "entities": [], "alertLevel": "green | yellow | red | critical", "scanPulseIntensity": 0 },
    "analytics": { "lines": [] },
    "comms": { "messages": [] }
  },
  "easterEgg": null
}
Keep panelUpdates valid and concise. Do not include markdown/code fences outside the JSON.`;

function buildUserPrompt(
  userMessage: string,
  suitMark: number,
  arcReactorOutput: number,
  alertLevel: string,
) {
  return `Current system state: Mark ${suitMark} armor, arc reactor at ${arcReactorOutput}%, threat level ${alertLevel.toUpperCase()}.
Sir says: "${userMessage}"`;
}

function parseJarvisResponse(text: string) {
  const fence = text.match(/\`\`\`json\s*([\\s\\S]*?)\s*\`\`\`/i);
  if (fence) {
    try { return JSON.parse(fence[1]); } catch {}
  }

  try { return JSON.parse(text); } catch {}

  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try { return JSON.parse(text.slice(first, last + 1)); } catch {}
  }

  const clean = text.replace(/\`\`\`[\\s\\S]*?\`\`\`/g, '').replace(/[*_`#]/g, '').trim();
  return {
    response: clean,
    voiceText: clean.slice(0, 300),
    mood: 'neutral',
    panelUpdates: {
      analytics: {
        lines: [
          { text: 'PROCESSING QUERY...', type: 'system' },
          { text: clean.slice(0, 80) || 'Response received', type: 'data' },
          { text: 'Response format unavailable — fallback text used', type: 'warning' },
        ],
      },
    },
    easterEgg: null,
  };
}

function normalizeMessages(history: ChatMessage[], current: string): ChatMessage[] {
  return [...history.slice(-16), { role: 'user', content: current }];
}

function getStatus(error: unknown) {
  return (error as { status?: number })?.status;
}

async function callClaude(messages: ChatMessage[], tier: 'sonnet' | 'haiku') {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Claude is not configured');

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: tier === 'sonnet' ? (process.env.ANTHROPIC_SONNET_MODEL || 'claude-sonnet-5') : (process.env.ANTHROPIC_HAIKU_MODEL || 'claude-haiku-4-5-20251001'),
    max_tokens: 1024,
    system: JARVIS_SYSTEM_PROMPT,
    messages,
  });

  return message.content.find((block) => block.type === 'text')?.text || '';
}

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
        max_tokens: 1024,
      messages: [{ role: 'system', content: JARVIS_SYSTEM_PROMPT }, ...messages],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const error = new Error(`${response.status}: ${body.slice(0, 300)}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

async function callGroq(messages: ChatMessage[]) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Groq is not configured');

  return callOpenAICompatible(
    'https://api.groq.com/openai/v1',
    apiKey,
    process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    messages,
  );
}

async function callOpenRouter(messages: ChatMessage[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OpenRouter is not configured');

  return callOpenAICompatible(
    'https://openrouter.ai/api/v1',
    apiKey,
    process.env.OPENROUTER_MODEL || 'openrouter/free',
    messages,
  );
}

async function callGemini(messages: ChatMessage[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini is not configured');

  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const contents = messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: JARVIS_SYSTEM_PROMPT }] },
        contents,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const error = new Error(`${response.status}: ${body.slice(0, 300)}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || '')
    .join('') || '';
}

async function callProvider(provider: Provider, messages: ChatMessage[]) {
  if (provider === 'claude-sonnet') return callClaude(messages, 'sonnet');
  if (provider === 'claude-haiku') return callClaude(messages, 'haiku');
  if (provider === 'groq') return callGroq(messages);
  if (provider === 'gemini') return callGemini(messages);
  return callOpenRouter(messages);
}

function fallbackResponse(errors: string[]) {
  return {
    response: 'Communication link disrupted, sir. All configured AI channels are currently unavailable.',
    voiceText: 'Communication link disrupted, sir. All configured AI channels are currently unavailable.',
    mood: 'concerned',
    panelUpdates: {
      analytics: {
        lines: [
          { text: 'COMM LINK INTERRUPTED', type: 'warning' },
          { text: 'All configured auxiliary channels unavailable', type: 'data' },
          { text: errors[errors.length - 1] || 'No provider response', type: 'warning' },
        ],
      },
    },
    easterEgg: null,
  };
}

export async function POST(request: NextRequest) {
  let body: {
    userMessage: string;
    chatHistory?: ChatMessage[];
    suitMark?: number;
    arcReactorOutput?: number;
    alertLevel?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    userMessage,
    chatHistory = [],
    suitMark = 50,
    arcReactorOutput = 94,
    alertLevel = 'green',
  } = body;

  if (!userMessage?.trim()) {
    return NextResponse.json({ error: 'No message provided' }, { status: 400 });
  }

  const messages = normalizeMessages(
    chatHistory,
    buildUserPrompt(userMessage, suitMark, arcReactorOutput, alertLevel),
  );

  const errors: string[] = [];

  for (const provider of FALLBACK_ORDER) {
    try {
      const text = await callProvider(provider, messages);
      if (!text.trim()) throw new Error('Empty response');

      const parsed = parseJarvisResponse(text);
      return NextResponse.json(parsed, {
        headers: { 'X-Jarvis-Provider': provider },
      });
    } catch (error) {
      const status = getStatus(error);
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${provider}: ${message.slice(0, 160)}`);
      console.error(`JARVIS ${provider} error [${status ?? 'unknown'}]:`, error);
    }
  }

  return NextResponse.json(fallbackResponse(errors), { status: 200 });
}
