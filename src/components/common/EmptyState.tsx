/**
 * EmptyState - Beautiful empty state for when no books exist
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSettingsStore } from '../../stores/settingsStore';
import { Ionicons } from '@expo/vector-icons';
import { getTheme } from '../../theme/themes';
import { textStyles } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

export function EmptyState({
  icon = 'library-outline',
  title,
  subtitle,
}: EmptyStateProps) {
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Ionicons name={icon} size={64} color={theme.textTertiary} style={styles.icon} />
      <Text style={[textStyles.h2, { color: theme.textPrimary, marginBottom: spacing.xs }]}>
        {title}
      </Text>
      {subtitle && (
        <Text
          style={[textStyles.body, styles.subtitle, { color: theme.textSecondary }]}
        >
          {subtitle}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  icon: {
    marginBottom: spacing.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 280,
  },
});
