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
import { toBn } from '../../../lib/subjectIcons';
import { colors, radius } from '../../../theme/theme';

function BackIcon({ size = 24, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckIcon({ size = 16, color = colors.success }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m5 12.5 4.5 4.5L19 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CrossIcon({ size = 16, color = colors.danger }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6 6 18" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

// options is jsonb — normalize array-of-string and array-of-object shapes.
function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((o) => {
    if (typeof o === 'string') return o;
    if (o && typeof o === 'object') return String(o.text ?? o.label ?? o.option ?? '');
    return String(o ?? '');
  });
}

function optionLetter(i, isBn) {
  const bn = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ'];
  const en = ['A', 'B', 'C', 'D', 'E', 'F'];
  const set = isBn ? bn : en;
  return set[i] || String(i + 1);
}

/**
 * MCQDeckPlayerScreen - MCQ practice deck + live quiz player.
 * One question at a time with tappable options, Prev/Next footer,
 * progress bar, then Submit → server-scored result + per-question
 * review. Copy is provisional Bangla (the prototype has no player
 * strings — the list screen's "coming soon" note is now retired).
 * mode 'deck' (default: chapter practice via deck RPCs, retakeable)
 * or 'quiz' (weekly live via quiz RPCs + `position` ordering).
 * Weekly quizzes are one-shot: an existing own submission skips the
 * questions entirely — closed quizzes show the server review, still-
 * open ones show a locked note until close.
 *
 * DATA IS REAL: questions via the purchase-gated
 * get_mcq_deck_questions(deck_id) RPC (falls back to a direct select
 * when the RPC is unreachable, with an honest error otherwise);
 * submit via submit_mcq_deck_attempt (server scores + records);
 * review via get_mcq_deck_review. Requires a real session — practice
 * must belong to someone, so session-less users get an honest
 * sign-in note instead of a fake local quiz.
 */
export default function MCQDeckPlayerScreen({ navigation, route }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { session } = useUser();
  const alert = useAlert();

  const courseId = route?.params?.courseId || null;
  // mode 'deck' (chapter practice, default) or 'quiz' (weekly live quiz).
  // Both question shapes carry correct_option_index; quiz rows order by
  // `position` instead of `order_index` (normalized after fetch).
  const mode = route?.params?.mode === 'quiz' ? 'quiz' : 'deck';
  const deckId = route?.params?.deckId || null;
  const deckTitle = route?.params?.deckTitle || '';
  const quizId = route?.params?.quizId || null;
  const quizTitle = route?.params?.quizTitle || '';
  const sourceTitle = mode === 'quiz' ? quizTitle : deckTitle;

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // questionId -> selectedIndex
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [takenLocked, setTakenLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { score, total }
  const [review, setReview] = useState([]); // [{question_id, question_text, options, correct_option_index, selected_option_index, is_correct}]

  const isBn = lang === 'bn';
  const fmtNum = (n) => (isBn ? toBn(n) : String(n));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError('');
      setTakenLocked(false);
      try {
        const access = await checkCourseAccess(courseId, session?.user?.id);
        if (!access.allowed) {
          alert(
            isBn ? 'কোর্স কিনুন' : 'Buy Course',
            isBn ? 'এই কুইজ দিতে কোর্সটি কিনুন।' : 'Please buy this course to take its quizzes.'
          );
          navigation?.goBack?.();
          return;
        }
        if (!session?.user?.id) {
          if (!cancelled) {
            setLoadError(
              isBn
                ? 'কুইজ দিতে সাইন ইন করুন — অনুশীলনের ফলাফল তোমার অ্যাকাউন্টে জমা হয়।'
                : 'Sign in to take quizzes — attempts are saved to your account.'
            );
            setQuestions([]);
          }
          return;
        }
        // One-shot quizzes: an existing submission means no retake.
        // Closed → show the server review; still open → locked note
        // (review unlocks after close).
        if (mode === 'quiz') {
          try {
            const sub = await supabase
              .from('quiz_submissions')
              .select('id,score,total_questions')
              .eq('quiz_id', quizId)
              .eq('student_id', session.user.id)
              .order('submitted_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (!sub.error && sub.data) {
              try {
                const rev = await supabase.rpc('get_quiz_review', { p_quiz_id: quizId });
                if (rev.error) throw rev.error;
                const rows = Array.isArray(rev.data) ? rev.data : [];
                if (!cancelled) {
                  setReview(rows);
                  setResult({
                    score: sub.data.score ?? rows.filter((r) => r.is_correct).length,
                    total: sub.data.total_questions ?? rows.length,
                  });
                  setQuestions(
                    rows.map((r, i) => ({
                      id: r.question_id,
                      question_text: r.question_text,
                      options: r.options,
                      correct_option_index: r.correct_option_index,
                      order_index: i,
                    }))
                  );
                }
              } catch {
                if (!cancelled) setTakenLocked(true);
              }
              return;
            }
          } catch (guardErr) {
            console.warn('MCQPlayer: retake check unreadable, continuing to questions:', guardErr?.message);
          }
        }
        let rows = null;
        if (mode === 'quiz') {
          try {
            const res = await supabase.rpc('get_quiz_questions', { p_quiz_id: quizId });
            if (res.error) throw res.error;
            rows = res.data || [];
          } catch (rpcErr) {
            console.warn('MCQPlayer: quiz RPC fetch failed, trying direct select:', rpcErr?.message);
            const res = await supabase
              .from('quiz_questions')
              .select('id, question_text, options, correct_option_index, position')
              .eq('quiz_id', quizId)
              .order('position');
            if (res.error) throw res.error;
            rows = res.data || [];
          }
        } else {
          try {
            const res = await supabase.rpc('get_mcq_deck_questions', { p_deck_id: deckId });
            if (res.error) throw res.error;
            rows = res.data || [];
          } catch (rpcErr) {
            console.warn('MCQPlayer: RPC fetch failed, trying direct select:', rpcErr?.message);
            const res = await supabase
              .from('mcq_deck_questions')
              .select('id, question_text, options, correct_option_index, order_index')
              .eq('deck_id', deckId)
              .order('order_index');
            if (res.error) throw res.error;
            rows = res.data || [];
          }
        }
        // Normalize ordering across both shapes (position vs order_index).
        rows = (rows || [])
          .map((r, i) => ({ ...r, order_index: r.order_index ?? r.position ?? i }))
          .sort((a, b) => a.order_index - b.order_index);
        if (!cancelled) {
          setQuestions(rows);
          setAnswers({});
          setIndex(0);
          setResult(null);
          setReview([]);
        }
      } catch (err) {
        console.warn('MCQPlayer: could not load questions:', err?.message);
        if (!cancelled) {
          setQuestions([]);
          setLoadError(err?.message || (isBn ? 'প্রশ্ন লোড করা যায়নি।' : 'Could not load questions.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [courseId, deckId, quizId, mode, session?.user?.id]);

  const current = questions[index] || null;
  const currentOptions = current ? normalizeOptions(current.options) : [];
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const hasPrev = index > 0;
  const hasNext = index < questions.length - 1;

  const pick = (optionIndex) => {
    if (!current || result) return;
    setAnswers((prev) => ({ ...prev, [current.id]: optionIndex }));
  };

  const handleSubmit = async () => {
    const unanswered = questions.filter((q) => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      alert(
        isBn ? 'সব উত্তর দাও' : 'Answer everything',
        isBn
          ? `${fmtNum(unanswered.length)}টি প্রশ্নের উত্তর বাকি আছে।`
          : `${fmtNum(unanswered.length)} question(s) still unanswered.`
      );
      const firstOpen = questions.findIndex((q) => answers[q.id] === undefined);
      if (firstOpen >= 0) setIndex(firstOpen);
      return;
    }
    setSubmitting(true);
    try {
      const payload = questions.map((q) => ({
        question_id: q.id,
        selected_option_index: answers[q.id],
      }));
      const res =
        mode === 'quiz'
          ? await supabase.rpc('submit_quiz', { p_quiz_id: quizId, p_answers: payload })
          : await supabase.rpc('submit_mcq_deck_attempt', { p_deck_id: deckId, p_answers: payload });
      if (res.error) throw res.error;
      const row = Array.isArray(res.data) ? res.data[0] : res.data;
      const score = row?.score ?? 0;
      const total = row?.total_questions ?? questions.length;
      let reviewRows = [];
      try {
        const rev =
          mode === 'quiz'
            ? await supabase.rpc('get_quiz_review', { p_quiz_id: quizId })
            : await supabase.rpc('get_mcq_deck_review', { p_deck_id: deckId });
        if (rev.error) throw rev.error;
        reviewRows = Array.isArray(rev.data) ? rev.data : [];
      } catch (revErr) {
        console.warn('MCQPlayer: review unavailable:', revErr?.message);
      }
      // Fallback review from local data when the review RPC is unreachable.
      if (reviewRows.length === 0) {
        reviewRows = questions.map((q) => {
          const correct = q.correct_option_index;
          const selected = answers[q.id];
          return {
            question_id: q.id,
            question_text: q.question_text,
            options: q.options,
            correct_option_index: correct,
            selected_option_index: selected,
            is_correct: selected === correct,
          };
        });
      }
      setReview(reviewRows);
      setResult({ score, total });
    } catch (err) {
      alert(
        isBn ? 'জমা দেওয়া যায়নি' : 'Could Not Submit',
        err?.message || (isBn ? 'আবার চেষ্টা করো।' : 'Please try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setIndex(0);
    setResult(null);
    setReview([]);
  };

  const renderResult = () => {
    const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.scoreCard}>
          <Text style={styles.scoreNum}>
            {fmtNum(result.score)}/{fmtNum(result.total)}
          </Text>
          <Text style={styles.scoreSub}>
            {isBn ? `${fmtNum(pct)}% সঠিক` : `${fmtNum(pct)}% correct`}
          </Text>
          <Text style={styles.scoreMsg}>
            {pct >= 80
              ? (isBn ? 'দারুণ! এভাবেই চালিয়ে যাও।' : 'Excellent! Keep it up.')
              : pct >= 50
                ? (isBn ? 'ভালো চেষ্টা — রিভিউ দেখে আবার দাও।' : 'Good try — review and go again.')
                : (isBn ? 'হাল ছেড়ো না — নিচে ভুলগুলো দেখো।' : "Don't give up — check your mistakes below.")}
          </Text>
        </View>

        {review.map((r, i) => {
          const opts = normalizeOptions(r.options);
          return (
            <View key={r.question_id || i} style={styles.reviewCard}>
              <Text style={styles.reviewQ}>
                {fmtNum(i + 1)}. {r.question_text}
              </Text>
              {opts.map((opt, oi) => {
                const isCorrect = oi === r.correct_option_index;
                const isPicked = oi === r.selected_option_index;
                return (
                  <View
                    key={oi}
                    style={[
                      styles.reviewOpt,
                      isCorrect && styles.reviewOptCorrect,
                      isPicked && !isCorrect && styles.reviewOptWrong,
                    ]}
                  >
                    <Text style={styles.reviewOptLetter}>{optionLetter(oi, isBn)}</Text>
                    <Text style={styles.reviewOptText}>{opt}</Text>
                    {isCorrect && <CheckIcon size={16} />}
                    {isPicked && !isCorrect && <CrossIcon size={16} />}
                  </View>
                );
              })}
            </View>
          );
        })}

        <View style={styles.resultActions}>
          <Button
            title={isBn ? 'আবার চেষ্টা করো' : 'Try again'}
            variant="primary"
            size="lg"
            onPress={handleRetry}
          />
          <Button
            title={isBn ? 'ডেকে ফিরে যাও' : 'Back to decks'}
            variant="secondary"
            size="lg"
            onPress={() => navigation?.goBack?.()}
          />
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.headRow}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={isBn ? 'ডেকে ফিরে যান' : 'Back to decks'}
        >
          <BackIcon size={24} />
        </Pressable>
        <View style={styles.headText}>
          <Text style={styles.headTitle} numberOfLines={2}>
            {sourceTitle || (isBn ? 'কুইজ' : 'Quiz')}
          </Text>
          {!!questions.length && (
            <Text style={styles.headSub}>
              {isBn
                ? `প্রশ্ন ${fmtNum(index + 1)} / ${fmtNum(questions.length)}`
                : `Question ${fmtNum(index + 1)} of ${fmtNum(questions.length)}`}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : loadError ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>{loadError}</Text>
        </View>
      ) : takenLocked ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>
            {isBn
              ? 'এই কুইজ দেওয়া হয়ে গেছে। কুইজ শেষ হলে রিভিউ দেখা যাবে।'
              : 'You already took this quiz. Review unlocks after it closes.'}
          </Text>
          <View style={styles.takenActions}>
            <Button
              title={isBn ? 'ফিরে যান' : 'Go back'}
              variant="secondary"
              size="lg"
              onPress={() => navigation?.goBack?.()}
            />
          </View>
        </View>
      ) : questions.length === 0 ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>
            {isBn ? 'এই ডেকে কোনো প্রশ্ন নেই।' : 'No questions in this deck yet.'}
          </Text>
        </View>
      ) : result ? (
        renderResult()
      ) : (
        <View style={styles.body}>
          {/* Progress */}
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {isBn
                ? `${fmtNum(answeredCount)}/${fmtNum(questions.length)}টি উত্তর`
                : `${fmtNum(answeredCount)}/${fmtNum(questions.length)} answered`}
            </Text>
          </View>

          {/* Question */}
          <ScrollView
            contentContainerStyle={styles.qScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.qCount}>
              {isBn ? `প্রশ্ন ${fmtNum(index + 1)}` : `Question ${fmtNum(index + 1)}`}
            </Text>
            <Text style={styles.qText}>{current?.question_text || ''}</Text>
            <View style={styles.optList}>
              {currentOptions.map((opt, oi) => {
                const selected = answers[current?.id] === oi;
                return (
                  <Pressable
                    key={oi}
                    onPress={() => pick(oi)}
                    style={({ pressed }) => [
                      styles.opt,
                      selected && styles.optSelected,
                      pressed && styles.btnPressed,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <View style={[styles.optLetter, selected && styles.optLetterSelected]}>
                      <Text style={[styles.optLetterText, selected && styles.optLetterTextSelected]}>
                        {optionLetter(oi, isBn)}
                      </Text>
                    </View>
                    <Text style={[styles.optText, selected && styles.optTextSelected]}>
                      {opt}
                    </Text>
                    {selected && <CheckIcon size={18} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer: Prev / Next-or-Submit */}
          <View style={styles.footer}>
            <Pressable
              onPress={() => hasPrev && setIndex(index - 1)}
              disabled={!hasPrev}
              style={({ pressed }) => [
                styles.navBtn,
                styles.navBtnGhost,
                !hasPrev && styles.navBtnDisabled,
                pressed && hasPrev && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={isBn ? 'আগের প্রশ্ন' : 'Previous question'}
            >
              <Text style={[styles.navTextGhost, !hasPrev && styles.navTextDisabled]}>
                {isBn ? 'আগেরটি' : 'Prev'}
              </Text>
            </Pressable>
            {hasNext ? (
              <Pressable
                onPress={() => setIndex(index + 1)}
                style={({ pressed }) => [styles.navBtn, pressed && styles.btnPressed]}
                accessibilityRole="button"
                accessibilityLabel={isBn ? 'পরের প্রশ্ন' : 'Next question'}
              >
                <Text style={styles.navText}>{isBn ? 'পরেরটি' : 'Next'}</Text>
              </Pressable>
            ) : (
              <View style={styles.submitHalf}>
                <Button
                  title={isBn ? 'জমা দাও' : 'Submit'}
                  variant="primary"
                  size="lg"
                  loading={submitting}
                  onPress={handleSubmit}
                />
              </View>
            )}
          </View>
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
  headText: {
    flex: 1,
    gap: 2,
  },
  headTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  headSub: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-SemiBold',
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
  body: {
    flex: 1,
  },
  progressWrap: {
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.backgroundMuted,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary,
  },
  qScroll: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexGrow: 1,
  },
  qCount: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
  qText: {
    fontSize: 18,
    lineHeight: 27,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  optList: {
    gap: 10,
    marginTop: 4,
  },
  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  optLetter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optLetterSelected: {
    backgroundColor: colors.primary,
  },
  optLetterText: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary,
  },
  optLetterTextSelected: {
    color: '#FFFFFF',
  },
  optText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textPrimary,
  },
  optTextSelected: {
    fontFamily: 'HindSiliguri-SemiBold',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  navBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    paddingVertical: 13,
  },
  navBtnGhost: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  navBtnDisabled: {
    backgroundColor: colors.backgroundMuted,
    borderWidth: 0,
  },
  navText: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-SemiBold',
    color: '#FFFFFF',
  },
  navTextGhost: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  navTextDisabled: {
    color: colors.textSecondary,
  },
  submitHalf: {
    flex: 1,
  },
  btnPressed: {
    opacity: 0.85,
  },
  scrollContent: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 44,
  },
  scoreCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.cardLg,
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  scoreNum: {
    fontSize: 40,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
  scoreSub: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  scoreMsg: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
    gap: 8,
  },
  reviewQ: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  reviewOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  reviewOptCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.successSubtle,
  },
  reviewOptWrong: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSubtle,
  },
  reviewOptLetter: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary,
  },
  reviewOptText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textPrimary,
  },
  resultActions: {
    gap: 10,
    marginTop: 4,
  },
  takenActions: {
    width: '100%',
    paddingHorizontal: 32,
    marginTop: 16,
  },
});
