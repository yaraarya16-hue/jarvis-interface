import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const apiKey = process.env.FISH_API_KEY;
  const voiceId = process.env.FISH_VOICE_ID;
  if (!apiKey || !voiceId) return NextResponse.json({ error: 'Fish Audio is not configured' }, { status: 500 });

  let body: { text?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  const text = body.text?.trim();
  if (!text) return NextResponse.json({ error: 'No text provided' }, { status: 400 });

  try {
    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: text.slice(0, 3000), reference_id: voiceId, format: 'mp3', latency: 'balanced' }),
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Fish Audio TTS error:', response.status, errorText.slice(0, 1000));
      return NextResponse.json({ error: 'Fish Audio synthesis failed', status: response.status }, { status: 502 });
    }
    const audio = Buffer.from(await response.arrayBuffer());
    if (!audio.length) return NextResponse.json({ error: 'Fish Audio returned empty audio' }, { status: 502 });
    return new NextResponse(audio, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'audio/mpeg',
        'Content-Length': String(audio.length),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Fish Audio request error:', error);
    return NextResponse.json({ error: 'Fish Audio request failed' }, { status: 502 });
  }
}
