/**
 * Reader Screen — Full epub.js reading experience
 *
 * Integrates:
 * - epub.js WebView (scrolled-doc infinite scrolling)
 * - Tap-to-show overlay (header + footer)
 * - Chapter drawer
 * - Text selection menu (highlights, bookmarks, copy, share)
 * - Quote card generation & sharing
 * - Reading position persistence
 * - Reading session tracking
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDB } from '../_layout';
import { getBookById } from '../../src/database/queries';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { getTheme } from '../../src/theme/themes';
import { useReader } from '../../src/hooks/useReader';
import { ReaderWebView } from '../../src/components/reader/ReaderWebView';
import { ReaderOverlay } from '../../src/components/reader/ReaderOverlay';
import { ChapterDrawer } from '../../src/components/reader/ChapterDrawer';
import { AnnotationsDrawer } from '../../src/components/reader/AnnotationsDrawer';
import { ReaderSettingsModal } from '../../src/components/reader/ReaderSettingsModal';
import { TextSelectionMenu } from '../../src/components/reader/TextSelectionMenu';
import { QuotePreviewModal } from '../../src/components/reader/QuotePreviewModal';
import { TtsPlayerSheet } from '../../src/components/reader/TtsPlayerSheet';
import { useTTS } from '../../src/hooks/useTTS';
import type { Book } from '../../src/types/book';

export default function ReaderScreen() {
  const { bookId, cfi } = useLocalSearchParams<{ bookId: string; cfi?: string }>();
  const router = useRouter();
  const db = useDB();
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);

  const [book, setBook] = useState<Book | null>(null);
  const [isQuotePreviewVisible, setIsQuotePreviewVisible] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);

  // Load book from database
  useEffect(() => {
    if (db && bookId) {
      const loadedBook = getBookById(db, parseInt(bookId, 10));
      if (loadedBook) {
        setBook(loadedBook);
      }
    }
  }, [db, bookId]);

  // Reader orchestration
  const {
    webViewRef,
    isOverlayVisible,
    isChapterDrawerOpen,
    toc,
    progress,
    chapterTitle,
    chapterIndex,
    selectedText,
    selectedCfiRange,
    isSelectionMenuVisible,
    handleReady,
    handleLocationChanged,
    handleTocLoaded,
    handleTextSelected,
    handleBookmarkContext,
    handleTap,
    toggleOverlay,
    handleError,
    goToChapter,
    addHighlightAction,
    addBookmarkAction,
    saveQuoteAction,
    deleteBookmarkAction,
    deleteHighlightAction,
    goToCfi,
    copySelection,
    dismissSelection,
    toggleChapterDrawer,
    setChapterDrawerOpen,
    isAnnotationsDrawerOpen,
    toggleAnnotationsDrawer,
    bookmarks,
    highlights,
  } = useReader({ db, book });

  // TTS orchestration
  const {
    ttsStatus,
    currentSentenceIndex,
    totalSentences,
    currentChapterTitle: ttsChapterTitle,
    sleepTimerRemaining,
    startFromCurrentPosition,
    startFromText,
    play,
    pause,
    stop,
    nextSentence,
    prevSentence,
    setSleepTimerActive,
    handleChapterText,
    handleLocationChangedForTts,
  } = useTTS({ webViewRef });

  // Override handleLocationChanged to notify TTS
  const onLocationChanged = useCallback(
    (cfi: string, prog: number, chapIdx: number, chapTitle: string) => {
      handleLocationChanged(cfi, prog, chapIdx, chapTitle);
      handleLocationChangedForTts();
    },
    [handleLocationChanged, handleLocationChangedForTts]
  );

  // Quote card state
  const [quoteData, setQuoteData] = useState<import('../../src/components/reader/QuotePreviewModal').QuoteData | null>(null);

  // Share as quote card — generates an image and shows preview
  const handleShareAsQuote = useCallback(() => {
    if (!book || !selectedText) return;

    setQuoteData({
      quoteText: selectedText,
      author: book.author,
      title: book.title,
      chapterTitle: chapterTitle,
      coverUri: book.coverUri,
    });
    setIsQuotePreviewVisible(true);
    dismissSelection();
  }, [book, selectedText, chapterTitle, dismissSelection]);

  const handleDismissQuote = useCallback(() => {
    setIsQuotePreviewVisible(false);
    setTimeout(() => setQuoteData(null), 300); // clear after animation
  }, []);

  if (!book) {
    return <View style={[styles.container, { backgroundColor: theme.reader.background }]} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.reader.background }]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
      />

      {/* epub.js WebView */}
      <ReaderWebView
        ref={webViewRef}
        book={book}
        initialCfi={cfi}
        onReady={handleReady}
        onLocationChanged={onLocationChanged}
        onTocLoaded={handleTocLoaded}
        onTextSelected={handleTextSelected}
        onChapterText={handleChapterText}
        onBookmarkContext={handleBookmarkContext}
        onTap={handleTap}
        onError={handleError}
      />

      {/* Header + Footer overlay */}
      <ReaderOverlay
        visible={isOverlayVisible}
        bookTitle={book.title}
        chapterTitle={chapterTitle}
        progress={progress}
        isBookmarked={bookmarks.some((b) => b.chapterTitle === chapterTitle)}
        onBack={() => router.back()}
        onChapters={() => toggleChapterDrawer()}
        onAnnotations={toggleAnnotationsDrawer}
        onBookmark={addBookmarkAction}
        onListen={() => {
          toggleOverlay(); // Hide overlay
          startFromCurrentPosition();
        }}
        onSettings={() => {
          toggleOverlay(); // Hide overlay
          setSettingsModalOpen(true);
        }}
      />

      {/* Chapter drawer */}
      <ChapterDrawer
        visible={isChapterDrawerOpen}
        toc={toc}
        currentChapterIndex={chapterIndex}
        onSelectChapter={goToChapter}
        onClose={() => setChapterDrawerOpen(false)}
      />

      {/* Annotations drawer (bookmarks, quotes, highlights) */}
      <AnnotationsDrawer
        visible={isAnnotationsDrawerOpen}
        bookmarks={bookmarks}
        highlights={highlights}
        onGoToBookmark={(cfi) => { goToCfi(cfi); }}
        onGoToHighlight={(cfiRange) => { goToCfi(cfiRange); }}
        onDeleteBookmark={deleteBookmarkAction}
        onDeleteHighlight={deleteHighlightAction}
        onClose={toggleAnnotationsDrawer}
      />

      {/* Reader Settings Modal */}
      <ReaderSettingsModal
        visible={isSettingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />

      {/* Text selection context menu */}
      <TextSelectionMenu
        visible={isSelectionMenuVisible}
        selectedText={selectedText}
        onHighlight={addHighlightAction}
        onSaveQuote={saveQuoteAction}
        onListenSelected={() => {
          startFromText(selectedText);
          dismissSelection();
        }}
        onStartHere={() => {
          startFromCurrentPosition(selectedText);
          dismissSelection();
        }}
        onShare={handleShareAsQuote}
        onDismiss={dismissSelection}
      />

      {/* Quote card preview */}
      <QuotePreviewModal
        visible={isQuotePreviewVisible}
        quoteData={quoteData}
        onDismiss={handleDismissQuote}
      />

      {/* TTS Player Sheet */}
      <TtsPlayerSheet
        visible={ttsStatus !== 'idle'}
        ttsStatus={ttsStatus}
        currentSentenceIndex={currentSentenceIndex}
        totalSentences={totalSentences}
        currentChapterTitle={ttsChapterTitle || chapterTitle}
        sleepTimerRemaining={sleepTimerRemaining}
        onPlay={play}
        onPause={pause}
        onStop={stop}
        onNextSentence={nextSentence}
        onPrevSentence={prevSentence}
        onSetSleepTimer={setSleepTimerActive}
        onClose={stop}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
