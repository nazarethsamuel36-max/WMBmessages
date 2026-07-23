import React, { useEffect, useRef } from 'react';
import { Paragraph } from '../../types';

interface ReadingWorkspaceProps {
  paragraphs: Paragraph[];
  reading: { paragraphIndex: number; slideIndex: number };
  live: { messageIndex: number; paragraphIndex: number; slideIndex: number };
  isLive: boolean;
  viewMode: 'read' | 'list';
  onParagraphClick: (pi: number) => void;
  onSlideClick: (pi: number, si: number) => void;
  onAddToSetlist: (e: React.MouseEvent, pi: number) => void;
}

export const ReadingWorkspace: React.FC<ReadingWorkspaceProps> = ({
  paragraphs,
  reading,
  live,
  isLive,
  viewMode,
  onParagraphClick,
  onSlideClick,
  onAddToSetlist,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll reading pointer into view when it changes
  useEffect(() => {
    if (reading.paragraphIndex >= 0) {
      const el = document.getElementById(`para-${reading.paragraphIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [reading.paragraphIndex]);

  if (paragraphs.length === 0) {
    return (
      <div className="workspace">
        <div className="empty-state">
          <div className="icon">📖</div>
          <p>Select a message to begin reading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace" ref={containerRef}>
      {viewMode === 'read' ? (
        // READ VIEW
        paragraphs.map((para, pi) => {
          const isReadingPara = pi === reading.paragraphIndex;
          const isLivePara = isLive && pi === live.paragraphIndex;

          return (
            <div className="para-group" key={pi} id={`para-${pi}`}>
              <div
                className={`para-card ${isReadingPara ? 'reading-pointer' : ''} ${
                  isLivePara ? 'live-pointer' : ''
                }`}
              >
                {/* Paragraph Header */}
                <div className="para-header" onClick={() => onParagraphClick(pi)}>
                  <div className="para-label">
                    <div className="para-state-dot"></div>
                    <span className="para-num">¶ {para.paragraph}</span>
                  </div>
                  <div className="para-actions">
                    <button
                      className="btn-add-setlist"
                      title="Add to Setlist"
                      onClick={(e) => onAddToSetlist(e, pi)}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Slides List */}
                <div className="slides-container">
                  {para.slides?.map((slide, si) => {
                    const isReadingSlide = isReadingPara && si === reading.slideIndex;
                    const isLiveSlide = isLivePara && si === live.slideIndex;

                    return (
                      <div
                        key={si}
                        className={`slide-card ${isReadingSlide ? 'slide-reading' : ''} ${
                          isLiveSlide ? 'slide-live' : ''
                        }`}
                        onClick={() => onSlideClick(pi, si)}
                      >
                        <div className="slide-meta">
                          <span className="slide-num-badge">
                            Slide {si + 1} of {para.slides?.length || 1}
                          </span>
                        </div>
                        <div className="slide-text">
                          {slide.lines.join('\n')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        // LIST VIEW
        paragraphs.map((para, pi) => {
          const isReadingPara = pi === reading.paragraphIndex;
          const isLivePara = isLive && pi === live.paragraphIndex;
          const previewText = para.text || '';

          return (
            <div
              key={pi}
              id={`para-${pi}`}
              className={`list-para-row ${isReadingPara ? 'reading-pointer' : ''} ${
                isLivePara ? 'live-pointer' : ''
              }`}
              onClick={() => onParagraphClick(pi)}
            >
              <div className="list-para-dot"></div>
              <div className="list-para-num">¶ {para.paragraph}</div>
              <div className="list-para-preview">{previewText}</div>
              <div className="list-slide-count">
                {para.slides?.length || 1} {para.slides?.length === 1 ? 'slide' : 'slides'}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
