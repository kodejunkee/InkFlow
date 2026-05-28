/**
 * QuotePreviewModal — Shows generated quote card with share/dismiss actions
 *
 * Displays a beautiful quote card using React Native primitives.
 * Captures the view to an image using react-native-view-shot and shares it.
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../theme/themes';
import { textStyles } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;

export interface QuoteData {
  quoteText: string;
  author: string;
  title: string;
  chapterTitle?: string;
  coverUri?: string | null;
}

interface QuotePreviewModalProps {
  visible: boolean;
  quoteData: QuoteData | null;
  onDismiss: () => void;
}

export function QuotePreviewModal({
  visible,
  quoteData,
  onDismiss,
}: QuotePreviewModalProps) {
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);
  const viewShotRef = useRef<ViewShot>(null);

  const handleShare = async () => {
    if (viewShotRef.current && quoteData) {
      try {
        const uri = await viewShotRef.current.capture?.();
        if (uri) {
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(uri, {
              mimeType: 'image/jpeg',
              dialogTitle: 'Share Quote',
            });
          }
        }
      } catch (e) {
        console.error('Failed to capture or share quote card:', e);
      }
    }
  };

  if (!visible || !quoteData) return null;

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
              Share Quote
            </Text>
            <Pressable onPress={onDismiss} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          {/* Preview area - The actual card that gets captured */}
          <View style={styles.previewArea}>
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'jpg', quality: 0.95 }}
              style={styles.cardContainer}
            >
              {/* Card Background */}
              <View style={[styles.card, { backgroundColor: '#1E1E1E' }]}>
                {/* App Branding */}
                <Text style={styles.brandName}>InkFlow</Text>
                <View style={styles.brandDivider} />

                {/* Quote Text */}
                <Text
                  style={[
                    textStyles.h2,
                    styles.quoteText,
                    { color: '#FFFFFF', fontStyle: 'italic' },
                  ]}
                  numberOfLines={10}
                >
                  "{quoteData.quoteText}"
                </Text>

                {/* Footer with Book Info */}
                <View style={styles.cardFooter}>
                  {quoteData.coverUri ? (
                    <Image
                      source={{ uri: quoteData.coverUri }}
                      style={styles.coverImage}
                    />
                  ) : (
                    <View style={styles.coverPlaceholder}>
                      <Text style={{ color: '#888', fontSize: 10 }}>No Cover</Text>
                    </View>
                  )}
                  
                  <View style={styles.bookInfo}>
                    <Text style={[textStyles.body, { color: '#FFFFFF', fontWeight: 'bold' }]} numberOfLines={1}>
                      {quoteData.title}
                    </Text>
                    <Text style={[textStyles.caption, { color: '#BBBBBB' }]} numberOfLines={1}>
                      {quoteData.author}
                    </Text>
                    {quoteData.chapterTitle && (
                      <Text style={[textStyles.caption, { color: '#888888', fontSize: 10 }]} numberOfLines={1}>
                        {quoteData.chapterTitle}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </ViewShot>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={onDismiss}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: theme.surfaceElevated },
                pressed && { opacity: 0.7 }
              ]}
            >
              <Text style={[textStyles.body, { color: theme.textSecondary }]}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [
                styles.actionButton,
                styles.shareButton,
                { backgroundColor: theme.primary },
                pressed && { opacity: 0.8 }
              ]}
            >
              <Ionicons name="share-outline" size={24} color="#FFFFFF" style={styles.shareIcon} />
              <Text style={[textStyles.body, { color: '#FFFFFF', fontWeight: '600' }]}>
                Share Image
              </Text>
            </Pressable>
          </View>
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
    maxHeight: SCREEN_HEIGHT * 0.9,
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
  closeButtonContainer: {
    padding: spacing.sm,
  },
  previewArea: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  cardContainer: {
    width: CARD_WIDTH,
    backgroundColor: '#1E1E1E', // Match card bg to avoid white edges during capture
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  card: {
    padding: spacing.xl,
    minHeight: CARD_WIDTH * 1.2,
    justifyContent: 'space-between',
  },
  brandName: {
    color: '#AAAAAA',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  brandDivider: {
    height: 1,
    backgroundColor: '#333333',
    marginBottom: spacing.lg,
  },
  quoteText: {
    lineHeight: 32,
    marginBottom: spacing.xl,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingTop: spacing.lg,
  },
  coverImage: {
    width: 40,
    height: 60,
    borderRadius: borderRadius.sm,
    backgroundColor: '#333',
  },
  coverPlaceholder: {
    width: 40,
    height: 60,
    borderRadius: borderRadius.sm,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
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
