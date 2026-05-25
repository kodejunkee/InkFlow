/**
 * ImportButton - Floating Action Button for importing EPUB files
 *
 * Premium FAB with shadow, press animation, and import progress modal.
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../theme/themes';
import { textStyles } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';

interface ImportButtonProps {
  onPress: () => void;
  isImporting: boolean;
  importProgress?: string;
  importError?: string | null;
}

export function ImportButton({
  onPress,
  isImporting,
  importProgress,
  importError,
}: ImportButtonProps) {
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();
  };

  return (
    <>
      {/* FAB */}
      <Animated.View
        style={[
          styles.fabContainer,
          shadows.xl,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isImporting}
          style={[styles.fab, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.fabIcon}>+</Text>
        </Pressable>
      </Animated.View>

      {/* Import progress modal */}
      <Modal
        visible={isImporting}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <ActivityIndicator size="large" color={theme.primary} />
            <Text
              style={[textStyles.subtitle, styles.modalTitle, { color: theme.textPrimary }]}
            >
              Importing Book
            </Text>
            <Text
              style={[textStyles.bodySmall, { color: theme.textSecondary, textAlign: 'center' }]}
            >
              {importProgress || 'Processing EPUB file...'}
            </Text>
            {importError && (
              <Text
                style={[textStyles.bodySmall, styles.errorText, { color: '#F44336' }]}
              >
                {importError}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 280,
    padding: spacing['2xl'],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  errorText: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
