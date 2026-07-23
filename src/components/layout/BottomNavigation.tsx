import React from 'react';
import { useApp } from '../../context/AppContext';
import { Workspace } from '../../types';

interface Tab {
  id: Workspace;
  icon: string;
  label: string;
}

const TABS: Tab[] = [
  { id: 'search',   icon: '⌕',  label: 'Search'  },
  { id: 'reader',   icon: '📖', label: 'Reader'  },
  { id: 'setlist',  icon: '📋', label: 'Setlist' },
  { id: 'settings', icon: '⚙',  label: 'Settings'},
];

export const BottomNavigation: React.FC = () => {
  const { state, setWorkspace } = useApp();

  return (
    <nav className="bottom-nav">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`nav-tab ${state.activeWorkspace === tab.id ? 'active' : ''}`}
          onClick={() => setWorkspace(tab.id)}
          aria-label={tab.label}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};
