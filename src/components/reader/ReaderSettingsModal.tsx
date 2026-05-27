import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme, type ThemeName, themes } from '../../theme/themes';
import { textStyles } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { DiscreteSlider } from '../common/DiscreteSlider';

interface ReaderSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const THEME_OPTIONS: { name: ThemeName; color: string }[] = [
  { name: 'dark', color: '#121212' },
  { name: 'ocean', color: '#1A2633' },
  { name: 'sepia', color: '#EDE3CC' },
  { name: 'light', color: '#FFFFFF' },
];

const FONT_SIZE_OPTIONS = [14, 16, 18, 20, 22, 24];
const LINE_HEIGHT_OPTIONS = [1.4, 1.6, 1.8, 2.0, 2.2];
const MARGIN_OPTIONS = [8, 16, 24, 32];
const TTS_RATE_OPTIONS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
const TTS_PITCH_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5];

export function ReaderSettingsModal({ visible, onClose }: ReaderSettingsModalProps) {
  const {
    theme: themeName,
    fontSize,
    lineHeight,
    margins,
    setTheme,
    setFontSize,
    setLineHeight,
    setMargins,
    ttsRate,
    ttsPitch,
    ttsAutoChapters,
    ttsSentenceHighlight,
    setTtsRate,
    setTtsPitch,
    setTtsAutoChapters,
    setTtsSentenceHighlight,
  } = useSettingsStore();

  const theme = getTheme(themeName);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.surfaceElevated }]}>
              {/* Drag Indicator */}
              <View style={styles.dragIndicatorContainer}>
                <View style={[styles.dragIndicator, { backgroundColor: theme.border }]} />
              </View>

              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Theme Selector */}
                <Text style={[textStyles.caption, styles.sectionTitle, { color: theme.textSecondary }]}>
                  Reader Theme
                </Text>
                <View style={styles.themeRow}>
                  {THEME_OPTIONS.map((opt) => {
                    const isActive = themeName === opt.name;
                    return (
                      <Pressable
                        key={opt.name}
                        onPress={() => setTheme(opt.name)}
                        style={[
                          styles.themeSwatch,
                          {
                            backgroundColor: opt.color,
                            borderColor: isActive ? theme.primary : themes[opt.name].border,
                            borderWidth: isActive ? 2 : 1,
                          },
                        ]}
                      >
                        {isActive && (
                          <Ionicons
                            name="checkmark"
                            size={24}
                            color={opt.name === 'light' || opt.name === 'sepia' ? '#000' : '#FFF'}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                {/* Font Size */}
                <Text style={[textStyles.caption, styles.sectionTitle, { color: theme.textSecondary }]}>
                  Font Size
                </Text>
                <DiscreteSlider
                  options={FONT_SIZE_OPTIONS}
                  value={fontSize}
                  onValueChange={setFontSize}
                  theme={theme}
                  leftIcon={<Text style={{ fontSize: 14, color: theme.textPrimary, fontWeight: 'bold' }}>A-</Text>}
                  rightIcon={<Text style={{ fontSize: 20, color: theme.textPrimary, fontWeight: 'bold' }}>A+</Text>}
                />

                {/* Line Spacing */}
                <Text style={[textStyles.caption, styles.sectionTitle, { color: theme.textSecondary }]}>
                  Line Spacing
                </Text>
                <DiscreteSlider
                  options={LINE_HEIGHT_OPTIONS}
                  value={lineHeight}
                  onValueChange={setLineHeight}
                  theme={theme}
                  leftIcon={<Ionicons name="reorder-two-outline" size={24} color={theme.textPrimary} style={{ transform: [{ scaleY: 0.8 }] }} />}
                  rightIcon={<Ionicons name="reorder-two-outline" size={24} color={theme.textPrimary} style={{ transform: [{ scaleY: 1.2 }] }} />}
                />

                {/* Margins */}
                <Text style={[textStyles.caption, styles.sectionTitle, { color: theme.textSecondary }]}>
                  Side Margins
                </Text>
                <DiscreteSlider
                  options={MARGIN_OPTIONS}
                  value={margins}
                  onValueChange={setMargins}
                  theme={theme}
                  leftIcon={<Ionicons name="code-working-outline" size={24} color={theme.textPrimary} />}
                  rightIcon={<Ionicons name="code-working-outline" size={24} color={theme.textPrimary} />}
                />

                {/* ─── Text-to-Speech Settings ─── */}
                <View style={styles.divider} />
                <Text style={[textStyles.h3, styles.sectionTitle, { color: theme.textPrimary }]}>
                  Text-to-Speech
                </Text>

                <Text style={[textStyles.caption, styles.sectionTitle, { color: theme.textSecondary }]}>
                  Speech Rate
                </Text>
                <DiscreteSlider
                  options={TTS_RATE_OPTIONS}
                  value={ttsRate}
                  onValueChange={setTtsRate}
                  theme={theme}
                  leftIcon={<Ionicons name="walk-outline" size={24} color={theme.textPrimary} />}
                  rightIcon={<Ionicons name="rocket-outline" size={24} color={theme.textPrimary} />}
                />

                <Text style={[textStyles.caption, styles.sectionTitle, { color: theme.textSecondary }]}>
                  Pitch
                </Text>
                <DiscreteSlider
                  options={TTS_PITCH_OPTIONS}
                  value={ttsPitch}
                  onValueChange={setTtsPitch}
                  theme={theme}
                  leftIcon={<Ionicons name="musical-note-outline" size={24} color={theme.textPrimary} />}
                  rightIcon={<Ionicons name="musical-notes" size={24} color={theme.textPrimary} />}
                />

                <View style={styles.toggleRow}>
                  <Text style={[textStyles.body, { color: theme.textPrimary }]}>
                    Auto Continue Chapters
                  </Text>
                  <Switch
                    value={ttsAutoChapters}
                    onValueChange={setTtsAutoChapters}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.toggleRow}>
                  <Text style={[textStyles.body, { color: theme.textPrimary }]}>
                    Sentence Highlighting
                  </Text>
                  <Switch
                    value={ttsSentenceHighlight}
                    onValueChange={setTtsSentenceHighlight}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.bottomPadding} />
              </ScrollView>
            </View>
        </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    paddingBottom: spacing.xl,
  },
  dragIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  sectionTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  themeSwatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomPadding: {
    height: spacing['3xl'],
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(150,150,150,0.2)',
    marginVertical: spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
});
