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

interface HorizontalNovelCardProps {
  title: string;
  coverUrl: string;
  onPress: () => void;
}

export default function HorizontalNovelCard({
  title,
  coverUrl,
  onPress,
}: HorizontalNovelCardProps) {
  const theme = getTheme(useSettingsStore((s) => s.theme));
  const [imageError, setImageError] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
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

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.container}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {/* Cover */}
        <View style={[styles.coverContainer, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          {!imageError && coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={styles.cover}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="book-outline" size={32} color={theme.textTertiary} />
            </View>
          )}
          {/* Subtle gradient overlay to make it look premium (optional) */}
          <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.03)' }]} />
        </View>

        {/* Info */}
        <Text
          style={[textStyles.caption, styles.title, { color: theme.textPrimary }]}
          numberOfLines={2}
        >
          {title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 105,
    marginRight: 12,
  },
  coverContainer: {
    width: 105,
    height: 155,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 6,
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  title: {
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 16,
  },
});
