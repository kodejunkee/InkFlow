import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { getTheme } from '../../../src/theme/themes';
import { textStyles } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';

export default function SettingsMenu() {
  const router = useRouter();
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);

  const menuItems = [
    {
      title: 'Theme',
      subtitle: 'Reading theme and colors',
      icon: 'color-palette-outline' as const,
      route: '/(tabs)/settings/theme' as const,
    },
    {
      title: 'Preferences',
      subtitle: 'Font size, spacing, and margins',
      icon: 'text-outline' as const,
      route: '/(tabs)/settings/preferences' as const,
    },
    {
      title: 'Text to Speech',
      subtitle: 'Voice model, speed, and behavior',
      icon: 'volume-medium-outline' as const,
      route: '/(tabs)/settings/tts' as const,
    },
    {
      title: 'About',
      subtitle: 'App info and version',
      icon: 'information-circle-outline' as const,
      route: '/(tabs)/settings/about' as const,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[textStyles.title, { color: theme.textPrimary }]}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {menuItems.map((item, index) => (
            <Pressable
              key={item.title}
              onPress={() => router.push(item.route)}
              style={({ pressed }) => [
                styles.menuItem,
                {
                  backgroundColor: pressed ? theme.surfaceHighlight || theme.surface : theme.background,
                  borderBottomColor: theme.border,
                  borderBottomWidth: index === menuItems.length - 1 ? 0 : 1,
                },
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: theme.surfaceElevated || theme.surface }]}>
                <Ionicons name={item.icon} size={24} color={theme.primary} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[textStyles.body, { color: theme.textPrimary, fontWeight: '500' }]}>
                  {item.title}
                </Text>
                <Text style={[textStyles.caption, { color: theme.textSecondary, marginTop: 2 }]}>
                  {item.subtitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
            </Pressable>
          ))}
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
});
