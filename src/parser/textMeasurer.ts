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

  // Optimize line breaks to better utilize available width
  if (lines.length > 1) {
    for (let i = lines.length - 1; i > 0; i--) {
      const currentLineWidth = measureTextWidth(lines[i], fontSize, fontFamily);
      const currentUtilization = currentLineWidth / maxLineWidth;

      if (currentUtilization < 0.85 && i > 0) {
        const prevLineWords = lines[i - 1].split(/\s+/);

        for (let j = prevLineWords.length - 1; j >= 0; j--) {
          const wordToMove = prevLineWords[j];
          const testLine = wordToMove + ' ' + lines[i];
          const testLineWidth = measureTextWidth(testLine, fontSize, fontFamily);

          if (testLineWidth <= maxLineWidth) {
            lines[i] = testLine;
            prevLineWords.splice(j, 1);
            lines[i - 1] = prevLineWords.join(' ');
          } else {
            break;
          }
        }
      }
    }
  }

  return lines;
}

export function calculateLinesThatFit(
  wrappedLines: string[],
  availableHeight: number,
  linePixelHeight: number
): number {
  if (wrappedLines.length === 0) return 0;
  const maxLines = Math.floor(availableHeight / linePixelHeight);
  return Math.min(maxLines, wrappedLines.length);
}

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
      slides.push([wrappedLines[currentIndex]]);
      currentIndex++;
    } else {
      slides.push(wrappedLines.slice(currentIndex, currentIndex + maxLines));
      currentIndex += maxLines;
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
