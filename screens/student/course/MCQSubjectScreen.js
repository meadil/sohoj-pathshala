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
import Button from '../../../components/Button';
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

// Deck status is NOT in the verified schema (mcq_decks columns are
// undocumented, students may not even SELECT the table). Resolve
// openness from whatever status-like field actually exists; return
// null (chip omitted) when nothing determinable is present.
function deckOpenState(deck) {
  if (!deck || typeof deck !== 'object') return null;
  if (typeof deck.status === 'string') {
    const s = deck.status.toLowerCase();
    if (['open', 'opened', 'active', 'live', 'published'].includes(s)) return true;
    if (['closed', 'close', 'locked', 'draft', 'inactive'].includes(s)) return false;
    return null;
  }
  if (typeof deck.is_open === 'boolean') return deck.is_open;
  if (typeof deck.is_closed === 'boolean') return !deck.is_closed;
  if (deck.opens_at || deck.closes_at) {
    const now = Date.now();
    const openAt = deck.opens_at ? new Date(deck.opens_at).getTime() : 0;
    const closeAt = deck.closes_at ? new Date(deck.closes_at).getTime() : Infinity;
    if (!Number.isNaN(openAt) && !Number.isNaN(closeAt)) {
      return now >= openAt && now <= closeAt;
    }
    return null;
  }
  return null;
}

/**
 * MCQSubjectScreen - MCQ quizzes by chapter (scr-mcq-subject).
 * Matches index.html: gen-head (back → MCQList, "Quizzes by chapter"),
 * chapter blocks (.mcq-chap) with status chip + chapterFmt head and
 * deck items (icon + title + Start CTA → deck player later). Copy
 * verbatim.
 *
 * Decks are REAL mcq_decks rows read defensively (select('*'), runtime
 * chapter linkage + status detection) because the deck columns and
 * student SELECT access are unverified — see deckOpenState above. The
 * prototype's alternating open/closed demo pattern and "10 questions"
 * demo sub are NOT reproduced; question counts are omitted (question
 * rows are instructor-only under RLS). Start CTA → MCQDeck player
 * screen (full player, submit, score + review).
 */
export default function MCQSubjectScreen({ navigation, route }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { session } = useUser();
  const alert = useAlert();

  const courseId = route?.params?.courseId || null;
  const subjectId = route?.params?.subjectId || null;

  const [subjectIcon, setSubjectIcon] = useState('atom');
  const [chapters, setChapters] = useState([]);
  const [decksByChapter, setDecksByChapter] = useState({});
  const [loading, setLoading] = useState(true);
  // True when the mcq_decks probe fails (RLS/schema unverified) — the
  // list is replaced by a banner instead of deck-less chapter heads.
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
        const { data: sub, error: subError } = await supabase
          .from('subjects')
          .select('id, name')
          .eq('id', subjectId)
          .single();
        if (subError) throw subError;
        if (cancelled) return;
        setSubjectIcon(iconForSubjectName(sub?.name));

        const { data: chaps, error: chapError } = await supabase
          .from('chapters')
          .select('id, title')
          .eq('subject_id', subjectId)
          .order('order_index');
        if (chapError) throw chapError;
        if (cancelled) return;
        setChapters(chaps || []);

        let decks = [];
        try {
          const res = await supabase.from('mcq_decks').select('*').limit(200);
          if (res.error) throw res.error;
          decks = res.data || [];
        } catch (deckErr) {
          console.warn('MCQSubject: deck listing blocked (schema/RLS unverified):', deckErr?.message);
          if (!cancelled) setDeckBlocked(true);
          decks = [];
        }
        if (cancelled) return;
        const chapIds = new Set((chaps || []).map((c) => c.id));
        const grouped = {};
        decks.forEach((d) => {
          let key = null;
          if (d.chapter_id && chapIds.has(d.chapter_id)) {
            key = d.chapter_id;
          } else if (d.subject_id && d.subject_id === subjectId) {
            key = d.subject_id;
          }
          if (key) {
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(d);
          }
        });
        setDecksByChapter(grouped);
      } catch (err) {
        console.warn('MCQSubject: could not load chapters:', err?.message);
        if (!cancelled) {
          setChapters([]);
          setDecksByChapter({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [courseId, subjectId, session?.user?.id]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header (.gen-head) */}
      <View style={styles.headRow}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={isBn ? 'MCQ বিষয়ে ফিরে যান' : 'Back to MCQ subjects'}
        >
          <BackIcon size={24} />
        </Pressable>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>{isBn ? 'অধ্যায়ভিত্তিক কুইজ' : 'Quizzes by chapter'}</Text>
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
          {/* Chapter Blocks (.mcq-chap) */}
          {chapters.map((c, ci) => {
            const decks = decksByChapter[c.id] || decksByChapter[subjectId] || [];
            const states = decks.map(deckOpenState);
            const chapterOpen = states.length > 0 && states.some((s) => s === true)
              ? true
              : states.length > 0 && states.every((s) => s === false)
                ? false
                : null;
            return (
              <View key={c.id} style={styles.chap}>
                <View style={styles.chapHead}>
                  {chapterOpen !== null && (
                    <Text style={[styles.chip, chapterOpen ? styles.chipOpen : styles.chipClosed]}>
                      {chapterOpen
                        ? (isBn ? 'খোলা' : 'Open')
                        : (isBn ? 'বন্ধ' : 'Closed')}
                    </Text>
                  )}
                  <Text style={styles.chapTitle}>
                    {isBn ? `অধ্যায় ${fmtNum(ci + 1)}: ${c.title}` : `Chapter ${fmtNum(ci + 1)}: ${c.title}`}
                  </Text>
                </View>
                {decks.map((d) => (
                  <View key={d.id || d.title} style={styles.deckItem}>
                    <SubjectIcon icon={subjectIcon} size={26} />
                    <View style={styles.deckBody}>
                      <Text style={styles.deckTitle}>{d.title || (isBn ? 'কুইজ ডেক' : 'Quiz deck')}</Text>
                    </View>
                    <Button
                      title={isBn ? 'শুরু করুন' : 'Start'}
                      variant="primary"
                      size="sm"
                      fullWidth={false}
                      onPress={() =>
                        navigation?.navigate?.('MCQDeck', {
                          courseId,
                          deckId: d.id,
                          deckTitle: d.title || '',
                        })
                      }
                    />
                  </View>
                ))}
              </View>
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
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 44,
  },
  chap: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  chapHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  chip: {
    fontSize: 12,
    fontFamily: 'HindSiliguri-SemiBold',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  chipOpen: {
    color: colors.successDeep,
    backgroundColor: colors.successSubtle,
  },
  chipClosed: {
    color: colors.textSecondary,
    backgroundColor: colors.backgroundMuted,
  },
  chapTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  deckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  deckBody: {
    flex: 1,
  },
  deckTitle: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
});
