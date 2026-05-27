/**
 * InkFlow Color System
 * 
 * Curated color palettes for light, dark, and sepia themes.
 * HSL-based for precise control. Inspired by Kindle, Apple Books, and modern reading apps.
 */

export const palette = {
  // Brand colors
  ink: {
    50: '#F0F4FF',
    100: '#DDE6FF',
    200: '#B3C7FF',
    300: '#809FFF',
    400: '#5C7FFF',
    500: '#3D5AFE', // Primary brand
    600: '#2844E5',
    700: '#1E33B8',
    800: '#16258A',
    900: '#0F1A5C',
  },

  // Neutral grays
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
    950: '#121212',
  },

  // Sepia tones
  sepia: {
    bg: '#F4ECD8',
    surface: '#EDE3CC',
    text: '#5B4636',
    textSecondary: '#7D6652',
    accent: '#8B6914',
    border: '#D4C4A8',
  },

  // Ocean / Slate tones ("Sepia Blue")
  ocean: {
    bg: '#141E28',
    surface: '#1A2633',
    text: '#D1E0E8',
    textSecondary: '#9AABB8',
    accent: '#5E93C5',
    border: '#2A3C4D',
  },

  // Semantic colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  // Highlight colors for annotations
  highlight: {
    yellow: '#FFEB3B',
    blue: '#64B5F6',
    green: '#81C784',
    pink: '#F48FB1',
    orange: '#FFB74D',
  },

  // Pure
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type HighlightColor = keyof typeof palette.highlight;
