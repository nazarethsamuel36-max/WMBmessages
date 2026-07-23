import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { searchRouter } from '../search/searchIntent';
import { SearchResult } from '../types';

export const SearchWorkspace: React.FC = () => {
  const { state, openMessage, handleSearchResult } = useApp();
  const { messages, paragraphs, currentMessageIndex, searchQuery } = state;

  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const res = await searchRouter.search(
      q,
      messages,
      paragraphs.length > 0 ? paragraphs : null,
      currentMessageIndex,
    );
    setResults(res);
    setSelectedIndex(-1);
    setSearching(false);
  }, [messages, paragraphs, currentMessageIndex]);

  // Sync results when global query changes
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(searchQuery), 180);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, runSearch]);

  const selectResult = (res: SearchResult) => {
    handleSearchResult(res.messageIndex, res.paragraphNo);
  };

  const badgeClass = (type: string) => {
    if (type === 'message') return 'type-message';
    if (type === 'paragraph') return 'type-paragraph';
    return 'type-quote';
  };

  return (
    <div className="reader-workspace">
      {/* Sidebar Message List */}
      <div className="reader-msg-panel">
        <div className="panel-label">Messages</div>
        <div className="reader-msg-list">
          {messages.length === 0 ? (
            <div className="loading-msg">Loading…</div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={msg.id || index}
                className={`msg-item ${index === currentMessageIndex ? 'active' : ''}`}
                onClick={() => openMessage(index)}
              >
                <div className="msg-item-date">{msg.date}</div>
                <div className="msg-item-title">{msg.title}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Search results main content */}
      <div className="reader-content">
        {searchQuery.trim().length === 0 ? (
          <div className="search-empty">
            <div style={{ fontSize: '2rem', marginBottom: '8px', opacity: 0.3 }}>⌕</div>
            Search sermons by title, date, paragraph number, or quote text.
            <br /><br />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Try: <em>65-0410</em> · <em>Leadership</em> · <em>50</em> · <em>"faith is"</em>
            </span>
          </div>
        ) : (
          <>
            {searching && <div className="search-hint">Searching…</div>}

            {!searching && results.length === 0 && (
              <div className="search-empty">No results for "<strong>{searchQuery}</strong>"</div>
            )}

            {results.map((res, i) => {
              const q = searchQuery.trim();
              const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              let snippet: React.ReactNode = null;

              if (res.type === 'quote' && res.text && q.length > 0) {
                const text = res.text;
                const matchIdx = text.toLowerCase().indexOf(q.toLowerCase());
                const raw = matchIdx >= 0
                  ? text.slice(Math.max(0, matchIdx - 30), matchIdx + q.length + 80)
                  : text.slice(0, 110);
                const parts = raw.split(new RegExp(`(${escapedQ})`, 'gi'));
                snippet = (
                  <div className="sri-snippet">
                    {matchIdx > 30 && '…'}
                    {parts.map((p, pi) =>
                      p.toLowerCase() === q.toLowerCase() ? <mark key={pi}>{p}</mark> : p
                    )}
                    …
                  </div>
                );
              }

              return (
                <div
                  key={i}
                  className={`search-result-item ${i === selectedIndex ? 'selected' : ''}`}
                  onClick={() => selectResult(res)}
                >
                  <div className="sri-meta">
                    <div>
                      <span className={`sri-badge ${badgeClass(res.type)}`}>{res.badge}</span>
                      <span className="sri-title">{res.title}</span>
                    </div>
                    <span className="sri-subtitle">{res.subtitle}</span>
                  </div>
                  {snippet}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};
