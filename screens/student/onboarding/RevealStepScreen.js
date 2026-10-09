import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Svg, { Circle, Path } from 'react-native-svg';
import Button from '../../../components/Button';
import OnboardingStepShell from '../../../components/OnboardingStepShell';
import { useAlert } from '../../../components/CustomAlert';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { SubjectIcon } from '../../../lib/subjectIcons';
import { colors, radius } from '../../../theme/theme';

// Subject lists per level, matching index.html SUBJECTS map verbatim
// (SSC: Physics, Chemistry, Biology, Math; HSC: Physics, Chemistry,
// Higher Math, Biology).
const SUBJECTS = {
  SSC: [
    { key: 'physics', icon: 'atom' },
    { key: 'chemistry', icon: 'flask' },
    { key: 'biology', icon: 'leaf' },
    { key: 'math', icon: 'sigma' },
  ],
  HSC: [
    { key: 'physics', icon: 'atom' },
    { key: 'chemistry', icon: 'flask' },
    { key: 'highmath', icon: 'sigma' },
    { key: 'biology', icon: 'leaf' },
  ],
};

const SUBJECT_NAMES = {
  physics: { bn: 'পদার্থবিজ্ঞান', en: 'Physics' },
  chemistry: { bn: 'রসায়ন', en: 'Chemistry' },
  biology: { bn: 'জীববিজ্ঞান', en: 'Biology' },
  math: { bn: 'গণিত', en: 'Mathematics' },
  highmath: { bn: 'উচ্চতর গণিত', en: 'Higher Mathematics' },
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Confetti palette mirrors the prototype's spawnConfetti colors, mapped
// onto design tokens: primary clay, secondary gold, success green,
// danger red, primaryStrong bevel, warning amber.
const CONFETTI_COLORS = [
  colors.primary,
  colors.secondary,
  colors.success,
  colors.danger,
  colors.primaryStrong,
  colors.warning,
];

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

function CheckIcon({ size = 18, color = colors.success, strokeWidth = 2.4 }) {
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

function TrophyIcon({ size = 48, color = '#FFFFFF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="m12 2.5 2.6 5.7 6.2.6-4.7 4.1 1.4 6.1L12 15.9l-5.5 3.1 1.4-6.1L3.2 8.8l6.2-.6Z" />
    </Svg>
  );
}

/**
 * RevealStepScreen - Onboarding Step 8 of 9 (Class Reveal Celebration)
 * Matches index.html#/reveal: the celebratory screen KEEPS the standard
 * step chrome (sp-head header, "Step 8 of 9", progress bar) — rendered
 * here via OnboardingStepShell — with a centered celebration body:
 * trophy star, personalized unlock title, lead text, subject list with
 * icons, ready banner with nickname, Continue CTA.
 * All Bangla/English strings pulled verbatim from index.html
 * (revealAlm, revealTitle with {level}, revealLead, subjAria, subPhysics,
 * subChemistry, subBiology, subMath, subHighMath, readyPre, readySuf,
 * friend, continue).
 *
 * Personalization reads classLevelName from onboarding context (works in
 * both bypass and post-revert states), falling back to 'SSC' exactly
 * like the prototype (`state.level || 'SSC'`). Nickname falls back to
 * the first word of the name, then friend — matching displayName().
 *
 * No Supabase call on this step (pure celebratory display, per
 * student-system-design.md Section 1 step 9) — no bypass concerns.
 *
 * Confetti burst mirrors index.html spawnConfetti: 80 pieces, design
 * token colors, ~1.4s fall, fired once on mount via autoStart in a
 * full-screen pointer-transparent overlay. Skipped when the OS
 * reduce-motion setting is on (prototype does the same).
 */
export default function RevealStepScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { data } = useOnboarding();
  const alert = useAlert();

  // Respect the OS reduce-motion setting (prototype skips confetti when
  // prefers-reduced-motion is set) — no animation in that case.
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
  }, []);

  const isBn = lang === 'bn';

  const levelKey = data.classLevelName === 'HSC' ? 'HSC' : 'SSC';
  const subjects = SUBJECTS[levelKey];

  const nickname =
    (data.nickname || '').trim() ||
    (data.name || '').trim().split(/\s+/)[0] ||
    (isBn ? 'বন্ধু' : 'friend');

  const title = isBn
    ? `${levelKey} বিজ্ঞান — আনলক হয়ে গেছে!`
    : `${levelKey} Science — unlocked!`;

  const handleContinue = () => {
    navigation?.navigate?.('OnboardingLocation');
  };

  return (
    <View style={styles.screen}>
      <OnboardingStepShell
      step={8}
      totalSteps={9}
      title={isBn ? 'তুমি প্রায় ঢুকে গেছো' : "You're almost in"}
      onBack={() => navigation?.goBack?.()}
      lang={lang}
    >
      <View style={styles.inner}>
        {/* Trophy (.sp-trophy) */}
        <View style={styles.trophy}>
          <TrophyIcon size={48} />
        </View>

        {/* Personalized Title (.sp-reveal-title) */}
        <Text style={styles.title}>{title}</Text>

        {/* Lead Text (.sp-lead, centered) */}
        <Text style={styles.leadText}>
          {isBn
            ? 'তোমার ক্লাসের সবকিছু প্রস্তুত — এবার বিজ্ঞান হোক সহজ।'
            : "Everything in your class is ready — let's make Science simple."}
        </Text>

        {/* Subject List (.sp-subjects) */}
        <View
          style={styles.subjectList}
          accessibilityLabel={isBn ? 'তোমার ক্লাসে থাকা বিষয়' : 'Subjects included for your class'}
        >
          {subjects.map((subject) => (
            <View key={subject.key} style={styles.subjectRow}>
              <View style={styles.subjectIcon}>
                <SubjectIcon icon={subject.icon} size={26} />
              </View>
              <Text style={styles.subjectName}>
                {isBn ? SUBJECT_NAMES[subject.key].bn : SUBJECT_NAMES[subject.key].en}
              </Text>
              <CheckIcon size={18} />
            </View>
          ))}
        </View>

        {/* Ready Banner (.sp-ready) */}
        <View style={styles.readyBanner}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="9" stroke={colors.success} strokeWidth={1.8} />
            <Path
              d="m8 12.5 2.6 2.6L16 9.5"
              stroke={colors.success}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.readyText}>
            {isBn ? 'তোমার অ্যাকাউন্ট প্রস্তুত — স্বাগতম, ' : 'Your account is ready — hello, '}
            <Text style={styles.readyNick}>{nickname}</Text>
            {'!'}
          </Text>
        </View>

        {/* Primary CTA Button (.sp-btn.primary) */}
        <View style={styles.ctaWrapper}>
          <Button
            title={isBn ? 'এগিয়ে যাও' : 'Continue'}
            variant="primary"
            size="lg"
            onPress={handleContinue}
            rightIcon={<ArrowRightIcon size={22} color="#FFFFFF" strokeWidth={2.4} />}
          />
        </View>
        </View>
      </OnboardingStepShell>
      {/* Confetti burst (.confetti-stage): full-screen overlay, fires once
          on mount via autoStart, pointer-transparent so content stays
          tappable. Skipped entirely under reduce-motion. */}
      {!reduceMotion && (
        <View style={styles.confettiStage} pointerEvents="none">
          <ConfettiCannon
            count={80}
            origin={{ x: SCREEN_WIDTH / 2, y: 0 }}
            autoStart
            fadeOut
            fallSpeed={1400}
            explosionSpeed={350}
            colors={CONFETTI_COLORS}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  // Full-screen overlay mirroring .confetti-stage (absolute inset,
  // above content, taps pass through).
  confettiStage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    elevation: 10,
  },
  inner: {
    flexDirection: 'column',
    alignItems: 'center', // .scr-reveal-inner centers content
    gap: 16,
    width: '100%',
    paddingVertical: 12,
  },
  trophy: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EAB308', // gold, from prototype confetti palette
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    lineHeight: 30,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary, // #1D1D1F
    textAlign: 'center',
  },
  leadText: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary, // #6E6E73
    textAlign: 'center',
  },
  subjectList: {
    gap: 10,
    width: '100%',
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface, // #FFFFFF
    borderWidth: 2,
    borderColor: colors.border, // #E5E5EA
    borderRadius: radius.input, // 14px
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  subjectIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectName: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  readyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.successSubtle,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '100%',
  },
  readyText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textPrimary,
  },
  readyNick: {
    fontFamily: 'HindSiliguri-SemiBold',
  },
  ctaWrapper: {
    marginTop: 4,
    width: '100%',
  },
});
