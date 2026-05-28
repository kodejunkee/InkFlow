/**
 * InkFlow - Root Layout
 *
 * Initializes the database, provides it via context, and sets up navigation.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import type * as SQLite from 'expo-sqlite';
import { useDatabase } from '../src/hooks/useDatabase';
import { useSettingsStore } from '../src/stores/settingsStore';
import { getTheme } from '../src/theme/themes';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

// ─── Database Context ────────────────────────────────────────────────────────

const DatabaseContext = createContext<SQLite.SQLiteDatabase | null>(null);

/** Access the initialised database instance from any screen. */
export function useDB(): SQLite.SQLiteDatabase | null {
  return useContext(DatabaseContext);
}

// ─── Root Layout ─────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const { db, isLoading: dbLoading, error: dbError } = useDatabase();
  const themeName = useSettingsStore((state) => state.theme);
  const theme = getTheme(themeName);

  useEffect(() => {
    if (!dbLoading && db) {
      setAppReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [dbLoading, db]);

  if (!appReady) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DatabaseContext.Provider value={db}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="reader/[bookId]"
            options={{
              animation: 'fade',
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="bookmarks/[bookId]"
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="highlights/[bookId]"
            options={{ animation: 'slide_from_bottom' }}
          />
        </Stack>
      </DatabaseContext.Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
