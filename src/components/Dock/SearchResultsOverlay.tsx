import React from 'react';
import { SearchResult } from '../../types';

interface SearchResultsOverlayProps {
  results: SearchResult[];
  query: string;
  selectedIndex: number;
  isActive: boolean;
  onSelectResult: (result: SearchResult) => void;
}

export const SearchResultsOverlay: React.FC<SearchResultsOverlayProps> = ({
  results,
  query,
  selectedIndex,
  isActive,
  onSelectResult,
}) => {
  if (!isActive) return null;

  return (
    <div
      className="search-results-overlay active"
      id="searchResultsOverlay"
    >
      {results.length === 0 ? (
        <div className="loading-msg">No results found</div>
      ) : (
        results.map((res, index) => {
          let badgeClass = 'badge-quote';
          if (res.type === 'message') badgeClass = 'badge-message';
          else if (res.type === 'paragraph') badgeClass = 'badge-paragraph';

          // Highlight query in text snippet if quote
          let highlightedSnippet: React.ReactNode = null;
          if (res.type === 'quote' && res.text) {
            const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(`(${escapedQuery})`, 'gi');
            const parts = res.text.split(regex);
            highlightedSnippet = (
              <div className="result-quote-snippet">
                "
                {parts.map((part, i) =>
                  regex.test(part) ? (
                    <mark key={i}>{part}</mark>
                  ) : (
                    part
                  )
                )}
                "
              </div>
            );
          }

          return (
            <div
              key={index}
              className={`search-result-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => onSelectResult(res)}
            >
              <div className="result-meta">
                <div>
                  <span className={`result-badge ${badgeClass}`}>{res.badge}</span>
                  <span className="result-title">{res.title}</span>
                </div>
                <span className="result-subtitle">{res.subtitle}</span>
              </div>
              {highlightedSnippet}
            </div>
          );
        })
      )}
    </div>
  );
};
