import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { getTheme } from '../../../src/theme/themes';
import { textStyles } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';

export default function AboutSettings() {
  const router = useRouter();
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);

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
        <Text style={[textStyles.title, { color: theme.textPrimary }]}>About</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        
        <View style={styles.hero}>
          <View style={[styles.logoPlaceholder, { backgroundColor: theme.primary }]}>
            <Ionicons name="book" size={48} color="#FFF" />
          </View>
          <Text style={[textStyles.h1, { color: theme.textPrimary, marginTop: spacing.md }]}>InkFlow</Text>
          <Text style={[textStyles.body, { color: theme.textSecondary }]}>Version 1.0.0</Text>
        </View>

        <Text style={[textStyles.caption, styles.sectionTitle, { color: theme.textSecondary }]}>
          DEVELOPER
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.row}>
            <Text style={[textStyles.body, { color: theme.textPrimary }]}>Created by</Text>
            <Text style={[textStyles.body, { color: theme.textSecondary }]}>Jayce</Text>
          </View>
        </View>

        <Text style={[textStyles.caption, styles.sectionTitle, { color: theme.textSecondary }]}>
          LEGAL
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Pressable style={[styles.row, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <Text style={[textStyles.body, { color: theme.textPrimary }]}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </Pressable>
          <Pressable style={[styles.row, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <Text style={[textStyles.body, { color: theme.textPrimary }]}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </Pressable>
          <Pressable style={styles.row}>
            <Text style={[textStyles.body, { color: theme.textPrimary }]}>Open Source Licenses</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </Pressable>
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
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  logoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
});
