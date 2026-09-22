'use client';

import { useEffect, useRef } from 'react';
import { useJarvisStore, VoiceStatus } from '@/store/jarvis-state';

// Energy intensity per voice status — drives particle speed, spark rate, glow.
const INTENSITY: Record<VoiceStatus, { speed: number; spark: number; glow: number }> = {
  standby:    { speed: 0.6, spark: 0.010, glow: 0.85 },
  listening:  { speed: 1.5, spark: 0.045, glow: 1.15 },
  processing: { speed: 2.2, spark: 0.075, glow: 1.30 },
  responding: { speed: 1.2, spark: 0.035, glow: 1.10 },
};

interface Orbiter {
  radius: number;
  angle: number;
  speed: number;
  size: number;
  hue: number;
}
interface Spark {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
}

export default function AICore() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const orbitersRef = useRef<Orbiter[]>([]);
  const sparksRef = useRef<Spark[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cx = 0, cy = 0, R = 0;

    const resize = () => {
      const parent = canvas.parentElement!;
      const rect = parent.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      cx = canvas.width / 2;
      cy = canvas.height / 2;
      R = Math.min(canvas.width, canvas.height) / 2;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    // Orbiting particles across several rings
    const ORBITERS = 46;
    orbitersRef.current = Array.from({ length: ORBITERS }, () => {
      const band = Math.random();
      return {
        radius: 0.28 + band * 0.66,
        angle: Math.random() * Math.PI * 2,
        speed: (0.0006 + Math.random() * 0.0018) * (Math.random() < 0.5 ? 1 : -1),
        size: 0.6 + Math.random() * 1.8,
        hue: 24 + Math.random() * 24, // amber → gold
      };
    });
    sparksRef.current = [];

    let last = performance.now();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function draw(now: number) {
      const dt = Math.min(now - last, 50);
      last = now;

      const vs = useJarvisStore.getState().voiceStatus;
      const I = INTENSITY[vs];

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx!.globalCompositeOperation = 'lighter';

      // ── Orbiting particles ──
      for (const o of orbitersRef.current) {
        if (!reduced) o.angle += o.speed * dt * I.speed;
        const rr = o.radius * R;
        const x = cx + Math.cos(o.angle) * rr;
        const y = cy + Math.sin(o.angle) * rr * 0.98;
        const tw = 0.5 + 0.5 * Math.sin(now * 0.004 + o.radius * 20);
        const sz = o.size * dpr * (0.7 + tw * 0.6);
        ctx!.beginPath();
        ctx!.arc(x, y, sz, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${o.hue}, 100%, ${60 + tw * 15}%, ${0.35 + tw * 0.4})`;
        ctx!.fill();
      }

      // ── Faint dust ring near center ──
      const dustCount = 8;
      for (let i = 0; i < dustCount; i++) {
        const a = now * 0.0004 + (i / dustCount) * Math.PI * 2;
        const rr = (0.12 + 0.05 * Math.sin(now * 0.001 + i)) * R;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        ctx!.beginPath();
        ctx!.arc(x, y, 1.2 * dpr, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(38, 100%, 72%, 0.5)`;
        ctx!.fill();
      }

      // ── Spawn outward sparks ──
      if (!reduced && Math.random() < I.spark) {
        const a = Math.random() * Math.PI * 2;
        const startR = R * 0.14;
        const sp = (0.6 + Math.random() * 1.4) * dpr;
        sparksRef.current.push({
          x: cx + Math.cos(a) * startR,
          y: cy + Math.sin(a) * startR,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0,
          maxLife: 600 + Math.random() * 700,
          size: (0.8 + Math.random() * 1.6) * dpr,
        });
      }

      // ── Update + draw sparks ──
      const sparks = sparksRef.current;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += dt;
        if (s.life > s.maxLife) { sparks.splice(i, 1); continue; }
        s.x += s.vx * (dt / 16);
        s.y += s.vy * (dt / 16);
        const t = s.life / s.maxLife;
        const op = t < 0.2 ? t / 0.2 : (1 - t);
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(34, 100%, 68%, ${op * 0.8})`;
        ctx!.fill();
      }
      if (sparks.length > 90) sparks.splice(0, sparks.length - 90);

      ctx!.globalCompositeOperation = 'source-over';
      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Core stage — square, sized to viewport min */}
      <div
        style={{
          position: 'relative',
          width: 'min(92vw, 74vh)',
          height: 'min(92vw, 74vh)',
        }}
      >
        {/* Soft outer halo */}
        <div
          className="core-glow"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '150%',
            height: '150%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,120,20,0.16) 0%, rgba(255,90,0,0.06) 34%, transparent 62%)',
            animation: 'haloPulse 5s ease-in-out infinite',
          }}
        />

        {/* SVG ring geometry */}
        <svg
          viewBox="0 0 400 400"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff2d6" stopOpacity="1" />
              <stop offset="22%" stopColor="#ffce7a" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#ff8a1e" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#ff5e00" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffd27a" />
              <stop offset="50%" stopColor="#ff9e2c" />
              <stop offset="100%" stopColor="#ff5e00" />
            </linearGradient>
          </defs>

          {/* radial spokes */}
          <g
            className="core-radial"
            style={{ transformOrigin: '200px 200px', animation: 'spin 90s linear infinite' }}
          >
            {Array.from({ length: 48 }).map((_, i) => {
              const a = (i / 48) * Math.PI * 2;
              const r1 = 150, r2 = 190;
              const long = i % 6 === 0;
              const round = (n: number) => Math.round(n * 1000) / 1000;
              return (
                <line
                  key={i}
                  x1={round(200 + Math.cos(a) * r1)}
                  y1={round(200 + Math.sin(a) * r1)}
                  x2={round(200 + Math.cos(a) * (long ? r2 + 8 : r2))}
                  y2={round(200 + Math.sin(a) * (long ? r2 + 8 : r2))}
                  stroke="#ff9e2c"
                  strokeWidth={long ? 1.4 : 0.6}
                  opacity={long ? 0.5 : 0.22}
                />
              );
            })}
          </g>

          {/* Outer dashed ring */}
          <circle
            className="core-ring"
            cx="200" cy="200" r="186"
            fill="none" stroke="url(#ringGrad)" strokeWidth="1"
            strokeDasharray="2 10" opacity="0.55"
            style={{ transformOrigin: '200px 200px', animation: 'spin 60s linear infinite' }}
          />
          {/* Second ring, counter-rotating with segmented arcs */}
          <circle
            className="core-ring"
            cx="200" cy="200" r="162"
            fill="none" stroke="url(#ringGrad)" strokeWidth="1.5"
            strokeDasharray="60 26" opacity="0.7"
            style={{ transformOrigin: '200px 200px', animation: 'spinRev 42s linear infinite' }}
          />
          {/* Tick ring */}
          <circle
            cx="200" cy="200" r="140"
            fill="none" stroke="#ff9e2c" strokeWidth="8"
            strokeDasharray="1 7" opacity="0.35"
            style={{ transformOrigin: '200px 200px', animation: 'spin 30s linear infinite' }}
          />
          {/* Bold arc ring, counter */}
          <circle
            cx="200" cy="200" r="118"
            fill="none" stroke="url(#ringGrad)" strokeWidth="2.5"
            strokeDasharray="120 60 40 60" opacity="0.8"
            style={{ transformOrigin: '200px 200px', animation: 'spinRev 22s linear infinite' }}
          />
          {/* Thin fast inner ring */}
          <circle
            cx="200" cy="200" r="94"
            fill="none" stroke="#ffce7a" strokeWidth="1"
            strokeDasharray="4 6" opacity="0.6"
            style={{ transformOrigin: '200px 200px', animation: 'spin 14s linear infinite' }}
          />
          {/* Inner hexagonal holographic geometry */}
          <polygon
            points="200,120 269,160 269,240 200,280 131,240 131,160"
            fill="none" stroke="url(#ringGrad)" strokeWidth="1.2" opacity="0.55"
            style={{ transformOrigin: '200px 200px', animation: 'spinRev 34s linear infinite' }}
          />
          <polygon
            points="200,138 260,169 260,231 200,262 140,231 140,169"
            fill="none" stroke="#ff8a1e" strokeWidth="0.8" opacity="0.35"
            style={{ transformOrigin: '200px 200px', animation: 'spin 26s linear infinite' }}
          />
          {/* Triangular reactor arms */}
          <g style={{ transformOrigin: '200px 200px', animation: 'spinRev 48s linear infinite' }}>
            {[0, 120, 240].map((deg) => {
              const a = (deg - 90) * (Math.PI / 180);
              const round = (n: number) => Math.round(n * 1000) / 1000;
              return (
                <line
                  key={deg}
                  x1={round(200 + Math.cos(a) * 30)}
                  y1={round(200 + Math.sin(a) * 30)}
                  x2={round(200 + Math.cos(a) * 88)}
                  y2={round(200 + Math.sin(a) * 88)}
                  stroke="url(#ringGrad)" strokeWidth="2" opacity="0.7"
                />
              );
            })}
          </g>

          {/* Core radiance */}
          <circle cx="200" cy="200" r="62" fill="url(#coreGrad)" />
        </svg>

        {/* Canvas particle layer */}
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />

        {/* Breathing bright core */}
        <div
          className="core-glow"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '30%',
            height: '30%',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, #fff4dc 0%, #ffce7a 26%, #ff8a1e 55%, rgba(255,94,0,0) 78%)',
            filter: 'blur(2px)',
            animation: 'coreBreathe 3.6s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  );
}
