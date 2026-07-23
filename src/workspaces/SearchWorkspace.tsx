import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { searchRouter } from '../search/searchIntent';
import { SearchResult } from '../types';

export const SearchWorkspace: React.FC = () => {
  const { state, handleSearchResult } = useApp();
  const { messages, paragraphs, currentMessageIndex } = state;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Auto-focus search on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  const handleInput = (val: string) => {
    // Auto-hyphenate date queries e.g. 650402 → 65-0402
    let v = val;
    if (/^\d{3,}/.test(v) && !v.includes('-')) {
      v = v.slice(0, 2) + '-' + v.slice(2);
    }
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(v), 180);
  };

  const selectResult = (res: SearchResult) => {
    if (res.type === 'message') {
      // Put date in box so user can type paragraph number
      setQuery(res.subtitle + ' ');
      handleSearchResult(res.messageIndex);
      // Keep in search if selecting message only
    } else {
      // Paragraph / quote → navigate to reader immediately
      handleSearchResult(res.messageIndex, res.paragraphNo);
      setQuery('');
      setResults([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        selectResult(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setQuery('');
      setResults([]);
    }
  };

  const badgeClass = (type: string) => {
    if (type === 'message') return 'type-message';
    if (type === 'paragraph') return 'type-paragraph';
    return 'type-quote';
  };

  return (
    <div className="search-workspace">
      {/* Search Input */}
      <div className="search-header">
        <div className="search-input-wrap">
          <span className="search-input-icon">⌕</span>
          <input
            ref={inputRef}
            className="search-input"
            type="text"
            placeholder="Search by title, date (65-0410), paragraph, or quote…"
            value={query}
            onChange={e => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>

      {/* Results / Empty States */}
      <div className="search-results-list">
        {query.trim().length === 0 && (
          <div className="search-empty">
            <div style={{ fontSize: '2rem', marginBottom: '8px', opacity: 0.3 }}>⌕</div>
            Search sermons by title, date, paragraph number, or quote text.
            <br /><br />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Try: <em>65-0410</em> · <em>Leadership</em> · <em>50</em> · <em>"faith is"</em>
            </span>
          </div>
        )}

        {query.trim().length > 0 && searching && (
          <div className="search-hint">Searching…</div>
        )}

        {query.trim().length > 0 && !searching && results.length === 0 && (
          <div className="search-empty">No results for "<strong>{query}</strong>"</div>
        )}

        {results.map((res, i) => {
          const q = query.trim();
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
      </div>
    </div>
  );
};
