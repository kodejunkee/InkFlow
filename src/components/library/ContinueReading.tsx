/**
 * ContinueReading - Hero card for the last opened book
 *
 * Shows a large cover, title, author, chapter, and progress.
 * Appears at the top of the library when a book has been opened before.
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../theme/themes';
import { textStyles } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { type Book } from '../../types/book';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface ContinueReadingProps {
  book: Book;
  onPress: () => void;
}

export function ContinueReading({ book, onPress }: ContinueReadingProps) {
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  const progressPercent = Math.round(book.progress * 100);

  return (
    <View style={styles.wrapper}>
      <Text style={[textStyles.caption, styles.sectionLabel, { color: theme.textSecondary }]}>
        CONTINUE READING
      </Text>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.card,
            shadows.lg,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.cardBorder,
            },
          ]}
        >
          {/* Cover thumbnail */}
          <View style={styles.coverContainer}>
            {book.coverUri ? (
              <Image
                source={{ uri: book.coverUri }}
                style={styles.cover}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.cover, styles.placeholder, { backgroundColor: theme.surfaceElevated }]}>
                <Text style={styles.placeholderIcon}>📖</Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text
              style={[textStyles.subtitle, { color: theme.textPrimary }]}
              numberOfLines={2}
            >
              {book.title}
            </Text>
            <Text
              style={[textStyles.bodySmall, { color: theme.textSecondary, marginTop: 2 }]}
              numberOfLines={1}
            >
              {book.author}
            </Text>

            {book.lastChapterTitle && (
              <Text
                style={[textStyles.caption, styles.chapter, { color: theme.textTertiary }]}
                numberOfLines={1}
              >
                {book.lastChapterTitle}
              </Text>
            )}

            {/* Progress bar */}
            <View style={styles.progressSection}>
              <View style={[styles.progressTrack, { backgroundColor: theme.progressTrack }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: theme.progressFill,
                    },
                  ]}
                />
              </View>
              <Text style={[textStyles.caption, { color: theme.textTertiary }]}>
                {progressPercent}%
              </Text>
            </View>
          </View>

          {/* Continue arrow */}
          <View style={styles.arrowContainer}>
            <Text style={[styles.arrow, { color: theme.primary }]}>›</Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    letterSpacing: 1.5,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    padding: spacing.md,
  },
  coverContainer: {
    width: 72,
    height: 108,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    ...shadows.md,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 24,
  },
  info: {
    flex: 1,
    marginLeft: spacing.lg,
    justifyContent: 'center',
  },
  chapter: {
    marginTop: spacing.sm,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  arrowContainer: {
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
  arrow: {
    fontSize: 28,
    fontWeight: '300',
  },
});
