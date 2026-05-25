/**
 * InkFlow Typography System
 *
 * Uses Inter for UI and system fonts.
 * Merriweather reserved for reader content and quote cards.
 */

import { TextStyle } from 'react-native';

export const fontFamilies = {
  ui: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  reader: {
    regular: 'Merriweather_400Regular',
    bold: 'Merriweather_700Bold',
  },
} as const;

/**
 * Type scale following a modular scale (1.250 ratio)
 */
export const typeScale = {
  /** 10px - Smallest labels */
  xs: {
    fontSize: 10,
    lineHeight: 14,
  },
  /** 12px - Captions, timestamps */
  sm: {
    fontSize: 12,
    lineHeight: 16,
  },
  /** 14px - Secondary text, metadata */
  base: {
    fontSize: 14,
    lineHeight: 20,
  },
  /** 16px - Body text */
  md: {
    fontSize: 16,
    lineHeight: 24,
  },
  /** 18px - Subtitles */
  lg: {
    fontSize: 18,
    lineHeight: 26,
  },
  /** 22px - Section titles */
  xl: {
    fontSize: 22,
    lineHeight: 28,
  },
  /** 28px - Screen titles */
  '2xl': {
    fontSize: 28,
    lineHeight: 34,
  },
  /** 34px - Hero text */
  '3xl': {
    fontSize: 34,
    lineHeight: 40,
  },
} as const;

/**
 * Pre-composed text styles for common UI patterns
 */
export const textStyles: Record<string, TextStyle> = {
  caption: {
    fontFamily: fontFamilies.ui.regular,
    ...typeScale.sm,
    letterSpacing: 0.2,
  },
  bodySmall: {
    fontFamily: fontFamilies.ui.regular,
    ...typeScale.base,
  },
  body: {
    fontFamily: fontFamilies.ui.regular,
    ...typeScale.md,
  },
  bodyMedium: {
    fontFamily: fontFamilies.ui.medium,
    ...typeScale.md,
  },
  subtitle: {
    fontFamily: fontFamilies.ui.medium,
    ...typeScale.lg,
  },
  title: {
    fontFamily: fontFamilies.ui.semibold,
    ...typeScale.xl,
  },
  headline: {
    fontFamily: fontFamilies.ui.bold,
    ...typeScale['2xl'],
  },
  hero: {
    fontFamily: fontFamilies.ui.bold,
    ...typeScale['3xl'],
    letterSpacing: -0.5,
  },
};
