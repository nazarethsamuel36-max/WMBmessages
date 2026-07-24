import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Slide } from '../types';
import { PresentationTheme, themeToCSSVariables } from '../parser/presentationTheme';

export const PresentationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true'; // ?preview=true displays background image
  const isBanner = searchParams.get('banner') === 'true'; // ?banner=true creates 30% height banner

  const [activeSlide, setActiveSlide] = useState<Slide | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Dynamic 16:9 scaler or banner mode
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current) return;
      const w = window.innerWidth;
      const h = window.innerHeight;

      if (isBanner) {
        // Banner mode: 30% height, full width, positioned at bottom
        canvasRef.current.style.transform = 'none';
        canvasRef.current.style.left = '0';
        canvasRef.current.style.top = `${h * 0.7}px`; // 30% from top (70% down)
        canvasRef.current.style.width = '100%';
        canvasRef.current.style.height = `${h * 0.3}px`;
      } else {
        // 16:9 mode with proportional margins
        const marginPercent = 0.05; // 5% margin on all sides
        const availableW = w * (1 - marginPercent * 2);
        const availableH = h * (1 - marginPercent * 2);
        const scale = Math.min(availableW / 1920, availableH / 1080);
        canvasRef.current.style.transform = `scale(${scale})`;
        canvasRef.current.style.left = `${(w - 1920 * scale) / 2}px`;
        canvasRef.current.style.top = `${(h - 1080 * scale) / 2}px`;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    return () => window.removeEventListener('resize', handleResize);
  }, [isBanner]);

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
        case 'loadPresentation':
          // Presentation data loaded, ready to receive slides
          console.log('Presentation data loaded:', cmd.data);
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

  // Apply CSS variables from theme
  useEffect(() => {
    const cssVariables = themeToCSSVariables(PresentationTheme);
    const root = document.documentElement;
    
    Object.entries(cssVariables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
    
    console.log('[PresentationPage] Applied CSS variables:', cssVariables);
    
    return () => {
      Object.keys(cssVariables).forEach(property => {
        root.style.removeProperty(property);
      });
    };
  }, []);

  // Listen for theme changes from settings via BroadcastChannel
  useEffect(() => {
    const handleThemeChange = (event: MessageEvent) => {
      console.log('[PresentationPage] Received broadcast message:', event.data);
      if (event.data.action === 'themeChange') {
        console.log('[PresentationPage] Theme change detected, updating CSS variables');
        console.log('[PresentationPage] Current PresentationTheme.quote.fontSize:', PresentationTheme.quote.fontSize);
        const cssVariables = themeToCSSVariables(PresentationTheme);
        const root = document.documentElement;
        
        Object.entries(cssVariables).forEach(([property, value]) => {
          root.style.setProperty(property, value);
          console.log('[PresentationPage] Set CSS variable:', property, '=', value);
        });
        console.log('[PresentationPage] Updated CSS variables:', cssVariables);
        
        // Force a reflow to ensure CSS variables take effect
        void document.body.offsetHeight;
      }
    };

    const presentationChannel = new BroadcastChannel('presentation_channel');
    presentationChannel.onmessage = handleThemeChange;
    
    return () => {
      presentationChannel.close();
    };
  }, []);

  const metaDate = activeSlide?.metadata?.date || '';
  const metaTitle = activeSlide?.metadata?.title || '';
  const paraNumber = activeSlide?.metadata?.paragraph || '';

  return (
    <div
      ref={canvasRef}
      className={`presentation-canvas-container ${isBanner ? 'banner-mode' : ''}`}
      style={{ position: 'absolute' }}
    >
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
            {activeSlide?.lines.join('\n')}
          </div>
        </div>
      </div>
    </div>
  );
};
