/**
 * Chapter Drawer — Slide-out table of contents panel
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { TocItem } from '../../types/reader';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../theme/themes';
import { textStyles } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

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

  const renderChapter = ({ item, index }: { item: TocItem; index: number }) => {
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
                <Text style={[styles.closeButton, { color: theme.textSecondary }]}>
                  ✕
                </Text>
              </Pressable>
            </View>

            {/* Chapter list */}
            <FlatList
              data={toc}
              keyExtractor={(item, idx) => item.id || `ch-${idx}`}
              renderItem={renderChapter}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              initialScrollIndex={
                currentChapterIndex > 0 && currentChapterIndex < toc.length
                  ? currentChapterIndex
                  : undefined
              }
              getItemLayout={(_, index) => ({
                length: 56,
                offset: 56 * index,
                index,
              })}
            />
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
  closeButton: {
    fontSize: 20,
    padding: 4,
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
});
