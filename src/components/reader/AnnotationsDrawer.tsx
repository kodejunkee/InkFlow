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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Bookmark, Highlight } from '../../types/book';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../theme/themes';
import { textStyles } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { Ionicons } from '@expo/vector-icons';

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
      style={({ pressed }) => [
        styles.annotationItem,
        pressed && { backgroundColor: theme.surfaceHighlight || 'rgba(128,128,128,0.1)' }
      ]}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemTypeRow}>
          <View style={[styles.colorDot, { backgroundColor: theme.primary }]} />
          <Text style={[textStyles.caption, { color: theme.textSecondary, fontWeight: '600' }]}>Bookmark</Text>
        </View>
        <Text style={[textStyles.caption, { color: theme.textSecondary, opacity: 0.7 }]}>
          {formatDate(item.createdAt)}
        </Text>
      </View>
      <Text style={[textStyles.body, { color: theme.textPrimary, fontWeight: '500', marginBottom: 4 }]} numberOfLines={2}>
        {item.label || item.chapterTitle}
      </Text>
      <Text style={[textStyles.caption, { color: theme.textSecondary }]} numberOfLines={1}>
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
        style={({ pressed }) => [
          styles.annotationItem,
          pressed && { backgroundColor: theme.surfaceHighlight || 'rgba(128,128,128,0.1)' }
        ]}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemTypeRow}>
            <View style={[styles.colorDot, { backgroundColor: colorHex }]} />
            <Text style={[textStyles.caption, { color: theme.textSecondary, fontWeight: '600' }]}>
              {isQuote ? 'Quote' : 'Highlight'}
            </Text>
          </View>
          <Text style={[textStyles.caption, { color: theme.textSecondary, opacity: 0.7 }]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>

        <View style={styles.quoteBlock}>
          <Text
            style={[textStyles.body, { color: theme.textPrimary, lineHeight: 24 }]}
            numberOfLines={4}
          >
            "{item.selectedText}"
          </Text>
        </View>

        {item.note ? (
          <View style={[styles.noteContainer, { backgroundColor: theme.surfaceElevated || 'rgba(128,128,128,0.05)' }]}>
            <Ionicons name="create-outline" size={16} color={theme.primary} style={{ marginTop: 2 }} />
            <Text style={[textStyles.body, { color: theme.textSecondary, flex: 1, marginLeft: 8 }]} numberOfLines={3}>
              {item.note}
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
          <Ionicons name="book-outline" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[textStyles.caption, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.chapterTitle}
          </Text>
        </View>
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
            <View style={styles.drawerHeader}>
              <View style={styles.dragIndicator} />
              <View style={styles.headerRow}>
                <Text style={[textStyles.h2, { color: theme.textPrimary }]}>Saved</Text>
                <Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}>
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </Pressable>
              </View>
            </View>

            {/* Segmented Control Tabs */}
            <View style={styles.tabContainer}>
              <View style={[styles.tabBg, { backgroundColor: theme.surfaceElevated || 'rgba(128,128,128,0.1)' }]}>
                <Pressable
                  onPress={() => setActiveTab('quotes')}
                  style={({ pressed }) => [styles.tabSegment, activeTab === 'quotes' && { backgroundColor: theme.surface }, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[textStyles.body, { 
                    color: activeTab === 'quotes' ? theme.primary : theme.textSecondary,
                    fontWeight: activeTab === 'quotes' ? '600' : '400',
                  }]}>
                    Highlights ({highlights.length})
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setActiveTab('bookmarks')}
                  style={({ pressed }) => [styles.tabSegment, activeTab === 'bookmarks' && { backgroundColor: theme.surface }, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[textStyles.body, { 
                    color: activeTab === 'bookmarks' ? theme.primary : theme.textSecondary,
                    fontWeight: activeTab === 'bookmarks' ? '600' : '400',
                  }]}>
                    Bookmarks ({bookmarks.length})
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Content */}
            {isEmpty ? (
              <View style={styles.emptyState}>
                <Ionicons 
                  name={activeTab === 'bookmarks' ? 'bookmark-outline' : 'chatbubbles-outline'} 
                  size={48} 
                  color={theme.textTertiary} 
                  style={{ marginBottom: spacing.md }} 
                />
                <Text style={[textStyles.body, { color: theme.textSecondary, textAlign: 'center' }]}>
                  {activeTab === 'bookmarks'
                    ? 'No bookmarks yet.\nTap the bookmark icon in the header to add one.'
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
    maxHeight: '90%',
  },
  drawer: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '100%',
    paddingTop: spacing.xs,
  },
  drawerHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(128,128,128,0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeBtn: {
    padding: spacing.xs,
    backgroundColor: 'rgba(128,128,128,0.1)',
    borderRadius: 20,
  },
  tabContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  tabBg: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: 4,
  },
  tabSegment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  listContent: {
    paddingBottom: spacing['2xl'],
  },
  annotationItem: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  itemTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  quoteBlock: {
    marginBottom: spacing.sm,
  },
  noteContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    alignItems: 'flex-start',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 3,
    paddingHorizontal: spacing.xl,
  },
});
