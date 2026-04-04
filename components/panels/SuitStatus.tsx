'use client';

import { useEffect, useRef } from 'react';
import { useJarvisStore, SuitData } from '@/store/jarvis-state';
import ArcReactor from '@/components/animations/ArcReactor';

function toRoman(n: number): string {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
}

function barColor(pct: number) {
  if (pct > 60) return 'var(--ok)';
  if (pct > 30) return 'var(--warning)';
  return 'var(--danger)';
}
function barColorHex(pct: number) {
  if (pct > 60) return '#00ff88';
  if (pct > 30) return '#ff8800';
  return '#ff2244';
}

// ── Repulsor frequency bars ────────────────────────────────────────
function RepulsorCanvas({ valueL, valueR }: { valueL: number; valueR: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const phaseRef  = useRef<number>(0);
  const vLRef     = useRef(valueL);
  const vRRef     = useRef(valueR);

  useEffect(() => { vLRef.current = valueL; }, [valueL]);
  useEffect(() => { vRRef.current = valueR; }, [valueR]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function draw() {
      phaseRef.current += 0.055;
      const ph = phaseRef.current;
      const vL = vLRef.current;
      const vR = vRRef.current;

      const W = canvas!.width;
      const H = canvas!.height;
      ctx!.clearRect(0, 0, W, H);

      const BARS = 16;
      const hw   = W / 2;
      const gap  = 1.5;
      const bw   = (hw - gap * (BARS + 1)) / BARS;
      const maxH = H - 12;

      const colL = barColorHex(vL);
      const colR = barColorHex(vR);

      for (let i = 0; i < BARS; i++) {
        // Left
        const wL  = Math.sin(ph * (0.8 + i * 0.18) + i * 0.9) * 0.38
                  + Math.sin(ph * 2.1 + i * 1.4) * 0.14;
        const bL  = vL / 100;
        const hL  = Math.max(2, (bL + wL * bL * 0.65) * maxH);
        const xL  = gap + i * (bw + gap);
        const yL  = H - hL - 8;
        ctx!.globalAlpha = 0.22 + bL * 0.55;
        ctx!.fillStyle = colL;
        ctx!.fillRect(xL, yL, bw, hL);
        ctx!.globalAlpha = 0.9;
        ctx!.fillRect(xL, yL, bw, 1.5);   // bright cap

        // Right
        const wR  = Math.sin(ph * (0.75 + i * 0.22) + i * 1.1 + 3.5) * 0.38
                  + Math.sin(ph * 1.85 + i * 0.85 + 6) * 0.14;
        const bR  = vR / 100;
        const hR  = Math.max(2, (bR + wR * bR * 0.65) * maxH);
        const xR  = hw + gap + i * (bw + gap);
        const yR  = H - hR - 8;
        ctx!.globalAlpha = 0.22 + bR * 0.55;
        ctx!.fillStyle = colR;
        ctx!.fillRect(xR, yR, bw, hR);
        ctx!.globalAlpha = 0.9;
        ctx!.fillRect(xR, yR, bw, 1.5);
      }

      ctx!.globalAlpha = 1;

      // Divider
      ctx!.fillStyle = 'rgba(0,212,255,0.12)';
      ctx!.fillRect(hw - 0.5, 0, 1, H - 8);

      // Labels
      ctx!.font = '7px "Share Tech Mono", monospace';
      ctx!.textAlign = 'center';
      ctx!.textBaseline = 'alphabetic';
      ctx!.fillStyle = colL;
      ctx!.fillText(`L · ${vL}%`, hw / 2, H);
      ctx!.fillStyle = colR;
      ctx!.fillText(`R · ${vR}%`, hw + hw / 2, H);

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={260}
      height={56}
      style={{ width: '100%', height: 56, display: 'block' }}
    />
  );
}

// ── Flight system waveform ─────────────────────────────────────────
type FlightMode = 'offline' | 'standby' | 'online' | 'max-thrust';

const FLIGHT_CFG: Record<FlightMode, { speed: number; amp: number; freq: number; color: string; waves: number }> = {
  offline:      { speed: 0,     amp: 0,  freq: 0.040, color: '#ff2244', waves: 1 },
  standby:      { speed: 0.014, amp: 3,  freq: 0.024, color: '#4a6a88', waves: 1 },
  online:       { speed: 0.042, amp: 9,  freq: 0.038, color: '#00ff88', waves: 2 },
  'max-thrust': { speed: 0.095, amp: 14, freq: 0.055, color: '#00d4ff', waves: 3 },
};

function FlightCanvas({ mode }: { mode: FlightMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const phaseRef  = useRef<number>(0);
  const modeRef   = useRef(mode);

  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function draw() {
      const m   = modeRef.current;
      const cfg = FLIGHT_CFG[m];
      phaseRef.current += cfg.speed;
      const ph = phaseRef.current;

      const W  = canvas!.width;
      const H  = canvas!.height;
      const cy = H / 2;
      ctx!.clearRect(0, 0, W, H);

      // Centre guide
      ctx!.strokeStyle = 'rgba(0,212,255,0.07)';
      ctx!.lineWidth = 1;
      ctx!.setLineDash([3, 7]);
      ctx!.beginPath();
      ctx!.moveTo(0, cy);
      ctx!.lineTo(W, cy);
      ctx!.stroke();
      ctx!.setLineDash([]);

      if (m === 'offline') {
        // flat dead line
        ctx!.strokeStyle = '#ff2244';
        ctx!.lineWidth = 1;
        ctx!.globalAlpha = 0.35;
        ctx!.beginPath();
        ctx!.moveTo(0, cy);
        ctx!.lineTo(W, cy);
        ctx!.stroke();
        ctx!.globalAlpha = 1;
      } else {
        for (let w = 0; w < cfg.waves; w++) {
          const wp = ph + w * Math.PI * 0.72;
          const wa = cfg.amp * (1 - w * 0.28);
          const wf = cfg.freq * (1 + w * 0.38);

          ctx!.beginPath();
          for (let x = 0; x <= W; x++) {
            const y = cy
              + Math.sin(x * wf + wp) * wa
              + Math.sin(x * wf * 2.3 + wp * 1.4) * (wa * 0.22);
            if (x === 0) ctx!.moveTo(x, y);
            else ctx!.lineTo(x, y);
          }
          ctx!.strokeStyle = cfg.color;
          ctx!.lineWidth  = w === 0 ? 1.5 : 0.8;
          ctx!.globalAlpha = w === 0 ? 0.9 : 0.45 - w * 0.1;
          if (w === 0) { ctx!.shadowColor = cfg.color; ctx!.shadowBlur = m === 'max-thrust' ? 10 : 5; }
          ctx!.stroke();
          ctx!.shadowBlur = 0;
        }
        ctx!.globalAlpha = 1;

        // Max-thrust particles
        if (m === 'max-thrust') {
          for (let i = 0; i < 8; i++) {
            const px = ((ph * 65 + i * (W / 8)) % W + W) % W;
            const py = cy + Math.sin(px * cfg.freq + ph) * cfg.amp;
            ctx!.beginPath();
            ctx!.arc(px, py, 1.5, 0, Math.PI * 2);
            ctx!.fillStyle = '#00d4ff';
            ctx!.globalAlpha = 0.85;
            ctx!.shadowColor = '#00d4ff';
            ctx!.shadowBlur = 8;
            ctx!.fill();
          }
          ctx!.shadowBlur = 0;
          ctx!.globalAlpha = 1;
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={34}
      style={{ width: '100%', height: 34, display: 'block' }}
    />
  );
}

// ── Structural integrity body silhouette ───────────────────────────
type SI = SuitData['structuralIntegrity'];

function BodySilhouette({ si }: { si: SI }) {
  return (
    <svg viewBox="0 0 54 96" width={40} height={72} style={{ display: 'block', flexShrink: 0 }}>
      {/* Head */}
      <rect x="18" y="1"  width="18" height="15" rx="4"
        fill={barColorHex(si.head)}
        opacity={si.head > 60 ? 0.5 : si.head > 30 ? 0.65 : 0.8}
        style={{ transition: 'fill 0.8s ease, opacity 0.8s ease' }}
      />
      {/* Neck join */}
      <rect x="23" y="16" width="8"  height="4"  rx="1"
        fill="rgba(0,212,255,0.18)" />
      {/* Chest */}
      <rect x="14" y="20" width="26" height="22" rx="3"
        fill={barColorHex(si.chest)}
        opacity={si.chest > 60 ? 0.5 : si.chest > 30 ? 0.65 : 0.8}
        style={{ transition: 'fill 0.8s ease, opacity 0.8s ease' }}
      />
      {/* Arc reactor dot */}
      <circle cx="27" cy="31" r="3"
        fill="rgba(0,212,255,0.35)"
        stroke="rgba(0,212,255,0.6)" strokeWidth="0.8"
      />
      {/* L arm */}
      <rect x="4"  y="20" width="9"  height="24" rx="4"
        fill={barColorHex(si.leftArm)}
        opacity={si.leftArm > 60 ? 0.5 : si.leftArm > 30 ? 0.65 : 0.8}
        style={{ transition: 'fill 0.8s ease, opacity 0.8s ease' }}
      />
      {/* R arm */}
      <rect x="41" y="20" width="9"  height="24" rx="4"
        fill={barColorHex(si.rightArm)}
        opacity={si.rightArm > 60 ? 0.5 : si.rightArm > 30 ? 0.65 : 0.8}
        style={{ transition: 'fill 0.8s ease, opacity 0.8s ease' }}
      />
      {/* Waist */}
      <rect x="18" y="42" width="18" height="5" rx="1"
        fill="rgba(0,212,255,0.12)" />
      {/* L leg */}
      <rect x="14" y="47" width="11" height="28" rx="3"
        fill={barColorHex(si.leftLeg)}
        opacity={si.leftLeg > 60 ? 0.5 : si.leftLeg > 30 ? 0.65 : 0.8}
        style={{ transition: 'fill 0.8s ease, opacity 0.8s ease' }}
      />
      {/* R leg */}
      <rect x="29" y="47" width="11" height="28" rx="3"
        fill={barColorHex(si.rightLeg)}
        opacity={si.rightLeg > 60 ? 0.5 : si.rightLeg > 30 ? 0.65 : 0.8}
        style={{ transition: 'fill 0.8s ease, opacity 0.8s ease' }}
      />
    </svg>
  );
}

function CompactBar({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
        <span style={{ color: 'var(--text-dim)', fontSize: 9, letterSpacing: '0.08em' }}>{label}</span>
        <span style={{ color: barColor(value), fontSize: 9, fontWeight: 'bold' }}>{value}%</span>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${value}%`, background: barColor(value), boxShadow: `0 0 4px ${barColor(value)}` }}
        />
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────
export default function SuitStatus() {
  const suit = useJarvisStore((s) => s.suit);
  const si   = suit.structuralIntegrity;

  const flightColor = {
    offline:      'var(--danger)',
    standby:      'var(--text-dim)',
    online:       'var(--ok)',
    'max-thrust': 'var(--arc)',
  }[suit.flightSystem];

  const flightLabel = {
    offline:      'OFFLINE',
    standby:      'STANDBY',
    online:       'ONLINE',
    'max-thrust': 'MAX THRUST',
  }[suit.flightSystem];

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header">
        <span>Suit Systems</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="text-glow-gold" style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--gold)' }}>
            MK {toRoman(suit.suitMark)}
          </span>
          <div className="panel-dot" />
        </div>
      </div>

      <div style={{ padding: '8px 10px', overflowY: 'auto', flex: 1 }}>

        {/* Arc Reactor */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, marginTop: 2 }}>
          <ArcReactor output={suit.arcReactorOutput} size={76} />
        </div>

        {/* Arc reactor output bar */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: 'var(--text-dim)', fontSize: 9, letterSpacing: '0.1em' }}>ARC REACTOR</span>
            <span style={{ color: barColor(suit.arcReactorOutput), fontSize: 10, fontWeight: 'bold' }}>
              {suit.arcReactorOutput}%
            </span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${suit.arcReactorOutput}%`,
                background: barColor(suit.arcReactorOutput),
                boxShadow: `0 0 6px ${barColorHex(suit.arcReactorOutput)}`,
              }}
            />
          </div>
        </div>

        {/* Repulsor frequency bars */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: 'var(--arc)', fontSize: 9, letterSpacing: '0.15em', marginBottom: 4, fontFamily: 'var(--font-display)' }}>
            REPULSOR OUTPUT
          </div>
          <RepulsorCanvas valueL={suit.repulsorLeft} valueR={suit.repulsorRight} />
        </div>

        {/* Flight system */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ color: 'var(--arc)', fontSize: 9, letterSpacing: '0.15em', fontFamily: 'var(--font-display)' }}>
              FLIGHT SYSTEM
            </span>
            <span style={{
              color: flightColor,
              fontSize: 9,
              fontWeight: 'bold',
              letterSpacing: '0.1em',
              textShadow: `0 0 6px ${flightColor}`,
            }}>
              {flightLabel}
            </span>
          </div>
          <FlightCanvas mode={suit.flightSystem} />
        </div>

        {/* Structural integrity */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 7, marginBottom: 6 }}>
          <div style={{ color: 'var(--arc)', fontSize: 9, letterSpacing: '0.15em', marginBottom: 6, fontFamily: 'var(--font-display)' }}>
            STRUCTURAL INTEGRITY
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <BodySilhouette si={si} />
            <div style={{ flex: 1 }}>
              <CompactBar label="HEAD"  value={si.head} />
              <CompactBar label="CHEST" value={si.chest} />
              <CompactBar label="L.ARM" value={si.leftArm} />
              <CompactBar label="R.ARM" value={si.rightArm} />
              <CompactBar label="L.LEG" value={si.leftLeg} />
              <CompactBar label="R.LEG" value={si.rightLeg} />
            </div>
          </div>
        </div>

        {/* Shields & weapons */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 7, display: 'flex', gap: 8 }}>
          <div style={{
            flex: 1, padding: '4px 8px', border: '1px solid',
            borderColor: suit.shieldsOnline ? 'var(--arc)' : 'var(--border)',
            textAlign: 'center', fontSize: 9, letterSpacing: '0.1em',
            color: suit.shieldsOnline ? 'var(--arc)' : 'var(--text-dim)',
            boxShadow: suit.shieldsOnline ? '0 0 8px rgba(0,212,255,0.2)' : 'none',
            transition: 'all 0.4s ease',
          }}>
            SHIELDS {suit.shieldsOnline ? 'ONLINE' : 'OFFLINE'}
          </div>
          <div style={{
            flex: 1, padding: '4px 8px', border: '1px solid',
            borderColor: suit.weaponSystemsArmed ? 'var(--danger)' : 'var(--border)',
            textAlign: 'center', fontSize: 9, letterSpacing: '0.1em',
            color: suit.weaponSystemsArmed ? 'var(--danger)' : 'var(--text-dim)',
            boxShadow: suit.weaponSystemsArmed ? '0 0 8px rgba(255,34,68,0.2)' : 'none',
            transition: 'all 0.4s ease',
          }}>
            WEAPONS {suit.weaponSystemsArmed ? 'ARMED' : 'SAFE'}
          </div>
        </div>
      </div>
    </div>
  );
}
