import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useAlert } from '../../../components/CustomAlert';
import { useUser } from '../../../contexts/UserContext';
import { checkCourseAccess } from './gate';
import { SubjectIcon } from '../../../lib/subjectIcons';
import { colors, radius } from '../../../theme/theme';

function BackIcon({ size = 24, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Chevron({ size = 22, color = colors.textTertiary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Both cards share one white style (icon + text in brand color) —
// per human decision, no primary/secondary split.
const CARDS = [
  { icon: 'atom', titleBn: 'CQ প্র্যাকটিস', titleEn: 'CQ practice', subBn: 'বিষয়ভিত্তিক CQ — ধাপে ধাপে ভিডিও সমাধান সহ', subEn: 'Subject-wise CQ with step-by-step video solutions', target: 'CQList' },
  { icon: 'flask', titleBn: 'MCQ কুইজ', titleEn: 'MCQ quizzes', subBn: 'সাপ্তাহিক লাইভ + অধ্যায়ভিত্তিক টেস্ট', subEn: 'Weekly live + chapter tests', target: 'MCQList' },
];

/**
 * CourseHomeScreen - Purchased course hub (scr-course-home).
 * Matches index.html: gen-head (back → Dashboard, "My Course") + hub
 * cards with verbatim copy. DEVIATION 2026-09-27: the prototype's
 * third "All videos" card (which routed to the same CQList as card 1)
 * was removed per human decision — it duplicated card 1 exactly.
 *
 * Entry is purchase-gated via the REAL is_purchased() RPC (shared
 * gate.js; bypass previews with a warn).
 */
export default function CourseHomeScreen({ navigation, route }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { session } = useUser();
  const alert = useAlert();

  const courseId = route?.params?.courseId || null;
  const isBn = lang === 'bn';

  const [checkingTarget, setCheckingTarget] = useState(null);

  const go = async (target) => {
    if (checkingTarget) {
      return;
    }
    setCheckingTarget(target);
    try {
      const { allowed } = await checkCourseAccess(courseId, session?.user?.id);
      if (!allowed) {
        alert(
          isBn ? 'কোর্স কিনুন' : 'Buy Course',
          isBn
            ? 'এই কনটেন্ট দেখতে কোর্সটি কিনুন।'
            : 'Please buy this course to view its content.'
        );
        return;
      }
      navigation?.navigate?.(target, { courseId });
    } catch (err) {
      alert(
        'Could Not Verify Access',
        err?.message || 'Please try again.'
      );
    } finally {
      setCheckingTarget(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header (.gen-head) */}
      <View style={styles.headRow}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={isBn ? 'ড্যাশবোর্ডে ফিরে যান' : 'Back to Dashboard'}
        >
          <BackIcon size={24} />
        </Pressable>
        <Text style={styles.headTitle}>{isBn ? 'আমার কোর্স' : 'My Course'}</Text>
        <View style={styles.backPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {/* Hub Cards (.ch-grid → .ch-card) */}
        {CARDS.map((card) => {
          const checking = checkingTarget === card.target;
          return (
            <Pressable
              key={card.target + card.titleEn}
              onPress={() => go(card.target)}
              disabled={checkingTarget !== null}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.cardIcon}>
                {checking ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <SubjectIcon icon={card.icon} size={30} color={colors.primary} />
                )}
              </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>
                {isBn ? card.titleBn : card.titleEn}
              </Text>
              <Text style={styles.cardSub}>
                {isBn ? card.subBn : card.subEn}
              </Text>
            </View>
            <Chevron size={22} color={colors.textTertiary} />
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  backPlaceholder: {
    width: 44,
    height: 44,
  },
  headTitle: {
    flex: 1,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  grid: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 44,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  cardSub: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
});
