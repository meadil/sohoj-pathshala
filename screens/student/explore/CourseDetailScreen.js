import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import YoutubeIframe from 'react-native-youtube-iframe';
import { useFocusEffect } from '@react-navigation/native';
import Button from '../../../components/Button';
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';
import { SubjectIcon, toBn } from '../../../lib/subjectIcons';
import { colors, radius } from '../../../theme/theme';

function BackIcon({ size = 24, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckIcon({ size = 18, color = colors.success }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m5 12.5 4.5 4.5L19 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
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

function CardIcon({ size = 24, color = colors.textSecondary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M4 9.5h16M8.5 15h5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Extract a YouTube video ID from the common URL shapes. Returns null when
 * the string isn't a recognizable YouTube link.
 */
function youtubeIdFromUrl(url) {
  if (!url) return null;
  const m = String(url).match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/
  );
  return m ? m[1] : null;
}

/**
 * CourseDetailScreen - Course detail / buy page (scr-course).
 * Matches index.html#course structure: gen-head (back → Explore,
 * "Course"), 16:9 cover with play overlay + class chip, meta
 * (title/subject chips/count/description), What-you-get spec list,
 * syllabus accordions, instructor card(s), how-to-pay link, FAQ
 * accordions, sticky buy bar. Header/body/CTA copy verbatim.
 *
 * DATA IS REAL (no demo values): course + subjects + chapters +
 * what_you_get[] + course_faqs (all RLS SELECT-open) plus
 * course_instructors → profiles (authenticated-only; hidden while
 * bypassed). Deliberate deviations, documented:
 * - Title/description/price/what-you-get/FAQs/chapters come from live
 *   rows (seed placeholders if teachers haven't filled them in yet).
 * - chTotalFmt {m} maps to the real CQ+MCQ video count; per-chapter
 *   video counts are omitted (unknown per chapter).
 * - Mini preview-video rail omitted (demo clips, no real equivalent).
 * - Enrolled pill omitted (not student-readable under RLS).
 * - Buy bar follows the REAL purchase row (confirmed → open placeholder
 *   [Course Home later]; pending → PayPending; none → PayIntro).
 */
export default function CourseDetailScreen({ navigation, route }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { session } = useUser();

  const courseId = route?.params?.courseId || null;

  const [course, setCourse] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [chaptersBySubject, setChaptersBySubject] = useState({});
  const [videoCount, setVideoCount] = useState(0);
  const [instructors, setInstructors] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [purchaseStatus, setPurchaseStatus] = useState(null); // 'pending' | 'confirmed' | null
  const [loading, setLoading] = useState(true);
  const [openSubject, setOpenSubject] = useState(null);
  const [openFaq, setOpenFaq] = useState(0);

  // Hide the sticky buy bar while scrolling DOWN, bring it back on scroll UP.
  // Direction is tracked from the raw offset so a fling can't leave it stuck.
  // The bar translates by its own measured height — a fixed pixel value left
  // the price row peeking out at the bottom.
  const lastOffset = useRef(0);
  const barShown = useRef(true);
  const barHeight = useRef(0);
  const barTranslate = useRef(new Animated.Value(0)).current;

  const handleScroll = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    const delta = y - lastOffset.current;
    lastOffset.current = y;
    if (Math.abs(delta) < 4) return; // ignore jitter / momentum noise
    const shouldShow = delta < 0 || y <= 0;
    if (shouldShow === barShown.current) return;
    barShown.current = shouldShow;
    Animated.timing(barTranslate, {
      toValue: shouldShow ? 0 : (barHeight.current || 160),
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const isBn = lang === 'bn';
  const fmtNum = (n) => (isBn ? toBn(n) : String(n));

  const load = useCallback(async () => {
    if (!courseId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: row, error: courseError } = await supabase
        .from('courses')
        .select('id, title, price, description, what_you_get, trailer_urls, class_levels(name)')
        .eq('id', courseId)
        .single();
      if (courseError) throw courseError;
      setCourse(row);

      const { data: subs, error: subError } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('course_id', courseId)
        .order('order_index');
      if (subError) throw subError;
      setSubjects(subs || []);
      if (subs?.length > 0) {
        setOpenSubject(subs[0].id);
      }

      const ids = (subs || []).map((s) => s.id);
      if (ids.length > 0) {
        const { data: chaps, error: chapError } = await supabase
          .from('chapters')
          .select('id, title, subject_id, order_index')
          .in('subject_id', ids)
          .order('order_index');
        if (chapError) throw chapError;
        const grouped = {};
        (chaps || []).forEach((c) => {
          if (!grouped[c.subject_id]) grouped[c.subject_id] = [];
          grouped[c.subject_id].push(c);
        });
        setChaptersBySubject(grouped);

        const { count: cqCount } = await supabase
          .from('cq_videos')
          .select('id', { count: 'exact', head: true })
          .in('chapter_id', (chaps || []).map((c) => c.id));
        setVideoCount(cqCount || 0);
      }

      const { data: faqRows } = await supabase
        .from('course_faqs')
        .select('id, question, answer')
        .eq('course_id', courseId)
        .order('order_index');
      setFaqs(faqRows || []);

      if (session?.user?.id) {
        const { data: links } = await supabase
          .from('course_instructors')
          .select('teacher_id, profiles(name, bio, avatar_url)')
          .eq('course_id', courseId);
        setInstructors(
          (links || [])
            .map((l) => l.profiles)
            .filter((p) => p && p.name)
        );

        const { data: purchases } = await supabase
          .from('course_purchases')
          .select('status')
          .eq('student_id', session.user.id)
          .eq('course_id', courseId)
          .order('created_at', { ascending: false })
          .limit(1);
        setPurchaseStatus(purchases?.[0]?.status || null);
      } else {
        setInstructors([]);
        setPurchaseStatus(null);
      }
    } catch (err) {
      console.warn('CourseDetail: could not load course:', err?.message);
      setCourse(null);
    } finally {
      setLoading(false);
    }
  }, [courseId, session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const chapterTotal = Object.values(chaptersBySubject).reduce((n, arr) => n + arr.length, 0);

  const handleBuy = () => {
    if (purchaseStatus === 'confirmed') {
      // Cross-tab: CourseHome lives in the Dashboard stack.
      navigation?.navigate?.('Dashboard', { screen: 'CourseHome', params: { courseId } });
      return;
    }
    if (purchaseStatus === 'pending') {
      navigation?.navigate?.('PayPending', { courseId });
      return;
    }
    navigation?.navigate?.('PayIntro', { courseId });
  };

  const buyLabel =
    purchaseStatus === 'confirmed'
      ? (isBn ? 'আমার কোর্স খুলুন' : 'Open my course')
      : purchaseStatus === 'pending'
        ? (isBn ? 'পেমেন্ট অপেক্ষমাণ' : 'Payment pending')
        : (isBn ? 'কোর্স কিনুন' : 'Buy Course');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header (.gen-head) */}
      <View style={styles.headRow}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={isBn ? 'এক্সপ্লোরে ফিরে যান' : 'Back to Explore'}
        >
          <BackIcon size={24} />
        </Pressable>
        <Text style={styles.headTitle}>{isBn ? 'কোর্স' : 'Course'}</Text>
        <View style={styles.backPlaceholder} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !course ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>
            {isBn ? 'কোর্স লোড করা যায়নি।' : 'Could not load the course.'}
          </Text>
        </View>
      ) : (
        <View style={styles.bodyWrap}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={handleScroll}
          >
            {/* Cover (.course-cover) */}
            <View style={styles.cover}>
              <SubjectIcon icon="atom" size={56} />
              <Text style={styles.coverChip}>{isBn ? 'সম্পূর্ণ কোর্স' : 'Full course'}</Text>
              {/* Course trailer play affordance will live here, wired to the
                  trailer video once teacher-side trailer authoring lands.
                  For now the cover shows no play button — the previous link
                  straight to FreeVideos was removed. */}
            </View>

            {/* Course trailers (.trailer-rail) — one player per trailer URL,
                scrolled horizontally. Rendered only when the owner has
                actually added trailer links. */}
            {(course?.trailer_urls || []).filter(Boolean).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.secTitle}>{isBn ? 'ট্রেলার' : 'Trailers'}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.trailerRail}
                >
                  {(course?.trailer_urls || []).filter(Boolean).map((url, i) => {
                    const ytId = youtubeIdFromUrl(url);
                    if (!ytId) return null;
                    return (
                      <View key={`${ytId}-${i}`} style={styles.trailerCard}>
                        <YoutubeIframe
                          key={ytId}
                          videoId={ytId}
                          height={180}
                          width={300}
                        />
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Meta (.course-meta) */}
            <View style={styles.meta}>
              <Text style={styles.courseTitle}>{course.title}</Text>
              <View style={styles.chipRow}>
                {subjects.map((s) => (
                  <Text key={s.id} style={styles.qChip}>{s.name}</Text>
                ))}
              </View>
              <Text style={styles.countLine}>
                {isBn
                  ? `${fmtNum(chapterTotal)} অধ্যায় · ${fmtNum(videoCount)} ভিডিও`
                  : `${fmtNum(chapterTotal)} chapters · ${fmtNum(videoCount)} videos`}
              </Text>
              {!!course.description && (
                <Text style={styles.desc}>{course.description}</Text>
              )}
            </View>

            {/* What You Get (.spec-list) */}
            {Array.isArray(course.what_you_get) && course.what_you_get.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.secTitle}>{isBn ? 'কী কী পাবেন' : 'What you get'}</Text>
                <View style={styles.specList}>
                  {course.what_you_get.map((item, i) => (
                    <View key={i} style={styles.specRow}>
                      <CheckIcon size={18} />
                      <Text style={styles.specText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Syllabus accordions */}
            {subjects.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.secTitle}>{isBn ? 'সিলেবাস' : 'Syllabus'}</Text>
                {subjects.map((s) => {
                  const chaps = chaptersBySubject[s.id] || [];
                  const open = openSubject === s.id;
                  return (
                    <View key={s.id} style={styles.acc}>
                      <Pressable
                        onPress={() => setOpenSubject(open ? null : s.id)}
                        style={styles.accHead}
                      >
                        <Chevron size={22} />
                        <View style={styles.accHeadText}>
                          <Text style={styles.accTitle}>{s.name}</Text>
                        </View>
                      </Pressable>
                      {open &&
                        chaps.map((c, ci) => (
                          <View key={c.id} style={styles.accRow}>
                            <SubjectIcon icon="atom" size={22} />
                            <Text style={styles.accRowText}>
                              {isBn
                                ? `অধ্যায় ${fmtNum(ci + 1)}: ${c.title}`
                                : `Chapter ${fmtNum(ci + 1)}: ${c.title}`}
                            </Text>
                          </View>
                        ))}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Instructors */}
            {instructors.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.secTitle}>{isBn ? 'আপনার শিক্ষক' : 'Your instructor'}</Text>
                {instructors.map((t, i) => (
                  <View key={i} style={styles.instrCard}>
                    <View style={styles.instrAva}>
                      {t.avatar_url ? (
                        <Image source={{ uri: t.avatar_url }} style={styles.instrAvaImage} />
                      ) : (
                        <Text style={styles.instrAvaLetter}>
                          {((t.name || 'A').trim().charAt(0) || 'A').toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.instrBody}>
                      <Text style={styles.instrName}>{t.name}</Text>
                      {!!t.bio && <Text style={styles.instrBio}>{t.bio}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* How to pay link → video guide page */}
            <Pressable
              onPress={() => navigation?.navigate?.('HowToPay')}
              style={({ pressed }) => [styles.howPay, pressed && styles.howPayPressed]}
            >
              <CardIcon size={24} />
              <View style={styles.howPayText}>
                <Text style={styles.howPayTitle}>{isBn ? 'কীভাবে পেমেন্ট করবেন' : 'How to pay'}</Text>
                <Text style={styles.howPaySub}>{isBn ? 'বিকাশ · ভিডিও গাইড ভেতরে' : 'bKash · video guide inside'}</Text>
              </View>
              <Chevron size={22} />
            </Pressable>

            {/* FAQ */}
            {faqs.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.secTitle}>{isBn ? 'সাধারণ প্রশ্ন' : 'Common questions'}</Text>
                {faqs.map((f, i) => {
                  const open = openFaq === i;
                  return (
                    <View key={f.id} style={styles.acc}>
                      <Pressable
                        onPress={() => setOpenFaq(open ? -1 : i)}
                        style={styles.accHead}
                      >
                        <Chevron size={22} />
                        <Text style={styles.accTitle}>{f.question}</Text>
                      </Pressable>
                      {open && <Text style={styles.faqA}>{f.answer}</Text>}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Sticky Buy Bar (.course-buy) — hides on scroll down, returns on scroll up */}
          <Animated.View
            style={[styles.buyBar, { transform: [{ translateY: barTranslate }] }]}
            onLayout={(e) => {
              barHeight.current = e.nativeEvent.layout.height;
            }}
          >
            <View style={styles.buyPriceRow}>
              <Text style={styles.buyPrice}>৳ {fmtNum(course.price ?? 0)}</Text>
            </View>
            <Button title={buyLabel} variant="primary" size="lg" onPress={handleBuy} />
            <Pressable
              onPress={() =>
                // Free videos live in the Dashboard tab's CourseStack, so this
                // is a cross-stack jump — same shape as Dashboard → More.
                navigation?.navigate?.('Dashboard', { screen: 'FreeVideos' })
              }
              style={styles.watchLink}
            >
              <Text style={styles.watchText}>{isBn ? 'ফ্রি ভিডিও দেখুন' : 'Watch free videos'}</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  bodyWrap: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 190,
    gap: 18,
  },
  cover: {
    aspectRatio: 16 / 9,
    borderRadius: radius.cardLg,
    overflow: 'hidden',
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  coverChip: {
    position: 'absolute',
    top: 12,
    left: 12,
    fontSize: 12,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  meta: {
    gap: 8,
  },
  courseTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  qChip: {
    fontSize: 12,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary,
    backgroundColor: colors.backgroundMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  countLine: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  desc: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  section: {
    gap: 10,
  },
  secTitle: {
    fontSize: 18,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  trailerRail: {
    gap: 12,
    paddingRight: 4,
  },
  trailerCard: {
    width: 300,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  specList: {
    gap: 10,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  specText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 23,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textPrimary,
  },
  acc: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  accHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  accHeadText: {
    flex: 1,
  },
  accTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  accRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  accRowText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textPrimary,
  },
  faqA: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
    paddingHorizontal: 14,
    paddingBottom: 13,
  },
  instrCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
  },
  instrAva: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  instrAvaImage: {
    width: '100%',
    height: '100%',
  },
  instrAvaLetter: {
    fontSize: 22,
    fontFamily: 'HindSiliguri-SemiBold',
    color: '#FFFFFF',
  },
  instrBody: {
    flex: 1,
    gap: 2,
  },
  instrName: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  instrBio: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  howPay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
  },
  howPayPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  howPayText: {
    flex: 1,
    gap: 2,
  },
  howPayTitle: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  howPaySub: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  buyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 8,
  },
  buyPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyPrice: {
    fontSize: 22,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  watchLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  watchText: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
});
