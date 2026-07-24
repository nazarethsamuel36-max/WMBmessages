import React, { useState } from 'react';
import { PresentationTheme, saveQuoteFontSize, saveMetadataFontSize } from '../parser/presentationTheme';
import { useApp } from '../context/AppContext';

export const SettingsWorkspace: React.FC = () => {
  const { regenerateSlides } = useApp();
  const [quoteFontSize, setQuoteFontSize] = useState<number>(PresentationTheme.quote.fontSize);
  const [metadataFontSize, setMetadataFontSize] = useState<number>(PresentationTheme.metadata.fontSize);

  const handleQuoteFontSizeChange = async (value: number) => {
    if (value >= 12 && value <= 120) {
      setQuoteFontSize(value);
      // Save to localStorage and update theme
      saveQuoteFontSize(value);
      // Trigger re-render of presentation by updating CSS variables
      updateCSSVariables();
      // Regenerate slides with new font size
      await regenerateSlides();
    }
  };

  const handleMetadataFontSizeChange = async (value: number) => {
    if (value >= 12 && value <= 72) {
      setMetadataFontSize(value);
      saveMetadataFontSize(value);
      updateCSSVariables();
      await regenerateSlides();
    }
  };

  const updateCSSVariables = () => {
    const root = document.documentElement;
    root.style.setProperty('--quote-font-size', `${PresentationTheme.quote.fontSize}px`);
    root.style.setProperty('--metadata-font-size', `${PresentationTheme.metadata.fontSize}px`);
    
    // Recalculate derived dimensions
    const overlayHeight = PresentationTheme.canvas.height * PresentationTheme.overlay.heightRatio;
    const metadataLineHeight = PresentationTheme.metadata.fontSize * PresentationTheme.metadata.lineHeight;
    const metadataHeight = metadataLineHeight + PresentationTheme.metadata.padding.top + PresentationTheme.metadata.padding.bottom;
    const quoteLineHeight = PresentationTheme.quote.fontSize * PresentationTheme.quote.lineHeight;
    const quoteBoxHeight = overlayHeight - metadataHeight - PresentationTheme.gap - PresentationTheme.quote.padding.top - PresentationTheme.quote.padding.bottom;
    
    root.style.setProperty('--metadata-height', `${metadataHeight}px`);
    root.style.setProperty('--quote-line-height-px', `${quoteLineHeight}px`);
    root.style.setProperty('--quote-box-height', `${quoteBoxHeight}px`);
  };

  return (
    <div className="settings-workspace">
      <div style={{ fontSize: '2rem', marginBottom: '8px', opacity: 0.3 }}>⚙</div>
      <h3>Settings</h3>
      
      <div className="settings-section" style={{ marginTop: '24px' }}>
        <h4 style={{ marginBottom: '12px', fontSize: '1.1rem', fontWeight: '600' }}>Presentation Typography</h4>
        
        {/* Quote Font Size Control */}
        <div className="setting-item" style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#666' }}>
            Quote Font Size
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => handleQuoteFontSizeChange(quoteFontSize - 2)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                background: '#f5f5f5',
                cursor: 'pointer',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              −
            </button>
            <input
              type="number"
              value={quoteFontSize}
              onChange={(e) => handleQuoteFontSizeChange(parseInt(e.target.value) || 36)}
              min="12"
              max="120"
              style={{
                width: '80px',
                height: '36px',
                textAlign: 'center',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '1rem',
                padding: '0 8px'
              }}
            />
            <button
              onClick={() => handleQuoteFontSizeChange(quoteFontSize + 2)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                background: '#f5f5f5',
                cursor: 'pointer',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              +
            </button>
            <span style={{ marginLeft: '8px', fontSize: '0.9rem', color: '#666' }}>px</span>
          </div>
        </div>

        {/* Metadata Font Size Control */}
        <div className="setting-item">
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#666' }}>
            Metadata Font Size
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => handleMetadataFontSizeChange(metadataFontSize - 2)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                background: '#f5f5f5',
                cursor: 'pointer',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              −
            </button>
            <input
              type="number"
              value={metadataFontSize}
              onChange={(e) => handleMetadataFontSizeChange(parseInt(e.target.value) || 24)}
              min="12"
              max="72"
              style={{
                width: '80px',
                height: '36px',
                textAlign: 'center',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '1rem',
                padding: '0 8px'
              }}
            />
            <button
              onClick={() => handleMetadataFontSizeChange(metadataFontSize + 2)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                background: '#f5f5f5',
                cursor: 'pointer',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              +
            </button>
            <span style={{ marginLeft: '8px', fontSize: '0.9rem', color: '#666' }}>px</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px', padding: '12px', background: '#f9f9f9', borderRadius: '6px', fontSize: '0.85rem', color: '#666' }}>
        <strong>Note:</strong> Font size changes are applied immediately. Slides regenerate automatically with new dimensions.
      </div>
    </div>
  );
};
