import React, { useState } from 'react';
import {
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
import { useUser } from '../../../contexts/UserContext';
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
 * AccountStepScreen - Onboarding Step 1 of 9 (Email + Phone)
 * Matches index.html#/account exactly:
 * - Reusable OnboardingStepShell header & 9-segment progress bar
 * - Lead text explaining email & phone collection
 * - Email address input with placeholder "you@example.com"
 * - Phone number input with placeholder "01712 345678"
 * - Note explaining code is emailed, phone is for updates
 * - Primary CTA "এগিয়ে যাও →" / "Continue →"
 */
export default function AccountStepScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { data, updateData } = useOnboarding();
  const { signInWithOtp } = useUser();
  const alert = useAlert();

  const [email, setEmail] = useState(data.email || '');
  const [phone, setPhone] = useState(data.phone || '');
  const [isSending, setIsSending] = useState(false);

  const isBn = lang === 'bn';

  const handleContinue = async () => {
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedEmail) {
      alert(
        isBn ? 'ইমেইল প্রয়োজন' : 'Email Required',
        isBn
          ? 'অনুগ্রহ করে তোমার ইমেইল ঠিকানা লিখো।'
          : 'Please enter your email address.'
      );
      return;
    }

    if (!trimmedPhone) {
      alert(
        isBn ? 'ফোন নম্বর প্রয়োজন' : 'Phone Number Required',
        isBn
          ? 'অনুগ্রহ করে তোমার যোগাযোগের ফোন নম্বর লিখো।'
          : 'Please enter your contact phone number.'
      );
      return;
    }

    // Save to OnboardingContext
    updateData({ email: trimmedEmail, phone: trimmedPhone });

    // TEMP DEV BYPASS — OTP disabled until domain/SMTP verified with
    // Resend (see STATUS.md). Skips the real signInWithOtp() API call.
    // TODO: remove this block once domain is verified, restore real
    // signInWithOtp() flow below.
    navigation?.navigate?.('OnboardingOtp');
    return;

    // Send the initial email OTP, then move to Step 2
    setIsSending(true);
    try {
      await signInWithOtp({ email: trimmedEmail, phone: trimmedPhone });
      navigation?.navigate?.('OnboardingOtp');
    } catch (err) {
      alert(
        'Unable to Send Code',
        err?.message || 'Could not send the verification code. Please try again.'
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <OnboardingStepShell
      step={1}
      totalSteps={9}
      title={isBn ? 'তোমার অ্যাকাউন্ট খুলো' : 'Create your account'}
      onBack={() => navigation?.goBack?.() || navigation?.navigate?.('Landing')}
      lang={lang}
    >
      {/* Lead Text (.sp-lead) */}
      <Text style={styles.leadText}>
        {isBn
          ? 'যে ইমেইল আর ফোন নম্বর দিয়ে সাইন-ইন করবে, সেগুলো লিখো।'
          : "Enter the email and phone number you'll sign in with."}
      </Text>

      {/* Form Fields Stack (.od-stack with gap: 16px) */}
      <View style={styles.formStack}>
        {/* Email Field (.od-field, .sp-fld) */}
        <View style={styles.field}>
          <Text style={styles.label}>
            {isBn ? 'ইমেইল ঠিকানা' : 'Email address'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
        </View>

        {/* Phone Field (.od-field, .sp-fld) */}
        <View style={styles.field}>
          <Text style={styles.label}>
            {isBn ? 'ফোন নম্বর' : 'Phone number'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="01712 345678"
            placeholderTextColor={colors.textTertiary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          {/* Helper Note below phone field (.sp-helper) */}
          <Text style={styles.helperText}>
            {isBn
              ? 'শুধু আপডেট জানাতে — কনফার্মেশন কোড ইমেইলে আসবে।'
              : 'For contact updates only — your code arrives by email.'}
          </Text>
        </View>

        {/* Primary CTA Button (.sp-btn.primary) */}
        <View style={styles.ctaWrapper}>
          <Button
            title={isBn ? 'এগিয়ে যাও' : 'Continue'}
            variant="primary"
            size="lg"
            loading={isSending}
            onPress={handleContinue}
            rightIcon={<ArrowRightIcon size={22} color="#FFFFFF" strokeWidth={2.4} />}
          />
        </View>
      </View>
    </OnboardingStepShell>
  );
}

const styles = StyleSheet.create({
  leadText: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary, // #6E6E73
  },
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
