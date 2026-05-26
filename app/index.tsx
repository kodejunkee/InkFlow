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

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDB } from './_layout';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useLibraryStore } from '../src/stores/libraryStore';
import { useBookImport } from '../src/hooks/useBookImport';
import { getBooks, deleteBook } from '../src/database/queries';
import { deleteBookFiles } from '../src/services/fileManager';
import { getTheme } from '../src/theme/themes';
import { textStyles } from '../src/theme/typography';
import { spacing } from '../src/theme/spacing';
import { BookGrid } from '../src/components/library/BookGrid';
import { ContinueReading } from '../src/components/library/ContinueReading';
import { ImportButton } from '../src/components/library/ImportButton';
import { EmptyState } from '../src/components/common/EmptyState';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';

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

  useEffect(() => {
    refreshBooks();
  }, [refreshBooks]);

  // Find the most recently updated book with progress > 0
  const continueBook = useMemo(() => {
    const inProgress = books
      .filter((b) => b.progress > 0 && b.progress < 1)
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

      Alert.alert(
        'Delete Book',
        `Are you sure you want to remove "${book.title}" from your library?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              try {
                deleteBook(db, bookId);
                deleteBookFiles(bookId, book.filePath, book.coverUri);
                removeBooksAction(bookId);
              } catch (e) {
                console.error('[Library] Delete failed:', e);
              }
            },
          },
        ],
      );
    },
    [books, db, removeBooksAction],
  );

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
          <Text style={[textStyles.hero, { color: theme.textPrimary }]}>
            InkFlow
          </Text>
          <Pressable
            onPress={() => router.push('/settings' as any)}
            style={styles.settingsButton}
            hitSlop={12}
          >
            <Text
              style={[styles.settingsIcon, { color: theme.textSecondary }]}
            >
              ⚙️
            </Text>
          </Pressable>
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
              icon="📚"
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
  settingsIcon: {
    fontSize: 24,
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
