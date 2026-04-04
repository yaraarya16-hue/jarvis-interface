'use client';

import { useEffect, useRef } from 'react';
import { useJarvisStore, RadarEntity, AlertLevel } from '@/store/jarvis-state';

const ALERT_COLORS: Record<AlertLevel, string> = {
  green:    '#00ff88',
  yellow:   '#ffd700',
  red:      '#ff8800',
  critical: '#ff2244',
};

const THREAT_COLORS = {
  low:      '#00ff88',
  medium:   '#ffd700',
  high:     '#ff8800',
  critical: '#ff2244',
};

function drawHelm(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // Simple angular Iron Man helm silhouette
  const s = r * 0.55;
  ctx.moveTo(cx, cy - s * 1.1);
  ctx.lineTo(cx + s * 0.7, cy - s * 0.5);
  ctx.lineTo(cx + s * 0.8, cy + s * 0.3);
  ctx.lineTo(cx + s * 0.5, cy + s * 0.8);
  ctx.lineTo(cx - s * 0.5, cy + s * 0.8);
  ctx.lineTo(cx - s * 0.8, cy + s * 0.3);
  ctx.lineTo(cx - s * 0.7, cy - s * 0.5);
  ctx.closePath();
  ctx.stroke();
  // Eye slits
  ctx.fillStyle = color;
  ctx.fillRect(cx - s * 0.4, cy - s * 0.1, s * 0.3, s * 0.12);
  ctx.fillRect(cx + s * 0.1, cy - s * 0.1, s * 0.3, s * 0.12);
}

function entityPos(e: RadarEntity, cx: number, cy: number, maxR: number) {
  const angle = (e.bearing - 90) * (Math.PI / 180);
  return {
    x: cx + Math.cos(angle) * e.distance * maxR,
    y: cy + Math.sin(angle) * e.distance * maxR,
  };
}

export default function ThreatRadar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const sweepAngleRef = useRef<number>(0);
  const flashRef = useRef<Map<string, number>>(new Map());

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

      const { radar } = useJarvisStore.getState();
      // ~3s full rotation normally, ~2s on critical — sonar cadence
      const speed = radar.alertLevel === 'critical' ? 0.00314 : 0.0021;
      sweepAngleRef.current = (sweepAngleRef.current + speed * dt) % (Math.PI * 2);

      const W = canvas!.width;
      const H = canvas!.height;
      const cx = W / 2;
      const cy = H / 2;
      const maxR = Math.min(W, H) * 0.42;

      ctx!.clearRect(0, 0, W, H);

      // Background circle
      ctx!.beginPath();
      ctx!.arc(cx, cy, maxR, 0, Math.PI * 2);
      ctx!.fillStyle = 'rgba(0, 10, 20, 0.6)';
      ctx!.fill();
      ctx!.strokeStyle = 'rgba(0, 212, 255, 0.2)';
      ctx!.lineWidth = 1;
      ctx!.stroke();

      // Distance rings
      for (const frac of [0.33, 0.66, 1.0]) {
        ctx!.beginPath();
        ctx!.arc(cx, cy, maxR * frac, 0, Math.PI * 2);
        ctx!.strokeStyle = 'rgba(0, 212, 255, 0.12)';
        ctx!.setLineDash([4, 6]);
        ctx!.lineWidth = 1;
        ctx!.stroke();
        ctx!.setLineDash([]);
      }

      // Cardinal labels
      const cardinals = [['N', 0, -1], ['E', 1, 0], ['S', 0, 1], ['W', -1, 0]] as const;
      ctx!.font = '9px "Orbitron", sans-serif';
      ctx!.fillStyle = 'rgba(0, 212, 255, 0.4)';
      ctx!.textAlign = 'center';
      ctx!.textBaseline = 'middle';
      for (const [label, dx, dy] of cardinals) {
        ctx!.fillText(label, cx + dx * (maxR + 12), cy + dy * (maxR + 12));
      }

      // Cross-hairs
      ctx!.strokeStyle = 'rgba(0, 212, 255, 0.08)';
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(cx - maxR, cy); ctx!.lineTo(cx + maxR, cy);
      ctx!.moveTo(cx, cy - maxR); ctx!.lineTo(cx, cy + maxR);
      ctx!.stroke();

      // Sweep gradient trail (using arc segments)
      const trailSteps = 40;
      for (let i = 0; i < trailSteps; i++) {
        const a = sweepAngleRef.current - (i / trailSteps) * (Math.PI * 0.6);
        const opacity = (1 - i / trailSteps) * 0.35;
        ctx!.beginPath();
        ctx!.moveTo(cx, cy);
        ctx!.arc(cx, cy, maxR, a - (Math.PI / trailSteps), a);
        ctx!.closePath();
        ctx!.fillStyle = `rgba(0, 212, 255, ${opacity})`;
        ctx!.fill();
      }

      // Sweep line
      ctx!.beginPath();
      ctx!.moveTo(cx, cy);
      ctx!.lineTo(
        cx + Math.cos(sweepAngleRef.current) * maxR,
        cy + Math.sin(sweepAngleRef.current) * maxR
      );
      ctx!.strokeStyle = 'rgba(0, 212, 255, 0.9)';
      ctx!.lineWidth = 1.5;
      ctx!.stroke();

      // Entities
      for (const entity of radar.entities) {
        const { x, y } = entityPos(entity, cx, cy, maxR);
        const col = THREAT_COLORS[entity.threat];

        // Flash when sweep passes entity bearing
        const entityAngle = (entity.bearing - 90) * (Math.PI / 180);
        const angleDiff = Math.abs(
          ((sweepAngleRef.current - entityAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
        );
        if (angleDiff < 0.12) {
          flashRef.current.set(entity.id, now);
        }

        const lastFlash = flashRef.current.get(entity.id) ?? 0;
        const flashAge = now - lastFlash;
        const brightness = flashAge < 2000 ? 1 - flashAge / 2000 : 0;

        const s = 5; // diamond half-size
        ctx!.beginPath();
        ctx!.moveTo(x, y - s);
        ctx!.lineTo(x + s, y);
        ctx!.lineTo(x, y + s);
        ctx!.lineTo(x - s, y);
        ctx!.closePath();
        ctx!.fillStyle = col;
        ctx!.globalAlpha = 0.5 + brightness * 0.5;
        ctx!.fill();
        if (brightness > 0) {
          ctx!.shadowColor = col;
          ctx!.shadowBlur = 12 * brightness;
        }
        ctx!.strokeStyle = col;
        ctx!.lineWidth = 1;
        ctx!.stroke();
        ctx!.shadowBlur = 0;
        ctx!.globalAlpha = 1;

        // Label
        ctx!.font = '7px "Share Tech Mono", monospace';
        ctx!.fillStyle = col;
        ctx!.textAlign = 'left';
        ctx!.textBaseline = 'middle';
        ctx!.globalAlpha = 0.8;
        ctx!.fillText(entity.name.slice(0, 18), x + 8, y);
        ctx!.globalAlpha = 1;
      }

      // Iron Man helm at center
      drawHelm(ctx!, cx, cy, maxR * 0.12, 'rgba(0, 212, 255, 0.7)');

      // Alert indicator
      const alertCol = ALERT_COLORS[radar.alertLevel];
      ctx!.beginPath();
      ctx!.arc(cx, cy, maxR + 3, 0, Math.PI * 2);
      ctx!.strokeStyle = alertCol;
      ctx!.lineWidth = 2;
      ctx!.globalAlpha = radar.alertLevel !== 'green' ? 0.5 : 0.15;
      ctx!.stroke();
      ctx!.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  const alertLevel = useJarvisStore((s) => s.radar.alertLevel);
  const alertCol = ALERT_COLORS[alertLevel];

  return (
    <div
      className="panel"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div className="panel-header">
        <span>Threat Radar</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: alertCol, letterSpacing: '0.1em' }}>
            {alertLevel.toUpperCase()}
          </span>
          <div className="panel-dot" style={{ background: alertCol, boxShadow: `0 0 6px ${alertCol}` }} />
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
    </div>
  );
}
