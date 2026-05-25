/**
 * QuotePreviewModal — Shows generated quote card with share/dismiss actions
 *
 * Displays the generated quote card image in a modal overlay.
 * User can share via the OS share sheet or dismiss.
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../theme/themes';
import { textStyles } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;
const CARD_HEIGHT = CARD_WIDTH * (1920 / 1080); // Match quote card aspect ratio
const MAX_CARD_HEIGHT = SCREEN_HEIGHT * 0.6;

interface QuotePreviewModalProps {
  visible: boolean;
  cardPath: string | null;
  isGenerating: boolean;
  error: string | null;
  onShare: () => void;
  onDismiss: () => void;
}

export function QuotePreviewModal({
  visible,
  cardPath,
  isGenerating,
  error,
  onShare,
  onDismiss,
}: QuotePreviewModalProps) {
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onDismiss} />

        {/* Content */}
        <View
          style={[
            styles.container,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[textStyles.title, { color: theme.textPrimary }]}>
              Quote Card
            </Text>
            <Pressable onPress={onDismiss} hitSlop={12}>
              <Text style={[styles.closeButton, { color: theme.textSecondary }]}>✕</Text>
            </Pressable>
          </View>

          {/* Preview area */}
          <View style={styles.previewArea}>
            {isGenerating ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text
                  style={[
                    textStyles.body,
                    { color: theme.textSecondary, marginTop: spacing.md },
                  ]}
                >
                  Generating quote card...
                </Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text
                  style={[
                    textStyles.body,
                    { color: theme.textSecondary, textAlign: 'center' },
                  ]}
                >
                  {error}
                </Text>
              </View>
            ) : cardPath ? (
              <Image
                source={{ uri: cardPath }}
                style={[
                  styles.cardImage,
                  { height: Math.min(CARD_HEIGHT, MAX_CARD_HEIGHT) },
                ]}
                resizeMode="contain"
              />
            ) : null}
          </View>

          {/* Actions */}
          {cardPath && !isGenerating && (
            <View style={styles.actions}>
              <Pressable
                onPress={onDismiss}
                style={[
                  styles.actionButton,
                  { backgroundColor: theme.surfaceElevated },
                ]}
              >
                <Text style={[textStyles.body, { color: theme.textSecondary }]}>
                  Dismiss
                </Text>
              </Pressable>

              <Pressable
                onPress={onShare}
                style={[
                  styles.actionButton,
                  styles.shareButton,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Text style={styles.shareIcon}>📤</Text>
                <Text style={[textStyles.body, { color: '#FFFFFF', fontWeight: '600' }]}>
                  Share
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  container: {
    width: CARD_WIDTH + 32,
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  closeButton: {
    fontSize: 20,
    padding: 4,
  },
  previewArea: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    minHeight: 200,
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: spacing.md,
  },
  cardImage: {
    width: CARD_WIDTH,
    borderRadius: borderRadius.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  shareButton: {
    flex: 2,
  },
  shareIcon: {
    fontSize: 18,
  },
});
