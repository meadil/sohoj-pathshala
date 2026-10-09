import React, { useEffect, useState } from 'react';
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
import { supabase } from '../../../lib/supabase';
import { checkCourseAccess } from './gate';
import { toBn } from '../../../lib/subjectIcons';
import { colors, radius } from '../../../theme/theme';

function BackIcon({ size = 24, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function BoltIcon({ size = 26, color = colors.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M13 3 5.5 13.5H11l-1 7.5 7.5-11H11Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

function windowState(quiz, now) {
  const open = quiz.opens_at ? new Date(quiz.opens_at).getTime() : 0;
  const close = quiz.closes_at ? new Date(quiz.closes_at).getTime() : Infinity;
  if (Number.isNaN(open) || Number.isNaN(close)) return 'unknown';
  if (now < open) return 'upcoming';
  if (now > close) return 'ended';
  return 'live';
}

function fmtDateTime(iso, isBn, fmtNum) {
  const dt = new Date(iso);
  if (!iso || Number.isNaN(dt.getTime())) return '—';
  const months = isBn
    ? ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${fmtNum(dt.getDate())} ${months[dt.getMonth()]}`;
}

// Live countdown: "2দিন 3ঘণ্টা 15মিনিট 20সেকেন্ড" / "2d 3h 15m 20s".
function fmtRemaining(ms, isBn, fmtNum) {
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d > 0) parts.push(`${fmtNum(d)}${isBn ? 'দিন' : 'd'}`);
  if (h > 0 || d > 0) parts.push(`${fmtNum(h)}${isBn ? 'ঘণ্টা' : 'h'}`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${fmtNum(m)}${isBn ? 'মিনিট' : 'm'}`);
  parts.push(`${fmtNum(sec)}${isBn ? 'সেকেন্ড' : 's'}`);
  return parts.join(' ');
}

/**
 * WeeklyQuizScreen - Live + scheduled quizzes, app-wide.
 * No prototype screen exists for this (the dashboard tile previously
 * showed a lock note) — layout follows the app's list conventions
 * (gen-head, status chips, row cards). Copy is provisional Bangla.
 *
 * Rows are REAL quizzes rows (SELECT-open per RLS) filtered to THIS
 * week only (Mon–Sun by opens_at; old weeks fall off, unknown windows
 * stay). Taken rows show the real score chip from own quiz_submissions
 * (one-shot: the player blocks retakes and shows review after close).
 * Tapping a LIVE quiz purchase-checks its course for real, then opens
 * the shared MCQDeck player in quiz mode. Upcoming/ended rows explain
 * why they can't start yet. Quizzes with no resolvable course fall
 * back to a direct open attempt — the server RPC enforces purchase
 * anyway.
 */
export default function WeeklyQuizScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { session } = useUser();
  const alert = useAlert();

  const [quizzes, setQuizzes] = useState([]);
  const [courseById, setCourseById] = useState({});
  const [takenById, setTakenById] = useState({}); // quizId -> {score,total}
  const [loading, setLoading] = useState(true);

  const isBn = lang === 'bn';
  const fmtNum = (n) => (isBn ? toBn(n) : String(n));

  // This week only (Mon–Sun): the list refreshes weekly, older
  // quizzes fall off automatically.
  const now0 = new Date();
  const dow = (now0.getDay() + 6) % 7;
  const mon = new Date(now0.getFullYear(), now0.getMonth(), now0.getDate() - dow);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  sun.setHours(23, 59, 59);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data: rows, error } = await supabase
          .from('quizzes')
          .select('id, title, opens_at, closes_at, subject_id')
          .order('opens_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        const list = (rows || []).filter((q) => {
          // Unknown window stays visible; dated quizzes must open
          // inside this week (old weeks fall off the list).
          if (!q.opens_at) return true;
          const t = new Date(q.opens_at).getTime();
          return !Number.isNaN(t) && t >= mon.getTime() && t <= sun.getTime();
        });
        if (!cancelled) setQuizzes(list);

        // Taken state: own submissions mark one-shot quizzes as done.
        if (session?.user?.id) {
          try {
            const res = await supabase
              .from('quiz_submissions')
              .select('quiz_id,score,total_questions')
              .eq('student_id', session.user.id);
            if (res.error) throw res.error;
            if (!cancelled) {
              const map = {};
              (res.data || []).forEach((s) => {
                if (s.quiz_id && !map[s.quiz_id]) {
                  map[s.quiz_id] = { score: s.score ?? 0, total: s.total_questions ?? 0 };
                }
              });
              setTakenById(map);
            }
          } catch (takenErr) {
            console.warn('WeeklyQuiz: taken state unreadable:', takenErr?.message);
            if (!cancelled) setTakenById({});
          }
        } else if (!cancelled) {
          setTakenById({});
        }

        const subjectIds = [...new Set(list.map((q) => q.subject_id).filter(Boolean))];
        if (subjectIds.length > 0) {
          const { data: subs, error: subError } = await supabase
            .from('subjects')
            .select('id, name, course_id')
            .in('id', subjectIds);
          if (subError) throw subError;
          const courseIds = [...new Set((subs || []).map((s) => s.course_id).filter(Boolean))];
          let courses = [];
          if (courseIds.length > 0) {
            const { data: crs, error: crsError } = await supabase
              .from('courses')
              .select('id, title')
              .in('id', courseIds);
            if (crsError) throw crsError;
            courses = crs || [];
          }
          if (!cancelled) {
            const subById = {};
            (subs || []).forEach((s) => {
              subById[s.id] = s;
            });
            const courseMap = {};
            courses.forEach((c) => {
              courseMap[c.id] = c.title;
            });
            const resolved = {};
            list.forEach((q) => {
              const sub = q.subject_id ? subById[q.subject_id] : null;
              resolved[q.id] = sub
                ? { subjectName: sub.name || '', courseId: sub.course_id || null, courseTitle: (sub.course_id && courseMap[sub.course_id]) || '' }
                : { subjectName: '', courseId: null, courseTitle: '' };
            });
            setCourseById(resolved);
          }
        } else if (!cancelled) {
          setCourseById({});
        }
      } catch (err) {
        console.warn('WeeklyQuiz: could not load quizzes:', err?.message);
        if (!cancelled) {
          setQuizzes([]);
          setCourseById({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const openQuiz = async (quiz) => {
    const info = courseById[quiz.id] || {};
    if (info.courseId) {
      try {
        const access = await checkCourseAccess(info.courseId, session?.user?.id);
        if (!access.allowed) {
          alert(
            isBn ? 'কোর্স কিনুন' : 'Buy Course',
            isBn ? 'এই কুইজ দিতে কোর্সটি কিনুন।' : 'Please buy this course to take its quizzes.'
          );
          return;
        }
      } catch (err) {
        alert(
          isBn ? 'যাচাই করা যায়নি' : 'Could Not Verify',
          err?.message || (isBn ? 'আবার চেষ্টা করো।' : 'Please try again.')
        );
        return;
      }
    }
    navigation?.navigate?.('MCQDeck', {
      mode: 'quiz',
      quizId: quiz.id,
      quizTitle: quiz.title || '',
      courseId: info.courseId || null,
    });
  };

  // Ticking clock so countdowns stay live while the list is open.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.headRow}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={isBn ? 'পেছনে যান' : 'Go back'}
        >
          <BackIcon size={24} />
        </Pressable>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>{isBn ? 'সাপ্তাহিক লাইভ কুইজ' : 'Weekly Live Quiz'}</Text>
          <Text style={styles.headSub}>
            {isBn ? 'লাইভ কুইজে অংশ নাও' : 'Take part in live quizzes'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : quizzes.length === 0 ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>
            {isBn ? 'এই সপ্তাহে কোনো কুইজ নেই।' : 'No quizzes this week.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {quizzes.map((q) => {
            const state = windowState(q, now);
            const info = courseById[q.id] || {};
            const live = state === 'live';
            const taken = takenById[q.id] || null;
            return (
              <Pressable
                key={q.id}
                onPress={() => {
                  if (live) {
                    openQuiz(q);
                  } else if (state === 'upcoming') {
                    alert(
                      '',
                      isBn
                        ? `${fmtDateTime(q.opens_at, isBn, fmtNum)} থেকে শুরু হবে।`
                        : `Opens ${fmtDateTime(q.opens_at, isBn, fmtNum)}.`
                    );
                  } else if (state === 'ended') {
                    alert('', isBn ? 'এই কুইজ শেষ হয়ে গেছে।' : 'This quiz has ended.');
                  } else {
                    openQuiz(q);
                  }
                }}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              >
                <View style={styles.cardIcon}>
                  <BoltIcon size={26} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {q.title || (isBn ? 'লাইভ কুইজ' : 'Live quiz')}
                  </Text>
                  {!!info.courseTitle && (
                    <Text style={styles.cardCourse}>{info.courseTitle}</Text>
                  )}
                  <Text style={styles.cardMeta}>
                    {state === 'live' &&
                      (q.closes_at
                        ? `${isBn ? 'শেষ হতে' : 'Ends in'} ${fmtRemaining(new Date(q.closes_at).getTime() - now, isBn, fmtNum) || (isBn ? 'শেষ' : 'Over')}`
                        : (isBn ? 'এখন চলছে' : 'Live now'))}
                    {state === 'upcoming' &&
                      `${isBn ? 'শুরু হতে' : 'Starts in'} ${fmtRemaining(new Date(q.opens_at).getTime() - now, isBn, fmtNum) || fmtDateTime(q.opens_at, isBn, fmtNum)}`}
                    {state === 'ended' && (isBn ? 'শেষ' : 'Ended')}
                    {state === 'unknown' && (isBn ? 'কুইজ' : 'Quiz')}
                  </Text>
                </View>
                {taken ? (
                  <Text style={[styles.chip, styles.chipDone]}>
                    {fmtNum(taken.score)}/{fmtNum(taken.total)}
                  </Text>
                ) : (
                  <Text style={[styles.chip, live ? styles.chipLive : styles.chipMute]}>
                    {live ? (isBn ? 'লাইভ' : 'LIVE') : state === 'upcoming' ? (isBn ? 'আসছে' : 'SOON') : (isBn ? 'শেষ' : 'OVER')}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
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
  headText: {
    flex: 1,
    gap: 2,
  },
  headTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  headSub: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  list: {
    gap: 12,
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
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  cardPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  cardCourse: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  cardMeta: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
  chip: {
    fontSize: 12,
    fontFamily: 'HindSiliguri-SemiBold',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  chipLive: {
    color: '#FFFFFF',
    backgroundColor: colors.danger,
  },
  chipMute: {
    color: colors.textSecondary,
    backgroundColor: colors.backgroundMuted,
  },
  chipDone: {
    color: colors.successDeep,
    backgroundColor: colors.successSubtle,
  },
});
