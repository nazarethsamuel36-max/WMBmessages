/**
 * WMB Text Slide Generation — DOM-Layout Engine
 *
 * Deterministic pure function:
 *   PresentationFrame + Paragraph text  →  TextSlide[]
 *
 * Uses word-aware greedy line-packer measured against the browser DOM.
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

  const maxHeight   = frame.quoteHeight;
  const slideTexts: string[] = [];
  let   buffer: string[] = [];

  for (const word of words) {
    const candidate = buffer.length > 0
      ? `${buffer.join(' ')} ${word}`
      : word;

    el.textContent = candidate;
    const h = el.scrollHeight;

    const fits = h <= maxHeight || buffer.length === 0;

    if (!fits) {
      slideTexts.push(buffer.join(' '));
      buffer = [word];
    } else {
      buffer = candidate.split(' ');
    }
  }

  if (buffer.length > 0) {
    slideTexts.push(buffer.join(' '));
  }

  document.body.removeChild(el);

  return buildResult(slideTexts, label);
}

function singleSlide(text: string, label: string): TextRenderResult {
  return {
    slides: [{ text, label, slideNumber: 1, totalSlides: 1 }],
    requiresSplitting: false,
  };
}

function buildResult(slideTexts: string[], label: string): TextRenderResult {
  const total = slideTexts.length;
  const slides: TextSlide[] = slideTexts.map((text, i) => ({
    text,
    label,
    slideNumber: i + 1,
    totalSlides: total,
  }));
  return { slides, requiresSplitting: total > 1 };
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
  for (let i = 0; i < totalSlides; i++) {
    slideTexts.push(lines.slice(i * maxLines, (i + 1) * maxLines).join(' '));
  }
  return buildResult(slideTexts, label);
}
