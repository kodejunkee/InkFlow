/**
 * Chapter Drawer — Slide-out table of contents panel
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { TocItem } from '../../types/reader';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../theme/themes';
import { textStyles } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { Ionicons } from '@expo/vector-icons';

interface ChapterDrawerProps {
  visible: boolean;
  toc: TocItem[];
  currentChapterIndex: number;
  onSelectChapter: (href: string) => void;
  onClose: () => void;
}

export function ChapterDrawer({
  visible,
  toc,
  currentChapterIndex,
  onSelectChapter,
  onClose,
}: ChapterDrawerProps) {
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredToc = useMemo(() => {
    if (!searchQuery.trim()) {
      return toc.map((item, index) => ({ item, index }));
    }
    const q = searchQuery.toLowerCase();
    return toc
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => {
        const label = item.label || `Chapter ${index + 1}`;
        return label.toLowerCase().includes(q);
      });
  }, [toc, searchQuery]);

  const renderChapter = ({ item: { item, index } }: { item: { item: TocItem; index: number } }) => {
    const isCurrent = index === currentChapterIndex;

    return (
      <Pressable
        onPress={() => {
          onSelectChapter(item.href);
          onClose();
        }}
        style={({ pressed }) => [
          styles.chapterItem,
          pressed && { backgroundColor: theme.surfaceHighlight || 'rgba(128,128,128,0.1)' }
        ]}
      >
        <Text
          style={[
            textStyles.body,
            {
              color: isCurrent ? theme.primary : theme.textPrimary,
              fontWeight: isCurrent ? '600' : '400',
            },
          ]}
          numberOfLines={2}
        >
          {item.label || `Chapter ${index + 1}`}
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => setSearchQuery('')}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <SafeAreaView style={styles.drawerWrapper}>
          <Pressable
            style={[
              styles.drawer,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.drawerHeader}>
              <View style={styles.dragIndicator} />
              <View style={styles.headerRow}>
                <Text style={[textStyles.h2, { color: theme.textPrimary }]}>
                  Chapters
                </Text>
                <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </Pressable>
              </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <View style={[styles.searchBox, { backgroundColor: theme.surfaceElevated || 'rgba(128,128,128,0.1)' }]}>
                <Ionicons name="search" size={18} color={theme.textSecondary} />
                <TextInput
                  style={[textStyles.body, styles.searchInput, { color: theme.textPrimary }]}
                  placeholder="Search chapters..."
                  placeholderTextColor={theme.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Chapter list */}
            {filteredToc.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search" size={48} color={theme.textTertiary} style={{ marginBottom: spacing.md }} />
                <Text style={[textStyles.body, { color: theme.textSecondary, textAlign: 'center' }]}>
                  No chapters found.
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredToc}
                keyExtractor={({ item, index }) => item.id || `ch-${index}`}
                renderItem={renderChapter}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                initialScrollIndex={
                  !searchQuery && currentChapterIndex > 0 && currentChapterIndex < toc.length
                    ? currentChapterIndex
                    : undefined
                }
                getItemLayout={(_, index) => ({
                  length: 56,
                  offset: 56 * index,
                  index,
                })}
                keyboardShouldPersistTaps="handled"
              />
            )}
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  drawerWrapper: {
    height: '90%',
  },
  drawer: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    flex: 1,
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
  listContent: {
    paddingBottom: spacing.xl,
  },
  chapterItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.1)',
    minHeight: 56,
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: borderRadius.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    padding: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 3,
    paddingHorizontal: spacing.xl,
  },
});
