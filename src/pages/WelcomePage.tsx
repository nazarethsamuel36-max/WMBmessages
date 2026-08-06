import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export const WelcomePage: React.FC = () => {
  const [origin, setOrigin] = useState<string>(import.meta.env.VITE_APP_URL || 'https://wm-bmessages.vercel.app');
  const [copiedDock, setCopiedDock] = useState<boolean>(false);
  const [copiedOverlay, setCopiedOverlay] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(import.meta.env.VITE_APP_URL || 'https://wm-bmessages.vercel.app');
    }
  }, []);

  const copyToClipboard = (text: string, setCopiedState: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    });
  };

  const dockUrl = `${origin}/dock`;
  const overlayUrl = `${origin}/presentation`;

  return (
    <div className="welcome-body">
      <div className="welcome-container">
        <h1 className="welcome-title">WMB Messages</h1>
        <p className="welcome-subtitle">Sermon Presentation & Controller Hub</p>

        <div className="welcome-cards">
          {/* Dock Card */}
          <div className="welcome-card">
            <div className="welcome-card-icon">🎛️</div>
            <h2>Dock Controller</h2>
            <p>
              Open the presentation workspace to find sermons, read scripture, structure setlists, and control overlays in real time.
            </p>
            <div className="welcome-url-box">
              <span className="welcome-url-text">{dockUrl}</span>
              <button
                className="welcome-btn-secondary"
                onClick={() => copyToClipboard(dockUrl, setCopiedDock)}
              >
                {copiedDock ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <Link to="/dock" className="welcome-btn">
              Open Dock
            </Link>
          </div>

          {/* Presentation Card */}
          <div className="welcome-card">
            <div className="welcome-card-icon">📺</div>
            <h2>OBS Overlay Display</h2>
            <p>
              Open this display window on your presentation output monitor or load it directly as a transparent browser source in OBS.
            </p>
            <div className="welcome-url-box">
              <span className="welcome-url-text">{overlayUrl}</span>
              <button
                className="welcome-btn-secondary"
                onClick={() => copyToClipboard(overlayUrl, setCopiedOverlay)}
              >
                {copiedOverlay ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <Link to="/presentation" className="welcome-btn">
              Open Presentation
            </Link>
          </div>
        </div>

        <div className="welcome-footer">
          Powered by React + Supabase. All content sourced dynamically from remote server.
        </div>
      </div>
    </div>
  );
};
