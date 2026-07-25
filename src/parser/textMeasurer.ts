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
 * Check if a line ends with a sentence terminator
 */
function isEndOfSentence(line: string): boolean {
  return /[.!?]\s*$/.test(line.trim());
}

/**
 * Height-driven slide generation with sentence awareness
 * Ensures sentences don't get split across slides
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
    const maxLines = calculateLinesThatFit(
      wrappedLines.slice(currentIndex),
      availableHeight,
      linePixelHeight
    );
    
    if (maxLines === 0) {
      // At least one line should fit if we have content
      slides.push([wrappedLines[currentIndex]]);
      currentIndex++;
      continue;
    }
    
    // Start with max lines that fit
    let linesForThisSlide = maxLines;
    
    // Keep adding lines until we hit a sentence boundary or exceed max capacity
    // Allow going slightly over max to complete a sentence
    let foundSentenceEnd = false;
    let checkIndex = currentIndex;
    
    while (checkIndex < wrappedLines.length && (checkIndex - currentIndex) < maxLines + 3) {
      const currentLine = wrappedLines[checkIndex];
      
      if (isEndOfSentence(currentLine)) {
        foundSentenceEnd = true;
        linesForThisSlide = (checkIndex - currentIndex) + 1;
        break;
      }
      
      checkIndex++;
    }
    
    // If we didn't find a sentence end within reasonable bounds, use max lines
    if (!foundSentenceEnd) {
      linesForThisSlide = Math.min(maxLines, wrappedLines.length - currentIndex);
    }
    
    const slideLines = wrappedLines.slice(currentIndex, currentIndex + linesForThisSlide);
    slides.push(slideLines);
    currentIndex += linesForThisSlide;
  }
  
  return slides;
}

export const TextMeasurer = { 
  measureTextWidth, 
  wrapText, 
  calculateLinesThatFit,
  generateSlidesByHeight
};
