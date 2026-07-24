import { PresentationTheme, calculateLayoutDimensions } from './presentationTheme';

/**
 * PresentationFrame - Legacy compatibility layer
 * 
 * This file now derives all values from PresentationTheme to maintain backward compatibility
 * while transitioning to the new layout-driven architecture.
 */

const theme = PresentationTheme;
const dimensions = calculateLayoutDimensions(theme);

// Legacy interface for backward compatibility
export const PresentationFrame = {
  canvasWidth: theme.canvas.width,
  canvasHeight: theme.canvas.height,
  aspectRatio: "16:9",
  overlay: {
    height: dimensions.overlayHeight
  },
  metadata: {
    fontSize: theme.metadata.fontSize,
    padding: theme.metadata.padding,
    height: dimensions.metadataHeight,
    lineHeight: theme.metadata.lineHeight
  },
  gap: theme.gap,
  quote: {
    fontSize: theme.quote.fontSize,
    lineHeight: theme.quote.lineHeight,
    padding: theme.quote.padding,
    linePixelHeight: dimensions.quoteLineHeight,
    maxVisibleLines: dimensions.maxVisibleLines // Now calculated dynamically
  },
  quoteBox: {
    width: dimensions.quoteBoxWidth,
    height: dimensions.quoteBoxHeight
  }
};
