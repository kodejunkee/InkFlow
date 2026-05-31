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
  ScrollView,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useDB } from '../_layout';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useLibraryStore } from '../../src/stores/libraryStore';
import { useNovelStore } from '../../src/stores/novelStore';
import { useBookImport } from '../../src/hooks/useBookImport';
import { getBooks, getAllNovelDownloads, deleteBook, deleteNovelDownloadByBookId } from '../../src/database/queries';
import { deleteBookFiles } from '../../src/services/fileManager';
import { getTheme } from '../../src/theme/themes';
import { updateNovel } from '../../src/services/novel/NovelDownloader';
import { getNovelDetails } from '../../src/services/novel/NovelSourceService';
import { textStyles } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { Ionicons } from '@expo/vector-icons';
import { BookCard, NUM_COLUMNS, CARD_MARGIN, GRID_PADDING, CARD_WIDTH } from '../../src/components/library/BookCard';
import { ContinueReading } from '../../src/components/library/ContinueReading';
import { ImportButton } from '../../src/components/library/ImportButton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { ErrorBoundary } from '../../src/components/common/ErrorBoundary';
import { ConfirmationModal } from '../../src/components/library/ConfirmationModal';
import { Book } from '../../src/types/book';
import { DownloadProgress } from '../../src/types/novel';

export default function LibraryScreen() {
  const router = useRouter();
  const db = useDB();
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);

  const books = useLibraryStore((s) => s.books);
  const downloads = useLibraryStore((s) => s.downloads);
  const isLoading = useLibraryStore((s) => s.isLoading);
  const loadBooksAction = useLibraryStore((s) => s.loadBooks);
  const loadDownloadsAction = useLibraryStore((s) => s.loadDownloads);
  const removeBooksAction = useLibraryStore((s) => s.removeBook);
  const setLoading = useLibraryStore((s) => s.setLoading);

  const activeDownloads = useNovelStore((s) => s.activeDownloads);
  const pauseDownload = useNovelStore((s) => s.pauseDownload);
  const resumeDownload = useNovelStore((s) => s.resumeDownload);
  const cancelDownload = useNovelStore((s) => s.cancelDownload);

  const [activeFilter, setActiveFilter] = useState<'All' | 'Local' | 'Downloaded' | 'Downloading' | 'Reading' | 'Finished'>('All');

  const { importBook, isImporting, importProgress, error: importError } =
    useBookImport(db);
    
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [downloadToCancel, setDownloadToCancel] = useState<DownloadProgress | null>(null);
  const [syncingBooks, setSyncingBooks] = useState<Record<number, boolean>>({});

  // Load books and downloads from database
  const refreshBooks = useCallback(() => {
    if (!db) return;
    setLoading(true);
    try {
      const allBooks = getBooks(db);
      const allDownloads = getAllNovelDownloads(db);
      loadBooksAction(allBooks);
      loadDownloadsAction(allDownloads);
    } catch (e) {
      console.error('[Library] Failed to load books:', e);
      loadBooksAction([]);
      loadDownloadsAction([]);
    }
  }, [db, loadBooksAction, loadDownloadsAction, setLoading]);

  const handleSyncBook = useCallback(async (bookId: number) => {
    if (!db || syncingBooks[bookId]) return;
    
    try {
      setSyncingBooks(prev => ({ ...prev, [bookId]: true }));
      
      const downloadRecord = downloads.find(d => d.bookId === bookId);
      if (!downloadRecord) throw new Error('Not a downloaded book');

      // Fetch latest novel details
      const cookies = '';
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      
      const details = await getNovelDetails(
        downloadRecord.sourceId, 
        downloadRecord.sourceUrl, 
        cookies, 
        userAgent
      );
      if ((details as any).error) throw new Error((details as any).error);

      // Attempt update
      const updated = await updateNovel(db, bookId, details, cookies, userAgent);
      
      if (updated) {
        Alert.alert('Update Complete', 'New chapters have been downloaded.');
        refreshBooks();
      } else {
        Alert.alert('No Updates', 'This book is already up to date.');
      }
    } catch (e) {
      console.error('[Library] Sync failed:', e);
      Alert.alert('Update Failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSyncingBooks(prev => ({ ...prev, [bookId]: false }));
    }
  }, [db, downloads, syncingBooks, refreshBooks]);

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

  // Filtered books
  const filteredBooks = useMemo(() => {
    const sorted = [...books].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (activeFilter === 'All') return sorted;
    if (activeFilter === 'Local') {
      return sorted.filter((b) => !downloads.some((d) => d.bookId === b.id));
    }
    if (activeFilter === 'Downloaded') {
      return sorted.filter((b) => downloads.some((d) => d.bookId === b.id && d.status === 'completed'));
    }
    if (activeFilter === 'Reading') {
      return sorted.filter((b) => (b.progress > 0 && b.progress < 0.99) || b.lastLocation);
    }
    if (activeFilter === 'Finished') {
      return sorted.filter((b) => b.progress >= 0.99);
    }
    return sorted; // Fallback
  }, [books, downloads, activeFilter]);

  const listData = useMemo(() => {
    if (activeFilter === 'Downloading') {
      return Object.values(activeDownloads).map((d) => ({ type: 'download' as const, data: d }));
    }
    const chunks = [];
    for (let i = 0; i < filteredBooks.length; i += NUM_COLUMNS) {
      chunks.push({ type: 'book-row' as const, data: filteredBooks.slice(i, i + NUM_COLUMNS) });
    }
    return chunks;
  }, [activeFilter, activeDownloads, filteredBooks]);

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

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {['All', 'Local', 'Downloaded', 'Downloading', 'Reading', 'Finished'].map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter as any)}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: isActive ? theme.primary : theme.surface,
                    borderColor: isActive ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    textStyles.caption,
                    {
                      color: isActive ? '#fff' : theme.textSecondary,
                      fontWeight: isActive ? 'bold' : '600',
                    },
                  ]}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Section title */}
        {activeFilter !== 'Downloading' && filteredBooks.length > 0 && (
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
              {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'}
            </Text>
          </View>
        )}
        
        {activeFilter === 'Downloading' && Object.keys(activeDownloads).length > 0 && (
          <View style={styles.sectionHeader}>
            <Text
              style={[
                textStyles.caption,
                styles.sectionLabel,
                { color: theme.textSecondary },
              ]}
            >
              ACTIVE DOWNLOADS
            </Text>
          </View>
        )}
      </View>
    );
  }, [
    continueBook,
    filteredBooks.length,
    activeFilter,
    activeDownloads,
    theme,
    handleContinueReading,
    router,
  ]);

  return (
    <ErrorBoundary>
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <FlatList
          data={listData as any[]}
          keyExtractor={(item, index) => item.type === 'download' ? item.data.sourceUrl : `row-${index}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: GRID_PADDING, paddingTop: spacing.sm, paddingBottom: spacing['5xl'] }}
          ListHeaderComponent={renderHeader()}
          ListEmptyComponent={
            <View style={{ flex: 1, paddingVertical: 100 }}>
              {activeFilter === 'Downloading' ? (
                <EmptyState
                  icon="cloud-download-outline"
                  title="No active downloads"
                  subtitle="Downloads running in the background will appear here"
                />
              ) : (
                <EmptyState
                  icon="library-outline"
                  title={activeFilter === 'All' ? "Your library is empty" : `No ${activeFilter.toLowerCase()} books`}
                  subtitle={activeFilter === 'All' ? "Tap the + button to add your first web novel EPUB" : ""}
                />
              )}
            </View>
          }
          refreshing={isLoading}
          onRefresh={refreshBooks}
          renderItem={({ item }) => {
            if (item.type === 'download') {
              const download = item.data;
              return (
                <View style={[styles.downloadCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  {download.coverUrl && (
                    <Image source={{ uri: download.coverUrl }} style={styles.downloadCover} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[textStyles.body, { color: theme.textPrimary, fontWeight: '600' }]} numberOfLines={1}>
                      {download.novelTitle}
                    </Text>
                    <Text style={[textStyles.caption, { color: theme.textSecondary, marginTop: 4 }]}>
                      {download.status === 'downloading'
                        ? `Downloading chapter ${download.currentChapter} of ${download.totalChapters}`
                        : download.status.replace('_', ' ').toUpperCase()}
                    </Text>
                    <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: download.status === 'failed' ? '#EF5350' : theme.primary,
                            width: `${Math.max((download.currentChapter / (download.totalChapters || 1)) * 100, 2)}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
                    {download.status === 'downloading' && (
                      <Pressable
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, padding: 8 }]}
                        onPress={() => pauseDownload(download.sourceUrl)}
                      >
                        <Ionicons name="pause" size={20} color={theme.textPrimary} />
                      </Pressable>
                    )}
                    {download.status === 'paused' && (
                      <Pressable
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, padding: 8 }]}
                        onPress={() => resumeDownload(download.sourceUrl)}
                      >
                        <Ionicons name="play" size={20} color={theme.textPrimary} />
                      </Pressable>
                    )}
                    {(download.status === 'downloading' || download.status === 'paused' || download.status === 'failed') && (
                      <Pressable
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, padding: 8 }]}
                        onPress={() => setDownloadToCancel(download)}
                      >
                        <Ionicons name="close" size={20} color="#EF5350" />
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            } else {
              const rowBooks = item.data as Book[];
              return (
                <View style={{ flexDirection: 'row', justifyContent: 'flex-start', gap: CARD_MARGIN, marginBottom: CARD_MARGIN }}>
                  {rowBooks.map((book) => (
                    <View key={book.id} style={{ width: CARD_WIDTH }}>
                      <BookCard
                        id={book.id}
                        title={book.title}
                        author={book.author}
                        coverUri={book.coverUri}
                        progress={book.progress}
                        onPress={handleBookPress}
                        onLongPress={handleBookLongPress}
                        onSync={downloads.some(d => d.bookId === book.id) ? handleSyncBook : undefined}
                        isSyncing={syncingBooks[book.id]}
                      />
                    </View>
                  ))}
                </View>
              );
            }
          }}
        />

        <ImportButton
          onPress={handleImport}
          isImporting={isImporting}
          importProgress={progressText}
          importError={importError?.message ?? null}
        />
        <ConfirmationModal
          visible={bookToDelete !== null}
          title="Remove from Library?"
          message={
            <>
              Are you sure you want to delete <Text style={{ color: theme.textPrimary, fontWeight: 'bold' }}>"{bookToDelete?.title}"</Text>? This will permanently remove the file and all your highlights and bookmarks.
            </>
          }
          iconName="trash-outline"
          iconColor="#EF4444"
          iconBgColor="rgba(239, 68, 68, 0.15)"
          confirmText="Delete"
          confirmButtonColor="#EF4444"
          onCancel={() => setBookToDelete(null)}
          onConfirm={confirmDelete}
        />
        <ConfirmationModal
          visible={downloadToCancel !== null}
          title="Cancel Download?"
          message={
            <>
              Are you sure you want to cancel the download for <Text style={{ color: theme.textPrimary, fontWeight: 'bold' }}>"{downloadToCancel?.novelTitle}"</Text>? This action cannot be undone.
            </>
          }
          iconName="close-circle-outline"
          iconColor="#EF5350"
          iconBgColor="rgba(239, 83, 80, 0.15)"
          confirmText="Yes"
          cancelText="No"
          confirmButtonColor="#EF5350"
          showConfirmIcon={false}
          onCancel={() => setDownloadToCancel(null)}
          onConfirm={() => {
            if (downloadToCancel) {
              cancelDownload(downloadToCancel.sourceUrl);
              setDownloadToCancel(null);
            }
          }}
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
  filterContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  downloadCard: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  downloadCover: {
    width: 40,
    height: 60,
    borderRadius: 4,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
