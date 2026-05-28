/**
 * Highlights List Screen
 *
 * Shows all highlights for a book with:
 * - Color-coded cards
 * - Inline note display/editing
 * - Tap to navigate to location
 * - Long-press to delete
 * - Search through highlighted text
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDB } from '../_layout';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { getTheme } from '../../src/theme/themes';
import { textStyles } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { Ionicons } from '@expo/vector-icons';
import {
  getBookById,
  getHighlightsByBookId,
  deleteHighlight,
  updateHighlightNote,
  searchHighlights,
} from '../../src/database/queries';
import { EmptyState } from '../../src/components/common/EmptyState';
import { QuotePreviewModal } from '../../src/components/reader/QuotePreviewModal';
import type { Book, Highlight } from '../../src/types/book';

const COLOR_HEX: Record<string, string> = {
  yellow: '#FFEB3B',
  green: '#4CAF50',
  blue: '#42A5F5',
  pink: '#F06292',
  orange: '#FFA726',
};

export default function HighlightsScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();
  const db = useDB();
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);

  const [book, setBook] = useState<Book | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Note editor state
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null);
  const [noteText, setNoteText] = useState('');
  const [isQuotePreviewVisible, setIsQuotePreviewVisible] = useState(false);

  // Quote card state
  const [quoteData, setQuoteData] = useState<import('../../src/components/reader/QuotePreviewModal').QuoteData | null>(null);

  // Load data
  useEffect(() => {
    if (db && bookId) {
      const id = parseInt(bookId, 10);
      const loadedBook = getBookById(db, id);
      if (loadedBook) setBook(loadedBook);

      const hls = getHighlightsByBookId(db, id);
      setHighlights(hls);
    }
  }, [db, bookId]);

  // Filtered highlights
  const filteredHighlights = useMemo(() => {
    if (!searchQuery.trim()) return highlights;
    if (!db || !bookId) return [];
    return searchHighlights(db, searchQuery, parseInt(bookId, 10));
  }, [highlights, searchQuery, db, bookId]);

  const handleHighlightPress = useCallback(
    (highlight: Highlight) => {
      router.push(
        `/reader/${bookId}?cfi=${encodeURIComponent(highlight.cfiRange)}` as any,
      );
    },
    [bookId, router],
  );

  const handleDeleteHighlight = useCallback(
    (highlight: Highlight) => {
      Alert.alert(
        'Delete Highlight',
        'Remove this highlight and its note?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              if (db) {
                deleteHighlight(db, highlight.id);
                setHighlights((prev) => prev.filter((h) => h.id !== highlight.id));
              }
            },
          },
        ],
      );
    },
    [db],
  );

  const handleEditNote = useCallback((highlight: Highlight) => {
    setEditingHighlight(highlight);
    setNoteText(highlight.note || '');
  }, []);

  const handleSaveNote = useCallback(() => {
    if (!db || !editingHighlight) return;
    updateHighlightNote(db, editingHighlight.id, noteText.trim() || null);
    setHighlights((prev) =>
      prev.map((h) =>
        h.id === editingHighlight.id
          ? { ...h, note: noteText.trim() || null }
          : h,
      ),
    );
    setEditingHighlight(null);
    setNoteText('');
  }, [db, editingHighlight, noteText]);

  const handleShareAsQuote = useCallback(
    (highlight: Highlight) => {
      if (!book) return;
      setQuoteData({
        quoteText: highlight.selectedText,
        author: book.author,
        title: book.title,
        chapterTitle: highlight.chapterTitle || undefined,
        coverUri: book.coverUri,
      });
      setIsQuotePreviewVisible(true);
    },
    [book],
  );

  const handleDismissQuote = useCallback(() => {
    setIsQuotePreviewVisible(false);
    setTimeout(() => setQuoteData(null), 300); // clear after animation
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderHighlight = ({ item }: { item: Highlight }) => {
    const accentColor = COLOR_HEX[item.color] || COLOR_HEX.yellow;

    return (
      <Pressable
        onPress={() => handleHighlightPress(item)}
        onLongPress={() => handleDeleteHighlight(item)}
        style={[
          styles.highlightCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.cardBorder,
            borderLeftColor: accentColor,
          },
        ]}
      >
        {/* Highlighted text */}
        <Text
          style={[
            textStyles.body,
            {
              color: theme.textPrimary,
              fontStyle: 'italic',
              lineHeight: 24,
            },
          ]}
          numberOfLines={4}
        >
          "{item.selectedText}"
        </Text>

        {/* Note */}
        {item.note ? (
          <Pressable
            onPress={() => handleEditNote(item)}
            style={[styles.noteContainer, { backgroundColor: theme.primaryLight }]}
          >
            <View style={styles.noteContainer}>
              <Ionicons name="chatbubble-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.noteText, { color: theme.textSecondary }]}>{item.note}</Text>
            </View>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => handleEditNote(item)}
            style={styles.addNoteButton}
          >
            <Text style={[textStyles.caption, { color: theme.primary }]}>
              + Add note
            </Text>
          </Pressable>
        )}

        {/* Meta + Share */}
        <View style={styles.highlightMeta}>
          <View style={[styles.colorDot, { backgroundColor: accentColor }]} />
          <Text style={[textStyles.caption, { color: theme.textTertiary, flex: 1 }]}>
            {item.chapterTitle || 'Unknown chapter'}
          </Text>
          <Pressable
            style={styles.actionButton}
            onPress={() => handleShareAsQuote(item)}
          >
            <Ionicons name="share-outline" size={18} color={theme.primary} />
            <Text style={[textStyles.caption, { color: theme.primary, marginLeft: spacing.xs }]}>Share</Text>
          </Pressable>
          <Text style={[textStyles.caption, { color: theme.textTertiary }]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
      </Pressable>
    );
  };

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
          <Text style={[textStyles.title, { color: theme.textPrimary }]}>Highlights</Text>
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

      {/* Search */}
      {highlights.length > 0 && (
        <View style={[styles.searchContainer, { borderBottomColor: theme.border }]}>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.surfaceElevated,
                color: theme.textPrimary,
                borderColor: theme.border,
              },
            ]}
            placeholder="Search highlights..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {/* List */}
      {filteredHighlights.length === 0 && !searchQuery ? (
        <EmptyState
          icon="brush-outline"
          title="No highlights yet"
          subtitle="Select text in the reader to create highlights"
        />
      ) : filteredHighlights.length === 0 && searchQuery ? (
        <EmptyState
          icon="search-outline"
          title="No results"
          subtitle={`No highlights matching "${searchQuery}"`}
        />
      ) : (
        <FlatList
          data={filteredHighlights}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderHighlight}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Note Editor Modal */}
      <Modal
        visible={editingHighlight !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingHighlight(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setEditingHighlight(null)}
          />
          <View
            style={[
              styles.noteEditor,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[textStyles.title, { color: theme.textPrimary, marginBottom: spacing.md }]}>
              Edit Note
            </Text>

            {editingHighlight && (
              <Text
                style={[
                  textStyles.caption,
                  { color: theme.textSecondary, fontStyle: 'italic', marginBottom: spacing.md },
                ]}
                numberOfLines={2}
              >
                "{editingHighlight.selectedText}"
              </Text>
            )}

            <TextInput
              style={[
                styles.noteInput,
                {
                  backgroundColor: theme.surfaceElevated,
                  color: theme.textPrimary,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Add your note..."
              placeholderTextColor={theme.textTertiary}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              textAlignVertical="top"
              autoFocus
            />

            <View style={styles.noteActions}>
              <Pressable
                onPress={() => setEditingHighlight(null)}
                style={[styles.noteButton, { backgroundColor: theme.surfaceElevated }]}
              >
                <Text style={[textStyles.body, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveNote}
                style={[styles.noteButton, { backgroundColor: theme.primary }]}
              >
                <Text style={[textStyles.body, { color: '#FFFFFF', fontWeight: '600' }]}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Quote card preview */}
      <QuotePreviewModal
        visible={isQuotePreviewVisible}
        quoteData={quoteData}
        onDismiss={handleDismissQuote}
      />
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
  searchContainer: {
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  searchInput: {
    height: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  highlightCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  noteContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  addNoteButton: {
    marginTop: spacing.xs,
    paddingVertical: 4,
  },
  highlightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  shareChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginRight: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  noteEditor: {
    width: '85%',
    maxWidth: 400,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  noteInput: {
    height: 120,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  noteActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  noteButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  noteText: {
    marginLeft: spacing.sm,
    fontStyle: 'italic',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
    marginRight: spacing.md,
  },
});
