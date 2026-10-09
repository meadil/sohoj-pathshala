import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';

/**
 * Button - Chunky, high-energy rounded button inspired by Duolingo & Sohoj Pathshala prototypes.
 * Features 16px corner radius and a 3D tactile bottom bevel that depresses on press.
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

  const getTextColor = () => {
    if (disabled) return colors.textTertiary;
    switch (variant) {
      case 'primary':
      case 'danger':
        return colors.textInverse;
      case 'secondary':
        return colors.textPrimary;
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
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.outerBase,
        fullWidth && styles.fullWidth,
        styles[`outer_${variant}`],
        isDisabled && styles.outerDisabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...props}
    >
      {({ pressed }) => {
        const isPressed = pressed && !isDisabled;
        return (
          <View
            style={[
              styles.innerBase,
              styles[size],
              styles[`inner_${variant}`],
              isPressed && styles.innerPressed,
              isDisabled && styles.innerDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={getTextColor()} />
            ) : (
              <View style={styles.contentRow}>
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
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outerBase: {
    borderRadius: radius.btn, // 16px (Duolingo chunky, not pill)
  },
  fullWidth: {
    width: '100%',
  },

  // Outer bevel styles (bottom shadow depth)
  outer_primary: {
    backgroundColor: colors.primaryStrong, // #A85A2B 3D bevel
    paddingBottom: 4,
  },
  outer_secondary: {
    backgroundColor: colors.secondaryBevel, // #E3DAC8 3D bevel
    paddingBottom: 4,
  },
  outer_danger: {
    backgroundColor: colors.dangerPressed,
    paddingBottom: 4,
  },
  outer_outline: {
    backgroundColor: colors.borderSubtle,
    paddingBottom: 3,
  },
  outer_ghost: {
    backgroundColor: 'transparent',
    paddingBottom: 0,
  },
  outerDisabled: {
    backgroundColor: colors.borderSubtle,
    paddingBottom: 0,
  },

  // Inner button face styles
  innerBase: {
    borderRadius: radius.btn, // 16px
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerPressed: {
    transform: [{ translateY: 3 }],
  },

  // Size configurations (inner height + outer paddingBottom = total height)
  lg: {
    minHeight: 52, // 52 + 4 = 56px total height
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  md: {
    minHeight: 44, // 44 + 3 = 47px total height
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  sm: {
    minHeight: 34, // 34 + 2 = 36px total height
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },

  // Inner face variant styles
  inner_primary: {
    backgroundColor: colors.primary, // #C2703D
  },
  inner_secondary: {
    backgroundColor: colors.surface, // #FFFFFF
    borderWidth: 2,
    borderColor: colors.border, // #E5E5EA
  },
  inner_danger: {
    backgroundColor: colors.danger,
  },
  inner_outline: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  inner_ghost: {
    backgroundColor: 'transparent',
    minHeight: 44,
  },
  innerDisabled: {
    backgroundColor: colors.border,
    opacity: 0.65,
  },

  contentRow: {
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
  text: {
    textAlign: 'center',
    includeFontPadding: false,
  },
});
