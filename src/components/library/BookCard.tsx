/**
 * BookCard - Premium book card with cover, title, author, and progress
 * 
 * Features subtle shadow, press animation, and progress indicator.
 * Inspired by Kindle and Apple Books card designs.
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

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_MARGIN = spacing.sm;
const GRID_PADDING = spacing.lg;
const NUM_COLUMNS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - CARD_MARGIN * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const COVER_HEIGHT = CARD_WIDTH * 1.5;

interface BookCardProps {
  id: number;
  title: string;
  author: string;
  coverUri: string | null;
  progress: number;
  onPress: (id: number) => void;
  onLongPress?: (id: number) => void;
}

export function BookCard({
  id,
  title,
  author,
  coverUri,
  progress,
  onPress,
  onLongPress,
}: BookCardProps) {
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
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

  const progressPercent = Math.round(progress * 100);

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={() => onPress(id)}
        onLongPress={() => onLongPress?.(id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          {
            width: CARD_WIDTH,
            backgroundColor: theme.cardBackground,
            borderColor: theme.cardBorder,
          },
        ]}
      >
        {/* Cover image */}
        <View style={[styles.coverContainer, shadows.cover]}>
          {coverUri ? (
            <Image
              source={{ uri: coverUri }}
              style={styles.cover}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.cover, styles.placeholderCover, { backgroundColor: theme.surfaceElevated }]}>
              <Text style={styles.placeholderIcon}>📖</Text>
              <Text
                style={[textStyles.caption, { color: theme.textTertiary }]}
                numberOfLines={2}
              >
                {title}
              </Text>
            </View>
          )}

          {/* Progress overlay at bottom of cover */}
          {progress > 0 && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressTrack, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: theme.primary,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* Book info */}
        <View style={styles.info}>
          <Text
            style={[textStyles.bodySmall, styles.title, { color: theme.textPrimary }]}
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text
            style={[textStyles.caption, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {author}
          </Text>
          {progress > 0 && (
            <Text style={[textStyles.caption, styles.progressText, { color: theme.textTertiary }]}>
              {progressPercent}%
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export { CARD_WIDTH, NUM_COLUMNS, CARD_MARGIN, GRID_PADDING };

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  coverContainer: {
    width: '100%',
    height: COVER_HEIGHT,
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  placeholderIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  info: {
    padding: spacing.md,
  },
  title: {
    fontWeight: '600',
    marginBottom: 2,
  },
  progressText: {
    marginTop: 4,
  },
});
