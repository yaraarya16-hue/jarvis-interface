import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type Provider = 'claude-sonnet' | 'claude-haiku' | 'groq' | 'gemini' | 'openrouter';
type JarvisApiResponse = { response: string; voiceText: string; mood: 'neutral' | 'concerned' | 'urgent' | 'sardonic' | 'alarmed' };

const FALLBACK_ORDER: Provider[] = ['claude-sonnet', 'claude-haiku', 'groq', 'gemini', 'openrouter'];
const JARVIS_SYSTEM_PROMPT =
  'You are J.A.R.V.I.S., a calm, capable personal AI assistant. Address the user as "Sir".\n' +
  'Keep responses focused on the user\'s request and do not introduce unrelated fictional lore.\n' +
  'Return ONLY one JSON object with keys response, voiceText, and mood.\n' +
  'voiceText must be a natural, concise version suitable for speech. Never use markdown fences.';

function parseJarvisResponse(text: string): JarvisApiResponse {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.response === 'string') {
      return {
        response: parsed.response,
        voiceText: typeof parsed.voiceText === 'string' && parsed.voiceText.trim() ? parsed.voiceText : parsed.response,
        mood: ['neutral', 'concerned', 'urgent', 'sardonic', 'alarmed'].includes(parsed.mood) ? parsed.mood : 'neutral',
      };
    }
  } catch {}
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try {
      const parsed = JSON.parse(text.slice(first, last + 1));
      if (typeof parsed?.response === 'string') return { response: parsed.response, voiceText: parsed.voiceText || parsed.response, mood: 'neutral' };
    } catch {}
  }
  const clean = text.replace(/[*_#]/g, '').trim();
  return { response: clean, voiceText: clean.slice(0, 500), mood: 'neutral' };
}

function normalizeMessages(history: ChatMessage[], current: string): ChatMessage[] {
  return [...history.slice(-16), { role: 'user', content: current }];
}

function getStatus(error: unknown) { return (error as { status?: number })?.status; }

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

async function callOpenAICompatible(baseUrl: string, apiKey: string, model: string, messages: ChatMessage[]) {
  const response = await fetch(baseUrl.replace(//$/, '') + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
    body: JSON.stringify({ model, max_tokens: 1024, messages: [{ role: 'system', content: JARVIS_SYSTEM_PROMPT }, ...messages] }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const error = new Error(String(response.status) + ': ' + body.slice(0, 300)) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

async function callGroq(messages: ChatMessage[]) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Groq is not configured');
  return callOpenAICompatible('https://api.groq.com/openai/v1', apiKey, process.env.GROQ_MODEL || 'openai/gpt-oss-120b', messages);
}

async function callOpenRouter(messages: ChatMessage[]) {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OpenRouter_API_KEY;
  if (!apiKey) throw new Error('OpenRouter is not configured');
  return callOpenAICompatible('https://openrouter.ai/api/v1', apiKey, process.env.OPENROUTER_MODEL || 'openrouter/free', messages);
}

async function callGemini(messages: ChatMessage[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini is not configured');
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const contents = messages.map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] }));
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: JARVIS_SYSTEM_PROMPT }] }, contents }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const error = new Error(String(response.status) + ': ' + body.slice(0, 300)) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('') || '';
}

async function callProvider(provider: Provider, messages: ChatMessage[]) {
  if (provider === 'claude-sonnet') return callClaude(messages, 'sonnet');
  if (provider === 'claude-haiku') return callClaude(messages, 'haiku');
  if (provider === 'groq') return callGroq(messages);
  if (provider === 'gemini') return callGemini(messages);
  return callOpenRouter(messages);
}

export async function POST(request: NextRequest) {
  let body: { userMessage?: string; chatHistory?: ChatMessage[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }
  const userMessage = body.userMessage?.trim();
  if (!userMessage) return NextResponse.json({ error: 'No message provided' }, { status: 400 });

  const messages = normalizeMessages(body.chatHistory || [], userMessage);
  const errors: string[] = [];
  for (const provider of FALLBACK_ORDER) {
    try {
      const text = await callProvider(provider, messages);
      if (!text.trim()) throw new Error('Empty response');
      return NextResponse.json(parseJarvisResponse(text), { headers: { 'X-Jarvis-Provider': provider } });
    } catch (error) {
      const status = getStatus(error);
      const message = error instanceof Error ? error.message : String(error);
      errors.push(provider + ': ' + message.slice(0, 160));
      console.error('JARVIS ' + provider + ' error [' + (status ?? 'unknown') + ']:', error);
    }
  }

  const fallback = 'I could not reach any configured AI service right now.';
  console.error('All AI providers failed:', errors);
  return NextResponse.json({ response: fallback, voiceText: fallback, mood: 'concerned' }, { status: 200 });
}
