/**
 * PresentationTheme - Single source of truth for presentation layout configuration
 * 
 * This configuration drives both the parser (slide generation) and the React renderer (CSS).
 * Changing typography, spacing, or dimensions should only require updating this file.
 */

export interface PresentationTheme {
  canvas: {
    width: number;
    height: number;
  };
  overlay: {
    heightRatio: number; // Ratio of canvas height (0.30 = 30%)
  };
  metadata: {
    fontSize: number;
    lineHeight: number;
    padding: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    borderBottomWidth: number;
  };
  gap: number;
  quote: {
    fontSize: number;
    lineHeight: number;
    padding: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
  fontFamily: {
    metadata: string;
    quote: string;
  };
}

export const PresentationTheme: PresentationTheme = {
  canvas: {
    width: 1920,
    height: 1080
  },
  overlay: {
    heightRatio: 0.30 // 30% of canvas height
  },
  metadata: {
    fontSize: 24,
    lineHeight: 1.2,
    padding: {
      top: 10,
      right: 45,
      bottom: 10,
      left: 45
    },
    borderBottomWidth: 2
  },
  gap: 10,
  quote: {
    fontSize: 36,
    lineHeight: 1.5,
    padding: {
      top: 10,
      right: 60,
      bottom: 10,
      left: 60
    }
  },
  fontFamily: {
    metadata: "'Inter', sans-serif",
    quote: "'Crimson Text', serif"
  }
};

/**
 * Derived layout calculations based on theme
 * These are computed at runtime to ensure consistency
 */
export function calculateLayoutDimensions(theme: PresentationTheme) {
  const overlayHeight = theme.canvas.height * theme.overlay.heightRatio;
  
  const metadataLineHeight = theme.metadata.fontSize * theme.metadata.lineHeight;
  const metadataHeight = metadataLineHeight + theme.metadata.padding.top + theme.metadata.padding.bottom;
  
  const quoteLineHeight = theme.quote.fontSize * theme.quote.lineHeight;
  
  const quoteBoxHeight = overlayHeight - metadataHeight - theme.gap - theme.quote.padding.top - theme.quote.padding.bottom;
  const quoteBoxWidth = theme.canvas.width - theme.quote.padding.left - theme.quote.padding.right;
  
  // Calculate how many lines can fit based on available height
  const maxVisibleLines = Math.floor(quoteBoxHeight / quoteLineHeight);
  
  return {
    overlayHeight,
    metadataHeight,
    metadataLineHeight,
    quoteLineHeight,
    quoteBoxHeight,
    quoteBoxWidth,
    maxVisibleLines
  };
}

/**
 * Generate CSS custom properties from theme for React renderer
 */
export function themeToCSSVariables(theme: PresentationTheme): Record<string, string> {
  const dimensions = calculateLayoutDimensions(theme);
  
  return {
    '--canvas-width': `${theme.canvas.width}px`,
    '--canvas-height': `${theme.canvas.height}px`,
    '--overlay-height': `${dimensions.overlayHeight}px`,
    '--metadata-font-size': `${theme.metadata.fontSize}px`,
    '--metadata-line-height': theme.metadata.lineHeight.toString(),
    '--metadata-padding-top': `${theme.metadata.padding.top}px`,
    '--metadata-padding-right': `${theme.metadata.padding.right}px`,
    '--metadata-padding-bottom': `${theme.metadata.padding.bottom}px`,
    '--metadata-padding-left': `${theme.metadata.padding.left}px`,
    '--metadata-height': `${dimensions.metadataHeight}px`,
    '--quote-font-size': `${theme.quote.fontSize}px`,
    '--quote-line-height': theme.quote.lineHeight.toString(),
    '--quote-padding-top': `${theme.quote.padding.top}px`,
    '--quote-padding-right': `${theme.quote.padding.right}px`,
    '--quote-padding-bottom': `${theme.quote.padding.bottom}px`,
    '--quote-padding-left': `${theme.quote.padding.left}px`,
    '--quote-line-height-px': `${dimensions.quoteLineHeight}px`,
    '--quote-box-height': `${dimensions.quoteBoxHeight}px`,
    '--quote-box-width': `${dimensions.quoteBoxWidth}px`,
    '--gap': `${theme.gap}px`,
    '--metadata-font-family': theme.fontFamily.metadata,
    '--quote-font-family': theme.fontFamily.quote
  };
}
