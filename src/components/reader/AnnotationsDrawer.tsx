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
      style={[styles.annotationItem, { borderLeftColor: theme.primary }]}
    >
      <View style={styles.annotationHeader}>
        <View style={styles.itemHeader}>
          <Ionicons name="bookmark" size={14} color={theme.primary} style={styles.itemTypeIcon} />
          <Text style={[textStyles.caption, { color: theme.primary }]}>Bookmark</Text>
        </View>
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
          <View style={styles.itemHeader}>
            <Ionicons 
              name={isQuote ? 'chatbubble-outline' : 'brush-outline'} 
              size={14} 
              color={colorHex} 
              style={styles.itemTypeIcon} 
            />
            <Text style={[textStyles.caption, { color: colorHex }]}>
              {isQuote ? 'Quote' : 'Highlight'}
            </Text>
          </View>
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
            <View style={styles.noteContainer}>
              <Ionicons name="chatbubble-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.noteText, { color: theme.textSecondary }]}>{item.note}</Text>
            </View>
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
                <Ionicons name="close" size={24} color={theme.textSecondary} />
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
                <View style={styles.tabContent}>
                  <Ionicons 
                    name="brush-outline" 
                    size={16} 
                    color={activeTab === 'quotes' ? theme.primary : theme.textSecondary} 
                    style={styles.tabIcon} 
                  />
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
                </View>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab('bookmarks')}
                style={[
                  styles.tab,
                  activeTab === 'bookmarks' && { borderBottomColor: theme.primary },
                ]}
              >
                <View style={styles.tabContent}>
                  <Ionicons 
                    name="bookmark-outline" 
                    size={16} 
                    color={activeTab === 'bookmarks' ? theme.primary : theme.textSecondary} 
                    style={styles.tabIcon} 
                  />
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
                </View>
              </Pressable>
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
  closeButtonContainer: {
    padding: spacing.sm,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabIcon: {
    marginRight: spacing.xs,
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
