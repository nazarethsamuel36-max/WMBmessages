import React, { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

export const ReaderWorkspace: React.FC = () => {
  const { state, openMessage, selectReading, toggleLive, addToSetlist } = useApp();
  const { messages, currentMessageIndex, paragraphs, reading, live, isLive } = state;

  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll reading pointer into view
  useEffect(() => {
    if (reading.paragraphIndex >= 0) {
      const el = document.getElementById(`para-${reading.paragraphIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [reading.paragraphIndex]);

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

      {/* Reader Main Content */}
      <div className="reader-content" ref={contentRef}>
        {paragraphs.length === 0 ? (
          <div className="reader-empty">
            <div className="reader-empty-icon">📖</div>
            <p>Select a message from the sidebar or search to start reading</p>
          </div>
        ) : (
          paragraphs.map((para, pi) => {
            const isReadingPara = pi === reading.paragraphIndex;
            const isLivePara = isLive && pi === live.paragraphIndex && live.messageIndex === currentMessageIndex;

            return (
              <div
                key={pi}
                id={`para-${pi}`}
                className={`para-card ${isReadingPara ? 'is-reading' : ''} ${
                  isLivePara ? 'is-live' : ''
                }`}
                onClick={() => toggleLive(pi, 0)}
              >
                {/* Paragraph Header */}
                <div className="para-card-header">
                  <div className="para-label">
                    <div className="para-state-dot"></div>
                    <span className="para-num">¶ {para.paragraph}</span>
                  </div>
                  <div className="para-actions">
                    <button
                      className="btn-add-setlist"
                      title="Add to Setlist"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToSetlist(pi);
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* RESPONSIVE text - natural wrapping */}
                <div className="para-text">{para.text}</div>

                {/* Slides (unwrapped representation for presentation check) */}
                <div className="slides-container" onClick={(e) => e.stopPropagation()}>
                  {para.slides?.map((slide, si) => {
                    const isReadingSlide = isReadingPara && si === reading.slideIndex;
                    const isLiveSlide = isLivePara && si === live.slideIndex;

                    return (
                      <div
                        key={si}
                        className={`slide-row ${isReadingSlide ? 'slide-reading' : ''} ${
                          isLiveSlide ? 'slide-live' : ''
                        }`}
                        onClick={() => selectReading(pi, si)}
                      >
                        <div className="slide-row-meta">
                          <span className="slide-num">
                            Slide {si + 1} of {para.slides?.length || 1}
                          </span>
                        </div>
                        <div className="slide-row-text">
                          {slide.lines.join('\n')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default ReaderWorkspace;
