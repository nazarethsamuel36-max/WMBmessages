import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Slide } from '../types';
import { renderTextToSlides } from '../parser/textRenderer';
import { BIBLE_FRAME_SPEC } from '../parser/sermonParser';

export const PresentationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true'; // ?preview=true displays background image
  const isBanner = searchParams.get('banner') === 'true'; // ?banner=true creates 30% height banner

  const [activeSlide, setActiveSlide] = useState<Slide | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);

  // BroadcastChannel and localStorage listeners for instant updates
  useEffect(() => {
    const handleCommand = (cmd: { action: string; data: any }) => {
      if (!cmd) return;

      switch (cmd.action) {
        case 'showSlide':
          setActiveSlide(cmd.data);
          setIsActive(true);
          break;
        case 'clearDisplay':
          setIsActive(false);
          break;
        default:
          break;
      }
    };

    // 1. BroadcastChannel listener
    const presentationChannel = new BroadcastChannel('presentation_channel');
    presentationChannel.onmessage = (event) => {
      handleCommand(event.data);
    };

    // 2. LocalStorage storage event listener (fallback)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'presentationCommand' && e.newValue) {
        try {
          const cmd = JSON.parse(e.newValue);
          handleCommand(cmd);
        } catch (err) {
          console.error('Failed to parse command from localStorage', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Read initial command state if present
    const initialCmd = localStorage.getItem('presentationCommand');
    if (initialCmd) {
      try {
        const cmd = JSON.parse(initialCmd);
        handleCommand(cmd);
      } catch (e) {}
    }

    return () => {
      presentationChannel.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Set the page background class
  useEffect(() => {
    document.body.className = 'overlay-body-transparent';
    return () => {
      document.body.className = '';
    };
  }, []);

  const metaDate = activeSlide?.metadata?.date || '';
  const metaTitle = activeSlide?.metadata?.title || '';
  const paraNumber = activeSlide?.metadata?.paragraph || '';

  // Re-wrap legacy slides (stored as a single long line) through the balanced
  // parser so the overlay always receives real per-line data for centering.
  const overlayLines = useMemo(() => {
    const raw = activeSlide?.lines?.length ? activeSlide.lines : [];
    if (raw.length > 1) return raw;
    const text = raw[0] ?? '';
    if (!text) return [];
    const clean = text.replace(/^["']|["']$/g, '');
    const { slides } = renderTextToSlides(clean, '', BIBLE_FRAME_SPEC);
    return slides[0]?.lines ?? [];
  }, [activeSlide]);

  const cleanLine = (l: string) => l.replace(/^["']|["']$/g, '');

  return (
    <div className={`presentation-canvas-container ${isBanner ? 'banner-mode' : ''}`}>
      {/* Background Image (Rendered only if ?preview=true parameter is set, otherwise transparent for OBS keying) */}
      {isPreview && (
        <>
          <img
            className="presentation-bg-image"
            src="Screenshot 2026-07-21 215142.png"
            alt="Presentation background"
          />
          <div className="presentation-gradient-overlay"></div>
        </>
      )}

      {/* Lower Third presentation block */}
      <div className={`lower-third ${isActive ? 'active' : ''}`}>
        <div className="overlay-metadata-bar">
          <div className="overlay-year">{metaDate}</div>
          <div className="overlay-title">{metaTitle}</div>
          <div className="overlay-para">{paraNumber}</div>
        </div>
        <div className="overlay-quote-container">
          <div className="overlay-quote-text">
            {overlayLines.map((line, i) => (
              <span key={i} className="overlay-quote-line">
                {cleanLine(line)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
