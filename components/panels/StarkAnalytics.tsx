'use client';

import { useEffect, useRef } from 'react';
import { useJarvisStore, AnalyticsLine } from '@/store/jarvis-state';

const LINE_COLORS = {
  system:   '#00d4ff',
  data:     '#a8c8e8',
  analysis: '#0080cc',
  warning:  '#ff8800',
  ascii:    '#00d4ff',
  code:     '#4a6a88',
};

function AnalyticsLineItem({ line }: { line: AnalyticsLine }) {
  const color = LINE_COLORS[line.type];
  const isAscii = line.type === 'ascii';
  const isCode = line.type === 'code';
  const isBold = line.type === 'system';

  return (
    <div style={{
      marginBottom: isAscii ? 0 : 2,
      fontFamily: 'var(--font-mono)',
      fontSize: isAscii ? 11 : 11,
      color,
      fontWeight: isBold ? 'bold' : 'normal',
      letterSpacing: isAscii ? '0.05em' : '0.02em',
      whiteSpace: isAscii || isCode ? 'pre' : 'normal',
      opacity: line.type === 'analysis' ? 0.85 : 1,
      borderLeft: line.type === 'warning' ? '2px solid var(--warning)' : 'none',
      paddingLeft: line.type === 'warning' ? 6 : 0,
      animation: 'bootFadeIn 0.3s ease-out',
    }}>
      {line.text}
    </div>
  );
}

export default function StarkAnalytics() {
  const lines = useJarvisStore((s) => s.analytics.lines);
  const isAnalyzing = useJarvisStore((s) => s.analytics.isAnalyzing);
  const scrollRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<number>(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines.length]);

  // Analyzing animation
  useEffect(() => {
    if (isAnalyzing) {
      progressRef.current = 0;
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = setInterval(() => {
        progressRef.current = Math.min(progressRef.current + 3, 95);
      }, 100);
    } else {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      progressRef.current = 0;
    }
    return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); };
  }, [isAnalyzing]);

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header">
        <span>Stark Analytics</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isAnalyzing && (
            <span style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.1em', animation: 'blink 0.6s step-end infinite' }}>
              ANALYZING
            </span>
          )}
          <div className="panel-dot" />
        </div>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {lines.map((line) => (
          <AnalyticsLineItem key={line.id} line={line} />
        ))}

        {isAnalyzing && (
          <div style={{ marginTop: 6 }}>
            <div style={{ color: 'var(--gold)', fontSize: 10, marginBottom: 3, letterSpacing: '0.1em' }}>
              JARVIS PROCESSING
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${progressRef.current}%`,
                  background: 'var(--gold)',
                  boxShadow: '0 0 6px var(--gold)',
                  transition: 'width 0.1s linear',
                }}
              />
            </div>
          </div>
        )}

        <div style={{ height: 4 }} />
      </div>
    </div>
  );
}
