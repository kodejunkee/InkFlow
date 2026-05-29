/**
 * NovelCard — Search result card for the Browse tab.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../theme/themes';
import { textStyles } from '../../theme/typography';

interface NovelCardProps {
  title: string;
  author: string;
  coverUrl: string;
  status: string;
  latestChapter: string;
  onPress: () => void;
}

export default function NovelCard({
  title,
  author,
  coverUrl,
  status,
  latestChapter,
  onPress,
}: NovelCardProps) {
  const theme = getTheme(useSettingsStore((s) => s.theme));
  const [imageError, setImageError] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const isOngoing = status?.toLowerCase() === 'ongoing';

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.cardBorder,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Cover */}
        <View style={[styles.coverContainer, { backgroundColor: theme.surfaceElevated }]}>
          {!imageError && coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={styles.cover}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="book-outline" size={28} color={theme.textTertiary} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text
            style={[textStyles.body, styles.title, { color: theme.textPrimary }]}
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text
            style={[textStyles.caption, { color: theme.textSecondary, marginTop: 2 }]}
            numberOfLines={1}
          >
            {author || 'Unknown Author'}
          </Text>

          {/* Status Badge */}
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isOngoing
                    ? 'rgba(76, 175, 80, 0.15)'
                    : 'rgba(158, 158, 158, 0.15)',
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isOngoing ? '#4CAF50' : '#9E9E9E' },
                ]}
              />
              <Text
                style={[
                  textStyles.caption,
                  {
                    color: isOngoing ? '#4CAF50' : '#9E9E9E',
                    fontSize: 10,
                    fontWeight: '600',
                  },
                ]}
              >
                {status || 'Unknown'}
              </Text>
            </View>
          </View>

          {latestChapter ? (
            <Text
              style={[textStyles.caption, { color: theme.textTertiary, marginTop: 4, fontSize: 11 }]}
              numberOfLines={1}
            >
              {latestChapter}
            </Text>
          ) : null}
        </View>

        {/* Chevron */}
        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.textTertiary}
          style={styles.chevron}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 5,
  },
  coverContainer: {
    width: 56,
    height: 80,
    borderRadius: 6,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  chevron: {
    marginLeft: 4,
  },
});
