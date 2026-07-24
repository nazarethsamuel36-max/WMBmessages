import { PresentationFrame } from './presentationFrame';
import { wrapText, generateSlidesByHeight } from './textMeasurer';
import { Paragraph, SermonData, Slide } from '../types';

export function createSlides(
  paragraph: { text: string; paragraph: number },
  spec: typeof PresentationFrame,
  metadata: { messageNumber: string; title: string; date: string }
): Slide[] {
  const wrappedLines = wrapText(paragraph.text, spec);
  
  // Height-driven slide generation
  const availableHeight = spec.quoteBox.height;
  const linePixelHeight = spec.quote.linePixelHeight;
  const slideLineGroups = generateSlidesByHeight(wrappedLines, availableHeight, linePixelHeight);
  
  const slides: Slide[] = slideLineGroups.map((slideLines, index) => ({
    slideNumber: index + 1,
    totalSlides: slideLineGroups.length,
    lines: slideLines,
    quoteLines: slideLines,
    metadata: {
      book: metadata.messageNumber,
      paragraph: paragraph.paragraph,
      title: metadata.title,
      date: metadata.date
    }
  }));
  
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
