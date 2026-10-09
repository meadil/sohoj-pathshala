import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useAlert } from '../../../components/CustomAlert';
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';
import { AVATAR_PRESETS } from '../../../lib/subjectIcons';
import { resolveBannerTarget } from '../../../lib/bannerTargets';
import { colors, radius } from '../../../theme/theme';

function BellIcon({ size = 24, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 16v-4.5a6 6 0 0 1 12 0V16l1.5 2.5h-15Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M10 20.5a2.2 2.2 0 0 0 4 0"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function LockIcon({ size = 13, color = colors.textSecondary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="10.5" width="14" height="9" rx="2.5" stroke={color} strokeWidth={1.8} />
      <Path
        d="M8 10.5V8a4 4 0 0 1 8 0v2.5"
        stroke={color}
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function QuizIcon({ size = 30, color = colors.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13 3 5.5 13.5H11l-1 7.5 7.5-11H11Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BookIcon({ size = 30, color = colors.primary, withSpine = true }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5.5C9.6 3.7 6.5 3 3 3.2V18c3.5-.2 6.6.5 9 2.3 2.4-1.8 5.5-2.5 9-2.3V3.2C17.5 3 14.4 3.7 12 5.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      {withSpine && (
        <Path d="M12 5.5v14.8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      )}
    </Svg>
  );
}

function ChartIcon({ size = 30, color = colors.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 20h16" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M7.5 16.5v-5M12 16.5V7M16.5 16.5v-3.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * DashboardScreen - Student Home tab (scr-dashboard).
 * Matches index.html#dashboard: dash-header (avatar + greeting + bell),
 * banner rail, Continue section (hidden — no in-progress courses exist
 * yet), quick-access grid (2 locked + 2 open).
 *
 * The banner rail is LIVE: rows come from the owner-published `banners`
 * table (tag / title / description / target_path) and tapping one navigates
 * to the page the owner picked. While the table is empty the rail is
 * hidden rather than showing placeholder cards.
 *
 * Bell → Notifications. Quiz/Decks tiles stay locked with the prototype's
 * verbatim lock messages until the student owns a confirmed course — then
 * Quiz opens the WeeklyQuiz list and Decks opens that course's MCQ subject
 * list (subs show the course title, which is data, not copy).
 * Free Classes → FreeVideos screen (real free_videos rows for the
 * student's class level, modal player).
 */
export default function DashboardScreen() {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { profile, session } = useUser();
  const navigation = useNavigation();
  const alert = useAlert();

  const [continueCourses, setContinueCourses] = useState([]);
  const [continueLoading, setContinueLoading] = useState(true);
  // Owner-published promo banners. Empty array = rail hidden, never placeholders.
  const [banners, setBanners] = useState([]);

  const isBn = lang === 'bn';
  const nickname =
    (profile?.nickname || '').trim() ||
    (profile?.name || '').trim().split(/\s+/)[0] ||
    (isBn ? 'বন্ধু' : 'friend');
  const initial = (nickname.charAt(0) || 'A').toUpperCase();
  // Preset avatar color from profile (photo wins when avatar_url set).
  const presetIndex =
    typeof profile?.avatar_preset === 'number' &&
    profile.avatar_preset >= 0 &&
    profile.avatar_preset < AVATAR_PRESETS.length
      ? profile.avatar_preset
      : null;
  const avatarBg = presetIndex !== null ? AVATAR_PRESETS[presetIndex].bg : colors.primary;

  const showComing = (message) => {
    alert('', message);
  };

  // First REAL confirmed purchase (preview entries excluded) — unlocks
  // the Quiz/Decks tiles into its CourseHome.
  const ownedCourse = continueCourses.find((c) => !c.preview) || null;

  // Continue section: REAL confirmed purchases (own rows) with course
  // titles. Hidden when empty, like the prototype's hidden
  // #dash-continue.
  useEffect(() => {
    let cancelled = false;
    const loadContinue = async () => {
      setContinueLoading(true);
      try {
        if (!session?.user?.id) {
          // TEMP DEV BYPASS (see STATUS.md): no session means no
          // purchase rows exist — show the first catalog course as a
          // clearly-marked preview entry so the Course Home flow stays
          // reviewable. TODO post-revert: delete this block (real
          // purchases will populate the section instead).
          const { data: catalog } = await supabase
            .from('courses')
            .select('id, title')
            .limit(1);
          if (!cancelled) {
            setContinueCourses(
              (catalog || []).map((c) => ({ courseId: c.id, title: c.title, preview: true }))
            );
          }
          return;
        }
        const { data: rows, error } = await supabase
          .from('course_purchases')
          .select('course_id, courses(id, title)')
          .eq('student_id', session.user.id)
          .eq('status', 'confirmed');
        if (error) throw error;
        if (!cancelled) {
          setContinueCourses(
            (rows || [])
              .filter((r) => r.courses)
              .map((r) => ({ courseId: r.courses.id, title: r.courses.title, preview: false }))
          );
        }
      } catch (err) {
        console.warn('Dashboard: could not load continue section:', err?.message);
        if (!cancelled) setContinueCourses([]);
      } finally {
        if (!cancelled) setContinueLoading(false);
      }
    };
    loadContinue();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // Owner-published banners. Read is open to all (banners RLS SELECT = true),
  // so this works signed out too. Failures warn and leave the rail hidden.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('banners')
          .select('id, tag, title, description, target_path')
          .eq('is_active', true)
          .order('order_index', { ascending: true })
          .limit(10);
        if (error) throw error;
        if (!cancelled) setBanners(data || []);
      } catch (err) {
        console.warn('Dashboard: could not load banners:', err?.message);
        if (!cancelled) setBanners([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Tap → the page the owner picked. Unknown or course-less paths are
  // ignored rather than guessed at.
  const openBanner = (targetPath) => {
    const target = resolveBannerTarget(targetPath);
    if (!target) return;
    if (target.screen) {
      navigation.navigate(target.tab, { screen: target.screen, params: target.params });
    } else {
      navigation.navigate(target.tab);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header (.dash-header) */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarLetter}>{initial}</Text>
            )}
          </View>
          <View style={styles.greetWrap}>
            <Text style={styles.greet}>
              {isBn ? 'হ্যালো,' : 'Hello,'} {nickname}{isBn ? '!' : '!'}
            </Text>
            <Text style={styles.greetSmall}>
              {isBn ? 'ফিরে দেখে ভালো লাগলো' : 'Good to see you back'}
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('More', { screen: 'Notifications' })}
            style={({ pressed }) => [styles.bellBtn, pressed && styles.bellBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <BellIcon size={24} />
          </Pressable>
        </View>

        {/* Banner rail (.dash-rail) — live owner-published banners.
            Hidden entirely when there are none, so an empty table never
            renders placeholder cards. */}
        {banners.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
            accessibilityLabel={isBn ? 'ব্যানার' : 'Banners'}
          >
            {banners.map((banner) => (
              <Pressable
                key={banner.id}
                onPress={() => openBanner(banner.target_path)}
                style={({ pressed }) => [styles.banner, pressed && styles.bannerPressed]}
                accessibilityRole="button"
                accessibilityLabel={banner.title}
              >
                {!!banner.tag && <Text style={styles.chip}>{banner.tag}</Text>}
                <Text style={styles.bannerTitle}>{banner.title}</Text>
                {!!banner.description && (
                  <Text style={styles.bannerSub}>{banner.description}</Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Continue Section (#dash-continue) — renders only with real
            in-progress data (confirmed purchases, or the marked bypass
            preview); otherwise hidden like the prototype. */}
        {!continueLoading && continueCourses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isBn ? 'চালিয়ে যাও' : 'Continue'}
            </Text>
            <View style={styles.continueList}>
              {continueCourses.map((c) => (
                <Pressable
                  key={c.courseId}
                  onPress={() => navigation.navigate('CourseHome', { courseId: c.courseId })}
                  style={({ pressed }) => [styles.continueCard, pressed && styles.tilePressed]}
                >
                  <View style={styles.continueBody}>
                    <Text style={styles.tileName}>{c.title}</Text>
                    <Text style={styles.tileSub}>
                      {c.preview
                        ? (isBn ? 'প্রিভিউ' : 'Preview')
                        : (isBn ? 'চালিয়ে যাও' : 'Continue')}
                    </Text>
                  </View>
                  <Text style={styles.continueArrow}>→</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Quick Access (.qa-grid) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isBn ? 'কুইক অ্যাক্সেস' : 'Quick access'}
          </Text>
          <View style={styles.qaGrid}>
            <Pressable
              onPress={() =>
                ownedCourse
                  ? navigation.navigate('WeeklyQuiz')
                  : showComing(isBn ? 'সাপ্তাহিক কুইজ খুলতে কোর্স কিনো।' : 'Buy your course to unlock the weekly quiz.')
              }
              style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
            >
              <QuizIcon size={30} />
              <Text style={styles.tileName}>{isBn ? 'এই সপ্তাহের কুইজ' : "This Week's Quiz"}</Text>
              {ownedCourse ? (
                <Text style={styles.tileSub}>{ownedCourse.title}</Text>
              ) : (
                <View style={styles.lockRow}>
                  <LockIcon size={13} />
                  <Text style={styles.tileSub}>{isBn ? 'কোর্স কিনলে খুলবে' : 'Buy course to unlock'}</Text>
                </View>
              )}
            </Pressable>
            {/* Practice Decks is hidden entirely for students with no confirmed
                purchase. A locked tile still advertises the feature, and decks
                are paid-course content, so it should not appear at all. */}
            {ownedCourse && (
              <Pressable
                onPress={() => navigation.navigate('MCQList', { courseId: ownedCourse.courseId })}
                style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
              >
                <BookIcon size={30} withSpine />
                <Text style={styles.tileName}>{isBn ? 'প্র্যাকটিস ডেক' : 'Practice Decks'}</Text>
                <Text style={styles.tileSub}>{ownedCourse.title}</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => navigation.navigate('Report')}
              style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
            >
              <ChartIcon size={30} />
              <Text style={styles.tileName}>{isBn ? 'লার্নিং রিপোর্ট' : 'Learning Report'}</Text>
              <Text style={styles.tileSub}>{isBn ? 'পড়ে পড়ে ভরবে' : 'Grows as you study'}</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('FreeVideos')}
              style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
            >
              <BookIcon size={30} withSpine={false} />
              <Text style={styles.tileName}>{isBn ? 'ফ্রি ক্লাস' : 'Free Classes'}</Text>
              <Text style={styles.tileSub}>{isBn ? 'সবসময় ফ্রি' : 'Always free'}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background, // #FBF7F0
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLetter: {
    fontSize: 22,
    fontFamily: 'HindSiliguri-SemiBold',
    color: '#FFFFFF',
  },
  greetWrap: {
    flex: 1,
    gap: 1,
  },
  greet: {
    fontSize: 20,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  greetSmall: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  bellBtnPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  rail: {
    gap: 12,
    paddingRight: 20,
  },
  banner: {
    width: 260,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
    gap: 6,
  },
  bannerPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  chip: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
    backgroundColor: colors.primarySubtle,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  bannerTitle: {
    fontSize: 17,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  bannerSub: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  continueList: {
    gap: 10,
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  continueBody: {
    flex: 1,
    gap: 2,
  },
  continueArrow: {
    fontSize: 20,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
  qaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
    gap: 6,
  },
  tilePressed: {
    backgroundColor: colors.backgroundMuted,
  },
  tileName: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tileSub: {
    fontSize: 12,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
});
