import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { getTheme, type ThemeName } from '../../../src/theme/themes';
import { textStyles } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';

export default function ThemeSettings() {
  const router = useRouter();
  const { theme: themeName, setTheme } = useSettingsStore();
  const theme = getTheme(themeName);

  const themeOptions: { name: ThemeName; label: string; bgColor: string; textColor: string }[] = [
    { name: 'light', label: 'Light', bgColor: '#FFFFFF', textColor: '#1A1A1A' },
    { name: 'dark', label: 'Dark', bgColor: '#121212', textColor: '#CCCCCC' },
    { name: 'sepia', label: 'Sepia', bgColor: '#F4ECD8', textColor: '#5B4636' },
    { name: 'ocean', label: 'Ocean', bgColor: '#141E28', textColor: '#D1E0E8' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderColor: theme.border }]}>
        <Pressable 
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={28} color={theme.primary} />
        </Pressable>
        <Text style={[textStyles.title, { color: theme.textPrimary }]}>Theme</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  backButton: { marginRight: spacing.lg },
  placeholder: { width: 40 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing['5xl'] },
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
});
