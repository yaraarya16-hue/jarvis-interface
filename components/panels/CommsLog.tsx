'use client';

import { useEffect, useRef } from 'react';
import { useJarvisStore, CommsMessage } from '@/store/jarvis-state';

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const PRIORITY_COLORS = {
  routine:  'var(--text-dim)',
  urgent:   'var(--gold)',
  critical: 'var(--danger)',
};

function CommsItem({ msg }: { msg: CommsMessage }) {
  const color = PRIORITY_COLORS[msg.priority];
  return (
    <div
      style={{
        padding: '6px 8px',
        marginBottom: 4,
        border: '1px solid',
        borderColor: msg.isNew ? color : 'var(--border)',
        background: 'rgba(0,0,0,0.3)',
        animation: msg.isNew ? 'commsBlip 1.5s ease-out' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ color, fontSize: 9, fontFamily: 'var(--font-display)', letterSpacing: '0.12em', fontWeight: 'bold' }}>
          {msg.sender}
        </span>
        <span style={{ color: 'var(--text-dim)', fontSize: 9 }} suppressHydrationWarning>{formatTime(msg.timestamp)}</span>
      </div>
      <div style={{ color: 'var(--text-dim)', fontSize: 8, letterSpacing: '0.1em', marginBottom: 3 }}>
        [{msg.channel}]
      </div>
      <div style={{ color: 'var(--text)', fontSize: 11, lineHeight: 1.4 }}>{msg.content}</div>
    </div>
  );
}

export default function CommsLog() {
  const messages = useJarvisStore((s) => s.comms.messages);
  const missionLog = useJarvisStore((s) => s.comms.missionLog);
  const commsScrollRef = useRef<HTMLDivElement>(null);
  const logScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll comms
  useEffect(() => {
    if (commsScrollRef.current) {
      commsScrollRef.current.scrollTop = commsScrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Auto-scroll log
  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }
  }, [missionLog.length]);

  const unreadCount = messages.filter((m) => m.isNew).length;

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header">
        <span>
          Communications
          {unreadCount > 0 && (
            <span style={{
              marginLeft: 6,
              background: 'var(--danger)',
              color: '#fff',
              borderRadius: 2,
              padding: '0 4px',
              fontSize: 8,
            }}>
              {unreadCount}
            </span>
          )}
        </span>
        <div className="panel-dot" />
      </div>

      {/* Comms section — 60% */}
      <div
        ref={commsScrollRef}
        style={{ flex: '0 0 60%', overflowY: 'auto', padding: '6px 10px', borderBottom: '1px solid var(--border)' }}
      >
        {messages.map((msg) => (
          <CommsItem key={msg.id} msg={msg} />
        ))}
      </div>

      {/* Mission log — 40% */}
      <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{
          padding: '4px 10px',
          borderBottom: '1px solid var(--border)',
          fontSize: 8,
          color: 'var(--text-dim)',
          fontFamily: 'var(--font-display)',
          letterSpacing: '0.15em',
        }}>
          MISSION LOG
        </div>
        <div ref={logScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '4px 10px' }}>
          {missionLog.map((entry) => (
            <div key={entry.id} style={{ marginBottom: 3, display: 'flex', gap: 6 }}>
              <span style={{ color: 'var(--arc-dim)', fontSize: 9, flexShrink: 0 }} suppressHydrationWarning>
                [{formatTime(entry.timestamp)}]
              </span>
              <span style={{ color: 'var(--text-dim)', fontSize: 9, letterSpacing: '0.05em' }}>
                {entry.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
