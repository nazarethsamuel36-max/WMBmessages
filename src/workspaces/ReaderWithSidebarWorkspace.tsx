import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { ReaderWorkspace } from './ReaderWorkspace';
import { SearchWorkspace } from './SearchWorkspace';
import { SplitPane } from '../components/layout/SplitPane';
import { normalizeText, buildSearchHighlightRegExp } from '../utils/textNormalizer';

export const ReaderWithSidebarWorkspace: React.FC = () => {
  const { state, setReaderQuery } = useApp();
  const { paragraphs, readerQuery } = state;
  const [readerSearchActive, setReaderSearchActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const readerSearchResults = useMemo(() => {
    const q = normalizeText(readerQuery.trim());
    if (!q || paragraphs.length === 0) return [];
    return paragraphs
      .map((p, idx) => ({ idx, para: p }))
      .filter(({ para }) => {
        const searchText = normalizeText(para.normalized_text || para.text || '');
        return searchText.includes(q);
      });
  }, [readerQuery, paragraphs]);

  const handleReaderSearchSelect = useCallback((idx: number) => {
    setReaderQuery(`¶${paragraphs[idx]?.paragraph}`);
    setReaderSearchActive(false);
    window.dispatchEvent(new CustomEvent('readerJumpTo', { detail: { paragraphIndex: idx } }));
  }, [paragraphs, setReaderQuery]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Keyboard shortcut for fullscreen (F)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
        // Check if not typing in an input
        if (document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          toggleFullscreen();
        }
      }
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, toggleFullscreen]);

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Reader Search Bar */}
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <input
          type="text"
          placeholder={paragraphs.length > 0 ? `Search in message or type ¶ number…` : 'Open a message first…'}
          value={readerQuery.startsWith('¶') ? '' : readerQuery}
          onChange={(e) => {
            setReaderQuery(e.target.value);
            setReaderSearchActive(e.target.value.trim().length >= 2);
          }}
          onFocus={() => {
            if (readerQuery && !readerQuery.startsWith('¶')) {
              setReaderSearchActive(true);
            }
          }}
          onBlur={() => setTimeout(() => setReaderSearchActive(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setReaderQuery('');
              setReaderSearchActive(false);
            }
          }}
          disabled={paragraphs.length === 0}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
        
        {/* Fullscreen Toggle Button */}
        <button
          onClick={toggleFullscreen}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          title={isFullscreen ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'}
        >
          {isFullscreen ? '⛶' : '⛶'}
        </button>
        
        {/* Reader Search Results */}
        {readerSearchActive && readerSearchResults.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '16px',
            right: '80px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 20,
            marginTop: '4px'
          }}>
            {readerSearchResults.slice(0, 10).map(({ idx, para }) => {
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
                  onClick={() => handleReaderSearchSelect(idx)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f3f4f6',
                    fontSize: '13px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}>
                    ¶{para.paragraph}
                  </div>
                  <div style={{ color: '#6b7280' }}>
                    {parts.map((part, i) =>
                      i % 2 === 1 ? <mark key={i} style={{ backgroundColor: '#fef08a' }}>{part}</mark> : part
                    )}
                    …
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Split Pane with Reader and Message List */}
      <div style={{ 
        flex: 1, 
        position: 'relative',
        overflow: 'hidden'
      }}>
        {isFullscreen ? (
          /* Fullscreen Mode - Both searches still accessible */
          <div style={{ 
            width: '100%', 
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <ReaderWorkspace />
            </div>
            {/* Collapsible Global Search in Fullscreen */}
            <div style={{
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              maxHeight: '40%',
              minHeight: '200px',
              overflow: 'auto'
            }}>
              <div style={{ padding: '8px 16px', fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>
                GLOBAL SEARCH (Press F to exit fullscreen)
              </div>
              <SearchWorkspace />
            </div>
          </div>
        ) : (
          /* Normal Mode - Split Pane */
          <SplitPane
            leftContent={<ReaderWorkspace />}
            rightContent={<SearchWorkspace />}
            defaultSplit={70}
            minLeft={30}
            maxLeft={90}
            collapsible={true}
            defaultCollapsed={false}
          />
        )}
      </div>
    </div>
  );
};
