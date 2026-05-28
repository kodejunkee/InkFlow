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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput } from 'react-native-gesture-handler';
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
        style={[
          styles.chapterItem,
          {
            backgroundColor: isCurrent ? theme.primaryLight : 'transparent',
            borderLeftColor: isCurrent ? theme.primary : 'transparent',
          },
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
            <View style={[styles.drawerHeader, { borderBottomColor: theme.border }]}>
              <Text style={[textStyles.title, { color: theme.textPrimary }]}>
                Chapters
              </Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </Pressable>
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
    maxHeight: '75%',
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
  listContent: {
    paddingBottom: spacing.xl,
  },
  chapterItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderLeftWidth: 3,
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
