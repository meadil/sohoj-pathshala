import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors, radius, spacing } from '../theme/theme';

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

function toBnDigit(num) {
  return String(num)
    .split('')
    .map((d) => BENGALI_DIGITS[parseInt(d, 10)] || d)
    .join('');
}

/**
 * Chevron Left Back Icon matching index.html sp-icobtn
 */
function ChevronLeftIcon({ size = 24, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 5l-7 7 7 7"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * OnboardingStepShell - Reusable chrome for all 9 onboarding steps.
 * Matches index.html header (.sp-head), step progress (.sp-progress),
 * and layout (.sp-body) with exact tokens and measurements.
 *
 * @param {number} step - Current step (1 to 9)
 * @param {number} totalSteps - Total steps (default 9)
 * @param {string} title - Step title
 * @param {Function} onBack - Back navigation callback
 * @param {'bn' | 'en'} lang - Language code
 * @param {React.ReactNode} children - Screen-specific form content
 */
export default function OnboardingStepShell({
  step = 1,
  totalSteps = 9,
  title,
  onBack,
  lang = 'bn',
  children,
}) {
  const isBn = lang === 'bn';

  const stepText = isBn
    ? `${toBnDigit(step)}`
    : `${step}`;
  const totalText = isBn
    ? `${toBnDigit(totalSteps)}`
    : `${totalSteps}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Step Header (.sp-head) */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            {onBack ? (
              <Pressable
                onPress={onBack}
                style={({ pressed }) => [
                  styles.backBtn,
                  pressed && styles.backBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <ChevronLeftIcon size={24} />
              </Pressable>
            ) : (
              <View style={styles.backBtnPlaceholder} />
            )}

            <View style={styles.headerTextStack}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.stepIndicator}>
                {isBn ? 'ধাপ ' : 'Step '}
                <Text style={styles.stepCurrent}>{stepText}</Text>
                {isBn ? ' / ' : ' of '}
                {totalText}
              </Text>
            </View>
          </View>

          {/* 9-Segment Progress Bar (.sp-progress) */}
          <View
            style={styles.progressContainer}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 1, max: totalSteps, now: step }}
          >
            {Array.from({ length: totalSteps }).map((_, index) => {
              const isFilled = index < step;
              return (
                <View
                  key={index}
                  style={[
                    styles.progressSegment,
                    isFilled && styles.progressSegmentFilled,
                  ]}
                />
              );
            })}
          </View>
        </View>

        {/* Step Body Content (.sp-body) */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background, // #FBF7F0 warm canvas
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20, // 20px from prototype .sp-head
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  backBtnPressed: {
    backgroundColor: '#F0E7D8',
  },
  backBtnPlaceholder: {
    width: 44,
    height: 44,
  },
  headerTextStack: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary, // #1D1D1F
    letterSpacing: -0.2,
  },
  stepIndicator: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary, // #6E6E73
    marginTop: 2,
  },
  stepCurrent: {
    color: colors.primaryStrong, // #A85A2B
  },

  // 9-segment progress bar (.sp-progress, .sp-seg)
  progressContainer: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 14,
    width: '100%',
  },
  progressSegment: {
    flex: 1,
    height: 14, // 14px height from prototype
    borderRadius: radius.pill, // 999px rounded pill
    backgroundColor: '#EAE1D0', // Muted tan/beige unfilled ground
  },
  progressSegmentFilled: {
    backgroundColor: colors.primary, // #C2703D primary accent
  },

  scrollContent: {
    paddingHorizontal: 20, // 20px from prototype .sp-body
    paddingTop: 6,
    paddingBottom: 44, // 44px bottom padding
    gap: 22,
  },
});
