import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { getTheme } from '../../../src/theme/themes';
import { textStyles } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { getAvailableVoices, type TtsVoice } from '../../../src/services/tts/TTSService';

export default function TTSSettings() {
  const router = useRouter();
  const {
    theme: themeName,
    ttsRate,
    ttsPitch,
    ttsAutoChapters,
    ttsSentenceHighlight,
    ttsVoiceId,
    setTtsRate,
    setTtsPitch,
    setTtsAutoChapters,
    setTtsSentenceHighlight,
    setTtsVoiceId,
  } = useSettingsStore();
  const theme = getTheme(themeName);

  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [showVoiceList, setShowVoiceList] = useState(false);

  useEffect(() => {
    getAvailableVoices().then(v => {
      // Sort: EN first, then network voices first, then alphabetical
      const sorted = v.sort((a, b) => {
        const aEn = a.locale.startsWith('en');
        const bEn = b.locale.startsWith('en');
        if (aEn && !bEn) return -1;
        if (!aEn && bEn) return 1;
        if (a.isNetworkRequired && !b.isNetworkRequired) return -1;
        if (!a.isNetworkRequired && b.isNetworkRequired) return 1;
        return a.name.localeCompare(b.name);
      });
      setVoices(sorted);
    });
  }, []);

  const RATE_OPTIONS = [0.5, 0.8, 1.0, 1.2, 1.5, 2.0];
  const PITCH_OPTIONS = [0.8, 1.0, 1.2, 1.5];

  const currentVoice = voices.find(v => v.id === ttsVoiceId) || voices[0];

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
        <Text style={[textStyles.title, { color: theme.textPrimary }]}>Text to Speech</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        
        {/* Voice Selection */}
        <Text style={[textStyles.caption, styles.sectionTitle, { color: theme.textSecondary }]}>
          VOICE MODEL
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Pressable 
            style={[styles.row, { paddingVertical: spacing.lg }]} 
            onPress={() => setShowVoiceList(!showVoiceList)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[textStyles.body, { color: theme.textPrimary, fontWeight: '500' }]}>
                {currentVoice ? currentVoice.name : 'System Default'}
              </Text>
              {currentVoice?.isNetworkRequired && (
                <Text style={[textStyles.caption, { color: theme.primary, marginTop: 4 }]}>
                  Online Voice (High Quality)
                </Text>
              )}
            </View>
            <Ionicons name={showVoiceList ? 'chevron-up' : 'chevron-down'} size={20} color={theme.textSecondary} />
          </Pressable>

          {showVoiceList && (
            <View style={{ maxHeight: 250, borderTopWidth: 1, borderTopColor: theme.border }}>
              <ScrollView nestedScrollEnabled>
                {voices.map((voice) => (
                  <Pressable
                    key={voice.id}
                    style={({ pressed }) => [
                      styles.voiceItem,
                      { borderBottomColor: theme.border },
                      pressed && { backgroundColor: theme.surfaceHighlight || 'rgba(128,128,128,0.1)' },
                    ]}
                    onPress={() => {
                      setTtsVoiceId(voice.id);
                      setShowVoiceList(false);
                    }}
                  >
                    <Ionicons 
                      name="checkmark" 
                      size={20} 
                      color={ttsVoiceId === voice.id ? theme.primary : 'transparent'} 
                      style={{ marginRight: spacing.sm }}
                    />
                    <View>
                      <Text style={[textStyles.body, { color: theme.textPrimary }]}>{voice.name}</Text>
                      <Text style={[textStyles.caption, { color: theme.textSecondary }]}>
                        {voice.locale} {voice.isNetworkRequired ? '• Online' : '• Local'}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        <Text style={[textStyles.caption, { color: theme.textSecondary, marginTop: spacing.sm, marginHorizontal: spacing.sm, lineHeight: 18 }]}>
          Online voices sound much more natural and expressive, but they require an active internet connection to work properly. Local voices will work offline.
        </Text>

        {/* Speed & Pitch */}
        <Text style={[textStyles.caption, styles.sectionTitle, { color: theme.textSecondary }]}>
          SPEECH SPEED
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.optionRow}>
            {RATE_OPTIONS.map((rate) => (
              <Pressable
                key={rate}
                onPress={() => setTtsRate(rate)}
                style={[
                  styles.sizeOption,
                  {
                    backgroundColor: ttsRate === rate ? theme.primary : 'transparent',
                    borderColor: ttsRate === rate ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    textStyles.bodySmall,
                    {
                      color: ttsRate === rate ? '#FFFFFF' : theme.textPrimary,
                      fontWeight: ttsRate === rate ? '600' : '400',
                    },
                  ]}
                >
                  {rate}x
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={[textStyles.caption, styles.sectionTitle, { color: theme.textSecondary }]}>
          VOICE PITCH
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.optionRow}>
            {PITCH_OPTIONS.map((pitch) => (
              <Pressable
                key={pitch}
                onPress={() => setTtsPitch(pitch)}
                style={[
                  styles.sizeOption,
                  {
                    backgroundColor: ttsPitch === pitch ? theme.primary : 'transparent',
                    borderColor: ttsPitch === pitch ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    textStyles.bodySmall,
                    {
                      color: ttsPitch === pitch ? '#FFFFFF' : theme.textPrimary,
                      fontWeight: ttsPitch === pitch ? '600' : '400',
                    },
                  ]}
                >
                  {pitch}x
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Behavior */}
        <Text style={[textStyles.caption, styles.sectionTitle, { color: theme.textSecondary }]}>
          BEHAVIOR
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={[textStyles.body, { color: theme.textPrimary }]}>Auto-continue chapters</Text>
              <Text style={[textStyles.caption, { color: theme.textSecondary, marginTop: 4 }]}>
                Automatically read the next chapter when one finishes.
              </Text>
            </View>
            <Switch
              value={ttsAutoChapters}
              onValueChange={setTtsAutoChapters}
              trackColor={{ true: theme.primary }}
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={[textStyles.body, { color: theme.textPrimary }]}>Sentence highlighting</Text>
              <Text style={[textStyles.caption, { color: theme.textSecondary, marginTop: 4 }]}>
                Highlight the exact sentence currently being read aloud on the screen.
              </Text>
            </View>
            <Switch
              value={ttsSentenceHighlight}
              onValueChange={setTtsSentenceHighlight}
              trackColor={{ true: theme.primary }}
            />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
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
  voiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
