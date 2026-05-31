import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../theme/themes';
import { textStyles } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: React.ReactNode;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBgColor?: string;
  confirmText: string;
  confirmButtonColor: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const { width } = Dimensions.get('window');

export function ConfirmationModal({
  visible,
  title,
  message,
  iconName,
  iconColor,
  iconBgColor,
  confirmText,
  confirmButtonColor,
  onCancel,
  onConfirm,
}: ConfirmationModalProps) {
  const themeName = useSettingsStore((s) => s.theme);
  const theme = getTheme(themeName);

  // Animations
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 100 });
      scale.value = withSpring(1, { damping: 18, stiffness: 450 });
    } else {
      opacity.value = withTiming(0, { duration: 80 });
      scale.value = withTiming(0.85, { duration: 80 });
    }
  }, [visible, opacity, scale]);

  const animatedOverlay = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const animatedContent = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible && opacity.value === 0) return null;

  const handleClose = () => {
    opacity.value = withTiming(0, { duration: 80 });
    scale.value = withTiming(0.85, { duration: 80 }, () => {
      runOnJS(onCancel)();
    });
  };

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="none">
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.overlay, animatedOverlay]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
        </Animated.View>
      </TouchableWithoutFeedback>

      <View style={styles.container} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
            animatedContent,
          ]}
        >
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: iconBgColor || theme.surfaceHighlight }]}>
              <Ionicons name={iconName} size={32} color={iconColor} />
            </View>
          </View>

          <Text style={[styles.title, textStyles.title, { color: theme.textPrimary }]}>
            {title}
          </Text>
          <Text style={[styles.message, textStyles.body, { color: theme.textSecondary }]}>
            {message}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: theme.surfaceHighlight || theme.border }]}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: theme.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: confirmButtonColor }]}
              onPress={() => {
                onConfirm();
                // We don't call handleClose here because the parent usually closes the modal immediately
              }}
              activeOpacity={0.7}
            >
              <Ionicons name={iconName} size={20} color="#FFFFFF" />
              <Text style={styles.deleteButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: width - spacing.xl * 2,
    maxWidth: 400,
    borderRadius: 24, // Using explicit value since borderRadius wasn't imported
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing['2xl'],
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    // Background color set via style prop
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
