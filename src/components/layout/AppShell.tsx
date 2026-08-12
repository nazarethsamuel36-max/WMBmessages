import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../layout/Header';
import { BottomNavigation } from '../layout/BottomNavigation';
import { SearchWorkspace } from '../../workspaces/SearchWorkspace';
import { ReaderWorkspace } from '../../workspaces/ReaderWorkspace';
import { ReaderWithSidebarWorkspace } from '../../workspaces/ReaderWithSidebarWorkspace';
import { SetlistWorkspace } from '../../workspaces/SetlistWorkspace';
import { normalizeText, buildSearchHighlightRegExp } from '../../utils/textNormalizer';

export const AppShell: React.FC = () => {
  const { state, setReaderQuery, setSearchQuery, selectReading, toggleLive } = useApp();
  const { activeWorkspace, readerQuery, searchQuery, paragraphs, reading } = state;

  // ─── In-reader search ───────────────────────────────────────────────────
  const [readerSearchActive, setReaderSearchActive] = useState(false);
  const readerInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const readerSearchResults = useMemo(() => {
    const q = normalizeText(readerQuery.trim());
    if (!q || paragraphs.length === 0) return [];
    return paragraphs
      .map((p, idx) => ({ idx, para: p }))
      .filter(({ para }) => {
        // Always normalize what we search against — don't trust pre-stored normalized_text
        // as it may have been stored before the normalization rules were updated.
        const searchText = normalizeText(para.normalized_text || para.text || '');
        // Also match an exact paragraph number so typing "179" jumps straight to it
        return searchText.includes(q) || String(para.paragraph) === q;
      });
  }, [readerQuery, paragraphs]);

  const handleReaderSearchSelect = (idx: number) => {
    // Dispatch to app state so ReaderWorkspace scrolls to it, then reset the
    // search state so a fresh paragraph search always works.
    window.dispatchEvent(new CustomEvent('readerJumpTo', { detail: { paragraphIndex: idx } }));
    setReaderQuery('');
    setReaderSearchActive(false);
    readerInputRef.current?.blur();
  };

  // Pure-digit query → treat as a paragraph number to jump to
  const paraJumpIdx = useMemo(() => {
    const q = normalizeText(readerQuery.trim());
    if (!/^\d+$/.test(q)) return -1;
    return paragraphs.findIndex(p => String(p.paragraph) === q);
  }, [readerQuery, paragraphs]);

  const handleSearchInput = (val: string) => {
    // Auto-hyphenate full date codes e.g. 650402 → 65-0402.
    // Only exactly 6 digits so pure paragraph numbers like "179" are untouched.
    let v = val;
    if (/^\d{6}$/.test(v) && !v.includes('-')) {
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
        case '/': // Focus the reader search bar
          e.preventDefault();
          readerInputRef.current?.focus();
          readerInputRef.current?.select();
          setReaderSearchActive(true);
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
        <div className="workspace" hidden={activeWorkspace !== 'reader-with-sidebar'}>
          <ReaderWithSidebarWorkspace />
        </div>
        <div className="workspace" hidden={activeWorkspace !== 'setlist'}>
          <SetlistWorkspace />
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
                ? `Search in message or enter paragraph number…`
                : 'Open a message first…'
            }
            value={readerQuery}
            onChange={e => {
              setReaderQuery(e.target.value);
              const t = e.target.value.trim();
              setReaderSearchActive(t.length >= 2 || /^\d+$/.test(t));
            }}
            onFocus={() => {
              if (readerQuery) setReaderSearchActive(true);
            }}
            onBlur={() => setTimeout(() => setReaderSearchActive(false), 150)}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                setReaderQuery('');
                setReaderSearchActive(false);
                readerInputRef.current?.blur();
              }
              if (e.key === 'Enter' && paraJumpIdx >= 0) {
                e.preventDefault();
                handleReaderSearchSelect(paraJumpIdx);
              }
            }}
            disabled={paragraphs.length === 0}
          />
          {/* Results dropdown (floats upward) */}
          {readerSearchActive &&
            (readerSearchResults.length > 0 || paraJumpIdx < 0) && (
              <div className="reader-search-results">
                {readerSearchResults.slice(0, 20).map(({ idx, para }) => {
                const text = para.text || '';
                const regex = buildSearchHighlightRegExp(readerQuery);
                const match = regex ? regex.exec(text) : null;
                const matchIdx = match ? match.index : -1;
                const matchLen = match ? match[0].length : 0;
                const snippet = matchIdx >= 0
                  ? text.slice(Math.max(0, matchIdx - 40), matchIdx + matchLen + 60)
                  : text.slice(0, 100);
                const parts = regex ? snippet.split(regex) : [snippet];

                return (
                  <div
                    key={idx}
                    className="reader-search-result"
                    onMouseDown={() => handleReaderSearchSelect(idx)}
                  >
                    <div className="rsr-num">{para.paragraph}</div>
                    <div className="rsr-text">
                      {matchIdx > 40 && '…'}
                      {parts.map((part, i) =>
                        i % 2 === 1 ? <mark key={i}>{part}</mark> : part
                      )}
                      …
                    </div>
                  </div>
                );
              })}
              {/* Pure-number query that matches no paragraph → explain why */}
              {/^\d+$/.test(normalizeText(readerQuery.trim())) && paraJumpIdx < 0 && (
                <div className="reader-search-empty">
                  No paragraph {readerQuery.trim()} in this message
                  <span className="rsr-range"> ({paragraphs.length > 0 ? `1–${paragraphs.length}` : 'no message open'})</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <BottomNavigation />

      {state.toastMessage && (
        <div className="toast-notification">
          {state.toastMessage}
        </div>
      )}
    </div>
  );
};
export default AppShell;
