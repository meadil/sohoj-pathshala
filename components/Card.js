import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme/theme';

/**
 * Card - Elevated container with warm organic shadow.
 *
 * @param {'elevated' | 'flat' | 'muted'} variant
 * @param {Function} onPress
 * @param {boolean} disabled
 */
export default function Card({
  children,
  variant = 'elevated',
  onPress,
  disabled = false,
  style,
  contentStyle,
  ...props
}) {
  const isPressable = typeof onPress === 'function';

  const cardStyles = [
    styles.base,
    variant === 'elevated' && styles.elevated,
    variant === 'flat' && styles.flat,
    variant === 'muted' && styles.muted,
    style,
  ];

  if (isPressable) {
    return (
      <Pressable
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        style={({ pressed }) => [
          cardStyles,
          pressed && !disabled && styles.pressed,
        ]}
        accessibilityRole="button"
        {...props}
      >
        <View style={[styles.inner, contentStyle]}>{children}</View>
      </Pressable>
    );
  }

  return (
    <View style={cardStyles} {...props}>
      <View style={[styles.inner, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  inner: {
    padding: spacing.lg,
  },
  elevated: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadow.card,
  },
  flat: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muted: {
    backgroundColor: colors.backgroundMuted,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
