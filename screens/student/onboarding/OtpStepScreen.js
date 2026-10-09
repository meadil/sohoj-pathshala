import React, { useRef, useState } from 'react';
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
import { useUser } from '../../../contexts/UserContext';
import { colors, radius, spacing } from '../../../theme/theme';

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
 * OtpStepScreen - Onboarding Step 2 of 9 (Email OTP Verification)
 * Matches index.html#/otp exactly:
 * - OnboardingStepShell with step 2 of 9
 * - Lead text with user's email highlighted inline
 * - 6 single-digit input boxes with auto-advance and backspace handling
 * - Primary CTA "ইমেইল যাচাই করো" / "Verify email"
 * - Secondary ghost button "কোড পাইনি? আবার পাঠাও" / "Didn't get it? Resend code"
 * - Small footer note from prototype
 */
export default function OtpStepScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { data, updateData } = useOnboarding();
  const { signInWithOtp, verifyOtp } = useUser();
  const alert = useAlert();

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // References to the 6 TextInput inputs for auto-focus
  const inputRefs = useRef([]);

  const isBn = lang === 'bn';
  const displayEmail = data.email || (isBn ? 'তোমার ইমেইল' : 'your email');

  const handleDigitChange = (value, index) => {
    // Handle pasting a 6-digit code
    if (value.length > 1) {
      const cleaned = value.replace(/\D/g, '').slice(0, 6);
      if (cleaned.length > 0) {
        const newDigits = [...digits];
        for (let i = 0; i < 6; i++) {
          newDigits[i] = cleaned[i] || '';
        }
        setDigits(newDigits);
        const nextFocus = Math.min(cleaned.length, 5);
        inputRefs.current[nextFocus]?.focus();
        return;
      }
    }

    const cleanChar = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanChar;
    setDigits(newDigits);

    // Auto-advance to next box if filled
    if (cleanChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    // Move to previous box on backspace if current box is empty
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = digits.join('');
    // TEMP DEV BYPASS — OTP disabled until domain/SMTP verified with
    // Resend (see STATUS.md). Auto-advances without a real session.
    // TODO: remove this block once domain is verified, restore real
    // verifyOtp() flow below.
    // NOTE: this early return INTENTIONALLY sits above the 6-digit
    // length gate — the gate is dead code while bypassed and goes live
    // again automatically post-revert. Do not "fix" the ordering.
    updateData({ otp: code });
    navigation?.navigate?.('OnboardingPassword');
    return;

    if (code.length < 6) {
      alert(
        isBn ? 'কোড অসম্পূর্ণ' : 'Incomplete Code',
        isBn
          ? 'অনুগ্রহ করে ৬ অঙ্কের ভেরিফিকেশন কোডটি সম্পূর্ণ লিখো।'
          : 'Please enter the complete 6-digit verification code.'
      );
      return;
    }

    // Save entered OTP code to OnboardingContext
    updateData({ otp: code });

    // Real verification via Supabase — no placeholder logic
    setIsVerifying(true);
    try {
      await verifyOtp({ email: data.email, token: code });
      navigation?.navigate?.('OnboardingPassword');
    } catch (err) {
      alert(
        'Verification Failed',
        err?.message || 'The code could not be verified. Please try again.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    // NOTE: resend intentionally left on the REAL path (not bypassed).
    // Until the Resend domain is verified it WILL fail with an honest
    // rate-limit/delivery error alert — dead by SMTP state, not by code.
    // No change needed here at revert; verify delivery works instead.
    setIsResending(true);
    try {
      // Re-send by re-invoking signInWithOtp with the same email
      await signInWithOtp({ email: data.email, phone: data.phone });
      alert(
        isBn ? 'কোড আবার পাঠানো হয়েছে' : 'Code Resent',
        isBn
          ? `${displayEmail} এ একটি নতুন ভেরিফিকেশন কোড পাঠানো হয়েছে।`
          : `A fresh verification code has been sent to ${displayEmail}.`
      );
    } catch (err) {
      alert(
        'Resend Failed',
        err?.message || 'Could not resend the code. Please try again.'
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <OnboardingStepShell
      step={2}
      totalSteps={9}
      title={isBn ? 'ইমেইল যাচাই করো' : 'Verify your email'}
      onBack={() => {
        if (navigation?.canGoBack?.()) navigation.goBack();
        else navigation?.navigate?.('OnboardingAccount');
      }}
      lang={lang}
    >
      {/* Lead Text with inline bold email (.sp-lead) */}
      <Text style={styles.leadText}>
        {isBn ? (
          <>
            {'আমরা একটা ৬ অঙ্কের কোড পাঠিয়েছি '}
            <Text style={styles.emailHighlight}>{displayEmail}</Text>
            {' এ। নিচে সেটা লিখো।'}
          </>
        ) : (
          <>
            {'We sent a 6-digit code to '}
            <Text style={styles.emailHighlight}>{displayEmail}</Text>
            {'. Enter it below.'}
          </>
        )}
      </Text>

      {/* 6-Digit OTP Box Row (.od-row, .sp-otp) */}
      <View style={styles.otpGroup} accessibilityRole="group" accessibilityLabel="6-digit verification code">
        {digits.map((digit, index) => {
          const isFilled = Boolean(digit);
          return (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.otpBox,
                isFilled && styles.otpBoxFilled,
              ]}
              value={digit}
              onChangeText={(val) => handleDigitChange(val, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={index === 0 ? 6 : 1}
              selectTextOnFocus
              textAlign="center"
              accessibilityLabel={`Digit ${index + 1}`}
            />
          );
        })}
      </View>

      {/* Action Buttons Stack */}
      <View style={styles.actionStack}>
        <Button
          title={isBn ? 'ইমেইল যাচাই করো' : 'Verify email'}
          variant="primary"
          size="lg"
          loading={isVerifying}
          onPress={handleVerify}
          rightIcon={<ArrowRightIcon size={22} color="#FFFFFF" strokeWidth={2.4} />}
        />

        <Pressable
          onPress={handleResend}
          disabled={isResending}
          style={({ pressed }) => [
            styles.resendBtn,
            pressed && styles.resendBtnPressed,
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.resendText}>
            {isResending
              ? (isBn ? 'পাঠানো হচ্ছে...' : 'Sending...')
              : (isBn ? 'কোড পাইনি? আবার পাঠাও' : "Didn't get it? Resend code")}
          </Text>
        </Pressable>

        {/* Footer note: plain accurate copy — enter the emailed code */}
        <Text style={styles.footerNote}>
          {isBn
            ? 'আপনার ইমেইলে পাঠানো কোডটি লিখুন।'
            : 'Enter the code sent to your email.'}
        </Text>
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
  emailHighlight: {
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary, // #1D1D1F
  },

  // 6-digit box layout (.sp-otp, .sp-otp-box)
  otpGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6, // 6px gap from prototype
    width: '100%',
    paddingVertical: 8,
  },
  otpBox: {
    flex: 1,
    maxWidth: 48,
    height: 58, // 48px width, 58px height from prototype
    borderRadius: radius.input, // 14px radius
    backgroundColor: colors.surface, // #FFFFFF pure white
    borderWidth: 2, // 2px border
    borderColor: colors.border, // #E5E5EA
    fontSize: 22,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary, // #1D1D1F
    includeFontPadding: false,
    padding: 0,
  },
  otpBoxFilled: {
    borderColor: colors.borderDeep, // #DFD5C4 deeper border when filled
  },

  actionStack: {
    gap: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  resendBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
  },
  resendBtnPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  resendText: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary, // #6E6E73
    textAlign: 'center',
  },
  footerNote: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary, // #6E6E73
    textAlign: 'center',
    marginTop: 4,
  },
});
