import { supabase } from './supabase';
import { Message, Paragraph } from '../types';
import { normalizeText } from '../utils/textNormalizer';

/**
 * TOGGLE: Set to true to run fully offline/static using public/data JSON files.
 * Set to false to use Supabase backend.
 */
export const USE_STATIC_DATA = true;

// In-memory caches for static mode
let cachedMessages: Message[] | null = null;
let cachedSearchIndex: Array<{ b: string; p: number; t: string; n: string }> | null = null;
let messageMap: Map<string, Message> | null = null;
let searchIndexLoadingPromise: Promise<any> | null = null;

/**
 * Preloads the search index in the background without blocking the UI
 */
export function preloadSearchIndex(): void {
  if (!USE_STATIC_DATA || cachedSearchIndex || searchIndexLoadingPromise) return;
  const shardFiles = [
    '/data/search_index_1.json',
    '/data/search_index_2.json',
    '/data/search_index_3.json',
    '/data/search_index_4.json',
    '/data/search_index_5.json',
    '/data/search_index_6.json'
  ];

  searchIndexLoadingPromise = Promise.all(
    shardFiles.map(url =>
      fetch(url).then(res => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
    )
  )
    .then(shards => {
      cachedSearchIndex = shards.flat();
      console.log(`[messageService] Search index preloaded from shards: ${cachedSearchIndex?.length} paragraphs`);
    })
    .catch(() => {
      // Fallback to monolithic index if shards are not present
      return fetch('/data/search_index.json')
        .then(res => {
          if (!res.ok) throw new Error(`Search index status ${res.status}`);
          return res.json();
        })
        .then(data => {
          cachedSearchIndex = data;
          console.log(`[messageService] Search index preloaded: ${data.length} paragraphs`);
        });
    })
    .catch(err => {
      console.warn('[messageService] Search index preload failed (will retry on first search):', err);
      searchIndexLoadingPromise = null;
    });
}

export async function getMessages(): Promise<Message[]> {
  if (USE_STATIC_DATA) {
    if (cachedMessages) return cachedMessages;
    const res = await fetch('/data/messages.json');
    if (!res.ok) throw new Error(`Failed to load messages index: ${res.statusText}`);
    const data = await res.json();
    const msgs: Message[] = data.map((m: any) => ({
      id: m.id,
      title: m.title,
      date: m.date
    }));
    cachedMessages = msgs;
    messageMap = new Map(msgs.map(m => [String(m.id), m]));
    return msgs;
  }

  // ─── Supabase Implementation (Fallback when USE_STATIC_DATA = false) ────────
  let allMessages: Message[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('messages')
      .select('book_id, title, date')
      .order('date', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allMessages = allMessages.concat(
      data.map(m => ({ id: m.book_id, title: m.title, date: m.date }))
    );

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allMessages;
}

export async function getParagraphs(msgId: number | string): Promise<{ message: Message; paragraphs: Paragraph[] }> {
  if (USE_STATIC_DATA) {
    const cleanId = String(msgId).replace(/[\\/*?:"<>|]/g, '_');
    const res = await fetch(`/data/sermons/${encodeURIComponent(cleanId)}.json`);
    if (!res.ok) throw new Error(`Failed to load sermon ${msgId}: ${res.statusText}`);
    const doc = await res.json();

    return {
      message: {
        id: doc.messageNumber || msgId,
        title: doc.title,
        date: doc.date || String(msgId)
      },
      paragraphs: (doc.paragraphs || []).map((p: any) => ({
        paragraph: p.paragraph,
        text: p.text,
        normalized_text: p.normalized_text
      }))
    };
  }

  // ─── Supabase Implementation (Fallback when USE_STATIC_DATA = false) ────────
  const [{ data: mData, error: mErr }, { data: pData, error: pErr }] = await Promise.all([
    supabase.from('messages').select('book_id, title, date').eq('book_id', msgId).single(),
    supabase.from('paragraphs').select('paragraph_no, text, normalized_text').eq('book_id', msgId).order('paragraph_no', { ascending: true })
  ]);

  if (mErr) throw mErr;
  
  if (pErr && pErr.code === '42703') {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('paragraphs')
      .select('paragraph_no, text')
      .eq('book_id', msgId)
      .order('paragraph_no', { ascending: true });
    
    if (fallbackError) throw fallbackError;
    
    return {
      message: { id: mData.book_id, title: mData.title, date: mData.date },
      paragraphs: fallbackData.map(p => ({ paragraph: p.paragraph_no, text: p.text }))
    };
  }

  if (pErr) throw pErr;

  return {
    message: { id: mData.book_id, title: mData.title, date: mData.date },
    paragraphs: pData.map(p => ({ paragraph: p.paragraph_no, text: p.text, normalized_text: p.normalized_text }))
  };
}

export async function searchQuotes(query: string): Promise<any[]> {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery || normalizedQuery.length < 3) return [];

  if (USE_STATIC_DATA) {
    if (!cachedSearchIndex) {
      if (searchIndexLoadingPromise) {
        await searchIndexLoadingPromise;
      } else {
        preloadSearchIndex();
        await searchIndexLoadingPromise;
      }
    }

    if (!cachedSearchIndex) return [];

    if (!messageMap) {
      const msgs = await getMessages();
      messageMap = new Map(msgs.map(m => [String(m.id), m]));
    }

    const hits: any[] = [];
    for (let i = 0; i < cachedSearchIndex.length; i++) {
      const item = cachedSearchIndex[i];
      if (item.n && item.n.includes(normalizedQuery)) {
        const m = messageMap.get(item.b);
        hits.push({
          book_id: item.b,
          paragraph_no: item.p,
          text: item.t,
          messages: {
            title: m?.title || item.b,
            date: m?.date || item.b
          }
        });
        if (hits.length >= 50) break;
      }
    }
    return hits;
  }

  // ─── Supabase Implementation (Fallback when USE_STATIC_DATA = false) ────────
  const { data, error } = await supabase
    .from('paragraphs')
    .select('book_id, paragraph_no, text, messages(title, date)')
    .ilike('normalized_text', `%${normalizedQuery}%`)
    .limit(50);

  if (error && error.code === '42703') {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('paragraphs')
      .select('book_id, paragraph_no, text, messages(title, date)')
      .ilike('text', `%${normalizedQuery}%`)
      .limit(50);

    if (fallbackError) throw fallbackError;
    return fallbackData || [];
  }

  if (error) throw error;
  return data || [];
}
