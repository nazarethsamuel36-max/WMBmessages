import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Message, Paragraph, SearchResult, SetlistEntry } from '../types';
import { getMessages, getParagraphs } from '../services/messageService';
import { parseSermonToSlides } from '../parser/sermonParser';
import { searchRouter } from '../search/searchIntent';
import { MessagePanel } from '../components/Dock/MessagePanel';
import { ReadingWorkspace } from '../components/Dock/ReadingWorkspace';
import { SetlistPanel } from '../components/Dock/SetlistPanel';
import { SearchResultsOverlay } from '../components/Dock/SearchResultsOverlay';

const presentationChannel = typeof window !== 'undefined' ? new BroadcastChannel('presentation_channel') : null;

function sendToPresentation(action: string, data: any) {
  const cmd = { action, data };
  if (presentationChannel) {
    presentationChannel.postMessage(cmd);
  }
  localStorage.setItem('presentationCommand', JSON.stringify(cmd));
}

export const DockPage: React.FC = () => {
  // Database / state arrays
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState<number>(-1);
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [presentationData, setPresentationData] = useState<any>(null);

  // App settings
  const [viewMode, setViewMode] = useState<'read' | 'list'>('read');
  const [reading, setReading] = useState<{ paragraphIndex: number; slideIndex: number }>({
    paragraphIndex: -1,
    slideIndex: 0,
  });
  const [live, setLive] = useState<{ messageIndex: number; paragraphIndex: number; slideIndex: number }>({
    messageIndex: -1,
    paragraphIndex: -1,
    slideIndex: 0,
  });
  const [isLive, setIsLive] = useState<boolean>(false);
  const [setlist, setSetlist] = useState<SetlistEntry[]>([]);

  // Search state
  const [query, setQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState<number>(-1);
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<any>(null);

  // Load messages on mount
  useEffect(() => {
    getMessages()
      .then(setMessages)
      .catch(err => console.error('Failed to load messages from service:', err));
  }, []);

  // Sync presentation if live states change
  const syncLiveSlide = useCallback((pi: number, si: number, sermonData: any) => {
    if (pi >= 0 && sermonData?.paragraphs?.[pi]) {
      const activePara = sermonData.paragraphs[pi];
      const activeSlide = activePara.slides?.[si];
      if (activeSlide) {
        sendToPresentation('showSlide', activeSlide);
      }
    }
  }, []);

  // Change active slide
  const selectSlide = useCallback((pi: number, si: number, sermonData = presentationData) => {
    setReading({ paragraphIndex: pi, slideIndex: si });
    if (isLive) {
      setLive({ messageIndex: currentMessageIndex, paragraphIndex: pi, slideIndex: si });
      syncLiveSlide(pi, si, sermonData);
    }
  }, [isLive, currentMessageIndex, presentationData, syncLiveSlide]);

  const selectParagraph = useCallback((pi: number, sermonData = presentationData) => {
    selectSlide(pi, 0, sermonData);
  }, [selectSlide, presentationData]);

  // Toggle Live State
  const toggleLive = useCallback((pi?: number, si?: number) => {
    const targetPi = pi !== undefined ? pi : reading.paragraphIndex;
    if (targetPi < 0 || !presentationData) return;

    const targetSi = si !== undefined ? si : (pi !== undefined ? 0 : reading.slideIndex);
    const clickingSameParagraph = isLive && live.paragraphIndex === targetPi && live.slideIndex === targetSi;

    if (clickingSameParagraph) {
      setIsLive(false);
      setLive({ messageIndex: -1, paragraphIndex: -1, slideIndex: 0 });
      sendToPresentation('clearDisplay', {});
    } else {
      setIsLive(true);
      setLive({ messageIndex: currentMessageIndex, paragraphIndex: targetPi, slideIndex: targetSi });
      syncLiveSlide(targetPi, targetSi, presentationData);
    }
  }, [isLive, live, reading, currentMessageIndex, presentationData, syncLiveSlide]);

  // Open / Load specific message
  const openMessage = useCallback(async (index: number, targetParagraphNo?: number) => {
    const isSameMessage = index === currentMessageIndex;

    let targetSermonData = presentationData;
    if (!isSameMessage) {
      setCurrentMessageIndex(index);
      setParagraphs([]);
      setPresentationData(null);

      const msg = messages[index];
      if (!msg) return;

      try {
        const data = await getParagraphs(msg.id);
        const parsed = parseSermonToSlides({
          messageNumber: data.message.date,
          title: data.message.title,
          date: data.message.date,
          paragraphs: data.paragraphs,
        });

        setPresentationData(parsed);
        targetSermonData = parsed;
        setParagraphs(parsed.paragraphs);
        sendToPresentation('loadPresentation', parsed);
      } catch (err) {
        console.error('Failed to load message:', err);
        return;
      }
    }

    if (targetParagraphNo !== undefined && targetSermonData) {
      const idx = targetSermonData.paragraphs.findIndex(
        (p: any) => String(p.paragraph) === String(targetParagraphNo)
      );
      if (idx >= 0) {
        selectSlide(idx, 0, targetSermonData);
      }
    } else if (!isSameMessage) {
      setReading({ paragraphIndex: 0, slideIndex: 0 });
    }
  }, [currentMessageIndex, messages, presentationData, selectSlide]);

  // Handle setlist additions
  const addToSetlist = useCallback((e: React.MouseEvent, pi: number) => {
    e.stopPropagation();
    const para = paragraphs[pi];
    const msg = messages[currentMessageIndex];
    if (!para || !msg) return;

    // Check for duplicates
    if (setlist.some(s => s.messageIndex === currentMessageIndex && s.paragraphIndex === pi)) return;

    setSetlist(prev => [
      ...prev,
      {
        messageIndex: currentMessageIndex,
        paragraphIndex: pi,
        msgDate: msg.date,
        paraNum: para.paragraph,
      },
    ]);
  }, [paragraphs, messages, currentMessageIndex, setlist]);

  // Search query inputs
  const handleSearchInput = (val: string) => {
    let queryVal = val;

    // Auto hyphenate e.g. 650402 -> 65-0402
    if (/^\d{3,}/.test(queryVal) && !queryVal.includes('-')) {
      queryVal = queryVal.slice(0, 2) + '-' + queryVal.slice(2);
    }

    setQuery(queryVal);
    clearTimeout(searchTimeout.current);

    if (!queryVal.trim()) {
      setIsSearchActive(false);
      setSearchResults([]);
      setSearchSelectedIndex(-1);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      const results = await searchRouter.search(
        queryVal,
        messages,
        paragraphs.length > 0 ? paragraphs : null,
        currentMessageIndex
      );
      setSearchResults(results);
      setSearchSelectedIndex(-1);
      setIsSearchActive(true);
    }, 150);
  };

  // Select Search result
  const handleSelectSearchResult = (res: SearchResult) => {
    if (res.type === 'message') {
      openMessage(res.messageIndex).then(() => {
        setQuery(res.subtitle + ' ');
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
        handleSearchInput(res.subtitle + ' ');
      });
    } else {
      openMessage(res.messageIndex, res.paragraphNo).then(() => {
        setQuery('');
        setIsSearchActive(false);
        setSearchResults([]);
      });
    }
  };

  // Keyboard Navigation logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Search dropdown keyboard navigation
      if (isSearchActive && searchResults.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSearchSelectedIndex(prev => (prev + 1) % searchResults.length);
          return;
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSearchSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
          return;
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (searchSelectedIndex >= 0 && searchResults[searchSelectedIndex]) {
            handleSelectSearchResult(searchResults[searchSelectedIndex]);
          }
          return;
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setIsSearchActive(false);
          return;
        }
      }

      // If typing in search input, block workspace arrow hotkeys
      if (searchInputRef.current && document.activeElement === searchInputRef.current) {
        if (e.key === 'Escape') {
          searchInputRef.current.blur();
        }
        return;
      }

      // 2. Reading workspace keyboard controls
      if (!presentationData || paragraphs.length === 0) return;

      const pi = reading.paragraphIndex;
      const si = reading.slideIndex;
      const slidesInPara = paragraphs[pi]?.slides?.length || 1;

      switch (e.key) {
        case 'ArrowDown': // Next slide
          e.preventDefault();
          if (si < slidesInPara - 1) {
            selectSlide(pi, si + 1);
          } else if (pi < paragraphs.length - 1) {
            selectSlide(pi + 1, 0);
          }
          break;
        case 'ArrowUp': // Previous slide
          e.preventDefault();
          if (si > 0) {
            selectSlide(pi, si - 1);
          } else if (pi > 0) {
            const prevSlides = paragraphs[pi - 1]?.slides?.length || 1;
            selectSlide(pi - 1, prevSlides - 1);
          }
          break;
        case 'ArrowRight': // Next paragraph
          e.preventDefault();
          if (pi < paragraphs.length - 1) {
            selectParagraph(pi + 1);
          }
          break;
        case 'ArrowLeft': // Previous paragraph
          e.preventDefault();
          if (pi > 0) {
            selectParagraph(pi - 1);
          }
          break;
        case 'Enter': // Go Live / Toggle display
          e.preventDefault();
          toggleLive();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isSearchActive,
    searchResults,
    searchSelectedIndex,
    reading,
    paragraphs,
    presentationData,
    selectSlide,
    selectParagraph,
    toggleLive,
    openMessage,
  ]);

  // Click outside search
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.search-wrap')) {
        setIsSearchActive(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Compute status bar text
  const currentMessage = messages[currentMessageIndex];
  const activeParagraph = paragraphs[reading.paragraphIndex];
  const slideCount = activeParagraph?.slides?.length || 1;

  return (
    <div className="dock-layout-wrapper">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input
            ref={searchInputRef}
            type="text"
            id="searchInput"
            placeholder="Search by title, date, or paragraph…"
            value={query}
            onChange={(e) => handleSearchInput(e.target.value)}
          />
          <SearchResultsOverlay
            results={searchResults}
            query={query}
            selectedIndex={searchSelectedIndex}
            isActive={isSearchActive}
            onSelectResult={handleSelectSearchResult}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'read' ? 'active' : ''}`}
              onClick={() => setViewMode('read')}
            >
              Read
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
          <Link to="/" className="welcome-btn-secondary" style={{ padding: '5px 10px', fontSize: '11px' }}>
            Home
          </Link>
        </div>
      </div>

      {/* Main 3-panel display */}
      <div className="main-layout">
        <MessagePanel
          messages={messages}
          currentMessageIndex={currentMessageIndex}
          onSelectMessage={(idx) => openMessage(idx)}
        />
        <ReadingWorkspace
          paragraphs={paragraphs}
          reading={reading}
          live={live}
          isLive={isLive}
          viewMode={viewMode}
          onParagraphClick={(pi) => toggleLive(pi)}
          onSlideClick={(pi, si) => selectSlide(pi, si)}
          onAddToSetlist={addToSetlist}
        />
        <SetlistPanel
          setlist={setlist}
          onSelectEntry={async (entry) => {
            await openMessage(entry.messageIndex);
            selectSlide(entry.paragraphIndex, 0);
          }}
          onRemoveEntry={(idx) => setSetlist(prev => prev.filter((_, i) => i !== idx))}
        />
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-left">
          <div className={`live-badge ${isLive ? 'live' : ''}`}>
            <div className="live-dot"></div>
            <span>{isLive ? 'LIVE' : 'READY'}</span>
          </div>
          <span id="statusText">
            {reading.paragraphIndex >= 0 && activeParagraph
              ? `${currentMessage ? currentMessage.date : ''} · ¶${activeParagraph.paragraph}`
              : ''}
          </span>
        </div>
        <div id="slideInfo">
          {reading.paragraphIndex >= 0
            ? `Slide ${reading.slideIndex + 1} / ${slideCount}`
            : ''}
        </div>
      </div>
    </div>
  );
};
