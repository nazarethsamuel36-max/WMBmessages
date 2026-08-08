import { renderTextToSlides } from './textRenderer';
import { Paragraph, SermonData, Slide } from '../types';

const BIBLE_FRAME_SPEC = {
  quoteWidth: 1800,
  quoteHeight: 294,
  fontFamily: 'Arial, sans-serif',
  fontSize: 52,
  lineHeight: 1.2
};

export function createSlides(
  paragraph: { text: string; paragraph: number },
  _spec: any,
  metadata: { messageNumber: string; title: string; date: string }
): Slide[] {
  const label = String(paragraph.paragraph);
  const result = renderTextToSlides(paragraph.text, label, BIBLE_FRAME_SPEC);
  
  return result.slides.map((slide) => ({
    slideNumber: slide.slideNumber,
    totalSlides: slide.totalSlides,
    lines: [slide.text],
    quoteLines: [slide.text],
    metadata: {
      book: metadata.messageNumber,
      paragraph: paragraph.paragraph,
      title: metadata.title,
      date: metadata.date
    }
  }));
}

export function parseSermonToSlides(sermonData: { messageNumber: string; title: string; date: string; paragraphs: Paragraph[] }): SermonData {
  const meta = { messageNumber: sermonData.date, title: sermonData.title, date: sermonData.date };
  return {
    metadata: meta,
    paragraphs: sermonData.paragraphs.map(p => ({
      paragraph: p.paragraph,
      text: p.text,
      slides: createSlides(p, null, meta)
    }))
  };
}
