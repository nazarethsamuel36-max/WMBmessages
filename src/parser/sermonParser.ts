import { PresentationFrame } from './presentationFrame';
import { wrapText } from './textMeasurer';
import { Paragraph, SermonData, Slide } from '../types';

export function createSlides(
  paragraph: { text: string; paragraph: number },
  spec: typeof PresentationFrame,
  metadata: { messageNumber: string; title: string; date: string }
): Slide[] {
  const wrappedLines = wrapText(paragraph.text, spec);
  const linesPerSlide = spec.quote.maxVisibleLines;
  const slides: Slide[] = [];
  
  for (let i = 0; i < wrappedLines.length; i += linesPerSlide) {
    const slideLines = wrappedLines.slice(i, i + linesPerSlide);
    slides.push({
      slideNumber: Math.floor(i / linesPerSlide) + 1,
      totalSlides: Math.ceil(wrappedLines.length / linesPerSlide),
      lines: slideLines,
      quoteLines: slideLines,
      metadata: {
        book: metadata.messageNumber,
        paragraph: paragraph.paragraph,
        title: metadata.title,
        date: metadata.date
      }
    });
  }
  return slides;
}

export function parseSermonToSlides(sermonData: { messageNumber: string; title: string; date: string; paragraphs: Paragraph[] }): SermonData {
  const meta = { messageNumber: sermonData.date, title: sermonData.title, date: sermonData.date };
  return {
    metadata: meta,
    paragraphs: sermonData.paragraphs.map(p => ({
      paragraph: p.paragraph,
      text: p.text,
      slides: createSlides(p, PresentationFrame, meta)
    }))
  };
}
