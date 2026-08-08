import { supabase } from './supabase';
import { Message, Paragraph } from '../types';
import { normalizeText } from '../utils/textNormalizer';

export async function getMessages(): Promise<Message[]> {
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
  const [{ data: mData, error: mErr }, { data: pData, error: pErr }] = await Promise.all([
    supabase.from('messages').select('book_id, title, date').eq('book_id', msgId).single(),
    supabase.from('paragraphs').select('paragraph_no, text, normalized_text').eq('book_id', msgId).order('paragraph_no', { ascending: true })
  ]);

  if (mErr) throw mErr;
  
  // If normalized_text column doesn't exist (pre-migration), fall back to text only
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
  // Normalize the query — same function used to populate normalized_text
  const normalizedQuery = normalizeText(query);

  // Primary path: search normalized_text column (post-migration)
  const { data, error } = await supabase
    .from('paragraphs')
    .select('book_id, paragraph_no, text, messages(title, date)')
    .ilike('normalized_text', `%${normalizedQuery}%`)
    .limit(50);

  // Fallback: normalized_text column does not exist (pre-migration schema)
  // Still use normalizedQuery — but search against text with ilike so
  // punctuation-free queries can still partially match
  if (error && error.code === '42703') {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('paragraphs')
      .select('book_id, paragraph_no, text, messages(title, date)')
      .ilike('text', `%${normalizedQuery}%`)   // ← was: query.toLowerCase() against text
      .limit(50);

    if (fallbackError) throw fallbackError;
    return fallbackData || [];
  }

  if (error) throw error;
  return data || [];
}
