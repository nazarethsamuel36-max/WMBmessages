import { PresentationFrame } from './presentationFrame';
import { wrapText, generateSlidesByHeight } from './textMeasurer';
import { Paragraph, SermonData, Slide } from '../types';
import { PresentationTheme } from './presentationTheme';

export function createSlides(
  paragraph: { text: string; paragraph: number },
  spec: typeof PresentationFrame,
  metadata: { messageNumber: string; title: string; date: string }
): Slide[] {
  console.log('[sermonParser] createSlides called with quote font size:', spec.quote.fontSize);
  console.log('[sermonParser] PresentationTheme.quote.fontSize:', PresentationTheme.quote.fontSize);
  console.log('[sermonParser] Available quote box height:', spec.quoteBox.height);
  console.log('[sermonParser] Line pixel height:', spec.quote.linePixelHeight);
  console.log('[sermonParser] Max visible lines calculated:', spec.quote.maxVisibleLines);
  
  const wrappedLines = wrapText(paragraph.text, spec);
  console.log('[sermonParser] Wrapped text into', wrappedLines.length, 'lines');
  
  // Height-driven slide generation
  const availableHeight = spec.quoteBox.height;
  const linePixelHeight = spec.quote.linePixelHeight;
  const slideLineGroups = generateSlidesByHeight(wrappedLines, availableHeight, linePixelHeight);
  console.log('[sermonParser] Generated', slideLineGroups.length, 'slides for paragraph', paragraph.paragraph);
  
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
