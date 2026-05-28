/**
 * InkFlow Theme Definitions
 *
 * Complete theme objects for light, dark, and sepia modes.
 * Each theme defines colors for backgrounds, surfaces, text, and reader-specific styling.
 */

import { palette } from './colors';

export interface AppTheme {
  name: 'light' | 'dark' | 'sepia' | 'ocean';
  isDark: boolean;

  // Backgrounds
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceHighlight?: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Interactive
  primary: string;
  primaryLight: string;
  accent: string;

  // Borders & dividers
  border: string;
  divider: string;

  // Status bar
  statusBarStyle: 'light-content' | 'dark-content';

  // Card
  cardBackground: string;
  cardBorder: string;

  // Overlay
  overlayBackground: string;
  overlayText: string;

  // Progress
  progressTrack: string;
  progressFill: string;

  // Reader-specific
  reader: {
    background: string;
    text: string;
    link: string;
    selectionBackground: string;
  };

  // Navigation bar
  tabBarBackground: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
}

export const lightTheme: AppTheme = {
  name: 'light',
  isDark: false,

  background: '#F9F9F9',
  surface: palette.white,
  surfaceElevated: palette.white,
  surfaceHighlight: 'rgba(0,0,0,0.05)',

  textPrimary: palette.gray[900],
  textSecondary: palette.gray[600],
  textTertiary: palette.gray[400],
  textInverse: palette.white,

  primary: palette.ink[500],
  primaryLight: palette.ink[50],
  accent: palette.ink[400],

  border: palette.gray[200],
  divider: palette.gray[100],

  statusBarStyle: 'dark-content',

  cardBackground: palette.white,
  cardBorder: palette.gray[100],

  overlayBackground: 'rgba(0, 0, 0, 0.5)',
  overlayText: palette.white,

  progressTrack: palette.gray[200],
  progressFill: palette.ink[500],

  reader: {
    background: palette.white,
    text: '#1A1A1A',
    link: palette.ink[500],
    selectionBackground: 'rgba(61, 90, 254, 0.2)',
  },

  tabBarBackground: palette.white,
  tabBarBorder: palette.gray[200],
  tabBarActive: palette.ink[500],
  tabBarInactive: palette.gray[400],
};

export const darkTheme: AppTheme = {
  name: 'dark',
  isDark: true,

  background: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceElevated: '#242424',
  surfaceHighlight: 'rgba(255,255,255,0.05)',

  textPrimary: '#EAEAEA',
  textSecondary: '#A0A0A0',
  textTertiary: '#666666',
  textInverse: palette.gray[900],

  primary: palette.ink[400],
  primaryLight: 'rgba(61, 90, 254, 0.12)',
  accent: palette.ink[300],

  border: '#2A2A2A',
  divider: '#1F1F1F',

  statusBarStyle: 'light-content',

  cardBackground: '#1A1A1A',
  cardBorder: '#2A2A2A',

  overlayBackground: 'rgba(0, 0, 0, 0.7)',
  overlayText: palette.white,

  progressTrack: '#2A2A2A',
  progressFill: palette.ink[400],

  reader: {
    background: '#121212',
    text: '#CCCCCC',
    link: palette.ink[300],
    selectionBackground: 'rgba(128, 159, 255, 0.25)',
  },

  tabBarBackground: '#1A1A1A',
  tabBarBorder: '#2A2A2A',
  tabBarActive: palette.ink[400],
  tabBarInactive: '#666666',
};

export const sepiaTheme: AppTheme = {
  name: 'sepia',
  isDark: false,

  background: palette.sepia.bg,
  surface: palette.sepia.surface,
  surfaceElevated: '#F8F0DC',

  textPrimary: palette.sepia.text,
  textSecondary: palette.sepia.textSecondary,
  textTertiary: '#A09080',
  textInverse: palette.white,

  primary: palette.sepia.accent,
  primaryLight: 'rgba(139, 105, 20, 0.1)',
  accent: '#A07B1A',

  border: palette.sepia.border,
  divider: '#E0D4B8',

  statusBarStyle: 'dark-content',

  cardBackground: palette.sepia.surface,
  cardBorder: palette.sepia.border,

  overlayBackground: 'rgba(91, 70, 54, 0.5)',
  overlayText: palette.white,

  progressTrack: palette.sepia.border,
  progressFill: palette.sepia.accent,

  reader: {
    background: palette.sepia.bg,
    text: palette.sepia.text,
    link: palette.sepia.accent,
    selectionBackground: 'rgba(139, 105, 20, 0.2)',
  },

  tabBarBackground: palette.sepia.surface,
  tabBarBorder: palette.sepia.border,
  tabBarActive: palette.sepia.accent,
  tabBarInactive: '#A09080',
};

export const oceanTheme: AppTheme = {
  name: 'ocean',
  isDark: true,

  background: palette.ocean.bg,
  surface: palette.ocean.surface,
  surfaceElevated: '#1D2A38',

  textPrimary: palette.ocean.text,
  textSecondary: palette.ocean.textSecondary,
  textTertiary: '#768A9B',
  textInverse: palette.white,

  primary: palette.ocean.accent,
  primaryLight: 'rgba(94, 147, 197, 0.1)',
  accent: '#4A79A5',

  border: palette.ocean.border,
  divider: '#213040',

  statusBarStyle: 'light-content',

  cardBackground: palette.ocean.surface,
  cardBorder: palette.ocean.border,

  overlayBackground: 'rgba(20, 30, 40, 0.7)',
  overlayText: palette.white,

  progressTrack: palette.ocean.border,
  progressFill: palette.ocean.accent,

  reader: {
    background: palette.ocean.bg,
    text: palette.ocean.text,
    link: palette.ocean.accent,
    selectionBackground: 'rgba(94, 147, 197, 0.25)',
  },

  tabBarBackground: palette.ocean.surface,
  tabBarBorder: palette.ocean.border,
  tabBarActive: palette.ocean.accent,
  tabBarInactive: '#768A9B',
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
  sepia: sepiaTheme,
  ocean: oceanTheme,
} as const;

export type ThemeName = keyof typeof themes;

export function getTheme(name: ThemeName): AppTheme {
  return themes[name];
}
