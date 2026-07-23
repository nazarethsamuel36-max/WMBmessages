import { Message, SearchResult } from '../types';
import { searchQuotes } from '../services/messageService';

class SearchIntentRouter {
  handlers: any[] = [];

  registerHandler(handler: any) {
    this.handlers.push(handler);
  }

  async search(query: string, messages: Message[], openSermonParagraphs: any[] | null, currentMessageIndex: number): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    for (const handler of this.handlers) {
      try {
        if (handler.matches(query, openSermonParagraphs)) {
          const res = await handler.execute(query, messages, openSermonParagraphs, currentMessageIndex);
          results.push(...res);
        }
      } catch(e) {
        console.error("Search handler error:", e);
      }
    }
    return results;
  }
}

class ParagraphNavigationHandler {
  matches(query: string, openSermonParagraphs: any[] | null) {
    return openSermonParagraphs !== null && /^\d+$/.test(query);
  }
  execute(query: string, messages: Message[], openSermonParagraphs: any[], currentMessageIndex: number): SearchResult[] {
    const num = parseInt(query, 10);
    const idx = openSermonParagraphs.findIndex(p => String(p.paragraph) === String(num));
    if (idx >= 0 && messages[currentMessageIndex]) {
      return [{
        type: 'paragraph',
        badge: '📍 Paragraph',
        title: `Paragraph ${num}`,
        subtitle: messages[currentMessageIndex].title,
        messageIndex: currentMessageIndex,
        paragraphNo: num
      }];
    }
    return [];
  }
}

class CombinedDateParagraphHandler {
  matches(query: string) {
    return /^(\d{2}-?\d{0,5}[A-Z]?)\s+(\d+)$/i.test(query);
  }
  execute(query: string, messages: Message[]): SearchResult[] {
    const match = query.match(/^(\d{2}-?\d{0,5}[A-Z]?)\s+(\d+)$/i);
    if (!match) return [];
    const datePart = match[1].toLowerCase();
    const paraNum = parseInt(match[2], 10);

    const mIdx = messages.findIndex(m => m.date.toLowerCase().includes(datePart));
    if (mIdx >= 0) {
      return [{
        type: 'paragraph',
        badge: '📍 Paragraph',
        title: `Paragraph ${paraNum}`,
        subtitle: `${messages[mIdx].title} (${messages[mIdx].date})`,
        messageIndex: mIdx,
        paragraphNo: paraNum
      }];
    }
    return [];
  }
}

class DateSearchHandler {
  matches(query: string) {
    return /^\d{2}-?\d{0,5}[A-Z]?$/.test(query);
  }
  execute(query: string, messages: Message[]): SearchResult[] {
    const q = query.toLowerCase();
    return messages
      .filter(m => m.date.toLowerCase().includes(q))
      .map(m => ({
        type: 'message',
        badge: '📖 Message',
        title: m.title,
        subtitle: m.date,
        messageIndex: messages.indexOf(m)
      }));
  }
}

class TitleSearchHandler {
  matches(query: string) {
    return query.length >= 2 && !/^\d+$/.test(query) && !/^\d{2}-?/.test(query);
  }
  execute(query: string, messages: Message[]): SearchResult[] {
    const q = query.toLowerCase();
    return messages
      .filter(m => m.title.toLowerCase().includes(q))
      .map(m => ({
        type: 'message',
        badge: '📖 Message',
        title: m.title,
        subtitle: m.date,
        messageIndex: messages.indexOf(m)
      }));
  }
}

class QuoteSearchHandler {
  matches(query: string) {
    return query.length >= 3 && !/^\d+$/.test(query) && !/^\d{2}-?/.test(query);
  }
  async execute(query: string, messages: Message[]): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    try {
      const data = await searchQuotes(query);
      data.forEach(p => {
        const mIdx = messages.findIndex(m => String(m.id) === String(p.book_id));
        if (mIdx >= 0) {
          results.push({
            type: 'quote',
            badge: '💬 Quote',
            title: p.messages?.title || 'Sermon',
            subtitle: `${p.messages?.date || ''} · Paragraph ${p.paragraph_no}`,
            text: p.text,
            messageIndex: mIdx,
            paragraphNo: p.paragraph_no
          });
        }
      });
    } catch(e) {
      console.error("Quote search execution error", e);
    }
    return results;
  }
}

export const searchRouter = new SearchIntentRouter();
searchRouter.registerHandler(new ParagraphNavigationHandler());
searchRouter.registerHandler(new CombinedDateParagraphHandler());
searchRouter.registerHandler(new DateSearchHandler());
searchRouter.registerHandler(new TitleSearchHandler());
searchRouter.registerHandler(new QuoteSearchHandler());
