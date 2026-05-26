/**
 * Text Selection Menu — Context menu for highlights, quotes, and actions
 *
 * Appears when user selects text in the reader.
 * - Color dots: highlight the selected text
 * - Save Quote: save the text with an optional note (navigable later)
 * - Copy: copy text to clipboard
 * - Share: generate a quote card image (Phase 3)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { HighlightColor } from '../../types/book';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../theme/themes';
import { textStyles } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

interface TextSelectionMenuProps {
  visible: boolean;
  selectedText: string;
  onHighlight: (color: HighlightColor) => void;
  onSaveQuote: (note: string) => void;
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
  onSaveQuote,
  onCopy,
  onShare,
  onDismiss,
}: TextSelectionMenuProps) {
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);

  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');

  if (!visible || !selectedText) return null;

  const handleSaveQuote = () => {
    if (showNoteInput) {
      // User has typed a note — save it
      onSaveQuote(noteText.trim());
      handleDismiss();
    } else {
      // Show the note input
      setShowNoteInput(true);
    }
  };

  const handleDismiss = () => {
    setShowNoteInput(false);
    setNoteText('');
    onDismiss();
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Preview of selected text */}
      <Text
        style={[textStyles.caption, { color: theme.textSecondary, marginBottom: spacing.sm }]}
        numberOfLines={2}
      >
        "{selectedText.substring(0, 100)}{selectedText.length > 100 ? '...' : ''}"
      </Text>

      {/* Note input (shown when Save Quote is tapped) */}
      {showNoteInput && (
        <View style={styles.noteContainer}>
          <TextInput
            style={[
              styles.noteInput,
              {
                color: theme.textPrimary,
                borderColor: theme.border,
                backgroundColor: theme.background + '80',
              },
            ]}
            placeholder="Add a note (optional)..."
            placeholderTextColor={theme.textSecondary + '80'}
            value={noteText}
            onChangeText={setNoteText}
            multiline
            maxLength={500}
            autoFocus
          />
          <View style={styles.noteActions}>
            <Pressable
              onPress={handleSaveQuote}
              style={[styles.noteButton, { backgroundColor: theme.primary + '20', flex: 1 }]}
            >
              <Text style={[textStyles.caption, { color: theme.primary, fontWeight: '600', textAlign: 'center' }]}>
                Save Quote
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Highlight color buttons */}
      {!showNoteInput && (
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
      )}

      {/* Action buttons */}
      {!showNoteInput && (
        <View style={styles.actionRow}>
          <Pressable onPress={handleSaveQuote} style={styles.actionButton}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={[textStyles.caption, { color: theme.textSecondary }]}>Quote</Text>
          </Pressable>

          <Pressable onPress={onCopy} style={styles.actionButton}>
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={[textStyles.caption, { color: theme.textSecondary }]}>Copy</Text>
          </Pressable>

          <Pressable onPress={onShare} style={styles.actionButton}>
            <Text style={styles.actionIcon}>📤</Text>
            <Text style={[textStyles.caption, { color: theme.textSecondary }]}>Share</Text>
          </Pressable>

          <Pressable onPress={handleDismiss} style={styles.actionButton}>
            <Text style={styles.actionIcon}>✕</Text>
            <Text style={[textStyles.caption, { color: theme.textSecondary }]}>Close</Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
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
  noteContainer: {
    marginBottom: spacing.md,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    minHeight: 60,
    maxHeight: 120,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  noteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  noteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
  },
});
