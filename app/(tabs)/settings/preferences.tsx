import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { getTheme } from '../../../src/theme/themes';
import { textStyles } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';

export default function PreferencesSettings() {
  const router = useRouter();
  const {
    theme: themeName,
    fontSize,
    lineHeight,
    margins,
    setFontSize,
    setLineHeight,
    setMargins,
  } = useSettingsStore();
  const theme = getTheme(themeName);

  const fontSizeOptions = [14, 16, 18, 20, 22, 24];
  const lineHeightOptions = [1.4, 1.6, 1.8, 2.0, 2.2];
  const marginOptions = [8, 16, 24, 32];

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
        <Text style={[textStyles.title, { color: theme.textPrimary }]}>Preferences</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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
});
