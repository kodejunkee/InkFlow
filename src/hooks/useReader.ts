/**
 * useReader — Orchestration hook for the reader screen
 *
 * Coordinates WebView events, state management, and database persistence.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Clipboard, ToastAndroid, Platform, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import type * as SQLite from 'expo-sqlite';
import type WebView from 'react-native-webview';
import type { Book, HighlightColor } from '../types/book';
import type { TocItem } from '../types/reader';
import type { ReaderCommand } from '../types/bridge';
import { serializeCommand } from '../types/bridge';
import { useReaderStore } from '../stores/readerStore';
import {
  updateBookLocation,
  getBookmarksByBookId,
  insertBookmark,
  deleteBookmark,
  getHighlightsByBookId,
  insertHighlight,
  deleteHighlight,
  startReadingSession,
  endReadingSession,
} from '../database/queries';

// Save location every 5 seconds at most (debounce)
const SAVE_INTERVAL_MS = 5000;

interface UseReaderOptions {
  db: SQLite.SQLiteDatabase | null;
  book: Book | null;
}

export function useReader({ db, book }: UseReaderOptions) {
  const webViewRef = useRef<WebView>(null);
  const sessionIdRef = useRef<number | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const lastSaveRef = useRef<number>(0);

  // Reader store
  const {
    setBook,
    updateLocation,
    toggleOverlay,
    isOverlayVisible,
    setOverlayVisible,
    isChapterDrawerOpen,
    toggleChapterDrawer,
    setChapterDrawerOpen,
    setToc,
    toc,
    currentCfi,
    progress,
    chapterIndex,
    chapterTitle,
    resetReader,
  } = useReaderStore();

  // Selection state
  const [selectedText, setSelectedText] = useState('');
  const [selectedCfiRange, setSelectedCfiRange] = useState('');
  const [selectedChapterTitle, setSelectedChapterTitle] = useState('');
  const [isSelectionMenuVisible, setIsSelectionMenuVisible] = useState(false);

  // Annotations drawer state
  const [isAnnotationsDrawerOpen, setAnnotationsDrawerOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<import('../types/book').Bookmark[]>([]);
  const [highlights, setHighlights] = useState<import('../types/book').Highlight[]>([]);

  // ─── Initialize ────────────────────────────────────────────────────

  useEffect(() => {
    if (book) {
      setBook(book);
    }
    return () => {
      // End reading session on unmount
      endSession();
      resetReader();
    };
  }, [book?.id]);

  // ─── Reading session tracking ──────────────────────────────────────

  const startSession = useCallback(() => {
    if (!db || !book) return;
    try {
      const id = startReadingSession(db, book.id, book.progress);
      sessionIdRef.current = id;
      sessionStartRef.current = Date.now();
    } catch (e) {
      console.error('[useReader] Failed to start session:', e);
    }
  }, [db, book]);

  const endSession = useCallback(() => {
    if (!db || !sessionIdRef.current) return;
    try {
      const durationSecs = Math.round((Date.now() - sessionStartRef.current) / 1000);
      endReadingSession(db, sessionIdRef.current, durationSecs, progress);
      sessionIdRef.current = null;
    } catch (e) {
      console.error('[useReader] Failed to end session:', e);
    }
  }, [db, progress]);

  // ─── WebView event handlers ────────────────────────────────────────

  const handleReady = useCallback(() => {
    startSession();
  }, [startSession]);

  const handleLocationChanged = useCallback(
    (cfi: string, prog: number, chapIdx: number, chapTitle: string) => {
      updateLocation(cfi, prog, chapIdx, chapTitle);

      // Debounced save to database
      const now = Date.now();
      if (db && book && now - lastSaveRef.current > SAVE_INTERVAL_MS) {
        lastSaveRef.current = now;
        try {
          updateBookLocation(db, book.id, cfi, prog, chapTitle || null);
        } catch (e) {
          console.error('[useReader] Failed to save location:', e);
        }
      }
    },
    [db, book, updateLocation],
  );

  const handleTocLoaded = useCallback(
    (tocItems: TocItem[]) => {
      setToc(tocItems);

      // Restore highlights
      if (db && book && webViewRef.current) {
        try {
          const highlights = getHighlightsByBookId(db, book.id);
          if (highlights.length > 0) {
            const cmd: ReaderCommand = {
              type: 'restoreHighlights',
              highlights: highlights.map((h) => ({
                cfiRange: h.cfiRange,
                color: h.color,
                id: h.id,
              })),
            };
            webViewRef.current.injectJavaScript(serializeCommand(cmd));
          }
        } catch (e) {
          console.error('[useReader] Failed to restore highlights:', e);
        }
      }
    },
    [db, book, setToc],
  );

  const handleTextSelected = useCallback(
    (cfiRange: string, text: string, chapTitle: string, _rect: any) => {
      if (!text) return;
      setSelectedText(text);
      setSelectedCfiRange(cfiRange);
      setSelectedChapterTitle(chapTitle);
      setIsSelectionMenuVisible(true);
      setOverlayVisible(false);
    },
    [setOverlayVisible],
  );

  const handleTap = useCallback(
    (x: number, _y: number) => {
      // Dismiss selection menu if visible
      if (isSelectionMenuVisible) {
        setIsSelectionMenuVisible(false);
        return;
      }
      // Toggle overlay on center tap (middle 60% of screen)
      if (x > 0.2 && x < 0.8) {
        toggleOverlay();
      }
    },
    [isSelectionMenuVisible, toggleOverlay],
  );

  const handleError = useCallback((message: string) => {
    console.error('[Reader] WebView error:', message);
  }, []);

  // ─── User actions ──────────────────────────────────────────────────

  const goToChapter = useCallback(
    (href: string) => {
      if (webViewRef.current) {
        const cmd: ReaderCommand = { type: 'goToChapter', href };
        webViewRef.current.injectJavaScript(serializeCommand(cmd));
      }
    },
    [],
  );

  const goToCfi = useCallback(
    (cfi: string) => {
      if (webViewRef.current) {
        const cmd: ReaderCommand = { type: 'goToCfi', cfi };
        webViewRef.current.injectJavaScript(serializeCommand(cmd));
      }
    },
    [],
  );

  // ─── Load annotations from DB ──────────────────────────────────────

  const refreshAnnotations = useCallback(() => {
    if (!db || !book) return;
    try {
      setBookmarks(getBookmarksByBookId(db, book.id));
      setHighlights(getHighlightsByBookId(db, book.id));
    } catch (e) {
      console.error('[useReader] Failed to load annotations:', e);
    }
  }, [db, book]);

  const toggleAnnotationsDrawer = useCallback(() => {
    setAnnotationsDrawerOpen((prev) => {
      if (!prev) refreshAnnotations(); // refresh when opening
      return !prev;
    });
  }, [refreshAnnotations]);

  const addHighlightAction = useCallback(
    (color: HighlightColor) => {
      if (!db || !book || !selectedCfiRange || !selectedText) return;

      try {
        const highlight = insertHighlight(
          db,
          book.id,
          selectedCfiRange,
          selectedText,
          selectedChapterTitle,
          color,
        );

        // Add to WebView
        if (webViewRef.current) {
          const cmd: ReaderCommand = {
            type: 'addHighlight',
            cfiRange: selectedCfiRange,
            color,
            id: highlight.id,
          };
          webViewRef.current.injectJavaScript(serializeCommand(cmd));
        }

        setIsSelectionMenuVisible(false);
        clearSelection();
      } catch (e) {
        console.error('[useReader] Failed to add highlight:', e);
      }
    },
    [db, book, selectedCfiRange, selectedText, selectedChapterTitle],
  );

  const addBookmarkAction = useCallback(() => {
    if (!db || !book) return;
    // Ask WebView for context text at the current position
    if (webViewRef.current) {
      const cmd: ReaderCommand = { type: 'getBookmarkContext' };
      webViewRef.current.injectJavaScript(serializeCommand(cmd));
    }
  }, [db, book]);

  const handleBookmarkContext = useCallback(
    (cfi: string, chapTitle: string, contextText: string) => {
      if (!db || !book) return;
      try {
        const label = contextText
          ? contextText.substring(0, 80)
          : chapTitle || 'Bookmark';

        insertBookmark(db, book.id, cfi, chapTitle, label);

        if (Platform.OS === 'android') {
          ToastAndroid.show('Bookmark added', ToastAndroid.SHORT);
        } else {
          Alert.alert('Bookmark added');
        }
      } catch (e) {
        console.error('[useReader] Failed to add bookmark:', e);
      }
    },
    [db, book],
  );

  const deleteBookmarkAction = useCallback(
    (id: number) => {
      if (!db) return;
      try {
        deleteBookmark(db, id);
        setBookmarks((prev) => prev.filter((b) => b.id !== id));
      } catch (e) {
        console.error('[useReader] Failed to delete bookmark:', e);
      }
    },
    [db],
  );

  const deleteHighlightAction = useCallback(
    (id: number) => {
      if (!db) return;
      try {
        // Remove from WebView
        const hl = highlights.find((h) => h.id === id);
        if (hl && webViewRef.current) {
          const cmd: ReaderCommand = {
            type: 'removeHighlight',
            cfiRange: hl.cfiRange,
            id: hl.id,
          };
          webViewRef.current.injectJavaScript(serializeCommand(cmd));
        }
        deleteHighlight(db, id);
        setHighlights((prev) => prev.filter((h) => h.id !== id));
      } catch (e) {
        console.error('[useReader] Failed to delete highlight:', e);
      }
    },
    [db, highlights],
  );

  const saveQuoteAction = useCallback(
    (note: string) => {
      if (!db || !book || !selectedCfiRange || !selectedText) return;

      try {
        // Save as a highlight with the note
        const highlight = insertHighlight(
          db,
          book.id,
          selectedCfiRange,
          selectedText,
          selectedChapterTitle,
          'yellow',
          note || null,
        );

        // Add visual highlight in WebView
        if (webViewRef.current) {
          const cmd: ReaderCommand = {
            type: 'addHighlight',
            cfiRange: selectedCfiRange,
            color: 'yellow',
            id: highlight.id,
          };
          webViewRef.current.injectJavaScript(serializeCommand(cmd));
        }

        setIsSelectionMenuVisible(false);
        clearSelection();

        if (Platform.OS === 'android') {
          ToastAndroid.show('Quote saved', ToastAndroid.SHORT);
        }
      } catch (e) {
        console.error('[useReader] Failed to save quote:', e);
      }
    },
    [db, book, selectedCfiRange, selectedText, selectedChapterTitle],
  );

  const copySelection = useCallback(() => {
    if (selectedText) {
      Clipboard.setString(selectedText);
      setIsSelectionMenuVisible(false);
      clearSelection();
    }
  }, [selectedText]);

  const shareSelection = useCallback(async () => {
    if (!selectedText || !book) return;

    const quote = `"${selectedText}"\n\n— ${book.title} by ${book.author}`;

    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        // Sharing.shareAsync requires a file — for text, we'll use clipboard for now
        Clipboard.setString(quote);
      }
    } catch (e) {
      console.error('[useReader] Share failed:', e);
    }

    setIsSelectionMenuVisible(false);
    clearSelection();
  }, [selectedText, book]);

  const dismissSelection = useCallback(() => {
    setIsSelectionMenuVisible(false);
    clearSelection();
  }, []);

  const clearSelection = useCallback(() => {
    if (webViewRef.current) {
      const cmd: ReaderCommand = { type: 'clearSelection' };
      webViewRef.current.injectJavaScript(serializeCommand(cmd));
    }
  }, []);

  // ─── Save on unmount ───────────────────────────────────────────────

  useEffect(() => {
    return () => {
      // Final save of reading position
      if (db && book && currentCfi) {
        try {
          updateBookLocation(db, book.id, currentCfi, progress, chapterTitle || null);
        } catch (e) {
          // Best effort
        }
      }
    };
  }, [db, book, currentCfi, progress, chapterTitle]);

  return {
    webViewRef,
    // State
    isOverlayVisible,
    isChapterDrawerOpen,
    toc,
    progress,
    chapterTitle,
    chapterIndex,
    selectedText,
    isSelectionMenuVisible,
    // WebView handlers
    handleReady,
    handleLocationChanged,
    handleTocLoaded,
    handleTextSelected,
    handleBookmarkContext,
    handleTap,
    handleError,
    // Actions
    goToChapter,
    goToCfi,
    addHighlightAction,
    addBookmarkAction,
    saveQuoteAction,
    deleteBookmarkAction,
    deleteHighlightAction,
    copySelection,
    shareSelection,
    dismissSelection,
    toggleOverlay,
    toggleChapterDrawer,
    setChapterDrawerOpen,
    // Annotations drawer
    isAnnotationsDrawerOpen,
    setAnnotationsDrawerOpen,
    toggleAnnotationsDrawer,
    bookmarks,
    highlights,
  };
}
