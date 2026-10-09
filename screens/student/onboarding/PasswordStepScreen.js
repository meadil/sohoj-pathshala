import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Button from '../../../components/Button';
import OnboardingStepShell from '../../../components/OnboardingStepShell';
import { useAlert } from '../../../components/CustomAlert';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../../../theme/theme';

function ArrowRightIcon({ size = 22, color = '#FFFFFF', strokeWidth = 2.4 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12h14M13 6l6 6-6 6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * PasswordStepScreen - Onboarding Step 3 of 9 (Set Password)
 * Matches index.html#/password exactly:
 * - OnboardingStepShell with step 3 of 9
 * - Password field with Show/Hide reveal toggle
 * - Helper hint below password field
 * - Confirm password field
 * - Primary CTA "এগিয়ে যাও" / "Continue"
 * All Bangla/English strings pulled verbatim from index.html
 * (pwTitle, pwLabel, pwLabel2, hintPw, show, hide, continue).
 */
export default function PasswordStepScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { data, updateData } = useOnboarding();
  const alert = useAlert();

  const [password, setPassword] = useState(data.password || '');
  const [confirmPassword, setConfirmPassword] = useState(data.confirmPassword || '');
  const [visible, setVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isBn = lang === 'bn';

  const handleContinue = async () => {
    if (password.length < 8) {
      alert(
        'Password Too Short',
        isBn
          ? 'অনুগ্রহ করে কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড দাও।'
          : 'Please use a password with at least 8 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      alert(
        'Passwords Do Not Match',
        isBn
          ? 'দুই ঘরে একই পাসওয়ার্ড লিখো।'
          : 'Please make sure both passwords match.'
      );
      return;
    }

    // Save to OnboardingContext
    updateData({ password, confirmPassword });

    // Real password set via Supabase — no placeholder logic.
    // NOTE: while the TEMP DEV BYPASS is active (see STATUS.md) there is
    // no live auth session, so this call is expected to fail — it is
    // caught and logged below so screen-building can continue.
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      navigation?.navigate?.('OnboardingName');
    } catch (err) {
      if (err?.name === 'AuthSessionMissingError' || err?.message?.includes('Auth session missing')) {
        // TEMP DEV BYPASS (see STATUS.md) — no live session while OTP is
        // bypassed: skip the alert and keep click-through moving.
        console.warn('TEMP DEV BYPASS: no live session, skipping real password save:', err?.message);
        navigation?.navigate?.('OnboardingName');
      } else {
        alert(
          'Could Not Save Password',
          err?.message || 'Could not save the password. Please try again.'
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OnboardingStepShell
      step={3}
      totalSteps={9}
      title={isBn ? 'পাসওয়ার্ড সেট করো' : 'Set a password'}
      onBack={() => navigation?.goBack?.()}
      lang={lang}
    >
      {/* Form Fields Stack (.od-stack with gap: 16px) */}
      <View style={styles.formStack}>
        {/* Password Field (.od-field, .sp-fld, .sp-passrow) */}
        <View style={styles.field}>
          <Text style={styles.label}>
            {isBn ? 'পাসওয়ার্ড' : 'Password'}
          </Text>
          <View style={styles.passRow}>
            <TextInput
              style={[styles.input, styles.inputWithReveal]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!visible}
              autoCapitalize="none"
              autoComplete="new-password"
              accessibilityLabel={isBn ? 'পাসওয়ার্ড' : 'Password'}
              accessibilityDescribedBy="hint-pw"
            />
            <Pressable
              onPress={() => setVisible((v) => !v)}
              style={({ pressed }) => [
                styles.revealBtn,
                pressed && styles.revealBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: visible }}
            >
              <Text style={styles.revealText}>
                {visible
                  ? (isBn ? 'লুকাও' : 'Hide')
                  : (isBn ? 'দেখাও' : 'Show')}
              </Text>
            </Pressable>
          </View>
          {/* Helper Note below password field (.sp-helper) */}
          <Text style={styles.helperText} nativeID="hint-pw">
            {isBn
              ? 'ন্যূনতম ৮ অক্ষর। সংখ্যা লাগবে না, তবে হলে ভালো।'
              : 'At least 8 characters. No numbers required, but they help.'}
          </Text>
        </View>

        {/* Confirm Password Field (.od-field, .sp-fld, .sp-passrow) */}
        <View style={styles.field}>
          <Text style={styles.label}>
            {isBn ? 'পাসওয়ার্ড আবার লিখো' : 'Confirm password'}
          </Text>
          <View style={styles.passRow}>
            <TextInput
              style={[styles.input, styles.inputWithReveal]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!visible}
              autoCapitalize="none"
              autoComplete="new-password"
              accessibilityLabel={isBn ? 'পাসওয়ার্ড আবার লিখো' : 'Confirm password'}
            />
          </View>
        </View>

        {/* Primary CTA Button (.sp-btn.primary) */}
        <View style={styles.ctaWrapper}>
          <Button
            title={isBn ? 'এগিয়ে যাও' : 'Continue'}
            variant="primary"
            size="lg"
            loading={isSaving}
            onPress={handleContinue}
            rightIcon={<ArrowRightIcon size={22} color="#FFFFFF" strokeWidth={2.4} />}
          />
        </View>
      </View>
    </OnboardingStepShell>
  );
}

const styles = StyleSheet.create({
  formStack: {
    gap: 16, // --od-gap: 16px from prototype
    width: '100%',
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary, // #1D1D1F
  },
  passRow: {
    position: 'relative', // .sp-passrow
    justifyContent: 'center',
  },
  input: {
    fontSize: 17,
    fontFamily: 'HindSiliguri-Regular',
    minHeight: 52, // 52px height from prototype
    backgroundColor: colors.surface, // #FFFFFF pure crisp white
    borderWidth: 2, // 2px border from prototype
    borderColor: colors.border, // #E5E5EA
    borderRadius: radius.input, // 14px radius from prototype
    paddingHorizontal: 16,
    color: colors.textPrimary,
  },
  inputWithReveal: {
    paddingRight: 76, // room for the Show/Hide toggle (.sp-passrow .sp-input)
  },
  revealBtn: {
    position: 'absolute',
    right: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
  },
  revealBtnPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  revealText: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary, // #6E6E73
    marginTop: 2,
  },
  ctaWrapper: {
    marginTop: 12,
  },
});
