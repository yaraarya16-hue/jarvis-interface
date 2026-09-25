'use client';

import { useEffect, useRef, useState } from 'react';
import { useJarvisStore, VoiceStatus } from '@/store/jarvis-state';
import MicButton from '@/components/MicButton';

const WAVEFORM_PARAMS: Record<VoiceStatus, { amp: number; freq: number; speed: number; color: string; label: string }> = {
  standby:    { amp: 4,  freq: 0.030, speed: 0.025, color: '#0080cc', label: 'STANDBY' },
  listening:  { amp: 22, freq: 0.045, speed: 0.12,  color: '#00d4ff', label: 'LISTENING' },
  processing: { amp: 14, freq: 0.060, speed: 0.20,  color: '#ffd700', label: 'PROCESSING' },
  responding: { amp: 18, freq: 0.035, speed: 0.08,  color: '#00ff88', label: 'RESPONDING' },
};

export default function WaveformCore() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef<number>(0);
  const [typedResponse, setTypedResponse] = useState('');
  const typeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const voiceStatus = useJarvisStore((s) => s.voiceStatus);
  const transcript = useJarvisStore((s) => s.waveform.transcript);
  const jarvisResponse = useJarvisStore((s) => s.waveform.jarvisResponse);

  // Typewriter effect for JARVIS response
  useEffect(() => {
    if (!jarvisResponse) return;
    if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);
    let i = 0;
    setTypedResponse('');
    typeIntervalRef.current = setInterval(() => {
      i++;
      setTypedResponse(jarvisResponse.slice(0, i));
      if (i >= jarvisResponse.length) {
        clearInterval(typeIntervalRef.current!);
      }
    }, 18);
    return () => { if (typeIntervalRef.current) clearInterval(typeIntervalRef.current); };
  }, [jarvisResponse]);

  // Canvas waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    let last = performance.now();

    function draw(now: number) {
      const dt = Math.min(now - last, 50);
      last = now;
      tRef.current += dt;

      const { voiceStatus: vs } = useJarvisStore.getState();
      const params = WAVEFORM_PARAMS[vs];

      const W = canvas!.width;
      const H = canvas!.height;
      const cx = H / 2;

      ctx!.clearRect(0, 0, W, H);

      // Glow effect
      ctx!.shadowColor = params.color;
      ctx!.shadowBlur = 8;

      // Main wave
      ctx!.beginPath();
      const steps = W;
      for (let i = 0; i <= steps; i++) {
        const x = i;
        const phase = (i / W) * Math.PI * 2 * 8;
        const y = cx + Math.sin(phase * params.freq * W / (Math.PI * 2) + tRef.current * params.speed) * params.amp
                   + Math.sin(phase * params.freq * W / (Math.PI * 2) * 1.7 + tRef.current * params.speed * 0.7) * params.amp * 0.3;
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      ctx!.strokeStyle = params.color;
      ctx!.lineWidth = 2;
      ctx!.stroke();

      // Ghost secondary wave
      ctx!.globalAlpha = 0.3;
      ctx!.beginPath();
      for (let i = 0; i <= steps; i++) {
        const x = i;
        const phase = (i / W) * Math.PI * 2 * 8;
        const y = cx + Math.sin(phase * params.freq * W / (Math.PI * 2) * 0.8 + tRef.current * params.speed * 1.3 + 1) * params.amp * 0.5;
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      ctx!.stroke();
      ctx!.globalAlpha = 1;
      ctx!.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  const params = WAVEFORM_PARAMS[voiceStatus];
  const statusColors: Record<VoiceStatus, string> = {
    standby: '#4a6a88',
    listening: '#00d4ff',
    processing: '#ffd700',
    responding: '#00ff88',
  };

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header">
        <span>Voice Core</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: statusColors[voiceStatus], letterSpacing: '0.12em' }}>
            {params.label}
          </span>
          <div className="panel-dot" style={{ background: statusColors[voiceStatus], boxShadow: `0 0 6px ${statusColors[voiceStatus]}` }} />
        </div>
      </div>

      {/* Waveform canvas */}
      <div style={{ flex: '0 0 70px', position: 'relative' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>

      {/* Content area */}
      <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
        {/* Transcript */}
        {transcript && (
          <div style={{ padding: '6px 8px', background: 'rgba(0,212,255,0.05)', border: '1px solid var(--arc-dark)' }}>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 2 }}>YOU SAID</div>
            <div style={{ fontSize: 12, color: 'var(--arc)', fontStyle: 'italic' }}>&ldquo;{transcript}&rdquo;</div>
          </div>
        )}

        {/* JARVIS response */}
        {typedResponse && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 4 }}>J.A.R.V.I.S.</div>
            <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>
              {typedResponse}
              {typedResponse.length < jarvisResponse.length && (
                <span style={{ color: 'var(--arc)', animation: 'blink 0.8s step-end infinite' }}>▌</span>
              )}
            </div>
          </div>
        )}

        {!transcript && !typedResponse && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, textAlign: 'center', letterSpacing: '0.05em' }}>
              Good {getTimeOfDay()}, Sir.
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 10, textAlign: 'center', opacity: 0.7 }}>
              All systems nominal. Awaiting your command.
            </div>
          </div>
        )}

        {/* Mic button at bottom */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
          <MicButton />
        </div>
      </div>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
