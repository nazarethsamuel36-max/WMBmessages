import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { searchRouter } from '../search/searchIntent';
import { buildSearchHighlightRegExp } from '../utils/textNormalizer';
import { SearchResult } from '../types';

export const SearchWorkspace: React.FC = () => {
  const { state, openMessage, handleSearchResult, setWorkspace } = useApp();
  const { messages, paragraphs, currentMessageIndex, searchQuery } = state;

  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const latestSearchRef = useRef(0);

  const runSearch = useCallback(async (q: string) => {
    const requestId = ++latestSearchRef.current;
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
    if (requestId !== latestSearchRef.current) return;
    setResults(res);
    setSelectedIndex(-1);
    setSearching(false);
  }, [messages, paragraphs, currentMessageIndex]);

  // Sync results when global query changes
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      latestSearchRef.current++;
      setResults([]);
      setSearching(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(searchQuery), 180);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, runSearch]);

  const selectResult = (res: SearchResult) => {
    handleSearchResult(res.messageIndex, res.paragraphNo, searchQuery);
  };

  const badgeClass = (type: string) => {
    if (type === 'message') return 'type-message';
    if (type === 'paragraph') return 'type-paragraph';
    return 'type-quote';
  };

  return (
    <div className="search-workspace" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="reader-content" style={{ width: '100%', flex: 1, overflowY: 'auto' }}>
        {searchQuery.trim().length === 0 ? (
          // If no search query, show the full list of messages in the middle (no sidebar)
          <div style={{ display: 'flex', flexDirection: 'column', padding: '0px' }}>
            <div className="panel-label" style={{ border: 'none', paddingLeft: '14px', paddingTop: '10px' }}>Sermon Messages</div>
            {messages.length === 0 ? (
              <div className="loading-msg">Loading messages…</div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={msg.id || index}
                  className={`msg-item ${index === currentMessageIndex ? 'active' : ''}`}
                  onClick={async () => {
                    await openMessage(index);
                    setWorkspace('reader');
                    // Navigate to Reader workspace immediately upon message selection
                    window.dispatchEvent(new CustomEvent('readerJumpTo', { detail: { paragraphIndex: 0 } }));
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    transition: 'all 0.15s'
                  }}
                >
                  <div className="msg-item-date" style={{ fontSize: '13px', color: 'var(--green)', marginRight: '24px', fontWeight: '600', flexShrink: 0, minWidth: '70px' }}>{msg.date}</div>
                  <div className="msg-item-title" style={{ fontSize: '13px', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{msg.title}</div>
                </div>
              ))
            )}
          </div>
        ) : (
          // If there is a search query, show search results in the middle
          <>
            {searching && <div className="search-hint">Searching…</div>}

            {!searching && results.length === 0 && (
              <div className="search-empty">No results for "<strong>{searchQuery}</strong>"</div>
            )}

            {results.map((res, i) => {
              const q = searchQuery.trim();
              let snippet: React.ReactNode = null;

              if (res.type === 'quote' && res.text && q.length > 0) {
                const text = res.text;
                const regex = buildSearchHighlightRegExp(q);
                const match = regex ? regex.exec(text) : null;
                const matchIdx = match ? match.index : -1;
                const matchLen = match ? match[0].length : 0;
                const raw = matchIdx >= 0
                  ? text.slice(Math.max(0, matchIdx - 30), matchIdx + matchLen + 80)
                  : text.slice(0, 110);
                const parts = regex ? raw.split(regex) : [raw];
                snippet = (
                  <div className="sri-snippet">
                    {matchIdx > 30 && '…'}
                    {parts.map((p, pi) =>
                      pi % 2 === 1 ? <mark key={pi}>{p}</mark> : p
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
export default SearchWorkspace;
