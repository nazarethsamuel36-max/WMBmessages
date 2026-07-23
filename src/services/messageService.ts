import { supabase } from './supabase';
import { Message, Paragraph } from '../types';

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
    supabase.from('paragraphs').select('paragraph_no, text').eq('book_id', msgId).order('paragraph_no', { ascending: true })
  ]);

  if (mErr) throw mErr;
  if (pErr) throw pErr;

  return {
    message: { id: mData.book_id, title: mData.title, date: mData.date },
    paragraphs: pData.map(p => ({ paragraph: p.paragraph_no, text: p.text }))
  };
}

export async function searchQuotes(query: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('paragraphs')
    .select('book_id, paragraph_no, text, messages(title, date)')
    .ilike('text', `%${query}%`)
    .limit(15);

  if (error) throw error;
  return data || [];
}
