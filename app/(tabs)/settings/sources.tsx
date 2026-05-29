/**
 * Sources Settings Screen — Manage novel sources.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { getTheme } from '../../../src/theme/themes';
import { textStyles } from '../../../src/theme/typography';
import { spacing } from '../../../src/theme/spacing';
import {
  getAllSources,
  setSourceEnabled,
} from '../../../src/services/novel/ExtensionManager';
import { useState } from 'react';

export default function SourcesScreen() {
  const router = useRouter();
  const theme = getTheme(useSettingsStore((s) => s.theme));
  const [sources, setSources] = useState(getAllSources());

  const handleToggle = (id: string, enabled: boolean) => {
    setSourceEnabled(id, enabled);
    setSources(getAllSources());
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </Pressable>
        <Text style={[textStyles.heading, { color: theme.textPrimary, marginLeft: 12 }]}>
          Sources
        </Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text
          style={[
            textStyles.caption,
            { color: theme.textTertiary, paddingHorizontal: spacing.xl, marginBottom: spacing.md },
          ]}
        >
          Enable or disable novel sources. Enabled sources appear in the Browse tab.
        </Text>

        {sources.map((source) => (
          <View
            key={source.id}
            style={[
              styles.sourceRow,
              {
                backgroundColor: theme.surface,
                borderBottomColor: theme.divider,
              },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="globe-outline" size={22} color={theme.primary} />
            </View>
            <View style={styles.sourceInfo}>
              <Text style={[textStyles.body, { color: theme.textPrimary, fontWeight: '500' }]}>
                {source.name}
              </Text>
              <Text style={[textStyles.caption, { color: theme.textSecondary, marginTop: 2 }]}>
                {source.baseUrl}
              </Text>
            </View>
            <Switch
              value={source.enabled}
              onValueChange={(val) => handleToggle(source.id, val)}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#fff"
            />
          </View>
        ))}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  scroll: { flex: 1 },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  sourceInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
});
