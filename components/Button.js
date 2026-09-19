import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';

/**
 * Button - Chunky, high-energy rounded button inspired by Duolingo.
 *
 * @param {'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'} variant
 * @param {'lg' | 'md' | 'sm'} size
 * @param {boolean} fullWidth
 * @param {boolean} loading
 * @param {boolean} disabled
 * @param {React.ReactNode} icon
 * @param {React.ReactNode} rightIcon
 * @param {string} title
 * @param {Function} onPress
 */
export default function Button({
  title,
  children,
  onPress,
  variant = 'primary',
  size = 'lg',
  fullWidth = true,
  loading = false,
  disabled = false,
  icon,
  rightIcon,
  style,
  textStyle,
  ...props
}) {
  const isDisabled = disabled || loading;

  const getContainerStyle = (pressed) => {
    const base = [
      styles.base,
      styles[size],
      fullWidth && styles.fullWidth,
      isDisabled && styles.disabled,
    ];

    switch (variant) {
      case 'primary':
        base.push(styles.primary);
        if (pressed && !isDisabled) base.push(styles.primaryPressed);
        break;
      case 'secondary':
        base.push(styles.secondary);
        if (pressed && !isDisabled) base.push(styles.secondaryPressed);
        break;
      case 'outline':
        base.push(styles.outline);
        if (pressed && !isDisabled) base.push(styles.outlinePressed);
        break;
      case 'danger':
        base.push(styles.danger);
        if (pressed && !isDisabled) base.push(styles.dangerPressed);
        break;
      case 'ghost':
        base.push(styles.ghost);
        if (pressed && !isDisabled) base.push(styles.ghostPressed);
        break;
    }

    return base;
  };

  const getTextColor = () => {
    if (disabled) return colors.textTertiary;
    switch (variant) {
      case 'primary':
        return colors.textInverse;
      case 'secondary':
        return '#1D1D1F';
      case 'danger':
        return colors.textInverse;
      case 'outline':
      case 'ghost':
        return colors.primary;
      default:
        return colors.textInverse;
    }
  };

  const content = title || children;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [getContainerStyle(pressed), style]}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <View style={styles.innerRow}>
          {icon && <View style={styles.iconLeft}>{icon}</View>}
          <Text
            style={[
              styles.text,
              size === 'sm' ? typography.buttonSmall : typography.button,
              { color: getTextColor() },
              textStyle,
            ]}
          >
            {content}
          </Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },

  // Sizes
  lg: {
    minHeight: 52,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
  },
  md: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  sm: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },

  // Variants
  primary: {
    backgroundColor: colors.primary,
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed,
    transform: [{ scale: 0.98 }],
  },

  secondary: {
    backgroundColor: colors.secondary,
  },
  secondaryPressed: {
    backgroundColor: colors.secondaryPressed,
    transform: [{ scale: 0.98 }],
  },

  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  outlinePressed: {
    backgroundColor: colors.primarySubtle,
    transform: [{ scale: 0.98 }],
  },

  danger: {
    backgroundColor: colors.danger,
  },
  dangerPressed: {
    backgroundColor: colors.dangerPressed,
    transform: [{ scale: 0.98 }],
  },

  ghost: {
    backgroundColor: 'transparent',
  },
  ghostPressed: {
    backgroundColor: colors.backgroundMuted,
  },

  disabled: {
    backgroundColor: colors.border,
    borderColor: colors.border,
    opacity: 0.65,
  },

  text: {
    textAlign: 'center',
    includeFontPadding: false,
  },
});
