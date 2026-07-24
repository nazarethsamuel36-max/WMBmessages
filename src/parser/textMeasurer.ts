import { PresentationFrame } from './presentationFrame';

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

function getCanvasContext(): CanvasRenderingContext2D | null {
  if (typeof document !== 'undefined') {
    if (!canvas) {
      canvas = document.createElement('canvas');
    }
    if (!ctx) {
      ctx = canvas.getContext('2d');
    }
    return ctx;
  }
  return null;
}

export function measureTextWidth(
  text: string,
  fontSize: number,
  fontFamily: string = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
): number {
  const browserCtx = getCanvasContext();
  if (browserCtx) {
    browserCtx.font = `${fontSize}px ${fontFamily}`;
    return browserCtx.measureText(text).width;
  }
  const avgCharWidth = fontSize * 0.57;
  return text.length * avgCharWidth;
}

export function wrapText(
  text: string,
  frame: typeof PresentationFrame,
  fontFamily: string = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
): string[] {
  if (!text) return [];

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  const maxLineWidth = frame.quoteBox.width;
  const fontSize = frame.quote.fontSize;

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const lineWidth = measureTextWidth(testLine, fontSize, fontFamily);

    if (lineWidth <= maxLineWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Calculate how many lines fit within available height
 * This is the core of the layout-driven approach
 */
export function calculateLinesThatFit(
  wrappedLines: string[],
  availableHeight: number,
  linePixelHeight: number
): number {
  if (wrappedLines.length === 0) return 0;
  
  const maxLines = Math.floor(availableHeight / linePixelHeight);
  return Math.min(maxLines, wrappedLines.length);
}

/**
 * Height-driven slide generation
 * Instead of assuming a fixed number of lines, determine how many lines fit
 */
export function generateSlidesByHeight(
  wrappedLines: string[],
  availableHeight: number,
  linePixelHeight: number
): string[][] {
  if (wrappedLines.length === 0) return [];
  
  const slides: string[][] = [];
  let currentIndex = 0;
  
  while (currentIndex < wrappedLines.length) {
    const linesThatFit = calculateLinesThatFit(
      wrappedLines.slice(currentIndex),
      availableHeight,
      linePixelHeight
    );
    
    if (linesThatFit === 0) {
      // At least one line should fit if we have content
      slides.push([wrappedLines[currentIndex]]);
      currentIndex++;
    } else {
      const slideLines = wrappedLines.slice(currentIndex, currentIndex + linesThatFit);
      slides.push(slideLines);
      currentIndex += linesThatFit;
    }
  }
  
  return slides;
}

export const TextMeasurer = { 
  measureTextWidth, 
  wrapText, 
  calculateLinesThatFit,
  generateSlidesByHeight
};
