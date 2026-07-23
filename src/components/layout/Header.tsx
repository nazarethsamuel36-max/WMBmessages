import React from 'react';
import { useApp } from '../../context/AppContext';

export const Header: React.FC = () => {
  const { state } = useApp();
  const { messages, currentMessageIndex, isLive, live, paragraphs } = state;

  const currentMsg = messages[currentMessageIndex];
  const livePara = paragraphs[live.paragraphIndex];

  return (
    <header className="app-header">
      <div className="header-left">
        <span className="app-title">WMB</span>
        {currentMsg && (
          <>
            <span className="header-sep">·</span>
            <span className="header-current-msg">{currentMsg.date} — {currentMsg.title}</span>
          </>
        )}
      </div>
      <div className={`live-badge ${isLive ? 'is-live' : ''}`}>
        <div className="live-dot" />
        {isLive
          ? `LIVE ¶${livePara?.paragraph ?? ''}`
          : 'READY'
        }
      </div>
    </header>
  );
};
