import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Button from '../../../components/Button';
import OnboardingStepShell from '../../../components/OnboardingStepShell';
import { useAlert } from '../../../components/CustomAlert';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { useUser } from '../../../contexts/UserContext';
import { AVATAR_PRESETS, DEFAULT_AVATAR_BG } from '../../../lib/subjectIcons';
import { colors, radius } from '../../../theme/theme';

function isNoSessionError(err) {
  return (
    err?.message === 'Not authenticated' ||
    err?.name === 'AuthSessionMissingError' ||
    (typeof err?.message === 'string' && err.message.includes('Auth session missing'))
  );
}

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

function CheckIcon({ size = 18, color = colors.success }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m5 12.5 4.5 4.5L19 7"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PersonIcon({ size = 28, color = '#FFFFFF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8.6" r="3.4" stroke={color} strokeWidth={1.8} />
      <Path
        d="M5.5 19a6.5 6.5 0 0 1 13 0"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * PhotoStepScreen - Onboarding Step 5 of 9 (Avatar preset, optional).
 * Matches index.html#/photo structure (shell step 5, preview, lead,
 * 4-preset rail, "Photo added" confirmation, Continue + Skip) with one
 * deliberate simplification (human decision, STATUS.md): photo upload
 * is REMOVED — no expo-image-picker, no storage bucket, no upload
 * code. The 4 preset colors ARE the avatar. UI strings remain verbatim
 * from index.html (photoTitle, photoLead, photoAdded, skipPhoto,
 * continue); the "Choose a photo" CTA is gone with the upload flow.
 *
 * Select → updateData({avatarPreset: 0-3}) + real
 * updateProfile({avatar_preset}) (warn-tolerant while bypassed).
 * Skip → avatarPreset null, context only (no server call, per
 * prototype), navigate onward.
 */
export default function PhotoStepScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { data, updateData } = useOnboarding();
  const { updateProfile } = useUser();
  const alert = useAlert();

  const [presetIndex, setPresetIndex] = useState(
    typeof data.avatarPreset === 'number' ? data.avatarPreset : null
  );
  const [isSaving, setIsSaving] = useState(false);

  const isBn = lang === 'bn';
  const hasAvatar = presetIndex !== null;

  const avatarLetter = ((data.nickname || data.name || 'A').trim().charAt(0) || 'A').toUpperCase();
  const previewBg =
    presetIndex !== null ? AVATAR_PRESETS[presetIndex].bg : DEFAULT_AVATAR_BG;

  const selectPreset = (index) => {
    setPresetIndex(index);
    updateData({ avatarPreset: index });
  };

  const handleContinue = async () => {
    if (presetIndex === null) {
      alert(
        isBn ? 'অ্যাভাটার বেছে নাও' : 'Choose an Avatar',
        isBn
          ? 'নিচ থেকে একটা রঙ বেছে নাও, অথবা বাদ দাও।'
          : 'Pick a color below, or skip this step.'
      );
      return;
    }
    updateData({ avatarPreset: presetIndex });
    setIsSaving(true);
    try {
      await updateProfile({ avatar_preset: presetIndex });
      navigation?.navigate?.('OnboardingTerms');
    } catch (err) {
      if (isNoSessionError(err)) {
        // TEMP DEV BYPASS (see STATUS.md) — no live session while OTP
        // is bypassed: keep click-through moving.
        console.warn('TEMP DEV BYPASS: no live session, avatar preset kept locally only:', err?.message);
        navigation?.navigate?.('OnboardingTerms');
      } else {
        alert(
          'Could Not Save Photo',
          err?.message || 'Could not save the avatar. Please try again.'
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    // Prototype skips with no server call: context only, then onward.
    setPresetIndex(null);
    updateData({ avatarPreset: null });
    navigation?.navigate?.('OnboardingTerms');
  };

  return (
    <OnboardingStepShell
      step={5}
      totalSteps={9}
      title={isBn ? 'প্রোফাইল ফটো যোগ করো' : 'Add a profile photo'}
      onBack={() => navigation?.goBack?.()}
      lang={lang}
    >
      <View style={styles.inner}>
        {/* Avatar Preview (.sp-avatar) */}
        <View
          style={[styles.avatar, { backgroundColor: previewBg }]}
          accessibilityRole="image"
          accessibilityLabel={isBn ? 'তোমার অ্যাভাটার' : 'Your avatar'}
        >
          <Text style={styles.avatarLetter}>{avatarLetter}</Text>
        </View>

        {/* Lead Text (.sp-lead) */}
        <Text style={styles.leadText}>
          {isBn
            ? 'ঐচ্ছিক — পরে যেকোনো সময় বদলাতে পারবে।'
            : 'Optional — you can change it anytime.'}
        </Text>

        {/* Preset Avatar Rail (.ava-rail) */}
        <View style={styles.rail} accessibilityRole="group">
          {AVATAR_PRESETS.map((preset, index) => {
            const selected = presetIndex === index;
            return (
              <Pressable
                key={index}
                onPress={() => selectPreset(index)}
                style={[
                  styles.preset,
                  { backgroundColor: preset.bg },
                  selected && styles.presetSelected,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Avatar option ${index + 1}`}
              >
                <PersonIcon size={28} color="#FFFFFF" />
              </Pressable>
            );
          })}
        </View>

        {/* Confirmation (.sp-photo-ok) */}
        {hasAvatar && (
          <View style={styles.addedRow}>
            <CheckIcon size={18} />
            <Text style={styles.addedText}>
              {isBn ? 'ফটো যোগ হয়েছে' : 'Photo added'}
            </Text>
          </View>
        )}

        {/* Action Buttons Stack */}
        <View style={styles.actionStack}>
          <Button
            title={isBn ? 'এগিয়ে যাও' : 'Continue'}
            variant="primary"
            size="lg"
            loading={isSaving}
            onPress={handleContinue}
            rightIcon={<ArrowRightIcon size={22} color="#FFFFFF" strokeWidth={2.4} />}
          />
          <Button
            title={isBn ? 'এখন বাদ দাও' : 'Skip for now'}
            variant="secondary"
            size="lg"
            onPress={handleSkip}
          />
        </View>
      </View>
    </OnboardingStepShell>
  );
}

const styles = StyleSheet.create({
  inner: {
    flexDirection: 'column',
    alignItems: 'center', // .scr-photo centers content
    gap: 20, // 20px gap from .scr-photo-inner
    width: '100%',
    paddingVertical: 12,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLetter: {
    fontSize: 44,
    fontFamily: 'HindSiliguri-SemiBold',
    color: '#FFFFFF',
  },
  leadText: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary, // #6E6E73
    textAlign: 'center',
  },
  rail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  preset: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  presetSelected: {
    borderColor: colors.primary, // selected ring
  },
  addedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addedText: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  actionStack: {
    gap: 12, // 12px gap from prototype
    width: '100%',
  },
});
