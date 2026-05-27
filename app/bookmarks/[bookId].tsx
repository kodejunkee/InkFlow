/**
 * Bookmarks List Screen
 *
 * Shows all bookmarks for a book. Tap to navigate, swipe to delete.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDB } from '../_layout';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { getTheme } from '../../src/theme/themes';
import { textStyles } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { Ionicons } from '@expo/vector-icons';
import { getBookById, getBookmarksByBookId, deleteBookmark } from '../../src/database/queries';
import { EmptyState } from '../../src/components/common/EmptyState';
import type { Book, Bookmark } from '../../src/types/book';

export default function BookmarksScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();
  const db = useDB();
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);

  const [book, setBook] = useState<Book | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  // Load data
  useEffect(() => {
    if (db && bookId) {
      const id = parseInt(bookId, 10);
      const loadedBook = getBookById(db, id);
      if (loadedBook) setBook(loadedBook);

      const marks = getBookmarksByBookId(db, id);
      setBookmarks(marks);
    }
  }, [db, bookId]);

  const handleBookmarkPress = useCallback(
    (bookmark: Bookmark) => {
      // Navigate to reader at the bookmark's CFI location
      // Pass the CFI as a query param so the reader can restore it
      router.push(`/reader/${bookId}?cfi=${encodeURIComponent(bookmark.cfi)}` as any);
    },
    [bookId, router],
  );

  const handleDeleteBookmark = useCallback(
    (bookmark: Bookmark) => {
      Alert.alert(
        'Delete Bookmark',
        `Remove "${bookmark.label || 'this bookmark'}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              if (db) {
                deleteBookmark(db, bookmark.id);
                setBookmarks((prev) => prev.filter((b) => b.id !== bookmark.id));
              }
            },
          },
        ],
      );
    },
    [db],
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderBookmark = ({ item }: { item: Bookmark }) => (
    <Pressable
      onPress={() => handleBookmarkPress(item)}
      onLongPress={() => handleDeleteBookmark(item)}
      style={[
        styles.bookmarkCard,
        { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder },
      ]}
    >
      <View style={styles.bookmarkIcon}>
        <Ionicons name="bookmark" size={24} color={theme.textTertiary} style={styles.icon} />
      </View>
      <View style={styles.bookmarkContent}>
        <Text
          style={[textStyles.body, { color: theme.textPrimary, fontWeight: '500' }]}
          numberOfLines={2}
        >
          {item.label || 'Bookmark'}
        </Text>
        <Text
          style={[textStyles.caption, { color: theme.textSecondary, marginTop: 2 }]}
          numberOfLines={1}
        >
          {item.chapterTitle || 'Unknown chapter'}
        </Text>
        <Text style={[textStyles.caption, { color: theme.textTertiary, marginTop: 2 }]}>
          {formatDate(item.createdAt)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} style={styles.chevron} />
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable 
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={28} color={theme.primary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[textStyles.title, { color: theme.textPrimary }]}>Bookmarks</Text>
          {book && (
            <Text
              style={[textStyles.caption, { color: theme.textSecondary, marginTop: 2 }]}
              numberOfLines={1}
            >
              {book.title}
            </Text>
          )}
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* List */}
      {bookmarks.length === 0 ? (
        <EmptyState
          icon="bookmark-outline"
          title="No bookmarks yet"
          subtitle="Tap the bookmark icon in the reader to save your place"
        />
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderBookmark}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  bookmarkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  bookmarkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  icon: {
    marginRight: spacing.sm,
  },
  bookmarkContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  chevron: {
    marginLeft: spacing.sm,
  },
});
