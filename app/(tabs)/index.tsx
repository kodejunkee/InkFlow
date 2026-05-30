/**
 * InkFlow Library Screen (Home)
 *
 * Displays the user's book collection with:
 * - "Continue Reading" hero for the last opened book
 * - Grid of all books with covers, titles, progress
 * - FAB to import new EPUBs
 * - Empty state for first-time users
 * - Long-press to delete books
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useDB } from '../_layout';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useLibraryStore } from '../../src/stores/libraryStore';
import { useBookImport } from '../../src/hooks/useBookImport';
import { getBooks, deleteBook, deleteNovelDownloadByBookId } from '../../src/database/queries';
import { deleteBookFiles } from '../../src/services/fileManager';
import { getTheme } from '../../src/theme/themes';
import { textStyles } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { Ionicons } from '@expo/vector-icons';
import { BookGrid } from '../../src/components/library/BookGrid';
import { ContinueReading } from '../../src/components/library/ContinueReading';
import { ImportButton } from '../../src/components/library/ImportButton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { ErrorBoundary } from '../../src/components/common/ErrorBoundary';
import { ConfirmDeleteModal } from '../../src/components/library/ConfirmDeleteModal';
import { Book } from '../../src/types/book';

export default function LibraryScreen() {
  const router = useRouter();
  const db = useDB();
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);

  const books = useLibraryStore((s) => s.books);
  const isLoading = useLibraryStore((s) => s.isLoading);
  const loadBooksAction = useLibraryStore((s) => s.loadBooks);
  const removeBooksAction = useLibraryStore((s) => s.removeBook);
  const setLoading = useLibraryStore((s) => s.setLoading);

  const { importBook, isImporting, importProgress, error: importError } =
    useBookImport(db);
    
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);

  // Load books from database
  const refreshBooks = useCallback(() => {
    if (!db) return;
    setLoading(true);
    try {
      const allBooks = getBooks(db);
      loadBooksAction(allBooks);
    } catch (e) {
      console.error('[Library] Failed to load books:', e);
      loadBooksAction([]);
    }
  }, [db, loadBooksAction, setLoading]);

  // Refresh books every time this screen gains focus (e.g. returning from reader)
  useFocusEffect(
    useCallback(() => {
      refreshBooks();
    }, [refreshBooks]),
  );

  // Find the most recently read book (has progress > 0 OR has a saved location)
  // We check lastLocation too because progress can be 0 if location generation
  // hadn't completed before the user exited the reader.
  const continueBook = useMemo(() => {
    const inProgress = books
      .filter((b) => (b.progress > 0 && b.progress < 1) || b.lastLocation)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    return inProgress[0] || null;
  }, [books]);

  // All books sorted by most recently added
  const sortedBooks = useMemo(() => {
    return [...books].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [books]);

  const handleBookPress = useCallback(
    (bookId: number) => {
      router.push(`/reader/${bookId}` as any);
    },
    [router],
  );

  const handleBookLongPress = useCallback(
    (bookId: number) => {
      const book = books.find((b) => b.id === bookId);
      if (!book || !db) return;
      setBookToDelete(book);
    },
    [books, db],
  );

  const confirmDelete = useCallback(() => {
    if (!bookToDelete || !db) return;
    try {
      deleteNovelDownloadByBookId(db, bookToDelete.id);
      deleteBook(db, bookToDelete.id);
      deleteBookFiles(bookToDelete.id, bookToDelete.filePath, bookToDelete.coverUri);
      removeBooksAction(bookToDelete.id);
    } catch (e) {
      console.error('[Library] Delete failed:', e);
    } finally {
      setBookToDelete(null);
    }
  }, [bookToDelete, db, removeBooksAction]);

  const handleContinueReading = useCallback(() => {
    if (continueBook) {
      router.push(`/reader/${continueBook.id}` as any);
    }
  }, [continueBook, router]);

  const handleImport = useCallback(async () => {
    const result = await importBook();
    if (result) {
      refreshBooks();
    }
  }, [importBook, refreshBooks]);

  const progressText = useMemo(() => {
    if (!isImporting) return undefined;
    if (importProgress < 0.1) return 'Opening file picker...';
    if (importProgress < 0.3) return 'Copying EPUB to storage...';
    if (importProgress < 0.8) return 'Processing EPUB metadata...';
    if (importProgress < 0.95) return 'Saving to library...';
    return 'Done!';
  }, [isImporting, importProgress]);

  const renderHeader = useCallback(() => {
    return (
      <View>
        {/* App header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image 
              source={require('../../assets/icon.png')} 
              style={{ width: 40, height: 40, borderRadius: 10, marginRight: 12 }} 
            />
            <Text style={[textStyles.h1, { color: theme.textPrimary, fontWeight: '700', letterSpacing: -0.5 }]}>
              InkFlow
            </Text>
          </View>
        </View>

        {/* Continue Reading */}
        {continueBook && (
          <ContinueReading
            book={continueBook}
            onPress={handleContinueReading}
          />
        )}

        {/* Section title */}
        {sortedBooks.length > 0 && (
          <View style={styles.sectionHeader}>
            <Text
              style={[
                textStyles.caption,
                styles.sectionLabel,
                { color: theme.textSecondary },
              ]}
            >
              YOUR LIBRARY
            </Text>
            <Text style={[textStyles.caption, { color: theme.textTertiary }]}>
              {sortedBooks.length} {sortedBooks.length === 1 ? 'book' : 'books'}
            </Text>
          </View>
        )}
      </View>
    );
  }, [
    continueBook,
    sortedBooks.length,
    theme,
    handleContinueReading,
    router,
  ]);

  return (
    <ErrorBoundary>
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        {sortedBooks.length === 0 && !isLoading ? (
          <View style={styles.emptyContainer}>
            {renderHeader()}
            <EmptyState
              icon="library-outline"
              title="Your library is empty"
              subtitle="Tap the + button to add your first web novel EPUB"
            />
          </View>
        ) : (
          <BookGrid
            books={sortedBooks}
            onBookPress={handleBookPress}
            onBookLongPress={handleBookLongPress}
            ListHeaderComponent={renderHeader()}
            refreshing={isLoading}
            onRefresh={refreshBooks}
          />
        )}

        <ImportButton
          onPress={handleImport}
          isImporting={isImporting}
          importProgress={progressText}
          importError={importError?.message ?? null}
        />
        <ConfirmDeleteModal
          visible={!!bookToDelete}
          book={bookToDelete}
          onCancel={() => setBookToDelete(null)}
          onConfirm={confirmDelete}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing.lg,
  },
  settingsButton: {
    padding: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    letterSpacing: 1.5,
    fontWeight: '600',
  },
});
