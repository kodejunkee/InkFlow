/**
 * Annotations Drawer — View bookmarks, quotes, and highlights for the current book
 *
 * Shows two tabs: Bookmarks and Quotes/Highlights.
 * Tapping an item navigates to that exact position in the book.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import type { Bookmark, Highlight } from '../../types/book';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../theme/themes';
import { textStyles } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

type Tab = 'bookmarks' | 'quotes';

interface AnnotationsDrawerProps {
  visible: boolean;
  bookmarks: Bookmark[];
  highlights: Highlight[];
  onGoToBookmark: (cfi: string) => void;
  onGoToHighlight: (cfiRange: string) => void;
  onDeleteBookmark: (id: number) => void;
  onDeleteHighlight: (id: number) => void;
  onClose: () => void;
}

const HIGHLIGHT_HEX: Record<string, string> = {
  yellow: '#FFEB3B',
  green: '#4CAF50',
  blue: '#42A5F5',
  pink: '#F06292',
  orange: '#FFA726',
};

export function AnnotationsDrawer({
  visible,
  bookmarks,
  highlights,
  onGoToBookmark,
  onGoToHighlight,
  onDeleteBookmark,
  onDeleteHighlight,
  onClose,
}: AnnotationsDrawerProps) {
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);
  const [activeTab, setActiveTab] = useState<Tab>('quotes');

  // Quotes = highlights that have notes. Plain highlights shown separately below.
  const quotes = useMemo(() => highlights.filter((h) => h.note), [highlights]);
  const plainHighlights = useMemo(() => highlights.filter((h) => !h.note), [highlights]);

  const renderBookmark = ({ item }: { item: Bookmark }) => (
    <Pressable
      onPress={() => {
        onGoToBookmark(item.cfi);
        onClose();
      }}
      onLongPress={() => onDeleteBookmark(item.id)}
      style={[styles.annotationItem, { borderLeftColor: theme.primary }]}
    >
      <View style={styles.annotationHeader}>
        <Text style={[textStyles.caption, { color: theme.primary }]}>🔖 Bookmark</Text>
        <Text style={[textStyles.caption, { color: theme.textSecondary, fontSize: 11 }]}>
          {formatDate(item.createdAt)}
        </Text>
      </View>
      <Text
        style={[textStyles.body, { color: theme.textPrimary, marginTop: 2 }]}
        numberOfLines={1}
      >
        {item.label || item.chapterTitle}
      </Text>
      <Text
        style={[textStyles.caption, { color: theme.textSecondary, marginTop: 2 }]}
        numberOfLines={1}
      >
        {item.chapterTitle}
      </Text>
    </Pressable>
  );

  const renderHighlight = ({ item }: { item: Highlight }) => {
    const colorHex = HIGHLIGHT_HEX[item.color] || HIGHLIGHT_HEX.yellow;
    const isQuote = !!item.note;

    return (
      <Pressable
        onPress={() => {
          onGoToHighlight(item.cfiRange);
          onClose();
        }}
        onLongPress={() => onDeleteHighlight(item.id)}
        style={[styles.annotationItem, { borderLeftColor: colorHex }]}
      >
        <View style={styles.annotationHeader}>
          <Text style={[textStyles.caption, { color: colorHex }]}>
            {isQuote ? '💬 Quote' : '🖍️ Highlight'}
          </Text>
          <Text style={[textStyles.caption, { color: theme.textSecondary, fontSize: 11 }]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        <Text
          style={[
            textStyles.body,
            { color: theme.textPrimary, marginTop: 4, fontStyle: 'italic' },
          ]}
          numberOfLines={3}
        >
          "{item.selectedText}"
        </Text>
        {item.note ? (
          <View
            style={[styles.notePreview, { backgroundColor: theme.primaryLight || theme.background }]}
          >
            <Text
              style={[textStyles.caption, { color: theme.textSecondary }]}
              numberOfLines={2}
            >
              📝 {item.note}
            </Text>
          </View>
        ) : null}
        <Text
          style={[textStyles.caption, { color: theme.textSecondary, marginTop: 2 }]}
          numberOfLines={1}
        >
          {item.chapterTitle}
        </Text>
      </Pressable>
    );
  };

  const allAnnotations = activeTab === 'bookmarks' ? [] : [...quotes, ...plainHighlights];
  const isEmpty =
    activeTab === 'bookmarks' ? bookmarks.length === 0 : allAnnotations.length === 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <SafeAreaView style={styles.drawerWrapper}>
          <Pressable
            style={[styles.drawer, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={[styles.drawerHeader, { borderBottomColor: theme.border }]}>
              <Text style={[textStyles.title, { color: theme.textPrimary }]}>Annotations</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={[styles.closeButton, { color: theme.textSecondary }]}>✕</Text>
              </Pressable>
            </View>

            {/* Tabs */}
            <View style={[styles.tabRow, { borderBottomColor: theme.border }]}>
              <Pressable
                onPress={() => setActiveTab('quotes')}
                style={[
                  styles.tab,
                  activeTab === 'quotes' && { borderBottomColor: theme.primary },
                ]}
              >
                <Text
                  style={[
                    textStyles.bodySmall,
                    {
                      color: activeTab === 'quotes' ? theme.primary : theme.textSecondary,
                      fontWeight: activeTab === 'quotes' ? '600' : '400',
                    },
                  ]}
                >
                  Quotes & Highlights ({highlights.length})
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab('bookmarks')}
                style={[
                  styles.tab,
                  activeTab === 'bookmarks' && { borderBottomColor: theme.primary },
                ]}
              >
                <Text
                  style={[
                    textStyles.bodySmall,
                    {
                      color: activeTab === 'bookmarks' ? theme.primary : theme.textSecondary,
                      fontWeight: activeTab === 'bookmarks' ? '600' : '400',
                    },
                  ]}
                >
                  Bookmarks ({bookmarks.length})
                </Text>
              </Pressable>
            </View>

            {/* Content */}
            {isEmpty ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 32, marginBottom: spacing.md }}>
                  {activeTab === 'bookmarks' ? '🔖' : '💬'}
                </Text>
                <Text style={[textStyles.body, { color: theme.textSecondary, textAlign: 'center' }]}>
                  {activeTab === 'bookmarks'
                    ? 'No bookmarks yet.\nTap the 🔖 icon in the header to add one.'
                    : 'No quotes or highlights yet.\nSelect text and tap Quote or a color to add one.'}
                </Text>
              </View>
            ) : activeTab === 'bookmarks' ? (
              <FlatList
                data={bookmarks}
                keyExtractor={(item) => `bm-${item.id}`}
                renderItem={renderBookmark}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            ) : (
              <FlatList
                data={allAnnotations}
                keyExtractor={(item) => `hl-${item.id}`}
                renderItem={renderHighlight}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            )}

            {/* Hint */}
            <Text
              style={[
                textStyles.caption,
                { color: theme.textSecondary, textAlign: 'center', padding: spacing.sm, opacity: 0.6 },
              ]}
            >
              Long press to delete
            </Text>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  drawerWrapper: {
    maxHeight: '80%',
  },
  drawer: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '100%',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    fontSize: 20,
    padding: 4,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  listContent: {
    paddingBottom: spacing.md,
  },
  annotationItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderLeftWidth: 3,
  },
  annotationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notePreview: {
    marginTop: 6,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.xl,
  },
});
