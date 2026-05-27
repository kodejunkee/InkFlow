import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { type AppTheme } from '../../theme/themes';
import { spacing } from '../../theme/spacing';

interface DiscreteSliderProps {
  options: number[];
  value: number;
  onValueChange: (val: number) => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  theme: AppTheme;
}

export function DiscreteSlider({
  options,
  value,
  onValueChange,
  leftIcon,
  rightIcon,
  theme,
}: DiscreteSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackLayoutX = useRef(0);
  const trackRef = useRef<View>(null);
  const thumbPosition = useRef(new Animated.Value(0)).current;

  const selectedIndex = Math.max(0, options.indexOf(value));
  const numSteps = Math.max(1, options.length - 1);

  // Animate thumb to correct position whenever value or layout changes
  useEffect(() => {
    if (trackWidth > 0) {
      const stepWidth = trackWidth / numSteps;
      Animated.spring(thumbPosition, {
        toValue: selectedIndex * stepWidth,
        useNativeDriver: false,
        speed: 30,
        bounciness: 0,
      }).start();
    }
  }, [selectedIndex, trackWidth, numSteps, thumbPosition]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setTrackWidth(w);
    // Also measure absolute position for touch calculations
    setTimeout(() => {
      trackRef.current?.measureInWindow((pageX) => {
        trackLayoutX.current = pageX;
      });
    }, 50);
  }, []);

  const snapFromTouch = useCallback((pageX: number) => {
    if (trackWidth === 0) return;
    const relativeX = pageX - trackLayoutX.current;
    const boundedX = Math.max(0, Math.min(relativeX, trackWidth));
    const stepWidth = trackWidth / numSteps;
    const index = Math.round(boundedX / stepWidth);
    const clampedIndex = Math.max(0, Math.min(index, options.length - 1));
    onValueChange(options[clampedIndex]);
  }, [trackWidth, numSteps, options, onValueChange]);

  const handleTouchStart = useCallback((e: GestureResponderEvent) => {
    snapFromTouch(e.nativeEvent.pageX);
  }, [snapFromTouch]);

  const handleTouchMove = useCallback((e: GestureResponderEvent) => {
    snapFromTouch(e.nativeEvent.pageX);
  }, [snapFromTouch]);

  return (
    <View style={styles.container}>
      {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}

      <View style={styles.sliderContainer}>
        <View
          ref={trackRef}
          style={styles.trackArea}
          onLayout={handleLayout}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={handleTouchStart}
          onResponderMove={handleTouchMove}
        >
          {/* Track line */}
          <View style={[styles.trackLine, { backgroundColor: theme.border }]} />

          {/* Dots */}
          <View style={styles.dotsContainer} pointerEvents="none">
            {options.map((_, i) => {
              const isActive = i <= selectedIndex;
              return (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: isActive ? theme.primary : theme.textTertiary },
                  ]}
                />
              );
            })}
          </View>

          {/* Thumb */}
          {trackWidth > 0 && (
            <Animated.View
              style={[
                styles.thumb,
                {
                  backgroundColor: theme.textPrimary,
                  transform: [{ translateX: thumbPosition }],
                },
              ]}
              pointerEvents="none"
            />
          )}
        </View>
      </View>

      {rightIcon && <View style={styles.iconContainer}>{rightIcon}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: spacing.md,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderContainer: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  trackArea: {
    height: 44,
    justifyContent: 'center',
  },
  trackLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: 16,
    height: 24,
    borderRadius: 8,
    left: -8,
  },
});
