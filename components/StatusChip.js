import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';

/**
 * StatusChip - Pill badge for status flags and category tags.
 *
 * @param {'paid' | 'approved' | 'success' | 'pending' | 'warning' | 'rejected' | 'danger' | 'gold' | 'owner' | 'primary' | 'neutral'} status
 * @param {'sm' | 'md'} size
 * @param {string} label
 * @param {React.ReactNode} icon
 */
export default function StatusChip({
  label,
  status = 'neutral',
  size = 'md',
  icon,
  style,
  textStyle,
}) {
  const getTheme = () => {
    switch (status) {
      case 'paid':
      case 'approved':
      case 'success':
        return {
          bg: colors.successSubtle,
          text: colors.successDeep,
          border: '#BBF7D0',
        };
      case 'pending':
      case 'warning':
        return {
          bg: colors.warningSubtle,
          text: '#B45309',
          border: '#FDE68A',
        };
      case 'rejected':
      case 'danger':
        return {
          bg: colors.dangerSubtle,
          text: colors.danger,
          border: '#FECACA',
        };
      case 'gold':
      case 'owner':
        return {
          bg: colors.secondarySubtle,
          text: '#92400E',
          border: '#FDE047',
        };
      case 'primary':
      case 'clay':
        return {
          bg: colors.primarySubtle,
          text: colors.primary,
          border: '#F0D5C3',
        };
      case 'neutral':
      case 'draft':
      default:
        return {
          bg: colors.backgroundMuted,
          text: colors.textSecondary,
          border: colors.border,
        };
    }
  };

  const current = getTheme();

  return (
    <View
      style={[
        styles.base,
        styles[size],
        { backgroundColor: current.bg, borderColor: current.border },
        style,
      ]}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text
        style={[
          size === 'sm' ? typography.captionBold : typography.subhead,
          styles.text,
          { color: current.text },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  icon: {
    marginRight: spacing.xs,
  },
  text: {
    includeFontPadding: false,
  },
});
