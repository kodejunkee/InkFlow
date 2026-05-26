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
import { TextSelectionMenu } from '../../src/components/reader/TextSelectionMenu';
import { QuotePreviewModal } from '../../src/components/reader/QuotePreviewModal';
import type { Book } from '../../src/types/book';

export default function ReaderScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();
  const db = useDB();
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);

  const [book, setBook] = useState<Book | null>(null);
  const [isQuotePreviewVisible, setIsQuotePreviewVisible] = useState(false);

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
    isSelectionMenuVisible,
    handleReady,
    handleLocationChanged,
    handleTocLoaded,
    handleTextSelected,
    handleBookmarkContext,
    handleTap,
    handleError,
    goToChapter,
    goToCfi,
    goToHighlight,
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
    setAnnotationsDrawerOpen,
    toggleAnnotationsDrawer,
    bookmarks,
    highlights,
  } = useReader({ db, book });

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
        onReady={handleReady}
        onLocationChanged={handleLocationChanged}
        onTocLoaded={handleTocLoaded}
        onTextSelected={handleTextSelected}
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
        onBack={() => router.back()}
        onChapters={() => toggleChapterDrawer()}
        onAnnotations={toggleAnnotationsDrawer}
        onBookmark={addBookmarkAction}
        onSettings={() => router.push('/settings' as any)}
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
        onGoToHighlight={(cfiRange) => { goToHighlight(cfiRange); }}
        onDeleteBookmark={deleteBookmarkAction}
        onDeleteHighlight={deleteHighlightAction}
        onClose={() => setAnnotationsDrawerOpen(false)}
      />

      {/* Text selection context menu */}
      <TextSelectionMenu
        visible={isSelectionMenuVisible}
        selectedText={selectedText}
        onHighlight={addHighlightAction}
        onSaveQuote={saveQuoteAction}
        onCopy={copySelection}
        onShare={handleShareAsQuote}
        onDismiss={dismissSelection}
      />

      {/* Quote card preview */}
      <QuotePreviewModal
        visible={isQuotePreviewVisible}
        quoteData={quoteData}
        onDismiss={handleDismissQuote}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
