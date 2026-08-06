import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { Workspace, Message, Paragraph, SermonData, SetlistEntry } from '../types';
import { getMessages, getParagraphs } from '../services/messageService';
import { parseSermonToSlides, createSlides } from '../parser/sermonParser';

// ─── Broadcast Channel ───────────────────────────────────────────────────────
const presentationChannel =
  typeof window !== 'undefined' ? new BroadcastChannel('presentation_channel') : null;

function sendToPresentation(action: string, data: unknown) {
  const cmd = { action, data };
  console.log('sendToPresentation()');
  console.log('Action:', action);
  console.log('Payload:', data);
  console.trace();
  presentationChannel?.postMessage(cmd);
  localStorage.setItem('presentationCommand', JSON.stringify(cmd));
}

// ─── State Shape ─────────────────────────────────────────────────────────────
export interface AppState {
  activeWorkspace: Workspace;
  messages: Message[];
  currentMessageIndex: number;
  paragraphs: Paragraph[];
  presentationData: SermonData | null;
  reading: { paragraphIndex: number; slideIndex: number };
  live: { messageIndex: number; paragraphIndex: number; slideIndex: number };
  isLive: boolean;
  setlist: SetlistEntry[];
  readerQuery: string;
  searchQuery: string;
}

const initialState: AppState = {
  activeWorkspace: 'search',
  messages: [],
  currentMessageIndex: -1,
  paragraphs: [],
  presentationData: null,
  reading: { paragraphIndex: -1, slideIndex: 0 },
  live: { messageIndex: -1, paragraphIndex: -1, slideIndex: 0 },
  isLive: false,
  setlist: [],
  readerQuery: '',
  searchQuery: '',
};

// ─── Actions ─────────────────────────────────────────────────────────────────
type Action =
  | { type: 'SET_WORKSPACE'; payload: Workspace }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'SET_MESSAGE'; payload: { index: number; paragraphs: Paragraph[]; data: SermonData } }
  | { type: 'SET_READING'; payload: { paragraphIndex: number; slideIndex: number } }
  | { type: 'SET_LIVE'; payload: { messageIndex: number; paragraphIndex: number; slideIndex: number } }
  | { type: 'SET_IS_LIVE'; payload: boolean }
  | { type: 'CLEAR_LIVE' }
  | { type: 'ADD_TO_SETLIST'; payload: SetlistEntry }
  | { type: 'REMOVE_FROM_SETLIST'; payload: number }
  | { type: 'SET_READER_QUERY'; payload: string }
  | { type: 'SET_SEARCH_QUERY'; payload: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_WORKSPACE':
      return { ...state, activeWorkspace: action.payload };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'SET_MESSAGE':
      return {
        ...state,
        currentMessageIndex: action.payload.index,
        paragraphs: action.payload.paragraphs,
        presentationData: action.payload.data,
        reading: { paragraphIndex: 0, slideIndex: 0 },
      };
    case 'SET_READING':
      return { ...state, reading: action.payload };
    case 'SET_LIVE':
      return { ...state, live: action.payload, isLive: true };
    case 'SET_IS_LIVE':
      return { ...state, isLive: action.payload };
    case 'CLEAR_LIVE':
      return { ...state, isLive: false, live: { messageIndex: -1, paragraphIndex: -1, slideIndex: 0 } };
    case 'ADD_TO_SETLIST':
      return { ...state, setlist: [...state.setlist, action.payload] };
    case 'REMOVE_FROM_SETLIST':
      return { ...state, setlist: state.setlist.filter((_, i) => i !== action.payload) };
    case 'SET_READER_QUERY':
      return { ...state, readerQuery: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────
interface AppContextValue {
  state: AppState;
  setWorkspace: (w: Workspace) => void;
  openMessage: (index: number, paragraphNo?: number) => Promise<void>;
  selectReading: (pi: number, si: number) => void;
  toggleLive: (pi: number, si?: number) => void;
  regenerateSlides: () => Promise<void>;
  addToSetlist: (pi: number) => void;
  removeFromSetlist: (idx: number) => void;
  setReaderQuery: (q: string) => void;
  setSearchQuery: (q: string) => void;
  handleSearchResult: (messageIndex: number, paragraphNo?: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppContextProvider');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  // Keep a ref to latest state for use in callbacks without stale closures
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Load messages once on mount
  useEffect(() => {
    getMessages()
      .then(msgs => dispatch({ type: 'SET_MESSAGES', payload: msgs }))
      .catch(err => console.error('[AppContext] loadMessages failed:', err));
  }, []);

  const openMessage = useCallback(async (index: number, paragraphNo?: number) => {
    const current = stateRef.current;
    const msg = current.messages[index];
    if (!msg) return;

    // Reuse already-loaded data for same message
    let paras = current.paragraphs;

    if (index !== current.currentMessageIndex) {
      const result = await getParagraphs(msg.id);
      const parsed = parseSermonToSlides({
        messageNumber: result.message.date,
        title: result.message.title,
        date: result.message.date,
        paragraphs: result.paragraphs,
      });
      paras = parsed.paragraphs;
      dispatch({ type: 'SET_MESSAGE', payload: { index, paragraphs: paras, data: parsed } });
      sendToPresentation('loadPresentation', parsed);
    }

    // Jump to a specific paragraph if requested
    if (paragraphNo !== undefined && paras.length > 0) {
      const pi = paras.findIndex(p => String(p.paragraph) === String(paragraphNo));
      if (pi >= 0) {
        dispatch({ type: 'SET_READING', payload: { paragraphIndex: pi, slideIndex: 0 } });
      }
    }
  }, []);

  // Regenerate current message slides with new theme settings
  const regenerateSlides = useCallback(async () => {
    const current = stateRef.current;
    if (current.currentMessageIndex === -1 || !current.presentationData) return;

    const msg = current.messages[current.currentMessageIndex];
    if (!msg) return;

    const result = await getParagraphs(msg.id);
    const parsed = parseSermonToSlides({
      messageNumber: result.message.date,
      title: result.message.title,
      date: result.message.date,
      paragraphs: result.paragraphs,
    });

    const currentReading = current.reading;
    dispatch({ type: 'SET_MESSAGE', payload: { index: current.currentMessageIndex, paragraphs: parsed.paragraphs, data: parsed } });
    sendToPresentation('loadPresentation', parsed);

    if (currentReading.paragraphIndex < parsed.paragraphs.length) {
      dispatch({ type: 'SET_READING', payload: currentReading });
    }
  }, []);

  const selectReading = useCallback((pi: number, si: number) => {
    const current = stateRef.current;
    dispatch({ type: 'SET_READING', payload: { paragraphIndex: pi, slideIndex: si } });

    if (current.isLive) {
      dispatch({
        type: 'SET_LIVE',
        payload: { messageIndex: current.currentMessageIndex, paragraphIndex: pi, slideIndex: si },
      });
      const activePara = current.paragraphs[pi];
      const activeSlide = activePara?.slides?.[si];
      if (activeSlide) {
        sendToPresentation('showSlide', activeSlide);
      }
    }
  }, []);

  const toggleLive = useCallback((pi: number, si = 0) => {
    const current = stateRef.current;
    const alreadyLive = current.isLive
      && current.live.paragraphIndex === pi
      && current.live.slideIndex === si
      && current.live.messageIndex === current.currentMessageIndex;

    console.log('========== toggleLive ==========');
    console.log('Time:', new Date().toISOString());
    console.log('Paragraph:', pi);
    console.log('Slide:', si);
    console.log('alreadyLive:', alreadyLive);
    console.trace();

    // Always move reading pointer to this paragraph
    dispatch({ type: 'SET_READING', payload: { paragraphIndex: pi, slideIndex: si } });

    console.log('Sending action:', alreadyLive ? 'clearDisplay' : 'showSlide');

    if (alreadyLive) {
      dispatch({ type: 'CLEAR_LIVE' });
      sendToPresentation('clearDisplay', {});
    } else {
      dispatch({
        type: 'SET_LIVE',
        payload: { messageIndex: current.currentMessageIndex, paragraphIndex: pi, slideIndex: si },
      });
      const activePara = current.paragraphs[pi];
      let activeSlide = activePara?.slides?.[si];

      // Guard: slides may be missing if the same message was reused without re-parsing
      if (!activeSlide && activePara?.text) {
        console.warn('[toggleLive] slides missing on paragraph', pi, '— re-parsing now');
        const meta = {
          messageNumber: current.presentationData?.metadata?.messageNumber ?? '',
          title: current.presentationData?.metadata?.title ?? '',
          date: current.presentationData?.metadata?.date ?? '',
        };
        const reparsed = createSlides(activePara, null, meta);
        activeSlide = reparsed[si] ?? reparsed[0];
      }

      if (activeSlide) {
        sendToPresentation('showSlide', activeSlide);
      } else {
        console.error('[toggleLive] No slide available for pi=', pi, 'si=', si);
      }
    }
  }, []);

  const addToSetlist = useCallback((pi: number) => {
    const current = stateRef.current;
    const para = current.paragraphs[pi];
    const msg = current.messages[current.currentMessageIndex];
    if (!para || !msg) return;
    if (current.setlist.some(s => s.messageIndex === current.currentMessageIndex && s.paragraphIndex === pi)) return;
    dispatch({
      type: 'ADD_TO_SETLIST',
      payload: {
        messageIndex: current.currentMessageIndex,
        paragraphIndex: pi,
        msgDate: msg.date,
        paraNum: para.paragraph,
      },
    });
  }, []);

  const removeFromSetlist = useCallback((idx: number) => {
    dispatch({ type: 'REMOVE_FROM_SETLIST', payload: idx });
  }, []);

  const setReaderQuery = useCallback((q: string) => {
    dispatch({ type: 'SET_READER_QUERY', payload: q });
  }, []);

  const setSearchQuery = useCallback((q: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: q });
  }, []);

  const setWorkspace = useCallback((w: Workspace) => {
    dispatch({ type: 'SET_WORKSPACE', payload: w });
  }, []);

  // Navigate from search result → open message → switch to reader
  const handleSearchResult = useCallback(async (messageIndex: number, paragraphNo?: number) => {
    await openMessage(messageIndex, paragraphNo);
    dispatch({ type: 'SET_WORKSPACE', payload: 'reader' });
  }, [openMessage]);

  return (
    <AppContext.Provider value={{
      state,
      setWorkspace,
      openMessage,
      selectReading,
      toggleLive,
      regenerateSlides,
      addToSetlist,
      removeFromSetlist,
      setReaderQuery,
      setSearchQuery,
      handleSearchResult,
    }}>
      {children}
    </AppContext.Provider>
  );
};
