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
import { getClassLevelName } from '../../../lib/classLevel';
import { SubjectIcon, iconForSubjectKey, toBn } from '../../../lib/subjectIcons';
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
      <Path d="m9 6 6 6-6 6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function subjectKeyForName(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('higher') || n.includes('উচ্চতর')) return 'highmath';
  if (n.includes('phys') || n.includes('পদার্থ')) return 'physics';
  if (n.includes('chem') || n.includes('রসায়')) return 'chemistry';
  if (n.includes('bio') || n.includes('জীব')) return 'biology';
  if (n.includes('math') || n.includes('গণিত')) return 'math';
  return null;
}

const LEVEL_SUBJECTS = {
  SSC: ['physics', 'chemistry', 'biology', 'math'],
  HSC: ['physics', 'chemistry', 'highmath', 'biology'],
};

const SUBJECT_NAMES = {
  physics: { bn: 'পদার্থবিজ্ঞান', en: 'Physics' },
  chemistry: { bn: 'রসায়ন', en: 'Chemistry' },
  biology: { bn: 'জীববিজ্ঞান', en: 'Biology' },
  math: { bn: 'গণিত', en: 'Mathematics' },
  highmath: { bn: 'উচ্চতর গণিত', en: 'Higher Mathematics' },
};

/**
 * ReportDetailScreen - Full learning report (scr-report-detail).
 * Matches index.html: gen-head (back → Report, "Full learning report"),
 * 2-metric grid (Quizzes, Accuracy), "Your best subjects" breakdown
 * rows (icon + title + "acc% · tries attempts" sub + chevron), share
 * row. Copy verbatim.
 *
 * Brief-vs-prototype corrections: the prototype detail screen has TWO
 * metric cards (not 2x2), NO week nav, NO range toggle, NO bars — built
 * what index.html actually renders.
 *
 * VALUES ARE REAL: videos-watched from live cq_video_views rows;
 * quizzes/accuracy/tries from live mcq_deck_attempts + quiz_submissions
 * rows (score/total sums, per-subject attribution via nested
 * deck/chapter/subject links with flat fallback). quizUnknown shows
 * "—" only when BOTH attempt sources fail — the prototype's demo
 * arithmetic is NOT reproduced. Share row → placeholder (sharing
 * comes later).
 */
export default function ReportDetailScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { profile, session } = useUser();
  const alert = useAlert();

  const [videosWatched, setVideosWatched] = useState(0);
  const [quizzes, setQuizzes] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [attempts, setAttempts] = useState([]); // {score,total,subject}
  // True only when BOTH attempt sources fail — the cards show
  // "unavailable" instead of a misleading 0.
  const [quizUnknown, setQuizUnknown] = useState(false);
  const [levelKey, setLevelKey] = useState('SSC');
  const [loading, setLoading] = useState(true);

  const isBn = lang === 'bn';
  const fmtNum = (n) => (isBn ? toBn(n) : String(n));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const levelName = await getClassLevelName(profile?.class_level_id);
        if (!cancelled && levelName) {
          setLevelKey(levelName);
        }
        if (session?.user?.id) {
          const uid = session.user.id;
          try {
            const { count, error } = await supabase
              .from('cq_video_views')
              .select('video_id', { count: 'exact', head: true })
              .eq('student_id', uid);
            if (error) throw error;
            if (!cancelled) setVideosWatched(count || 0);
          } catch (err) {
            console.warn('ReportDetail: could not load watched videos:', err?.message);
          }
          // Attempts from both sources (deck + live quiz), with subject
          // attribution; nested link fails degrade to unattributed rows.
          const scored = [];
          let okAny = false;
          try {
            const res = await supabase
              .from('mcq_deck_attempts')
              .select('score,total_questions,submitted_at, mcq_decks(chapters(subjects(name)))')
              .eq('student_id', uid)
              .order('submitted_at', { ascending: false })
              .limit(500);
            if (res.error) throw res.error;
            (res.data || []).forEach((a) =>
              scored.push({
                score: a.score || 0,
                total: a.total_questions || 0,
                subject: a?.mcq_decks?.chapters?.subjects?.name || '',
              })
            );
            okAny = true;
          } catch (err) {
            console.warn('ReportDetail: deck attempts nested unreadable, retrying flat:', err?.message);
            try {
              const res = await supabase
                .from('mcq_deck_attempts')
                .select('score,total_questions')
                .eq('student_id', uid)
                .limit(500);
              if (res.error) throw res.error;
              (res.data || []).forEach((a) =>
                scored.push({ score: a.score || 0, total: a.total_questions || 0, subject: '' })
              );
              okAny = true;
            } catch (flatErr) {
              console.warn('ReportDetail: deck attempts unreadable:', flatErr?.message);
            }
          }
          try {
            const res = await supabase
              .from('quiz_submissions')
              .select('score,total_questions,submitted_at, quizzes(subjects(name))')
              .eq('student_id', uid)
              .order('submitted_at', { ascending: false })
              .limit(500);
            if (res.error) throw res.error;
            (res.data || []).forEach((s) =>
              scored.push({
                score: s.score || 0,
                total: s.total_questions || 0,
                subject: s?.quizzes?.subjects?.name || '',
              })
            );
            okAny = true;
          } catch (err) {
            console.warn('ReportDetail: quiz submissions nested unreadable, retrying flat:', err?.message);
            try {
              const res = await supabase
                .from('quiz_submissions')
                .select('score,total_questions')
                .eq('student_id', uid)
                .limit(500);
              if (res.error) throw res.error;
              (res.data || []).forEach((s) =>
                scored.push({ score: s.score || 0, total: s.total_questions || 0, subject: '' })
              );
              okAny = true;
            } catch (flatErr) {
              console.warn('ReportDetail: quiz submissions unreadable:', flatErr?.message);
            }
          }
          if (!cancelled) {
            setAttempts(scored);
            const t = scored.reduce((n, a) => n + a.total, 0);
            const s = scored.reduce((n, a) => n + a.score, 0);
            setQuizzes(scored.length);
            setAccuracy(t > 0 ? Math.round((s / t) * 100) : 0);
            setQuizUnknown(!okAny);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [profile?.class_level_id, session?.user?.id]);

  const subjects = LEVEL_SUBJECTS[levelKey];

  const subMap = {};
  subjects.forEach((key) => {
    subMap[key] = { score: 0, total: 0, tries: 0 };
  });
  attempts.forEach((a) => {
    const key = subjectKeyForName(a.subject);
    if (key && subMap[key]) {
      subMap[key].score += a.score;
      subMap[key].total += a.total;
      subMap[key].tries += 1;
    }
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header (.gen-head) */}
      <View style={styles.headRow}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={isBn ? 'রিপোর্টে ফিরে যান' : 'Back to report'}
        >
          <BackIcon size={24} />
        </Pressable>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>{isBn ? 'সম্পূর্ণ শেখার রিপোর্ট' : 'Full learning report'}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Metric Grid (.metric-grid, 2 cards per prototype) */}
          <View style={styles.metricGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricNum}>{quizUnknown ? '—' : fmtNum(quizzes)}</Text>
              <Text style={styles.metricLabel}>{isBn ? 'কুইজ' : 'Quizzes'}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricNum}>{quizUnknown ? '—' : `${fmtNum(accuracy)}%`}</Text>
              <Text style={styles.metricLabel}>{isBn ? 'নির্ভুলতা' : 'Accuracy'}</Text>
            </View>
          </View>
          {quizUnknown && (
            <Text style={styles.unknownNote}>
              {isBn ? 'কুইজ তথ্য পাওয়া যায়নি।' : 'Quiz data unavailable.'}
            </Text>
          )}

          {/* Breakdown (.breakdown-list) */}
          <Text style={styles.secTitle}>{isBn ? 'আপনার সেরা বিষয়' : 'Your best subjects'}</Text>
          <View style={styles.breakdownList}>
            {subjects.map((key) => {
              const st = subMap[key];
              const acc = st.total > 0 ? Math.round((st.score / st.total) * 100) : 0;
              return (
                <Pressable
                  key={key}
                  onPress={() =>
                    alert('', isBn ? 'লাইভ অ্যাপে শেয়ার চালু হবে।' : 'Sharing opens on the live app.')
                  }
                  style={({ pressed }) => [styles.rowCard, pressed && styles.rowPressed]}
                >
                  <View style={styles.rowIcon}>
                    <SubjectIcon icon={iconForSubjectKey(key)} size={26} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>
                      {isBn ? SUBJECT_NAMES[key].bn : SUBJECT_NAMES[key].en}
                    </Text>
                    <Text style={styles.rowSub}>
                      {fmtNum(acc)}% {isBn ? 'নির্ভুলতা' : 'Accuracy'} · {fmtNum(st.tries)} {isBn ? 'চেষ্টা' : 'attempts'}
                    </Text>
                  </View>
                  <Chevron size={22} />
                </Pressable>
              );
            })}
          </View>

          {/* Share Row */}
          <Pressable
            onPress={() =>
              alert('', isBn ? 'লাইভ অ্যাপে শেয়ার চালু হবে।' : 'Sharing opens on the live app.')
            }
            style={({ pressed }) => [styles.rowCard, pressed && styles.rowPressed]}
          >
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{isBn ? 'রিপোর্ট শেয়ার করুন' : 'Share report'}</Text>
            </View>
            <Chevron size={22} />
          </Pressable>

          {/* Videos-watched footnote (real count, no prototype equivalent —
              shown plainly so the verified number is visible).
              TODO on review: keep as a feature or drop for strict
              prototype parity. */}
          <Text style={styles.footnote}>
            {isBn
              ? `দেখা ভিডিও: ${fmtNum(videosWatched)}`
              : `Videos watched: ${fmtNum(videosWatched)}`}
          </Text>
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 44,
    gap: 16,
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
  unknownNote: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  secTitle: {
    fontSize: 18,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  breakdownList: {
    gap: 10,
  },
  rowCard: {
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
  rowPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  rowSub: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  footnote: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
