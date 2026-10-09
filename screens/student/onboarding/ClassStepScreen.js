import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import OnboardingStepShell from '../../../components/OnboardingStepShell';
import { useAlert } from '../../../components/CustomAlert';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { useUser } from '../../../contexts/UserContext';
import { getClassLevelId } from '../../../lib/classLevel';
import { colors, radius } from '../../../theme/theme';

const LEVELS = ['SSC', 'HSC'];

function isNoSessionError(err) {
  return (
    err?.message === 'Not authenticated' ||
    err?.name === 'AuthSessionMissingError' ||
    (typeof err?.message === 'string' && err.message.includes('Auth session missing'))
  );
}

function CheckIcon({ size = 16, color = '#FFFFFF', strokeWidth = 3 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m5 12.5 4.5 4.5L19 7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * ClassStepScreen - Onboarding Step 7 of 9 (Class Level: SSC / HSC)
 * Matches index.html#/class exactly:
 * - OnboardingStepShell with step 7 of 9
 * - Lead text + two selectable level cards (.sp-class-grid, .sp-class),
 *   each with check badge, level name, full-form subtitle, classes line
 * - Science-only note (.sp-note)
 * - NO separate CTA button: tapping a card selects + saves + advances,
 *   per prototype (260ms tap-to-reveal)
 * All Bangla/English strings pulled verbatim from index.html
 * (classTitle, classLead, classGroupAria, subSSC, subHSC, cls910,
 * cls1112, classNote).
 *
 * Single binary choice only — no batch/year/group selector, matching
 * student-system-design.md Section 1 step 8 and the prototype (which
 * shows exactly two .sp-class cards, nothing more).
 *
 * The class_levels row id is QUERIED by name at runtime (never a
 * hardcoded UUID). Verified against Supabase/current-schema-reference.md:
 * class_levels has (id uuid PK, name text unique e.g. "SSC"/"HSC",
 * order_index int) — exact case-sensitive match on 'SSC'/'HSC' is
 * correct, and .single() is safe (unique). RLS is authenticated-only,
 * so the lookup is session-gated (see bypass gate below). Both
 * classLevelId (row UUID, or null while bypassed) and classLevelName
 * (tapped key, schema-guaranteed equal to the row name) are stored via
 * the shared lib/classLevel helpers so Step 8 Reveal can read
 * classLevelName without caring which state produced it.
 */
export default function ClassStepScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { updateData } = useOnboarding();
  const { session, updateProfile } = useUser();
  const alert = useAlert();

  const [selected, setSelected] = useState(null); // 'SSC' | 'HSC' | null
  const [savingLevel, setSavingLevel] = useState(null);

  const isBn = lang === 'bn';

  const levelText = (level) => {
    if (level === 'SSC') {
      return {
        sub: isBn ? 'সেকেন্ডারি স্কুল সার্টিফিকেট' : 'Secondary School Certificate',
        classes: isBn ? '৯ – ১০ শ্রেণি' : 'Classes 9 – 10',
      };
    }
    return {
      sub: isBn ? 'হায়ার সেকেন্ডারি সার্টিফিকেট' : 'Higher Secondary Certificate',
      classes: isBn ? '১১ – ১২ শ্রেণি' : 'Classes 11 – 12',
    };
  };

  const handleSelect = async (level) => {
    if (savingLevel) {
      return;
    }
    setSelected(level);
    // TEMP DEV BYPASS gate (see STATUS.md): with no live session the
    // class_levels lookup (RLS: authenticated-only) cannot run — skip
    // straight to local state. Post-revert (session exists) the full
    // real path below runs. Never fake a session.
    // TODO post-revert: unify on this session-presence pattern in
    // Steps 3-5 too (they currently match on error-message strings).
    if (!session?.user?.id) {
      console.warn('TEMP DEV BYPASS: no live session, class level kept locally only');
      updateData({ classLevelId: null, classLevelName: level });
      navigation?.navigate?.('OnboardingReveal');
      return;
    }
    setSavingLevel(level);
    try {
      // Real lookup: fetch the class_levels row id by name at runtime
      // (shared helper — never a hardcoded UUID). classLevelName stores
      // the tapped key, which the schema guarantees equals the row name
      // (unique + verified 'SSC'/'HSC').
      const rowId = await getClassLevelId(level);
      updateData({ classLevelId: rowId, classLevelName: level });
      await updateProfile({ class_level_id: rowId });
      navigation?.navigate?.('OnboardingReveal');
    } catch (err) {
      if (isNoSessionError(err)) {
        console.warn('TEMP DEV BYPASS: session lost mid-save, class level kept locally only:', err?.message);
        updateData({ classLevelId: null, classLevelName: level });
        navigation?.navigate?.('OnboardingReveal');
      } else {
        alert(
          'Could Not Save Class',
          err?.message || 'Could not save the class level. Please try again.'
        );
      }
    } finally {
      setSavingLevel(null);
    }
  };

  return (
    <OnboardingStepShell
      step={7}
      totalSteps={9}
      title={isBn ? 'তুমি কোন ক্লাসে?' : 'Which class are you in?'}
      onBack={() => navigation?.goBack?.()}
      lang={lang}
    >
      {/* Lead Text (.sp-lead) */}
      <Text style={styles.leadText}>
        {isBn ? 'প্রতি লেভেলে পাঠ আলাদা হয়।' : 'Lessons look different per level.'}
      </Text>

      {/* Level Cards (.sp-class-grid) */}
      <View
        style={styles.grid}
        accessibilityRole="group"
        accessibilityLabel={isBn ? 'ক্লাস লেভেল বেছে নাও' : 'Choose a class level'}
      >
        {LEVELS.map((level) => {
          const text = levelText(level);
          const isSelected = selected === level;
          const isSaving = savingLevel === level;
          return (
            <Pressable
              key={level}
              onPress={() => handleSelect(level)}
              disabled={Boolean(savingLevel)}
              style={({ pressed }) => [
                styles.card,
                isSelected && styles.cardSelected,
                (pressed || isSaving) && styles.cardPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: Boolean(savingLevel) }}
              accessibilityLabel={`${level}, ${text.sub}, ${text.classes}`}
            >
              <View style={[styles.check, isSelected && styles.checkSelected]}>
                <CheckIcon size={15} color={isSelected ? '#FFFFFF' : colors.textTertiary} />
              </View>
              <Text style={styles.levelName}>{level}</Text>
              <Text style={styles.levelSub}>{text.sub}</Text>
              <Text style={styles.levelClasses}>{text.classes}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Science-only Note (.sp-note) */}
      <Text style={styles.note} nativeID="class-note">
        {isBn
          ? 'আপাতত শুধু বিজ্ঞান।'
          : 'Science only for now.'}
      </Text>
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
  grid: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  card: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface, // #FFFFFF
    borderWidth: 2,
    borderColor: colors.border, // #E5E5EA
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 18,
    gap: 4,
  },
  cardSelected: {
    borderColor: colors.primary,
  },
  cardPressed: {
    opacity: 0.85,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  checkSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  levelName: {
    fontSize: 22,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary, // #1D1D1F
  },
  levelSub: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  levelClasses: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 2,
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary, // #6E6E73
    textAlign: 'center',
  },
});
