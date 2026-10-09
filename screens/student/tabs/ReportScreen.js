import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';
import { DAYL, MONTHS, toBn } from '../../../lib/subjectIcons';
import { getClassLevelName } from '../../../lib/classLevel';
import { colors, radius } from '../../../theme/theme';

const LEVEL_SUBJECTS = {
  SSC: [
    { key: 'physics' },
    { key: 'chemistry' },
    { key: 'biology' },
    { key: 'math' },
  ],
  HSC: [
    { key: 'physics' },
    { key: 'chemistry' },
    { key: 'highmath' },
    { key: 'biology' },
  ],
};

const SUBJECT_NAMES = {
  physics: { bn: 'পদার্থবিজ্ঞান', en: 'Physics' },
  chemistry: { bn: 'রসায়ন', en: 'Chemistry' },
  biology: { bn: 'জীববিজ্ঞান', en: 'Biology' },
  math: { bn: 'গণিত', en: 'Mathematics' },
  highmath: { bn: 'উচ্চতর গণিত', en: 'Higher Mathematics' },
};

function ChevronLeft({ size = 24, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRight({ size = 24, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ArrowRight({ size = 22, color = '#FFFFFF', strokeWidth = 2.4 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * ReportScreen - Student Learning Report tab (scr-report).
 * Matches index.html#report: gen-head header, week nav, 2x2 metric
 * grid, Week/Month range toggle, 7-bar study graph, per-subject
 * breakdown, "See full report" CTA. All Bangla/English strings pulled
 * verbatim from index.html.
 *
 * VALUES ARE REAL: metrics/bars/breakdown derive from live
 * cq_video_views + mcq_deck_attempts + quiz_submissions rows (own rows
 * only). The prototype's demo formulas are NOT reproduced. DEVIATION:
 * the 4th card shows videos-watched count ("দেখা ভিডিও", same wording
 * as the ReportDetail footnote) instead of study time — watch duration
 * is not tracked anywhere, and inventing hours would be fake data.
 * Breakdown subjects follow the student's class level (looked up for
 * real when a session exists, SSC default while bypassed).
 */
function subjectKeyForName(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('higher') || n.includes('উচ্চতর')) return 'highmath';
  if (n.includes('phys') || n.includes('পদার্থ')) return 'physics';
  if (n.includes('chem') || n.includes('রসায়')) return 'chemistry';
  if (n.includes('bio') || n.includes('জীব')) return 'biology';
  if (n.includes('math') || n.includes('গণিত')) return 'math';
  return null;
}

export default function ReportScreen() {
  const navigation = useNavigation();
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { profile, session } = useUser();

  const [weekOffset, setWeekOffset] = useState(0); // 0..8, like prototype
  const [range, setRange] = useState('7'); // '7' | '30'
  const [levelKey, setLevelKey] = useState('SSC');
  const [activity, setActivity] = useState({ views: [], deckAttempts: [], quizSubs: [] });

  const isBn = lang === 'bn';
  const fmtNum = (n) => (isBn ? toBn(n) : String(n));

  useEffect(() => {
    let cancelled = false;
    const loadLevel = async () => {
      const levelName = await getClassLevelName(profile?.class_level_id);
      if (!cancelled && levelName) {
        setLevelKey(levelName);
      }
    };
    loadLevel();
    return () => {
      cancelled = true;
    };
  }, [profile?.class_level_id]);

  // Real activity rows (own rows only). Nested subject lookups degrade
  // to unattributed counts when any link in the chain is unreadable.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (!session?.user?.id) {
          if (!cancelled) setActivity({ views: [], deckAttempts: [], quizSubs: [] });
          return;
        }
        const uid = session.user.id;
        let views = [];
        try {
          const res = await supabase
            .from('cq_video_views')
            .select('video_id,watched_at')
            .eq('student_id', uid)
            .order('watched_at', { ascending: false })
            .limit(500);
          if (res.error) throw res.error;
          views = (res.data || []).map((v) => ({ at: v.watched_at }));
        } catch (err) {
          console.warn('Report: views unreadable:', err?.message);
        }
        let deckAttempts = [];
        try {
          const res = await supabase
            .from('mcq_deck_attempts')
            .select('score,total_questions,submitted_at, mcq_decks(chapters(subjects(name)))')
            .eq('student_id', uid)
            .order('submitted_at', { ascending: false })
            .limit(500);
          if (res.error) throw res.error;
          deckAttempts = (res.data || []).map((a) => ({
            score: a.score || 0,
            total: a.total_questions || 0,
            at: a.submitted_at,
            subject: a?.mcq_decks?.chapters?.subjects?.name || '',
          }));
        } catch (err) {
          console.warn('Report: deck attempts nested unreadable, retrying flat:', err?.message);
          try {
            const res = await supabase
              .from('mcq_deck_attempts')
              .select('score,total_questions,submitted_at')
              .eq('student_id', uid)
              .order('submitted_at', { ascending: false })
              .limit(500);
            if (res.error) throw res.error;
            deckAttempts = (res.data || []).map((a) => ({
              score: a.score || 0,
              total: a.total_questions || 0,
              at: a.submitted_at,
              subject: '',
            }));
          } catch (flatErr) {
            console.warn('Report: deck attempts unreadable:', flatErr?.message);
          }
        }
        let quizSubs = [];
        try {
          const res = await supabase
            .from('quiz_submissions')
            .select('score,total_questions,submitted_at, quizzes(subjects(name))')
            .eq('student_id', uid)
            .order('submitted_at', { ascending: false })
            .limit(500);
          if (res.error) throw res.error;
          quizSubs = (res.data || []).map((s) => ({
            score: s.score || 0,
            total: s.total_questions || 0,
            at: s.submitted_at,
            subject: s?.quizzes?.subjects?.name || '',
          }));
        } catch (err) {
          console.warn('Report: quiz submissions nested unreadable, retrying flat:', err?.message);
          try {
            const res = await supabase
              .from('quiz_submissions')
              .select('score,total_questions,submitted_at')
              .eq('student_id', uid)
              .order('submitted_at', { ascending: false })
              .limit(500);
            if (res.error) throw res.error;
            quizSubs = (res.data || []).map((s) => ({
              score: s.score || 0,
              total: s.total_questions || 0,
              at: s.submitted_at,
              subject: '',
            }));
          } catch (flatErr) {
            console.warn('Report: quiz submissions unreadable:', flatErr?.message);
          }
        }
        if (!cancelled) setActivity({ views, deckAttempts, quizSubs });
      } catch (err) {
        console.warn('Report: could not load activity:', err?.message);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // Week bounds: Monday-based, like the prototype's weekBounds().
  const now = new Date();
  const dow = (now.getDay() + 6) % 7;
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow - weekOffset * 7);
  const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
  const months = isBn ? MONTHS.bn : MONTHS.en;
  const fmtDate = (dt) => `${fmtNum(dt.getDate())} ${months[dt.getMonth()]}`;
  const weekLabel =
    weekOffset <= 0
      ? (isBn ? 'এই সপ্তাহ' : 'This week')
      : weekOffset === 1
        ? (isBn ? 'গত সপ্তাহ' : 'Last week')
        : (isBn ? `${fmtNum(weekOffset)} সপ্তাহ আগে` : `${fmtNum(weekOffset)} weeks ago`);

  const dayLabels = isBn ? DAYL.bn : DAYL.en;
  const subjects = LEVEL_SUBJECTS[levelKey];

  // ---- Real stats from live activity rows ----
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayKeyOf = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const toDay = (iso) => {
    const dt = new Date(iso);
    return Number.isNaN(dt.getTime()) ? null : startOfDay(dt);
  };
  // Window: selected Mon–Sun week for range 7, trailing 30d ending
  // Sunday for range 30.
  const windowEnd = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate(), 23, 59, 59);
  const windowStart = new Date(windowEnd);
  windowStart.setDate(windowStart.getDate() - (range === '30' ? 29 : 6));
  windowStart.setHours(0, 0, 0, 0);

  const allEvents = [
    ...activity.views.map((v) => ({ day: toDay(v.at), kind: 'video' })),
    ...activity.deckAttempts.map((a) => ({ day: toDay(a.at), kind: 'quiz', score: a.score, total: a.total, subject: a.subject })),
    ...activity.quizSubs.map((a) => ({ day: toDay(a.at), kind: 'quiz', score: a.score, total: a.total, subject: a.subject })),
  ].filter((e) => e.day);
  const inWin = allEvents.filter((e) => e.day >= windowStart && e.day <= windowEnd);
  const quizEvents = inWin.filter((e) => e.kind === 'quiz');
  const scoreSum = quizEvents.reduce((n, e) => n + e.score, 0);
  const totalSum = quizEvents.reduce((n, e) => n + e.total, 0);
  const videosWatched = inWin.filter((e) => e.kind === 'video').length;

  // Streak: trailing consecutive active days (today, else from yesterday).
  const activeDays = new Set(allEvents.map((e) => dayKeyOf(e.day)));
  let streak = 0;
  {
    const cursor = startOfDay(new Date());
    if (!activeDays.has(dayKeyOf(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (activeDays.has(dayKeyOf(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  const stats = {
    quizzes: quizEvents.length,
    accuracy: totalSum > 0 ? Math.round((scoreSum / totalSum) * 100) : 0,
    streak,
    videos: videosWatched,
  };

  const countOnDay = (day) =>
    inWin.filter((e) => dayKeyOf(e.day) === dayKeyOf(day)).length;

  // 7 bars: daily for range 7, ~4-5-day buckets for range 30.
  const bars =
    range === '7'
      ? Array.from({ length: 7 }, (_, i) => {
          const d = new Date(mon);
          d.setDate(d.getDate() + i);
          return { label: dayLabels[i], count: countOnDay(d) };
        })
      : Array.from({ length: 7 }, (_, i) => {
          const bStart = new Date(windowStart);
          bStart.setDate(bStart.getDate() + Math.round((i * 30) / 7));
          const bEnd = new Date(windowStart);
          bEnd.setDate(bEnd.getDate() + Math.round(((i + 1) * 30) / 7) - 1);
          bEnd.setHours(23, 59, 59);
          const count = inWin.filter((e) => e.day >= bStart && e.day <= bEnd).length;
          return { label: fmtNum(bStart.getDate()), count };
        });
  const maxBar = Math.max(1, ...bars.map((b) => b.count));

  // Per-subject accuracy/tries within the window.
  const subjectStats = {};
  subjects.forEach((s) => {
    subjectStats[s.key] = { score: 0, total: 0, tries: 0 };
  });
  quizEvents.forEach((e) => {
    const key = subjectKeyForName(e.subject);
    if (key && subjectStats[key]) {
      subjectStats[key].score += e.score;
      subjectStats[key].total += e.total;
      subjectStats[key].tries += 1;
    }
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header (.gen-head) */}
        <View style={styles.headWrap}>
          <Text style={styles.title}>{isBn ? 'লার্নিং রিপোর্ট' : 'Learning Report'}</Text>
          <Text style={styles.sub}>{isBn ? 'পড়ে পড়ে ভরবে' : 'Grows as you study'}</Text>
        </View>

        {/* Week Nav (.week-nav) */}
        <View style={styles.weekNav}>
          <Pressable
            onPress={() => setWeekOffset((o) => Math.min(8, o + 1))}
            style={({ pressed }) => [styles.weekArrow, pressed && styles.weekArrowPressed]}
            accessibilityRole="button"
            accessibilityLabel="Previous week"
          >
            <ChevronLeft size={24} />
          </Pressable>
          <View style={styles.weekLabel}>
            <Text style={styles.weekTitle}>{weekLabel}</Text>
            <Text style={styles.weekRange}>{fmtDate(mon)} — {fmtDate(sun)}</Text>
          </View>
          <Pressable
            onPress={() => setWeekOffset((o) => Math.max(0, o - 1))}
            style={({ pressed }) => [styles.weekArrow, pressed && styles.weekArrowPressed]}
            accessibilityRole="button"
            accessibilityLabel="Next week"
          >
            <ChevronRight size={24} />
          </Pressable>
        </View>

        {/* Metric Grid (.metric-grid) */}
        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricNum}>{fmtNum(stats.quizzes)}</Text>
            <Text style={styles.metricLabel}>{isBn ? 'কুইজ' : 'Quizzes'}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricNum}>{fmtNum(stats.accuracy)}%</Text>
            <Text style={styles.metricLabel}>{isBn ? 'নির্ভুলতা' : 'Accuracy'}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricNum}>{fmtNum(stats.streak)}</Text>
            <Text style={styles.metricLabel}>{isBn ? 'দিনের ধারা' : 'Day streak'}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricNum}>{fmtNum(stats.videos)}</Text>
            <Text style={styles.metricLabel}>{isBn ? 'দেখা ভিডিও' : 'Videos watched'}</Text>
          </View>
        </View>

        {/* Range Toggle (.range-toggle) */}
        <View
          style={styles.rangeToggle}
          accessibilityLabel={isBn ? 'রিপোর্টের পরিসর' : 'Report range'}
        >
          <Pressable
            onPress={() => setRange('7')}
            style={[styles.rangePill, range === '7' && styles.rangePillOn]}
          >
            <Text style={[styles.rangeText, range === '7' && styles.rangeTextOn]}>
              {fmtNum(7)} {isBn ? 'দিন' : 'days'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setRange('30')}
            style={[styles.rangePill, range === '30' && styles.rangePillOn]}
          >
            <Text style={[styles.rangeText, range === '30' && styles.rangeTextOn]}>
              {fmtNum(30)} {isBn ? 'দিন' : 'days'}
            </Text>
          </Pressable>
        </View>

        {/* Bar Graph (.graph-card) */}
        <View style={styles.graphCard}>
          <Text style={styles.graphTitle}>{isBn ? 'অধ্যয়ন কার্যক্রম' : 'Study activity'}</Text>
          <View
            style={styles.bars}
            accessibilityLabel={isBn ? 'প্রতিদিনের কুইজ প্রচেষ্টা' : 'Daily quiz attempts'}
          >
            {bars.map((bar, i) => (
              <View key={i} style={styles.bar}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${Math.max(4, Math.round((bar.count / maxBar) * 100))}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{bar.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Breakdown List (.breakdown-list) */}
        <Text style={styles.secTitle}>{isBn ? 'আপনার সেরা বিষয়' : 'Your best subjects'}</Text>
        <View style={styles.breakdownList}>
          {subjects.map((s) => {
            const st = subjectStats[s.key];
            const acc = st.total > 0 ? Math.round((st.score / st.total) * 100) : 0;
            return (
              <View key={s.key} style={styles.breakdownItem}>
                <View style={styles.breakdownTop}>
                  <Text style={styles.breakdownName}>
                    {isBn ? SUBJECT_NAMES[s.key].bn : SUBJECT_NAMES[s.key].en}
                  </Text>
                  <Text style={styles.breakdownPct}>
                    {fmtNum(acc)}% · {fmtNum(st.tries)} {isBn ? 'চেষ্টা' : 'tries'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <Pressable
          onPress={() => navigation?.navigate?.('ReportDetail')}
          style={({ pressed }) => [styles.detailBtn, pressed && styles.detailBtnPressed]}
        >
          <Text style={styles.detailText}>{isBn ? 'সম্পূর্ণ রিপোর্ট দেখুন' : 'See full report'}</Text>
          <ArrowRight size={22} color={colors.primary} />
        </Pressable>
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
    gap: 16,
  },
  headWrap: {
    gap: 2,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  sub: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekArrow: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  weekArrowPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  weekLabel: {
    alignItems: 'center',
    gap: 1,
  },
  weekTitle: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  weekRange: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
    gap: 2,
  },
  metricNum: {
    fontSize: 22,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  metricLabel: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  rangeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundMuted,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  rangePill: {
    flex: 1,
    borderRadius: radius.pill,
    paddingVertical: 8,
    alignItems: 'center',
  },
  rangePillOn: {
    backgroundColor: colors.surface,
  },
  rangeText: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary,
  },
  rangeTextOn: {
    color: colors.textPrimary,
  },
  graphCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
    gap: 12,
  },
  graphTitle: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
  },
  bar: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barTrack: {
    height: 120,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: 14,
    minHeight: 5,
    borderRadius: 7,
    backgroundColor: colors.primary, // primary-color bars
  },
  barLabel: {
    fontSize: 12,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  secTitle: {
    fontSize: 18,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  breakdownList: {
    gap: 10,
  },
  breakdownItem: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  breakdownTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownName: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  breakdownPct: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.secondarySubtle,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.btn,
    paddingVertical: 14,
  },
  detailBtnPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  detailText: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
});
