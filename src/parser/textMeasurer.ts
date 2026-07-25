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

  console.log('[wrapText] Original text:', text);
  console.log('[wrapText] Original text length:', text.length);

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  const maxLineWidth = frame.quoteBox.width;
  const fontSize = frame.quote.fontSize;

  console.log('[wrapText] Max line width:', maxLineWidth, 'Font size:', fontSize);

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const lineWidth = measureTextWidth(testLine, fontSize, fontFamily);

    if (lineWidth <= maxLineWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        console.log('[wrapText] Line added:', currentLine, 'Width:', measureTextWidth(currentLine, fontSize, fontFamily), 'Utilization:', (measureTextWidth(currentLine, fontSize, fontFamily) / maxLineWidth * 100).toFixed(1) + '%');
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
    console.log('[wrapText] Final line added:', currentLine, 'Width:', measureTextWidth(currentLine, fontSize, fontFamily), 'Utilization:', (measureTextWidth(currentLine, fontSize, fontFamily) / maxLineWidth * 100).toFixed(1) + '%');
  }

  console.log('[wrapText] Total lines before optimization:', lines.length);

  // Optimize line breaks to better utilize available width
  // Try to move words from underutilized lines to lines with capacity
  if (lines.length > 1) {
    for (let i = lines.length - 1; i > 0; i--) {
      const currentLineWidth = measureTextWidth(lines[i], fontSize, fontFamily);
      const currentUtilization = currentLineWidth / maxLineWidth;
      
      // If current line is underutilized (< 85%), try to move words from previous line
      if (currentUtilization < 0.85 && i > 0) {
        const prevLineWords = lines[i - 1].split(/\s+/);
        
        // Try moving words from previous line to current line
        for (let j = prevLineWords.length - 1; j >= 0; j--) {
          const wordToMove = prevLineWords[j];
          const testLine = wordToMove + ' ' + lines[i];
          const testLineWidth = measureTextWidth(testLine, fontSize, fontFamily);
          
          if (testLineWidth <= maxLineWidth) {
            // Move the word
            lines[i] = testLine;
            prevLineWords.splice(j, 1);
            lines[i - 1] = prevLineWords.join(' ');
            console.log('[wrapText] Moved word from line', i, 'to line', i + 1, ':', wordToMove);
          } else {
            break; // Stop if word doesn't fit
          }
        }
      }
    }
  }

  console.log('[wrapText] Total lines after optimization:', lines.length);
  for (let i = 0; i < lines.length; i++) {
    const lineWidth = measureTextWidth(lines[i], fontSize, fontFamily);
    console.log('[wrapText] Optimized line', i + 1, ':', lines[i], 'Width:', lineWidth, 'Utilization:', (lineWidth / maxLineWidth * 100).toFixed(1) + '%');
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
  const result = Math.min(maxLines, wrappedLines.length);
  console.log('[calculateLinesThatFit] Available height:', availableHeight, 'Line pixel height:', linePixelHeight, 'Max lines:', maxLines, 'Result:', result);
  return result;
}

/**
 * Height-driven slide generation
 * Simply fills available height without sentence awareness
 */
export function generateSlidesByHeight(
  wrappedLines: string[],
  availableHeight: number,
  linePixelHeight: number
): string[][] {
  if (wrappedLines.length === 0) return [];
  
  console.log('[generateSlidesByHeight] Total wrapped lines:', wrappedLines.length, 'Available height:', availableHeight, 'Line pixel height:', linePixelHeight);
  
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
    } else {
      const slideLines = wrappedLines.slice(currentIndex, currentIndex + maxLines);
      console.log('[generateSlidesByHeight] Slide', slides.length + 1, 'with', slideLines.length, 'lines:', slideLines);
      slides.push(slideLines);
      currentIndex += maxLines;
    }
  }
  
  console.log('[generateSlidesByHeight] Total slides generated:', slides.length);
  return slides;
}

export const TextMeasurer = { 
  measureTextWidth, 
  wrapText, 
  calculateLinesThatFit,
  generateSlidesByHeight
};
