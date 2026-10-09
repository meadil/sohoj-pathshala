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
 * NameStepScreen - Onboarding Step 4 of 9 (Permanent Name + Nickname)
 * Matches index.html#/name exactly:
 * - OnboardingStepShell with step 4 of 9
 * - Lead text shown to friends note (.sp-lead)
 * - Permanent name input with placeholder + immutable-record helper
 * - Nickname input with placeholder
 * - Primary CTA "এগিয়ে যাও" / "Continue"
 * All Bangla/English strings pulled verbatim from index.html
 * (nameTitle, nameLead, nameLabelReal, namePhReal, hintReal,
 * nameLabelNick, namePhNick, continue).
 */
export default function NameStepScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { data, updateData } = useOnboarding();
  const { updateProfile } = useUser();
  const alert = useAlert();

  const [name, setName] = useState(data.name || '');
  const [nickname, setNickname] = useState(data.nickname || '');
  const [isSaving, setIsSaving] = useState(false);

  const isBn = lang === 'bn';

  const handleContinue = async () => {
    const trimmedName = name.trim();
    const trimmedNick = nickname.trim();

    if (!trimmedName) {
      alert(
        isBn ? 'নাম প্রয়োজন' : 'Name Required',
        isBn
          ? 'অনুগ্রহ করে তোমার সত্যিকারের নাম লিখো।'
          : 'Please enter your permanent name.'
      );
      return;
    }

    // Save to OnboardingContext
    updateData({ name: trimmedName, nickname: trimmedNick });

    // Real profile save via Supabase — no placeholder logic.
    // NOTE: while the TEMP DEV BYPASS is active (see STATUS.md) there is
    // no live auth session, so this call is expected to fail — it is
    // caught and logged below so screen-building can continue.
    setIsSaving(true);
    try {
      const updates = { name: trimmedName };
      if (trimmedNick) {
        updates.nickname = trimmedNick;
      }
      await updateProfile(updates);
      navigation?.navigate?.('OnboardingPhoto');
    } catch (err) {
      if (
        err?.message === 'Not authenticated' ||
        err?.name === 'AuthSessionMissingError' ||
        err?.message?.includes('Auth session missing')
      ) {
        // TEMP DEV BYPASS (see STATUS.md) — no live session while OTP is
        // bypassed: skip the alert and keep click-through moving.
        console.warn('TEMP DEV BYPASS: no live session, skipping real profile save:', err?.message);
        navigation?.navigate?.('OnboardingPhoto');
      } else {
        alert(
          'Could Not Save Name',
          err?.message || 'Could not save the name. Please try again.'
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OnboardingStepShell
      step={4}
      totalSteps={9}
      title={isBn ? 'তোমাকে কী নামে ডাকবো?' : 'What should we call you?'}
      onBack={() => navigation?.goBack?.()}
      lang={lang}
    >
      {/* Lead Text (.sp-lead) */}
      <Text style={styles.leadText}>
        {isBn
          ? 'Sohoj Pathshala-এ বন্ধুরা এই নাম দেখবে।'
          : 'Friends at Sohoj Pathshala will see this.'}
      </Text>

      {/* Form Fields Stack (.od-stack with gap: 16px) */}
      <View style={styles.formStack}>
        {/* Permanent Name Field (.od-field, .sp-fld) */}
        <View style={styles.field}>
          <Text style={styles.label}>
            {isBn ? 'সত্যিকারের নাম' : 'Permanent name'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={isBn ? 'আদিল হাসান' : 'Adil Hasan'}
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            accessibilityDescribedBy="hint-real"
          />
          {/* Helper Note below name field (.sp-helper) */}
          <Text style={styles.helperText} nativeID="hint-real">
            {isBn
              ? 'তোমার রেকর্ডে থেকে যাবে — পরে এই নাম বদলানো যাবে না।'
              : "Stored on your record — this name can't be changed later."}
          </Text>
        </View>

        {/* Nickname Field (.od-field, .sp-fld) */}
        <View style={styles.field}>
          <Text style={styles.label}>
            {isBn ? 'ডাকনাম' : 'Nickname'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={isBn ? 'আদিল' : 'Adil'}
            placeholderTextColor={colors.textTertiary}
            value={nickname}
            onChangeText={setNickname}
            autoCapitalize="words"
            autoComplete="nickname"
          />
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
