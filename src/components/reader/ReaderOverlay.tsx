/**
 * Reader Overlay — Header + Footer bars that appear on tap
 *
 * Shows book title, chapter, progress, and action buttons.
 * Slides in/out with animation.
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import { useSettingsStore } from '../../stores/settingsStore';
import { useReaderStore } from '../../stores/readerStore';
import { getTheme } from '../../theme/themes';
import { textStyles } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Ionicons } from '@expo/vector-icons';

interface ReaderOverlayProps {
  visible: boolean;
  bookTitle: string;
  chapterTitle: string;
  progress: number;
  isBookmarked: boolean;
  onBack: () => void;
  onChapters: () => void;
  onAnnotations: () => void;
  onBookmark: () => void;
  onSettings: () => void;
}

export function ReaderOverlay({
  visible,
  bookTitle,
  chapterTitle,
  progress,
  isBookmarked,
  onBack,
  onChapters,
  onAnnotations,
  onBookmark,
  onSettings,
}: ReaderOverlayProps) {
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);

  const slideAnim = React.useRef(new Animated.Value(visible ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  const headerTranslate = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 0],
  });

  const footerTranslate = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  const progressPercent = Math.round(progress * 100);

  if (!visible) return null;

  return (
    <>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            backgroundColor: theme.surface + 'F0',
            borderBottomColor: theme.border,
            transform: [{ translateY: headerTranslate }],
          },
        ]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <StatusBar
          barStyle={theme.isDark ? 'light-content' : 'dark-content'}
          translucent
        />
        <Pressable onPress={onBack} hitSlop={12} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text
            style={[textStyles.bodySmall, { color: theme.textPrimary, fontWeight: '600' }]}
            numberOfLines={1}
          >
            {bookTitle}
          </Text>
          {chapterTitle ? (
            <Text
              style={[textStyles.caption, { color: theme.textSecondary, marginTop: 2 }]}
              numberOfLines={1}
            >
              {chapterTitle}
            </Text>
          ) : null}
        </View>

        <Pressable onPress={onBookmark} hitSlop={12} style={styles.headerButton}>
          <Ionicons 
            name={isBookmarked ? "bookmark" : "bookmark-outline"} 
            size={24} 
            color={theme.primary} 
          />
        </Pressable>
      </Animated.View>

      {/* Footer */}
      <Animated.View
        style={[
          styles.footer,
          {
            backgroundColor: theme.surface + 'F0',
            borderTopColor: theme.border,
            transform: [{ translateY: footerTranslate }],
          },
        ]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View
            style={[styles.progressTrack, { backgroundColor: theme.progressTrack }]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: theme.progressFill,
                  width: `${progressPercent}%`,
                },
              ]}
            />
          </View>
          <Text style={[textStyles.caption, { color: theme.textSecondary }]}>
            {progressPercent}%
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.footerActions}>
          <Pressable onPress={onChapters} style={styles.footerButton}>
            <Ionicons name="list-outline" size={24} color={theme.textSecondary} />
            <Text style={[textStyles.caption, { color: theme.textSecondary }]}>
              Chapters
            </Text>
          </Pressable>

          <Pressable onPress={onAnnotations} style={styles.footerButton}>
            <Ionicons name="chatbubbles-outline" size={24} color={theme.textSecondary} />
            <Text style={[textStyles.caption, { color: theme.textSecondary }]}>
              Notes
            </Text>
          </Pressable>

          <Pressable onPress={onSettings} style={styles.footerButton}>
            <Ionicons name="settings-outline" size={24} color={theme.textSecondary} />
            <Text style={[textStyles.caption, { color: theme.textSecondary }]}>
              Settings
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 48,
    paddingBottom: 12,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  headerButton: {
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  buttonText: {
    fontSize: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    zIndex: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  footerButton: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: spacing.lg,
  },
  footerIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
});
