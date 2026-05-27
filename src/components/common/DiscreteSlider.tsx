import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
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
  const selectedIndex = options.indexOf(value) >= 0 ? options.indexOf(value) : 0;
  const numSteps = Math.max(1, options.length - 1);
  
  // Use Animated.Value to smoothly transition thumb position
  const thumbPosition = useRef(new Animated.Value(0)).current;

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

  const handleLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e, gestureState) => {
        // Find closest step on initial tap
        const x = gestureState.x0 - trackLeftOffset.current;
        snapToClosest(x);
      },
      onPanResponderMove: (e, gestureState) => {
        // Find closest step during drag
        const x = gestureState.moveX - trackLeftOffset.current;
        snapToClosest(x);
      },
      onPanResponderRelease: () => {
        // Optional: finalize action
      },
    })
  ).current;

  // We need to know the absolute screen X coordinate of the track to calculate relative touches
  const trackRef = useRef<View>(null);
  const trackLeftOffset = useRef(0);

  const measureTrack = () => {
    trackRef.current?.measure((x, y, width, height, pageX, pageY) => {
      trackLeftOffset.current = pageX;
    });
  };

  const snapToClosest = (x: number) => {
    if (trackWidth === 0) return;
    let boundedX = Math.max(0, Math.min(x, trackWidth));
    const stepWidth = trackWidth / numSteps;
    const index = Math.round(boundedX / stepWidth);
    
    if (index >= 0 && index < options.length && options[index] !== value) {
      onValueChange(options[index]);
    }
  };

  return (
    <View style={styles.container}>
      {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
      
      <View style={styles.sliderContainer}>
        <View 
          style={[styles.trackArea]} 
          onLayout={handleLayout}
          ref={trackRef}
          onLayoutCapture={measureTrack} // Update offset when layout settles
          {...panResponder.panHandlers}
        >
          {/* Main Track Line */}
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
          
          {/* Draggable Thumb */}
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
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  trackArea: {
    height: 40,
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
    left: -8, // Center thumb over the dot (width 16 / 2 = 8)
  },
});
