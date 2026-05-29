/**
 * DownloadProgressModal — Shows download progress overlay.
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../theme/themes';
import { textStyles } from '../../theme/typography';
import { useNovelStore } from '../../stores/novelStore';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export default function DownloadProgressModal({ visible, onDismiss }: Props) {
  const theme = getTheme(useSettingsStore((s) => s.theme));
  const download = useNovelStore((s) => s.activeDownload);

  if (!download) return null;

  const progress =
    download.totalChapters > 0
      ? download.currentChapter / download.totalChapters
      : 0;
  const percentage = Math.round(progress * 100);

  const statusText = (() => {
    switch (download.status) {
      case 'pending':
        return 'Preparing download…';
      case 'downloading':
        return `Downloading chapter ${download.currentChapter} of ${download.totalChapters}`;
      case 'generating_epub':
        return 'Generating EPUB…';
      case 'importing':
        return 'Importing to library…';
      case 'completed':
        return 'Download complete!';
      case 'failed':
        return `Failed: ${download.error || 'Unknown error'}`;
      case 'cancelled':
        return 'Download cancelled.';
      default:
        return 'Working…';
    }
  })();

  const isActive = ['pending', 'downloading', 'generating_epub', 'importing'].includes(
    download.status,
  );
  const isDone = download.status === 'completed';
  const isFailed = download.status === 'failed';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          {/* Title */}
          <Text
            style={[textStyles.heading, { color: theme.textPrimary, fontSize: 16, marginBottom: 4 }]}
            numberOfLines={2}
          >
            {download.novelTitle}
          </Text>

          {/* Status */}
          <View style={styles.statusRow}>
            {isActive && (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 8 }} />
            )}
            {isDone && (
              <Ionicons
                name="checkmark-circle"
                size={18}
                color="#4CAF50"
                style={{ marginRight: 8 }}
              />
            )}
            {isFailed && (
              <Ionicons
                name="close-circle"
                size={18}
                color="#EF5350"
                style={{ marginRight: 8 }}
              />
            )}
            <Text
              style={[textStyles.caption, { color: theme.textSecondary, flex: 1 }]}
              numberOfLines={2}
            >
              {statusText}
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: isDone ? '#4CAF50' : isFailed ? '#EF5350' : theme.primary,
                  width: `${Math.max(percentage, 2)}%`,
                },
              ]}
            />
          </View>
          <Text
            style={[textStyles.caption, { color: theme.textTertiary, textAlign: 'right', marginTop: 4 }]}
          >
            {percentage}%
          </Text>

          {/* Actions */}
          <View style={styles.actions}>
            {isActive && (
              <Pressable
                style={[styles.button, { borderColor: theme.border }]}
                onPress={() => {
                  useNovelStore.getState().updateDownloadStatus('cancelled');
                  onDismiss();
                }}
              >
                <Text style={[textStyles.caption, { color: theme.textSecondary, fontWeight: '600' }]}>
                  Cancel
                </Text>
              </Pressable>
            )}
            {(isDone || isFailed) && (
              <Pressable
                style={[styles.button, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                onPress={onDismiss}
              >
                <Text style={[textStyles.caption, { color: '#fff', fontWeight: '600' }]}>
                  {isDone ? 'Done' : 'Close'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 10,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
});
