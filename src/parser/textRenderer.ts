import { measureTextWidth } from './textMeasurer';

/**
 * WMB Text Slide Generation — DOM-Layout Engine
 *
 * Deterministic pure function:
 *   PresentationFrame + Paragraph text  →  TextSlide[]
 *
 * 1. Words are greedy-wrapped into lines against the real DOM (same width/font
 *    as the overlay), then
 * 2. Lines are BALANCED (words moved from earlier lines down, so the tail line
 *    is as full as possible instead of a few stranded words), and finally
 * 3. The balanced line list is paginated into slides of maxLines per slide.
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

/**
 * Balance the wrapped lines: repeatedly try moving the last word of line i onto
 * the start of line i+1 while it reduces the widest line. This shrinks the
 * ragged tail that greedy wrapping leaves behind.
 */
function balanceLines(lines: string[], frame: PresentationFrame): string[] {
  if (lines.length < 2) return lines;
  const width = (l: string) => measureTextWidth(l, frame.fontSize, frame.fontFamily);

  for (let iter = 0; iter < lines.length * 2; iter++) {
    let improved = false;
    for (let i = 0; i < lines.length - 1; i++) {
      const words = lines[i].split(/\s+/);
      while (words.length > 1) {
        const prevWithout = words.slice(0, -1).join(' ');
        const nextWith = `${words[words.length - 1]} ${lines[i + 1]}`.trim();

        // Move the word only while the donor stays AT LEAST as wide as the
        // recipient. This equalizes the lines instead of draining the first
        // line, so the true remainder still lands on the last line.
        if (width(prevWithout) <= width(nextWith)) break;

        lines[i] = prevWithout;
        lines[i + 1] = nextWith;
        words.pop();
        improved = true;
      }
    }
    if (!improved) break;
  }
  return lines;
}

export function renderTextToSlides(
  text: string,
  label: string,
  frame: PresentationFrame,
): TextRenderResult {
  if (typeof document === 'undefined') {
    return estimateSplit(text, label, frame);
  }

  const primaryFamily = frame.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
  const fontReady =
    document.fonts &&
    document.fonts.check(`${frame.fontSize}px "${primaryFamily}"`);

  if (!fontReady) {
    return estimateSplit(text, label, frame);
  }

  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return singleSlide(text, label);
  }

  const el = createMeasurementElement(frame);
  document.body.appendChild(el);

  const lineHeightPx = frame.fontSize * frame.lineHeight;

  // 1. Greedy wrap into lines using the real DOM layout.
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

  // 2. Balance the lines so the last line is as full as possible.
  const balanced = balanceLines(lines, frame);

  // 3. Paginate balanced lines into slides of <= maxLines each.
  const maxLines = Math.max(1, Math.floor(frame.quoteHeight / lineHeightPx));
  const slides: TextSlide[] = [];
  const totalSlides = Math.ceil(balanced.length / maxLines);

  for (let i = 0; i < balanced.length; i += maxLines) {
    const chunk = balanced.slice(i, i + maxLines);
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
