/**
 * WMB Text Slide Generation — DOM-Layout Engine
 *
 * Deterministic pure function:
 *   PresentationFrame + Paragraph text  →  TextSlide[]
 *
 * 1. Words are greedily wrapped into lines against the real DOM width/font used
 *    by the overlay.
 * 2. The generated line list is paginated into slides of maxLines per slide.
 */

export interface PresentationFrame {
  quoteWidth: number;
  quoteHeight: number;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
}

export interface TextSlide {
  text: string;
  lines: string[];
  label: string;
  slideNumber: number;
  totalSlides: number;
}

export interface TextRenderResult {
  slides: TextSlide[];
  requiresSplitting: boolean;
}

function createMeasurementElement(frame: PresentationFrame): HTMLDivElement {
  const el = document.createElement('div');

  el.style.position      = 'fixed';
  el.style.top           = '0';
  el.style.left          = '0';
  el.style.height        = 'auto';
  el.style.bottom        = 'auto';
  el.style.zIndex        = '-9999';
  el.style.overflow      = 'hidden';

  el.style.width         = `${frame.quoteWidth}px`;
  el.style.fontFamily    = frame.fontFamily;
  el.style.fontSize      = `${frame.fontSize}px`;
  el.style.lineHeight    = `${frame.lineHeight}`;
  el.style.fontWeight    = 'normal';
  el.style.letterSpacing = 'normal';
  el.style.fontStyle     = 'normal';

  el.style.whiteSpace    = 'normal';
  el.style.wordWrap      = 'break-word';
  el.style.overflowWrap  = 'break-word';

  el.style.padding       = '0';
  el.style.margin        = '0';
  el.style.border        = 'none';
  el.style.boxSizing     = 'border-box';

  el.style.visibility    = 'hidden';
  el.style.pointerEvents = 'none';
  el.style.userSelect    = 'none';

  return el;
}

export function renderTextToSlides(
  text: string,
  label: string,
  frame: PresentationFrame,
): TextRenderResult {
  if (typeof document === 'undefined') {
    return estimateSplit(text, label, frame);
  }

  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return singleSlide(text, label);
  }

  const el = createMeasurementElement(frame);
  document.body.appendChild(el);

  const lineHeightPx = frame.fontSize * frame.lineHeight;

  // Greedy wrap into lines using the real DOM layout.
  const lines: string[] = [];
  let cur = '';
  let before = 0;
  for (const word of words) {
    const candidate = cur ? `${cur} ${word}` : word;
    el.textContent = candidate;
    const h = el.scrollHeight;
    if (cur && h > before) {
      lines.push(cur);
      cur = word;
    } else {
      cur = candidate;
    }
    before = h;
  }
  if (cur) lines.push(cur);

  // Paginate greedily wrapped lines into slides of <= maxLines each.
  const maxLines = Math.max(1, Math.floor(frame.quoteHeight / lineHeightPx));
  const slides: TextSlide[] = [];
  const totalSlides = Math.ceil(lines.length / maxLines);

  for (let i = 0; i < lines.length; i += maxLines) {
    const chunk = lines.slice(i, i + maxLines);
    const slide: TextSlide = {
      text: chunk.join(' '),
      lines: chunk,
      label,
      slideNumber: slides.length + 1,
      totalSlides,
    };
    slides.push(slide);
  }

  document.body.removeChild(el);

  return { slides, requiresSplitting: totalSlides > 1 };
}

function singleSlide(text: string, label: string): TextRenderResult {
  return {
    slides: [{ text, lines: [text], label, slideNumber: 1, totalSlides: 1 }],
    requiresSplitting: false,
  };
}

function estimateSplit(
  text: string,
  label: string,
  frame: PresentationFrame,
): TextRenderResult {
  const avgCharWidth = frame.fontSize * 0.5;
  const charsPerLine = Math.max(1, Math.floor(frame.quoteWidth / avgCharWidth));
  const maxLines     = Math.max(1, Math.floor(frame.quoteHeight / (frame.fontSize * frame.lineHeight)));

  const words    = text.trim().split(/\s+/);
  const lines: string[] = [];
  let   line     = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && candidate.length > charsPerLine) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);

  const totalSlides = Math.ceil(lines.length / maxLines);
  if (totalSlides <= 1) return singleSlide(text, label);

  const slideTexts: string[] = [];
  const slideLines: string[][] = [];
  for (let i = 0; i < totalSlides; i++) {
    const chunk = lines.slice(i * maxLines, (i + 1) * maxLines);
    slideLines.push(chunk);
    slideTexts.push(chunk.join(' '));
  }
  return {
    slides: slideLines.map((chunk, i) => ({
      text: slideTexts[i],
      lines: chunk,
      label,
      slideNumber: i + 1,
      totalSlides: totalSlides,
    })),
    requiresSplitting: totalSlides > 1,
  };
}
