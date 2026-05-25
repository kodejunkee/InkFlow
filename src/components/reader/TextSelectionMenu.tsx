/**
 * Text Selection Menu — Context menu for highlights and bookmarks
 *
 * Appears when user selects text in the reader.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { HighlightColor } from '../../types/book';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../theme/themes';
import { textStyles } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

interface TextSelectionMenuProps {
  visible: boolean;
  selectedText: string;
  onHighlight: (color: HighlightColor) => void;
  onBookmark: () => void;
  onCopy: () => void;
  onShare: () => void;
  onDismiss: () => void;
}

const HIGHLIGHT_COLORS: { color: HighlightColor; label: string; hex: string }[] = [
  { color: 'yellow', label: '🟡', hex: '#FFEB3B' },
  { color: 'green', label: '🟢', hex: '#4CAF50' },
  { color: 'blue', label: '🔵', hex: '#42A5F5' },
  { color: 'pink', label: '🩷', hex: '#F06292' },
  { color: 'orange', label: '🟠', hex: '#FFA726' },
];

export function TextSelectionMenu({
  visible,
  selectedText,
  onHighlight,
  onBookmark,
  onCopy,
  onShare,
  onDismiss,
}: TextSelectionMenuProps) {
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);

  if (!visible || !selectedText) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Preview of selected text */}
      <Text
        style={[textStyles.caption, { color: theme.textSecondary, marginBottom: spacing.sm }]}
        numberOfLines={2}
      >
        "{selectedText.substring(0, 100)}{selectedText.length > 100 ? '...' : ''}"
      </Text>

      {/* Highlight color buttons */}
      <View style={styles.colorRow}>
        {HIGHLIGHT_COLORS.map((item) => (
          <Pressable
            key={item.color}
            onPress={() => onHighlight(item.color)}
            style={[styles.colorButton, { backgroundColor: item.hex + '40' }]}
          >
            <View style={[styles.colorDot, { backgroundColor: item.hex }]} />
          </Pressable>
        ))}
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <Pressable onPress={onBookmark} style={styles.actionButton}>
          <Text style={styles.actionIcon}>🔖</Text>
          <Text style={[textStyles.caption, { color: theme.textSecondary }]}>Bookmark</Text>
        </Pressable>

        <Pressable onPress={onCopy} style={styles.actionButton}>
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={[textStyles.caption, { color: theme.textSecondary }]}>Copy</Text>
        </Pressable>

        <Pressable onPress={onShare} style={styles.actionButton}>
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={[textStyles.caption, { color: theme.textSecondary }]}>Share</Text>
        </Pressable>

        <Pressable onPress={onDismiss} style={styles.actionButton}>
          <Text style={styles.actionIcon}>✕</Text>
          <Text style={[textStyles.caption, { color: theme.textSecondary }]}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    zIndex: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 8,
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
});
