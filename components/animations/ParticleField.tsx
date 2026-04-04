'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  size: number;
  life: number;
  maxLife: number;
}

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Init particles
    const COUNT = 50;
    particlesRef.current = Array.from({ length: COUNT }, () => spawnParticle(canvas));

    function spawnParticle(c: HTMLCanvasElement): Particle {
      const maxLife = 6000 + Math.random() * 6000;
      return {
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -0.1 - Math.random() * 0.2, // drift upward
        opacity: 0,
        size: 0.5 + Math.random() * 1.5,
        life: Math.random() * maxLife,
        maxLife,
      };
    }

    let last = performance.now();
    function draw(now: number) {
      const dt = Math.min(now - last, 50);
      last = now;

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      for (const p of particlesRef.current) {
        p.life += dt;
        if (p.life > p.maxLife) {
          Object.assign(p, spawnParticle(canvas!));
          continue;
        }

        const t = p.life / p.maxLife;
        // fade in/out
        p.opacity = t < 0.15 ? t / 0.15 : t > 0.8 ? (1 - t) / 0.2 : 1;

        p.x += p.vx;
        p.y += p.vy;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(0, 180, 255, ${p.opacity * 0.3})`;
        ctx!.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.6,
      }}
    />
  );
}
