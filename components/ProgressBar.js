import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme/theme';

/**
 * ProgressBar - Bold, chunky animated progress indicator inspired by Duolingo.
 *
 * @param {number} progress - Value between 0 and 1 (e.g. 0.65 for 65%)
 * @param {number} height - Bar thickness in pixels (default 10)
 * @param {'primary' | 'success' | 'gold'} variant
 * @param {boolean} animated - Whether to animate transitions
 */
export default function ProgressBar({
  progress = 0,
  height = 10,
  variant = 'primary',
  color,
  trackColor = colors.backgroundMuted,
  animated = true,
  style,
}) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const animatedWidth = useRef(new Animated.Value(clamped)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(animatedWidth, {
        toValue: clamped,
        duration: 450,
        useNativeDriver: false,
      }).start();
    } else {
      animatedWidth.setValue(clamped);
    }
  }, [clamped, animated]);

  const getFillColor = () => {
    if (color) return color;
    switch (variant) {
      case 'success':
        return colors.success;
      case 'gold':
        return colors.secondary;
      case 'primary':
      default:
        return colors.primary;
    }
  };

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: radius.pill, backgroundColor: trackColor },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            width: widthInterpolation,
            height,
            borderRadius: radius.pill,
            backgroundColor: getFillColor(),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
