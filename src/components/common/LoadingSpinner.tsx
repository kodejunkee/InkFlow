/**
 * LoadingSpinner - Animated loading indicator
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../theme/themes';
import { textStyles } from '../../theme/typography';

interface LoadingSpinnerProps {
  size?: number;
  message?: string;
}

export function LoadingSpinner({ size = 48, message }: LoadingSpinnerProps) {
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);
  const rotation = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Continuous rotation
    const spin = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1200,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      })
    );
    spin.start();

    return () => spin.stop();
  }, []);

  const rotateInterpolation = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: theme.border,
            borderTopColor: theme.primary,
            transform: [{ rotate: rotateInterpolation }],
          },
        ]}
      />
      {message && (
        <Animated.Text
          style={[
            textStyles.bodySmall,
            styles.message,
            { color: theme.textSecondary },
          ]}
        >
          {message}
        </Animated.Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  spinner: {
    borderWidth: 3,
  },
  message: {
    marginTop: 16,
  },
});
