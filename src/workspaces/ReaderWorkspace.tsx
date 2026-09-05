import React, { useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { buildSearchHighlightRegExp } from '../utils/textNormalizer';

export const ReaderWorkspace: React.FC = () => {
  const { state, selectReading, toggleLive, addToSetlist } = useApp();
  const { paragraphs, reading, live, isLive, currentMessageIndex, searchQuery } = state;

  const highlightRegex = useMemo(() => buildSearchHighlightRegExp(searchQuery), [searchQuery]);

  // Split text into [plain, match, plain, ...] segments for <mark> highlighting
  const renderHighlighted = (text: string): React.ReactNode => {
    if (!text || !highlightRegex) return text;
    const parts = text.split(highlightRegex);
    return parts.map((part, i) =>
      i % 2 === 1 ? <mark key={i}>{part}</mark> : part
    );
  };

  const contentRef = useRef<HTMLDivElement>(null);

  // Flatten paragraphs and slides into a single array of slide-cards
  const displayItems = React.useMemo(() => {
    const items: Array<{
      pi: number;
      si: number;
      paragraphNum: number;
      text: string;
      slideNumber: number;
      totalSlides: number;
    }> = [];

    paragraphs.forEach((para, pi) => {
      if (para.slides && para.slides.length > 0) {
        para.slides.forEach((slide, si) => {
          items.push({
            pi,
            si,
            paragraphNum: para.paragraph,
            text: slide.lines.join('\n'),
            slideNumber: si + 1,
            totalSlides: para.slides?.length || 1,
          });
        });
      } else {
        items.push({
          pi,
          si: 0,
          paragraphNum: para.paragraph,
          text: para.text,
          slideNumber: 1,
          totalSlides: 1,
        });
      }
    });

    return items;
  }, [paragraphs]);

  // Scroll reading pointer card into view
  useEffect(() => {
    if (reading.paragraphIndex >= 0) {
      const idx = displayItems.findIndex(
        item => item.pi === reading.paragraphIndex && item.si === reading.slideIndex
      );
      if (idx >= 0) {
        const el = document.getElementById(`slide-card-${idx}`);
        if (el) {
          // Align to top of the reader so the selected slide is visible even in a small dock.
          // scrollIntoView with block:'start' naturally caps at the container's scroll limit,
          // so the last paragraph is not forced off-screen.
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  }, [reading.paragraphIndex, reading.slideIndex, displayItems]);

  // Jump event listener for In-Reader search
  useEffect(() => {
    const handleJump = (e: Event) => {
      const customEvent = e as CustomEvent;
      const idx = customEvent.detail?.paragraphIndex;
      if (idx !== undefined && idx >= 0) {
        selectReading(idx, 0);
      }
    };
    window.addEventListener('readerJumpTo', handleJump);
    return () => window.removeEventListener('readerJumpTo', handleJump);
  }, [selectReading]);

  return (
    <div className="reader-workspace">
      {/* Reader Main Content - full width */}
      <div className="reader-content" ref={contentRef} style={{ width: '100%' }}>
        {paragraphs.length === 0 ? (
          <div className="reader-empty">
            <div className="reader-empty-icon">📖</div>
            <p>Select a message from the Search tab to start reading</p>
          </div>
        ) : (
          displayItems.map((item, idx) => {
            const isReadingSlide = item.pi === reading.paragraphIndex && item.si === reading.slideIndex;
            const isLiveSlide = isLive && item.pi === live.paragraphIndex && item.si === live.slideIndex && live.messageIndex === currentMessageIndex;

            // Formulate label e.g. "¶ 2 (1/2)" or "¶ 2"
            const label = item.totalSlides > 1
              ? `¶ ${item.paragraphNum} (${item.slideNumber}/${item.totalSlides})`
              : `¶ ${item.paragraphNum}`;

            return (
              <div
                key={idx}
                id={`slide-card-${idx}`}
                className={`para-card ${isReadingSlide ? 'is-reading' : ''} ${isLiveSlide ? 'is-live' : ''}`}
                onClick={() => { console.log('CARD CLICKED pi=' + item.pi + ' si=' + item.si); toggleLive(item.pi, item.si); }}
              >
                {/* Paragraph/Slide Header */}
                <div className="para-card-header">
                  <div className="para-label">
                    <div className="para-state-dot" style={{ backgroundColor: isLiveSlide ? 'var(--green)' : undefined, boxShadow: isLiveSlide ? '0 0 5px var(--green)' : undefined }}></div>
                    <span className="para-num" style={{ color: isLiveSlide ? 'var(--green)' : undefined }}>{label}</span>
                  </div>
                  <div className="para-actions">
                    <button
                      className="btn-add-setlist"
                      title="Add to List"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToSetlist(item.pi);
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* RESPONSIVE text - slide lines formatted naturally */}
                <div className="para-text" style={{ color: isLiveSlide ? 'var(--green)' : undefined }}>{renderHighlighted(item.text)}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default ReaderWorkspace;
