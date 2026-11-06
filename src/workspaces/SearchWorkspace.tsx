import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { searchRouter } from '../search/searchIntent';
import { buildSearchHighlightRegExp } from '../utils/textNormalizer';
import { SearchResult } from '../types';
import { sermonSeries } from '../data/series';

export const SearchWorkspace: React.FC = () => {
  const { state, openMessage, handleSearchResult, setWorkspace } = useApp();
  const { messages, paragraphs, currentMessageIndex, searchQuery } = state;

  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [listMode, setListMode] = useState<'dates' | 'series'>('dates');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const latestSearchRef = useRef(0);
  const searchStateRef = useRef({ results, searching, selectedIndex, searchQuery });
  searchStateRef.current = { results, searching, selectedIndex, searchQuery };

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
    setSearching(true);
    setSelectedIndex(-1);
    debounceRef.current = setTimeout(() => runSearch(searchQuery), 180);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, runSearch]);

  const selectResult = (res: SearchResult) => {
    handleSearchResult(res.messageIndex, res.paragraphNo, searchQuery.trim());
  };

  useEffect(() => {
    const handleResultNavigation = (event: KeyboardEvent) => {
      if (document.activeElement?.id !== 'globalSearchInput') return;

      const current = searchStateRef.current;
      if (current.results.length === 0 || current.searching) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex(index => Math.min(index + 1, current.results.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex(index => index < 0 ? current.results.length - 1 : Math.max(index - 1, 0));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const index = current.selectedIndex >= 0 ? current.selectedIndex : 0;
        const result = current.results[index];
        if (result) {
          handleSearchResult(result.messageIndex, result.paragraphNo, current.searchQuery.trim());
        }
      }
    };

    window.addEventListener('keydown', handleResultNavigation);
    return () => window.removeEventListener('keydown', handleResultNavigation);
  }, [handleSearchResult]);

  const badgeClass = (type: string) => {
    if (type === 'message') return 'type-message';
    if (type === 'paragraph') return 'type-paragraph';
    return 'type-quote';
  };

  const selectedSeries = sermonSeries.find(series => series.id === selectedSeriesId);
  const seriesMessages = selectedSeries
    ? messages
        .map((message, index) => ({ message, index }))
        .filter(({ message }) => selectedSeries.messageIds.includes(String(message.id)))
    : [];

  return (
    <div className="search-workspace" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="reader-content" style={{ width: '100%', flex: 1, overflowY: 'auto' }}>
        {searchQuery.trim().length === 0 ? (
          // If no search query, show the full list of messages in the middle (no sidebar)
          <div style={{ display: 'flex', flexDirection: 'column', padding: '0px' }}>
            <div className="message-list-tabs" role="tablist" aria-label="Browse messages">
              <button
                type="button"
                role="tab"
                aria-selected={listMode === 'dates'}
                className={listMode === 'dates' ? 'active' : ''}
                onClick={() => {
                  setListMode('dates');
                  setSelectedSeriesId(null);
                }}
              >
                Dates
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={listMode === 'series'}
                className={listMode === 'series' ? 'active' : ''}
                onClick={() => setListMode('series')}
              >
                Series
              </button>
            </div>
            {listMode === 'dates' ? (
              <>
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
              </>
            ) : (
              <div className="series-browser">
                {selectedSeries ? (
                  <>
                    <button
                      type="button"
                      className="series-back-button"
                      onClick={() => setSelectedSeriesId(null)}
                    >
                      ← All series
                    </button>
                    <div className="panel-label series-heading">{selectedSeries.title}</div>
                    {seriesMessages.length > 0 ? seriesMessages.map(({ message, index }) => (
                      <div
                        key={message.id}
                        className={`msg-item ${index === currentMessageIndex ? 'active' : ''}`}
                        onClick={async () => {
                          await openMessage(index);
                          setWorkspace('reader');
                          window.dispatchEvent(new CustomEvent('readerJumpTo', { detail: { paragraphIndex: 0 } }));
                        }}
                      >
                        <div className="msg-item-date">{message.date}</div>
                        <div className="msg-item-title">{message.title}</div>
                      </div>
                    )) : (
                      <div className="series-empty">{selectedSeries.note || 'No matching messages found in this library yet.'}</div>
                    )}
                  </>
                ) : (
                  <div className="series-list">
                    {sermonSeries.map(series => (
                      <button
                        key={series.id}
                        type="button"
                        className="series-list-item"
                        onClick={() => setSelectedSeriesId(series.id)}
                      >
                        <span>{series.title}</span>
                        <span>{series.messageIds.length || '—'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
