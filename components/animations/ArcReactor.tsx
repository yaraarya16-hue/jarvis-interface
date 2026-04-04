'use client';

interface ArcReactorProps {
  output: number; // 0–100
  size?: number;
}

export default function ArcReactor({ output, size = 100 }: ArcReactorProps) {
  const glowIntensity = 4 + (output / 100) * 14;
  const coreOpacity = 0.15 + (output / 100) * 0.6;
  const arcColor = '#00d4ff';

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <filter id="arc-glow">
          <feGaussianBlur stdDeviation={glowIntensity * 0.5} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="core-glow">
          <feGaussianBlur stdDeviation={glowIntensity} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="core-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={arcColor} stopOpacity={coreOpacity + 0.3} />
          <stop offset="70%"  stopColor={arcColor} stopOpacity={coreOpacity} />
          <stop offset="100%" stopColor={arcColor} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer spinning dashed ring */}
      <circle
        cx="60" cy="60" r="56"
        fill="none"
        stroke={arcColor}
        strokeWidth="1"
        strokeDasharray="8 5"
        opacity="0.5"
        filter="url(#arc-glow)"
        style={{ transformOrigin: '60px 60px', animation: 'spin 10s linear infinite' }}
      />

      {/* Middle counter-rotating ring */}
      <circle
        cx="60" cy="60" r="46"
        fill="none"
        stroke={arcColor}
        strokeWidth="1.5"
        strokeDasharray="22 10"
        opacity="0.65"
        filter="url(#arc-glow)"
        style={{ transformOrigin: '60px 60px', animation: 'spin 6s linear infinite reverse' }}
      />

      {/* Static hex outline */}
      <polygon
        points="60,24 91,42 91,78 60,96 29,78 29,42"
        fill="none"
        stroke={arcColor}
        strokeWidth="1.5"
        opacity="0.8"
        filter="url(#arc-glow)"
      />

      {/* Inner hex — faster spin */}
      <polygon
        points="60,38 76,47 76,65 60,74 44,65 44,47"
        fill="none"
        stroke={arcColor}
        strokeWidth="1"
        opacity="0.5"
        style={{ transformOrigin: '60px 60px', animation: 'spin 4s linear infinite' }}
      />

      {/* 3 energy arms */}
      {[0, 120, 240].map((deg) => {
        const rad = (deg - 90) * (Math.PI / 180);
        const x2 = 60 + 22 * Math.cos(rad);
        const y2 = 60 + 22 * Math.sin(rad);
        return (
          <line
            key={deg}
            x1="60" y1="60"
            x2={x2} y2={y2}
            stroke={arcColor}
            strokeWidth="1.5"
            opacity="0.9"
            filter="url(#arc-glow)"
          />
        );
      })}

      {/* Core glow circle */}
      <circle
        cx="60" cy="60" r="16"
        fill="url(#core-grad)"
        filter="url(#core-glow)"
        style={{ animation: 'arcPulse 2s ease-in-out infinite' }}
      />

      {/* Core center dot */}
      <circle
        cx="60" cy="60" r="5"
        fill={arcColor}
        opacity={0.8 + (output / 100) * 0.2}
        filter="url(#core-glow)"
      />
    </svg>
  );
}
