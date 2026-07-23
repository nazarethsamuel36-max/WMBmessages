import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../layout/Header';
import { BottomNavigation } from '../layout/BottomNavigation';
import { SearchWorkspace } from '../../workspaces/SearchWorkspace';
import { ReaderWorkspace } from '../../workspaces/ReaderWorkspace';
import { SetlistWorkspace } from '../../workspaces/SetlistWorkspace';
import { SettingsWorkspace } from '../../workspaces/SettingsWorkspace';

export const AppShell: React.FC = () => {
  const { state, setReaderQuery, setSearchQuery, selectReading, toggleLive } = useApp();
  const { activeWorkspace, readerQuery, searchQuery, paragraphs, reading } = state;

  // ─── In-reader search ───────────────────────────────────────────────────
  const [readerSearchActive, setReaderSearchActive] = useState(false);
  const readerInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const readerSearchResults = useMemo(() => {
    const q = readerQuery.trim().toLowerCase();
    if (!q || paragraphs.length === 0) return [];
    return paragraphs
      .map((p, idx) => ({ idx, para: p }))
      .filter(({ para }) => para.text?.toLowerCase().includes(q));
  }, [readerQuery, paragraphs]);

  const handleReaderSearchSelect = (idx: number) => {
    // Dispatch to app state so ReaderWorkspace scrolls to it
    setReaderQuery(`¶${paragraphs[idx]?.paragraph}`); // signal special jump
    setReaderSearchActive(false);
    // Use a custom event to communicate to ReaderWorkspace
    window.dispatchEvent(new CustomEvent('readerJumpTo', { detail: { paragraphIndex: idx } }));
  };

  const handleSearchInput = (val: string) => {
    // Auto-hyphenate date queries e.g. 650402 → 65-0402
    let v = val;
    if (/^\d{3,}/.test(v) && !v.includes('-')) {
      v = v.slice(0, 2) + '-' + v.slice(2);
    }
    setSearchQuery(v);
  };

  // ─── Keyboard Navigation ────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process arrow keys if in reader and not typing in input
      if (activeWorkspace !== 'reader' || paragraphs.length === 0) return;
      
      const activeEl = document.activeElement;
      const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
      if (isTyping) {
        if (e.key === 'Escape' && activeEl === readerInputRef.current) {
          e.preventDefault();
          setReaderQuery('');
          setReaderSearchActive(false);
          readerInputRef.current?.blur();
        }
        return;
      }

      const pi = reading.paragraphIndex;
      const si = reading.slideIndex;
      const slidesInPara = paragraphs[pi]?.slides?.length || 1;

      switch (e.key) {
        case 'ArrowDown': // Next slide / next paragraph
          e.preventDefault();
          if (si < slidesInPara - 1) {
            selectReading(pi, si + 1);
          } else if (pi < paragraphs.length - 1) {
            selectReading(pi + 1, 0);
          }
          break;
        case 'ArrowUp': // Previous slide / previous paragraph
          e.preventDefault();
          if (si > 0) {
            selectReading(pi, si - 1);
          } else if (pi > 0) {
            const prevSlides = paragraphs[pi - 1]?.slides?.length || 1;
            selectReading(pi - 1, prevSlides - 1);
          }
          break;
        case 'ArrowRight': // Next paragraph directly
          e.preventDefault();
          if (pi < paragraphs.length - 1) {
            selectReading(pi + 1, 0);
          }
          break;
        case 'ArrowLeft': // Previous paragraph directly
          e.preventDefault();
          if (pi > 0) {
            selectReading(pi - 1, 0);
          }
          break;
        case 'Enter': // Toggle live presentation of current paragraph
          e.preventDefault();
          if (pi >= 0) {
            toggleLive(pi, si);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeWorkspace, paragraphs, reading, selectReading, toggleLive, setReaderQuery]);

  return (
    <div className="app-shell">
      <Header />

      <div className="workspace-area">
        {/* Workspaces — always mounted, hidden via display:none to preserve state */}
        <div className="workspace" hidden={activeWorkspace !== 'search'}>
          <SearchWorkspace />
        </div>
        <div className="workspace" hidden={activeWorkspace !== 'reader'}>
          <ReaderWorkspace />
        </div>
        <div className="workspace" hidden={activeWorkspace !== 'setlist'}>
          <SetlistWorkspace />
        </div>
        <div className="workspace" hidden={activeWorkspace !== 'settings'}>
          <SettingsWorkspace />
        </div>
      </div>

      {/* Global Search Bar — only shown when Search workspace is active */}
      {activeWorkspace === 'search' && (
        <div className="reader-search-zone">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by title, date (65-0410), paragraph, or quote…"
            value={searchQuery}
            onChange={e => handleSearchInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                setSearchQuery('');
                searchInputRef.current?.blur();
              }
            }}
          />
        </div>
      )}

      {/* In-Reader Search Bar — only shown when Reader workspace is active */}
      {activeWorkspace === 'reader' && (
        <div className="reader-search-zone" style={{ position: 'relative' }}>
          <input
            ref={readerInputRef}
            type="text"
            placeholder={
              paragraphs.length > 0
                ? `Search in message or type ¶ number…`
                : 'Open a message first…'
            }
            value={readerQuery.startsWith('¶') ? '' : readerQuery}
            onChange={e => {
              setReaderQuery(e.target.value);
              setReaderSearchActive(e.target.value.trim().length >= 2);
            }}
            onFocus={() => {
              if (readerQuery && !readerQuery.startsWith('¶')) {
                setReaderSearchActive(true);
              }
            }}
            onBlur={() => setTimeout(() => setReaderSearchActive(false), 150)}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                setReaderQuery('');
                setReaderSearchActive(false);
                readerInputRef.current?.blur();
              }
            }}
            disabled={paragraphs.length === 0}
          />
          {/* Results dropdown (floats upward) */}
          {readerSearchActive && readerSearchResults.length > 0 && (
            <div className="reader-search-results">
              {readerSearchResults.slice(0, 20).map(({ idx, para }) => {
                const q = readerQuery.toLowerCase();
                const text = para.text || '';
                const matchIdx = text.toLowerCase().indexOf(q);
                const snippet = matchIdx >= 0
                  ? text.slice(Math.max(0, matchIdx - 40), matchIdx + q.length + 60)
                  : text.slice(0, 100);
                const parts = snippet.split(new RegExp(`(${readerQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

                return (
                  <div
                    key={idx}
                    className="reader-search-result"
                    onMouseDown={() => handleReaderSearchSelect(idx)}
                  >
                    <div className="rsr-num">¶ {para.paragraph}</div>
                    <div className="rsr-text">
                      {matchIdx > 40 && '…'}
                      {parts.map((part, i) =>
                        part.toLowerCase() === q ? <mark key={i}>{part}</mark> : part
                      )}
                      …
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <BottomNavigation />
    </div>
  );
};
export default AppShell;
