/**
 * useTTS — Orchestration hook for Text-to-Speech in the reader.
 *
 * Manages sentence queue, chapter transitions, sentence highlighting,
 * sleep timer, and synchronization between the TTS service and WebView.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type WebView from 'react-native-webview';
import * as TTS from '../services/tts/TTSService';
import { useSettingsStore } from '../stores/settingsStore';
import { serializeCommand } from '../types/bridge';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TtsStatus = 'idle' | 'playing' | 'paused' | 'loading';

interface UseTTSOptions {
  webViewRef: React.RefObject<WebView | null>;
}

interface UseTTSReturn {
  ttsStatus: TtsStatus;
  currentSentenceIndex: number;
  totalSentences: number;
  currentChapterTitle: string;
  sleepTimerRemaining: number | null;

  startFromCurrentPosition: () => void;
  startFromText: (text: string) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  nextSentence: () => void;
  prevSentence: () => void;
  setSleepTimerActive: (minutes: number | null) => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTTS({ webViewRef }: UseTTSOptions): UseTTSReturn {
  // Settings
  const ttsRate = useSettingsStore((s) => s.ttsRate);
  const ttsPitch = useSettingsStore((s) => s.ttsPitch);
  const ttsVoiceId = useSettingsStore((s) => s.ttsVoiceId);
  const ttsAutoChapters = useSettingsStore((s) => s.ttsAutoChapters);
  const ttsSentenceHighlight = useSettingsStore((s) => s.ttsSentenceHighlight);

  // State
  const [ttsStatus, setTtsStatus] = useState<TtsStatus>('idle');
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [totalSentences, setTotalSentences] = useState(0);
  const [currentChapterTitle, setCurrentChapterTitle] = useState('');
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);

  // Refs for stable access in callbacks
  const sentencesRef = useRef<string[]>([]);
  const currentIndexRef = useRef(0);
  const statusRef = useRef<TtsStatus>('idle');
  const sleepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sleepEndTimeRef = useRef<number | null>(null);
  const isPlayingSelectedTextRef = useRef(false);
  const waitingForChapterRef = useRef(false);
  const chapterTitleRef = useRef('');

  // Keep ref in sync with state
  useEffect(() => { statusRef.current = ttsStatus; }, [ttsStatus]);

  // ─── Send commands to WebView ──────────────────────────────────

  const sendCommand = useCallback((cmd: any) => {
    webViewRef.current?.injectJavaScript(serializeCommand(cmd));
  }, [webViewRef]);

  // ─── Apply settings to native TTS ─────────────────────────────

  useEffect(() => {
    TTS.setRate(ttsRate).catch(() => {});
  }, [ttsRate]);

  useEffect(() => {
    TTS.setPitch(ttsPitch).catch(() => {});
  }, [ttsPitch]);

  useEffect(() => {
    if (ttsVoiceId) {
      TTS.setVoice(ttsVoiceId).catch(() => {});
    }
  }, [ttsVoiceId]);

  // ─── Speak a specific sentence ────────────────────────────────

  const speakSentence = useCallback((index: number) => {
    const sentences = sentencesRef.current;
    if (index < 0 || index >= sentences.length) return;

    currentIndexRef.current = index;
    setCurrentSentenceIndex(index);

    // Highlight and scroll
    if (ttsSentenceHighlight) {
      sendCommand({ type: 'highlightSentence', index });
      sendCommand({ type: 'scrollToSentence', index });
    }

    // Speak
    TTS.speak(sentences[index], `sentence-${index}`);
  }, [sendCommand, ttsSentenceHighlight]);

  // ─── Handle chapter text received from WebView ────────────────

  const handleChapterText = useCallback((data: {
    sentences: string[];
    startIndex?: number;
    chapterTitle: string;
    chapterIndex: number;
  }) => {
    const { sentences, chapterTitle, startIndex = 0 } = data;

    if (sentences.length === 0) {
      // Empty chapter — try advancing
      if (ttsAutoChapters && statusRef.current !== 'idle') {
        sendCommand({ type: 'nextPage' });
        waitingForChapterRef.current = true;
      } else {
        setTtsStatus('idle');
        statusRef.current = 'idle';
      }
      return;
    }

    sentencesRef.current = sentences;
    setTotalSentences(sentences.length);
    chapterTitleRef.current = chapterTitle;
    setCurrentChapterTitle(chapterTitle);

    if (waitingForChapterRef.current) {
      waitingForChapterRef.current = false;
      // Read chapter title first, then start sentences
      if (chapterTitle && chapterTitle.trim().length > 0) {
        TTS.speak(chapterTitle, 'chapter-title');
      } else {
        speakSentence(0);
      }
    } else {
      // Start from calculated sentence index
      speakSentence(startIndex);
    }
  }, [ttsAutoChapters, sendCommand, speakSentence]);

  // ─── Handle location changes (for auto chapter advance) ───────

  const handleLocationChangedForTts = useCallback(() => {
    if (waitingForChapterRef.current && statusRef.current !== 'idle') {
      // New chapter loaded — extract its text
      setTimeout(() => {
        sendCommand({ type: 'extractChapterText' });
      }, 500); // Brief delay for epub.js rendering
    }
  }, [sendCommand]);

  // ─── TTS event listeners ──────────────────────────────────────

  useEffect(() => {
    const unsubDone = TTS.onDone((event) => {
      if (statusRef.current === 'idle') return;

      // Check sleep timer
      if (sleepEndTimeRef.current && Date.now() >= sleepEndTimeRef.current) {
        stopPlayback();
        return;
      }

      // If we just spoke the chapter title, start sentence 0
      if (event.utteranceId === 'chapter-title') {
        speakSentence(0);
        return;
      }

      // If playing selected text only, stop
      if (isPlayingSelectedTextRef.current) {
        isPlayingSelectedTextRef.current = false;
        setTtsStatus('idle');
        statusRef.current = 'idle';
        return;
      }

      // Advance to next sentence
      const nextIdx = currentIndexRef.current + 1;
      if (nextIdx < sentencesRef.current.length) {
        speakSentence(nextIdx);
      } else {
        // Chapter finished
        if (ttsAutoChapters) {
          // Clear highlights and request next chapter
          sendCommand({ type: 'clearTtsHighlight' });
          sendCommand({ type: 'nextPage' });
          waitingForChapterRef.current = true;
          setTtsStatus('loading');
          statusRef.current = 'loading';
        } else {
          stopPlayback();
        }
      }
    });

    const unsubError = TTS.onError((event) => {
      console.error('[useTTS] TTS error:', event.error);
      // Try to continue with next sentence
      const nextIdx = currentIndexRef.current + 1;
      if (nextIdx < sentencesRef.current.length && statusRef.current === 'playing') {
        speakSentence(nextIdx);
      } else {
        stopPlayback();
      }
    });

    return () => {
      unsubDone();
      unsubError();
    };
  }, [speakSentence, ttsAutoChapters, sendCommand]);

  // ─── Public API ───────────────────────────────────────────────

  const startFromCurrentPosition = useCallback((startText?: string) => {
    isPlayingSelectedTextRef.current = false;
    waitingForChapterRef.current = false;
    setTtsStatus('loading');
    statusRef.current = 'loading';

    // Request text extraction from WebView
    sendCommand({ type: 'extractChapterText', startText });
  }, [sendCommand]);

  const startFromText = useCallback((text: string) => {
    isPlayingSelectedTextRef.current = true;
    waitingForChapterRef.current = false;
    sentencesRef.current = [text];
    setTotalSentences(1);
    setCurrentSentenceIndex(0);
    currentIndexRef.current = 0;
    setTtsStatus('playing');
    statusRef.current = 'playing';

    TTS.speak(text, 'selected-text');
  }, []);

  const play = useCallback(() => {
    if (statusRef.current === 'paused' && sentencesRef.current.length > 0) {
      setTtsStatus('playing');
      statusRef.current = 'playing';
      speakSentence(currentIndexRef.current);
    }
  }, [speakSentence]);

  const pausePlayback = useCallback(() => {
    TTS.pause();
    setTtsStatus('paused');
    statusRef.current = 'paused';
  }, []);

  const stopPlayback = useCallback(() => {
    TTS.stop();
    sendCommand({ type: 'clearTtsHighlight' });
    setTtsStatus('idle');
    statusRef.current = 'idle';
    setCurrentSentenceIndex(0);
    currentIndexRef.current = 0;
    sentencesRef.current = [];
    isPlayingSelectedTextRef.current = false;
    waitingForChapterRef.current = false;

    // Clear sleep timer
    if (sleepTimerRef.current) {
      clearInterval(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    sleepEndTimeRef.current = null;
    setSleepTimerRemaining(null);
  }, [sendCommand]);

  const nextSentenceAction = useCallback(() => {
    const nextIdx = currentIndexRef.current + 1;
    if (nextIdx < sentencesRef.current.length) {
      TTS.stop();
      speakSentence(nextIdx);
    }
  }, [speakSentence]);

  const prevSentenceAction = useCallback(() => {
    const prevIdx = Math.max(0, currentIndexRef.current - 1);
    TTS.stop();
    speakSentence(prevIdx);
  }, [speakSentence]);

  // ─── Sleep timer ──────────────────────────────────────────────

  const setSleepTimerActive = useCallback((minutes: number | null) => {
    // Clear existing timer
    if (sleepTimerRef.current) {
      clearInterval(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }

    if (minutes === null || minutes <= 0) {
      sleepEndTimeRef.current = null;
      setSleepTimerRemaining(null);
      return;
    }

    const endTime = Date.now() + minutes * 60 * 1000;
    sleepEndTimeRef.current = endTime;
    setSleepTimerRemaining(minutes * 60);

    // Update remaining every second
    sleepTimerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setSleepTimerRemaining(remaining);

      if (remaining <= 0) {
        stopPlayback();
      }
    }, 1000);
  }, [stopPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      TTS.stop();
      if (sleepTimerRef.current) {
        clearInterval(sleepTimerRef.current);
      }
    };
  }, []);

  // ─── Expose the chapterText handler for the WebView ───────────

  // This needs to be called from the ReaderWebView message handler
  // We expose it and also the location changed handler

  return {
    ttsStatus,
    currentSentenceIndex,
    totalSentences,
    currentChapterTitle,
    sleepTimerRemaining,

    startFromCurrentPosition,
    startFromText,
    play,
    pause: pausePlayback,
    stop: stopPlayback,
    nextSentence: nextSentenceAction,
    prevSentence: prevSentenceAction,
    setSleepTimerActive,

    // Internal handlers exposed for wiring
    handleChapterText,
    handleLocationChangedForTts,
  } as UseTTSReturn & {
    handleChapterText: typeof handleChapterText;
    handleLocationChangedForTts: typeof handleLocationChangedForTts;
  };
}
