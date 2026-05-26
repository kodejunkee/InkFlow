/**
 * InkFlow Settings Screen
 *
 * Reader preferences: theme, font size, line spacing, margins.
 * Minimal, focused settings panel.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../src/stores/settingsStore';
import { getTheme, type ThemeName } from '../src/theme/themes';
import { textStyles } from '../src/theme/typography';
import { spacing, borderRadius } from '../src/theme/spacing';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    theme: themeName,
    fontSize,
    lineHeight,
    margins,
    setTheme,
    setFontSize,
    setLineHeight,
    setMargins,
  } = useSettingsStore();
  const theme = getTheme(themeName);

  const themeOptions: { name: ThemeName; label: string; bgColor: string; textColor: string }[] = [
    { name: 'light', label: 'Light', bgColor: '#FFFFFF', textColor: '#1A1A1A' },
    { name: 'dark', label: 'Dark', bgColor: '#121212', textColor: '#CCCCCC' },
    { name: 'sepia', label: 'Sepia', bgColor: '#F4ECD8', textColor: '#5B4636' },
  ];

  const fontSizeOptions = [14, 16, 18, 20, 22, 24];
  const lineHeightOptions = [1.4, 1.6, 1.8, 2.0, 2.2];
  const marginOptions = [8, 16, 24, 32];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.backButton, { color: theme.primary }]}>← Back</Text>
        </Pressable>
        <Text style={[textStyles.title, { color: theme.textPrimary }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Theme Selection */}
        <Text style={[textStyles.caption, styles.sectionTitle, { color: theme.textSecondary }]}>
          READING THEME
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.themeRow}>
            {themeOptions.map((opt) => (
              <Pressable
                key={opt.name}
                onPress={() => setTheme(opt.name)}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: opt.bgColor,
                    borderColor: themeName === opt.name ? theme.primary : theme.border,
                    borderWidth: themeName === opt.name ? 2 : 1,
                  },
                ]}
              >
                <Text style={[styles.themePreviewText, { color: opt.textColor }]}>Aa</Text>
                <Text style={[textStyles.caption, { color: opt.textColor }]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Font Size */}
        <Text style={[textStyles.caption, styles.sectionTitle, { color: theme.textSecondary }]}>
          FONT SIZE
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.optionRow}>
            {fontSizeOptions.map((size) => (
              <Pressable
                key={size}
                onPress={() => setFontSize(size)}
                style={[
                  styles.sizeOption,
                  {
                    backgroundColor: fontSize === size ? theme.primary : 'transparent',
                    borderColor: fontSize === size ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    textStyles.bodySmall,
                    {
                      color: fontSize === size ? '#FFFFFF' : theme.textPrimary,
                      fontWeight: fontSize === size ? '600' : '400',
                    },
                  ]}
                >
                  {size}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[textStyles.caption, styles.previewLabel, { color: theme.textTertiary }]}>
            Preview: {fontSize}px
          </Text>
          <Text
            style={{
              fontSize: fontSize,
              lineHeight: fontSize * lineHeight,
              color: theme.textPrimary,
              paddingHorizontal: spacing.md,
              paddingBottom: spacing.md,
            }}
          >
            The quick brown fox jumps over the lazy dog.
          </Text>
        </View>

        {/* Line Spacing */}
        <Text style={[textStyles.caption, styles.sectionTitle, { color: theme.textSecondary }]}>
          LINE SPACING
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.optionRow}>
            {lineHeightOptions.map((lh) => (
              <Pressable
                key={lh}
                onPress={() => setLineHeight(lh)}
                style={[
                  styles.sizeOption,
                  {
                    backgroundColor: lineHeight === lh ? theme.primary : 'transparent',
                    borderColor: lineHeight === lh ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    textStyles.bodySmall,
                    {
                      color: lineHeight === lh ? '#FFFFFF' : theme.textPrimary,
                      fontWeight: lineHeight === lh ? '600' : '400',
                    },
                  ]}
                >
                  {lh}x
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Margins */}
        <Text style={[textStyles.caption, styles.sectionTitle, { color: theme.textSecondary }]}>
          READER MARGINS
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.optionRow}>
            {marginOptions.map((m) => (
              <Pressable
                key={m}
                onPress={() => setMargins(m)}
                style={[
                  styles.sizeOption,
                  {
                    backgroundColor: margins === m ? theme.primary : 'transparent',
                    borderColor: margins === m ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    textStyles.bodySmall,
                    {
                      color: margins === m ? '#FFFFFF' : theme.textPrimary,
                      fontWeight: margins === m ? '600' : '400',
                    },
                  ]}
                >
                  {m}px
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* App info */}
        <View style={styles.footer}>
          <Text style={[textStyles.caption, { color: theme.textTertiary, textAlign: 'center' }]}>
            InkFlow v1.0.0
          </Text>
          <Text style={[textStyles.caption, { color: theme.textTertiary, textAlign: 'center', marginTop: 4 }]}>
            A web novel reader built with care
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  placeholder: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['5xl'],
  },
  sectionTitle: {
    letterSpacing: 1.5,
    fontWeight: '600',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  themeRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  themeOption: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  themePreviewText: {
    fontSize: 24,
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  sizeOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLabel: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  footer: {
    marginTop: spacing['4xl'],
    marginBottom: spacing['2xl'],
  },
});
