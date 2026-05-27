/**
 * TtsPlayerSheet — Compact bottom sheet for TTS playback controls.
 *
 * Shows: chapter title, sentence progress, play/pause/stop, skip, speed, sleep timer.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../theme/themes';
import { textStyles } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import type { TtsStatus } from '../../hooks/useTTS';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TtsPlayerSheetProps {
  visible: boolean;
  ttsStatus: TtsStatus;
  currentSentenceIndex: number;
  totalSentences: number;
  currentChapterTitle: string;
  sleepTimerRemaining: number | null;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onNextSentence: () => void;
  onPrevSentence: () => void;
  onSetSleepTimer: (minutes: number | null) => void;
  onClose: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const RATE_OPTIONS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

const SLEEP_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Off', value: null },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hr', value: 60 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TtsPlayerSheet({
  visible,
  ttsStatus,
  currentSentenceIndex,
  totalSentences,
  currentChapterTitle,
  sleepTimerRemaining,
  onPlay,
  onPause,
  onStop,
  onNextSentence,
  onPrevSentence,
  onSetSleepTimer,
  onClose,
}: TtsPlayerSheetProps) {
  const themeName = useSettingsStore((s) => s.theme);
  const ttsRate = useSettingsStore((s) => s.ttsRate);
  const setTtsRate = useSettingsStore((s) => s.setTtsRate);
  const theme = getTheme(themeName);

  const [showSleepPicker, setShowSleepPicker] = useState(false);

  if (!visible) return null;

  const isPlaying = ttsStatus === 'playing';
  const isLoading = ttsStatus === 'loading';

  const cycleRate = () => {
    const currentIdx = RATE_OPTIONS.indexOf(ttsRate);
    const nextIdx = (currentIdx + 1) % RATE_OPTIONS.length;
    setTtsRate(RATE_OPTIONS[nextIdx]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: theme.surfaceElevated }]}>
              {/* Drag Indicator */}
              <View style={styles.dragIndicatorContainer}>
                <View style={[styles.dragIndicator, { backgroundColor: theme.border }]} />
              </View>

              {/* Chapter Title */}
              <Text
                style={[textStyles.caption, styles.chapterTitle, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {currentChapterTitle || 'Reading...'}
              </Text>

              {/* Sentence Progress */}
              <View style={styles.progressRow}>
                <View style={[styles.progressTrack, { backgroundColor: theme.progressTrack }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: theme.primary,
                        width: totalSentences > 0
                          ? `${((currentSentenceIndex + 1) / totalSentences) * 100}%`
                          : '0%',
                      },
                    ]}
                  />
                </View>
                <Text style={[textStyles.caption, { color: theme.textSecondary }]}>
                  {totalSentences > 0
                    ? `${currentSentenceIndex + 1} / ${totalSentences}`
                    : '—'}
                </Text>
              </View>

              {/* Playback Controls */}
              <View style={styles.controlsRow}>
                {/* Previous */}
                <Pressable
                  onPress={onPrevSentence}
                  style={({ pressed }) => [styles.controlButton, pressed && { opacity: 0.5 }]}
                  disabled={isLoading}
                >
                  <Ionicons name="play-back" size={28} color={theme.textPrimary} />
                </Pressable>

                {/* Play / Pause */}
                <Pressable
                  onPress={isPlaying ? onPause : onPlay}
                  style={({ pressed }) => [
                    styles.playButton,
                    { backgroundColor: theme.primary },
                    pressed && { opacity: 0.8 },
                  ]}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Ionicons name="hourglass-outline" size={32} color="#FFF" />
                  ) : (
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={32}
                      color="#FFF"
                    />
                  )}
                </Pressable>

                {/* Next */}
                <Pressable
                  onPress={onNextSentence}
                  style={({ pressed }) => [styles.controlButton, pressed && { opacity: 0.5 }]}
                  disabled={isLoading}
                >
                  <Ionicons name="play-forward" size={28} color={theme.textPrimary} />
                </Pressable>

                {/* Stop */}
                <Pressable
                  onPress={onStop}
                  style={({ pressed }) => [styles.controlButton, pressed && { opacity: 0.5 }]}
                >
                  <Ionicons name="stop" size={28} color={theme.textSecondary} />
                </Pressable>
              </View>

              {/* Bottom row: Speed + Sleep Timer */}
              <View style={styles.bottomRow}>
                {/* Speed chip */}
                <Pressable
                  onPress={cycleRate}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Ionicons name="speedometer-outline" size={16} color={theme.textSecondary} />
                  <Text style={[textStyles.caption, { color: theme.textPrimary, fontWeight: '600' }]}>
                    {ttsRate}x
                  </Text>
                </Pressable>

                {/* Sleep timer chip */}
                <Pressable
                  onPress={() => setShowSleepPicker(!showSleepPicker)}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    sleepTimerRemaining !== null && { borderColor: theme.primary },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Ionicons
                    name="moon-outline"
                    size={16}
                    color={sleepTimerRemaining !== null ? theme.primary : theme.textSecondary}
                  />
                  <Text style={[
                    textStyles.caption,
                    {
                      color: sleepTimerRemaining !== null ? theme.primary : theme.textPrimary,
                      fontWeight: '600',
                    },
                  ]}>
                    {sleepTimerRemaining !== null
                      ? formatTime(sleepTimerRemaining)
                      : 'Sleep'}
                  </Text>
                </Pressable>
              </View>

              {/* Sleep Timer Picker */}
              {showSleepPicker && (
                <View style={styles.sleepPickerRow}>
                  {SLEEP_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.label}
                      onPress={() => {
                        onSetSleepTimer(opt.value);
                        setShowSleepPicker(false);
                      }}
                      style={({ pressed }) => [
                        styles.sleepOption,
                        { backgroundColor: theme.surface, borderColor: theme.border },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={[textStyles.caption, { color: theme.textPrimary }]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing['3xl'],
    paddingHorizontal: spacing.xl,
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
  chapterTitle: {
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  controlButton: {
    padding: spacing.sm,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  sleepPickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sleepOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
});
