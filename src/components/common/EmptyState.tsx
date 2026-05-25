/**
 * EmptyState - Beautiful empty state for when no books exist
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../theme/themes';
import { textStyles } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({
  icon = '📚',
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
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[textStyles.title, styles.title, { color: theme.textPrimary }]}>
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
    fontSize: 64,
    marginBottom: spacing.xl,
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
