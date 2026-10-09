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
import { SubjectIcon, iconForSubjectName, toBn } from '../../../lib/subjectIcons';
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

/**
 * MCQListScreen - MCQ subject list (scr-mcq).
 * Matches index.html: gen-head (back → CourseHome, "MCQ quizzes" +
 * "Pick a subject"), subject rows (icon + title + counts + chevron →
 * MCQSubject). Copy verbatim — the prototype renders the same
 * row-card shape as CQ subjects, so this screen mirrors CQListScreen
 * with the MCQ target.
 *
 * Counts are REAL (chapters + MCQ decks per subject actually found).
 * Deck linkage/columns are read defensively (see MCQSubjectScreen) —
 * when decks can't be scoped, counts fall back to chapters only.
 */
export default function MCQListScreen({ navigation, route }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { session } = useUser();
  const alert = useAlert();

  const courseId = route?.params?.courseId || null;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  // True when the mcq_decks probe fails (RLS/schema unverified) — the
  // list is replaced by a banner instead of misleading zero counts.
  const [deckBlocked, setDeckBlocked] = useState(false);

  const isBn = lang === 'bn';
  const fmtNum = (n) => (isBn ? toBn(n) : String(n));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const access = await checkCourseAccess(courseId, session?.user?.id);
        if (!access.allowed) {
          if (!cancelled) setLoading(false);
          alert(
            isBn ? 'কোর্স কিনুন' : 'Buy Course',
            isBn ? 'এই কনটেন্ট দেখতে কোর্সটি কিনুন।' : 'Please buy this course to view its content.'
          );
          navigation?.goBack?.();
          return;
        }
        const { data: subs, error: subError } = await supabase
          .from('subjects')
          .select('id, name')
          .eq('course_id', courseId)
          .order('order_index');
        if (subError) throw subError;
        const ids = (subs || []).map((s) => s.id);
        let deckCounts = {};
        if (ids.length > 0) {
          const { data: chaps } = await supabase
            .from('chapters')
            .select('id, subject_id')
            .in('subject_id', ids);
          const chapIds = (chaps || []).map((c) => c.id);
          const bySubject = {};
          (chaps || []).forEach((c) => {
            bySubject[c.subject_id] = (bySubject[c.subject_id] || 0) + 1;
          });
          let decks = [];
          try {
            const res = await supabase.from('mcq_decks').select('*').limit(200);
            if (res.error) throw res.error;
            decks = res.data || [];
          } catch (deckErr) {
            console.warn('MCQList: deck listing blocked (schema/RLS unverified):', deckErr?.message);
            if (!cancelled) setDeckBlocked(true);
            decks = [];
          }
          (subs || []).forEach((s) => {
            const subjectChapIds = new Set(
              (chaps || []).filter((c) => c.subject_id === s.id).map((c) => c.id)
            );
            const scoped = decks.filter((d) => {
              if (d.chapter_id && subjectChapIds.has(d.chapter_id)) return true;
              if (d.subject_id && d.subject_id === s.id) return true;
              return false;
            });
            deckCounts[s.id] = { chapters: bySubject[s.id] || 0, decks: scoped.length };
          });
        }
        if (cancelled) return;
        setRows(
          (subs || []).map((s) => ({
            ...s,
            chapterCount: (deckCounts[s.id] && deckCounts[s.id].chapters) || 0,
            videoCount: (deckCounts[s.id] && deckCounts[s.id].decks) || 0,
          }))
        );
      } catch (err) {
        console.warn('MCQList: could not load subjects:', err?.message);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [courseId, session?.user?.id]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header (.gen-head) */}
      <View style={styles.headRow}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={isBn ? 'কোর্স হোমে ফিরে যান' : 'Back to course home'}
        >
          <BackIcon size={24} />
        </Pressable>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>{isBn ? 'MCQ কুইজ' : 'MCQ quizzes'}</Text>
          <Text style={styles.headSub}>{isBn ? 'একটি বিষয় বাছুন' : 'Pick a subject'}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : deckBlocked ? (
        // TODO: Bangla (provisional copy) — shown only when the deck
        // probe fails, never as content.
        <View style={styles.blockedWrap}>
          <Text style={styles.blockedText}>
            {isBn ? 'MCQ কুইজের অ্যাক্সেস পাওয়া যায়নি।' : 'MCQ access restricted.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {/* Subject Rows (.vid-list → .row-card) */}
          {rows.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => navigation?.navigate?.('MCQSubject', { courseId, subjectId: s.id })}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.rowIcon}>
                <SubjectIcon icon={iconForSubjectName(s.name)} size={26} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{s.name}</Text>
                <Text style={styles.rowSub}>
                  {isBn
                    ? `${fmtNum(s.chapterCount)} অধ্যায় · ${fmtNum(s.videoCount)} কুইজ`
                    : `${fmtNum(s.chapterCount)} chapters · ${fmtNum(s.videoCount)} quizzes`}
                </Text>
              </View>
              <Chevron size={22} />
            </Pressable>
          ))}
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
    fontSize: 14,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  blockedText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  list: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 44,
  },
  row: {
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
});
