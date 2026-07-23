export type Workspace = 'search' | 'reader' | 'setlist' | 'settings';

export interface Message {
  id: number | string;
  title: string;
  date: string;
  file?: string;
}

export interface Slide {
  slideNumber: number;
  totalSlides: number;
  lines: string[];
  quoteLines: string[];
  metadata: {
    book?: string;
    paragraph?: number | string;
    title?: string;
    date?: string;
  };
}

export interface Paragraph {
  paragraph: number;
  text: string;
  slides?: Slide[];
}

export interface SermonData {
  metadata: {
    messageNumber: string;
    title: string;
    date: string;
  };
  paragraphs: Paragraph[];
}

export interface SetlistEntry {
  messageIndex: number;
  paragraphIndex: number;
  msgDate: string;
  paraNum: number;
}

export interface AppState {
  messages: Message[];
  currentMessageIndex: number;
  presentationData: SermonData | null;
  viewMode: 'read' | 'list';
  reading: { paragraphIndex: number; slideIndex: number };
  live: { messageIndex: number; paragraphIndex: number; slideIndex: number };
  isLive: boolean;
  setlist: SetlistEntry[];
  searchSelectedIndex: number;
}

export interface SearchResult {
  type: 'message' | 'paragraph' | 'quote';
  badge: string;
  title: string;
  subtitle: string;
  messageIndex: number;
  paragraphNo?: number;
  text?: string;
}
