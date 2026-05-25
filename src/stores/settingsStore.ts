import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ReaderTheme } from '../types/reader';

// ─── State shape ─────────────────────────────────────────────────────────────

interface SettingsState {
  theme: ReaderTheme;
  fontSize: number;
  lineHeight: number;
  margins: number;
}

interface SettingsActions {
  setTheme: (theme: ReaderTheme) => void;
  setFontSize: (size: number) => void;
  setLineHeight: (height: number) => void;
  setMargins: (margins: number) => void;
  resetDefaults: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: SettingsState = {
  theme: 'dark',
  fontSize: 18,
  lineHeight: 1.8,
  margins: 16,
};

// ─── Constraints ─────────────────────────────────────────────────────────────

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 32;
const MIN_LINE_HEIGHT = 1.0;
const MAX_LINE_HEIGHT = 3.0;
const MIN_MARGINS = 0;
const MAX_MARGINS = 48;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setTheme: (theme) => set({ theme }),

      setFontSize: (size) =>
        set({ fontSize: clamp(size, MIN_FONT_SIZE, MAX_FONT_SIZE) }),

      setLineHeight: (height) =>
        set({
          lineHeight: clamp(height, MIN_LINE_HEIGHT, MAX_LINE_HEIGHT),
        }),

      setMargins: (margins) =>
        set({ margins: clamp(margins, MIN_MARGINS, MAX_MARGINS) }),

      resetDefaults: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'inkflow-settings',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the data fields, not the action functions.
      partialize: (state) => ({
        theme: state.theme,
        fontSize: state.fontSize,
        lineHeight: state.lineHeight,
        margins: state.margins,
      }),
    },
  ),
);
