import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '../../components/CustomAlert';
import Button from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../contexts/UserContext';
import { colors, radius } from '../../theme/theme';

const OPTION_COUNT = 4;
const LETTERS = ['A', 'B', 'C', 'D'];
const DAY_MS = 24 * 60 * 60 * 1000;
/** Fixed for now. Later this becomes a teacher-editable "disappears after". */
const VISIBLE_AFTER_CLOSE = 1; // days

/**
 * TeacherQuizEditorScreen - author a weekly quiz and schedule it.
 *
 * A weekly quiz is NOT course content: subject_id stays null so it is not tied
 * to any subject, and `published` decides whether students see it at all.
 *
 * Lifecycle enforced by opens_at / closes_at / hides_at:
 *   now < opens_at              -> hidden
 *   opens_at .. closes_at       -> may answer; NO answers revealed to anyone
 *   closes_at .. hides_at       -> answers revealed, answering closed
 *   now > hides_at              -> disappears
 *
 * The reveal is deliberately gated on closes_at for EVERYONE, including a
 * student who already submitted - they must not be able to see answers while
 * others are still answering.
 */
export default function TeacherQuizEditorScreen({ navigation, route }) {
  const { lang } = useUser();
  const alert = useAlert();
  const isBn = lang === 'bn';

  const quizId = route?.params?.quizId || null;

  const [loading, setLoading] = useState(!!quizId);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [minutes, setMinutes] = useState('15');
  const [openAt, setOpenAt] = useState(() => toInput(new Date(Date.now() + 5 * 60 * 1000)));
  const [closeAt, setCloseAt] = useState(() => toInput(new Date(Date.now() + 35 * 60 * 1000)));

  const openIso = useMemo(() => fromInput(openAt), [openAt]);
  const closeIso = useMemo(() => fromInput(closeAt), [closeAt]);
  const hidesIso = useMemo(() => (closeIso ? new Date(new Date(closeIso).getTime() + VISIBLE_AFTER_CLOSE * DAY_MS).toISOString() : null), [closeIso]);

  const load = useCallback(async () => {
    if (!quizId) return;
    try {
      const { data: quiz, error } = await supabase
        .from('quizzes')
        .select('id, title, opens_at, closes_at, hides_at, published')
        .eq('id', quizId)
        .single();
      if (error) throw error;
      setTitle(quiz?.title || '');
      if (quiz?.opens_at) setOpenAt(toInput(new Date(quiz.opens_at)));
      if (quiz?.closes_at) setCloseAt(toInput(new Date(quiz.closes_at)));

      const { data: qs } = await supabase
        .from('quiz_questions')
        .select('id, question_text, options, correct_option_index, position')
        .eq('quiz_id', quizId)
        .order('position', { ascending: true });
      setQuestions(
        (qs || []).map((q) => ({
          id: q.id,
          text: q.question_text || '',
          options: normalise(q.options),
          correct: typeof q.correct_option_index === 'number' ? q.correct_option_index : -1,
        }))
      );
    } catch (err) {
      console.warn('TeacherQuizEditor: load failed:', err?.message);
      alert(isBn ? 'লোড করা যায়নি' : 'Could not load', err?.message);
    } finally {
      setLoading(false);
    }
  }, [quizId, isBn, alert]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- question editing -------------------------------------------------
  const addQuestion = () =>
    setQuestions((prev) => [
      ...prev,
      { id: `new-${Date.now()}-${prev.length}`, text: '', options: blank(), correct: -1 },
    ]);
  const setText = (id, text) => setQuestions((p) => p.map((q) => (q.id === id ? { ...q, text } : q)));
  const setOpt = (id, i, v) =>
    setQuestions((p) => p.map((q) => (q.id === id ? { ...q, options: q.options.map((o, j) => (j === i ? v : o)) } : q)));
  const pickCorrect = (id, i) => setQuestions((p) => p.map((q) => (q.id === id ? { ...q, correct: i } : q)));
  const removeQ = (id) => setQuestions((p) => p.filter((q) => q.id !== id));

  // ---- save -------------------------------------------------------------
  const validate = () => {
    if (!title.trim()) return isBn ? 'শিরোনাম দিন।' : 'Enter a title.';
    if (!openIso || !closeIso) return isBn ? 'সময় সঠিক নয় (YYYY-MM-DD HH:MM)।' : 'Invalid date/time. Use YYYY-MM-DD HH:MM.';
    if (new Date(closeIso) <= new Date(openIso))
      return isBn ? 'শেষ হওয়ার সময় শুরুর পরে হতে হবে।' : 'The close time must be after the open time.';
    const mins = parseInt(minutes, 10);
    if (Number.isNaN(mins) || mins < 1 || mins > 600)
      return isBn ? 'সময় ১ থেকে ৬০০ মিনিটের মধ্যে দিন।' : 'Duration must be between 1 and 600 minutes.';
    if (questions.length === 0) return isBn ? 'অন্তত একটি প্রশ্ন লাগবে।' : 'Add at least one question.';
    const bad = questions.findIndex((q) => !q.text.trim() || q.correct < 0 || !q.options[q.correct]?.trim());
    if (bad > -1)
      return isBn
        ? `${bad + 1} নম্বর প্রশ্নে লেখা ও সঠিক অপশন দিন।`
        : `Question ${bad + 1} needs text and a correct option chosen.`;
    return null;
  };

  const save = async (publish) => {
    const problem = validate();
    if (problem) {
      alert(isBn ? 'অসম্পূর্ণ' : 'Incomplete', problem);
      return;
    }

    setSaving(true);
    try {
      let id = quizId;
      const payload = {
        title: title.trim(),
        opens_at: openIso,
        closes_at: closeIso,
        // Fixed 1 day for now; becomes teacher-editable later.
        hides_at: hidesIso,
        published: !!publish,
      };

      if (id) {
        const { error } = await supabase.from('quizzes').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('quizzes')
          .insert({ ...payload, created_by: route?.params?.userId || null })
          .select('id')
          .single();
        if (error) throw error;
        id = data.id;
      }

      const keepIds = questions.map((q) => q.id).filter((x) => !String(x).startsWith('new-'));
      const { error: pruneErr } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', id)
        .not('id', 'in', `(${keepIds.join(',')})`);
      if (pruneErr) throw pruneErr;

      for (let i = 0; i < questions.length; i += 1) {
        const q = questions[i];
        const body = {
          question_text: q.text.trim(),
          options: q.options.slice(0, OPTION_COUNT),
          correct_option_index: q.correct,
          position: i,
        };
        if (String(q.id).startsWith('new-')) {
          const { error } = await supabase.from('quiz_questions').insert({ ...body, quiz_id: id });
          if (error) throw error;
        } else {
          const { error } = await supabase.from('quiz_questions').update(body).eq('id', q.id);
          if (error) throw error;
        }
      }

      alert('', publish ? (isBn ? 'প্রকাশিত হয়েছে' : 'Quiz published') : isBn ? 'সংরক্ষিত হয়েছে' : 'Saved');
      route?.params?.onChanged?.();
      navigation?.goBack?.();
    } catch (err) {
      console.warn('TeacherQuizEditor: save failed:', err?.message);
      alert(isBn ? 'সংরক্ষণ করা যায়নি' : 'Could not save', err?.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.head}>
        <Pressable onPress={() => navigation?.goBack?.()} style={s.back} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={s.backT}>‹</Text>
        </Pressable>
        <Text style={s.title}>{isBn ? 'সাপ্তাহিক কুইজ' : 'Weekly quiz'}</Text>
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>{isBn ? 'শিরোনাম' : 'Title'}</Text>
        <TextInput
          style={s.input}
          placeholder={isBn ? 'যেমন: সাপ্তাহিক কুইজ ১' : 'e.g. Weekly quiz 1'}
          placeholderTextColor={colors.textTertiary}
          value={title}
          onChangeText={setTitle}
        />

        {/* ---- schedule ---- */}
        <Text style={s.label}>{isBn ? 'সময়সূচি' : 'Schedule'}</Text>
        <Text style={s.hint}>{isBn ? 'ফরম্যাট: YYYY-MM-DD HH:MM' : 'Format: YYYY-MM-DD HH:MM'}</Text>
        <Text style={s.subLabel}>{isBn ? 'শুরু হবে' : 'Opens at'}</Text>
        <TextInput style={s.input} value={openAt} onChangeText={setOpenAt} autoCapitalize="none" placeholder="2026-10-09 10:00" placeholderTextColor={colors.textTertiary} />
        <Text style={s.subLabel}>{isBn ? 'শেষ হবে' : 'Closes at'}</Text>
        <TextInput style={s.input} value={closeAt} onChangeText={setCloseAt} autoCapitalize="none" placeholder="2026-10-09 10:30" placeholderTextColor={colors.textTertiary} />

        <Text style={s.subLabel}>{isBn ? 'সময় (মিনিট)' : 'Duration (minutes)'}</Text>
        <TextInput
          style={s.input}
          value={minutes}
          onChangeText={setMinutes}
          keyboardType="number-pad"
          placeholder="15"
          placeholderTextColor={colors.textTertiary}
        />

        <View style={s.preview}>
          <Text style={s.previewT}>
            {isBn
              ? `শিক্ষার্থীরা ${openAt} থেকে ${closeAt} পর্যন্ত উত্তর দিতে পারবে। উত্তর ${hidesIso ? toInput(new Date(hidesIso)) : ''} তারিখে দেখা যাবে, তারপর কুইজটি লুকিয়ে যাবে।`
              : `Students answer between ${openAt} and ${closeAt}. Answers are revealed at ${hidesIso ? toInput(new Date(hidesIso)) : ''}, then the quiz disappears.`}
          </Text>
        </View>

        {/* ---- questions ---- */}
        <View style={s.rowBetween}>
          <Text style={s.label}>{isBn ? 'প্রশ্ন' : 'Questions'} ({questions.length})</Text>
          <Pressable onPress={addQuestion} style={s.addBtn} accessibilityRole="button">
            <Text style={s.addT}>{isBn ? '+ প্রশ্ন' : '+ Question'}</Text>
          </Pressable>
        </View>

        {questions.map((q, qi) => (
          <View key={String(q.id)} style={s.card}>
            <View style={s.qHead}>
              <Text style={s.qNum}>{isBn ? `প্রশ্ন ${qi + 1}` : `Question ${qi + 1}`}</Text>
              <Pressable onPress={() => removeQ(q.id)} style={s.iconBtn} accessibilityRole="button" accessibilityLabel={isBn ? 'মুছুন' : 'Delete'}>
                <Text style={[s.iconT, s.danger]}>✕</Text>
              </Pressable>
            </View>
            <TextInput
              style={[s.input, s.area]}
              placeholder={isBn ? 'প্রশ্ন লিখুন' : 'Write the question'}
              placeholderTextColor={colors.textTertiary}
              value={q.text}
              onChangeText={(v) => setText(q.id, v)}
              multiline
            />
            {q.options.map((opt, oi) => {
              const on = q.correct === oi;
              return (
                <View key={String(oi)} style={s.optRow}>
                  <Text style={[s.optLetter, on && s.optLetterOn]}>{LETTERS[oi]}</Text>
                  <TextInput
                    style={[s.input, s.optInput, on && s.optInputOn]}
                    placeholder={`${isBn ? 'অপশন' : 'Option'} ${LETTERS[oi]}`}
                    placeholderTextColor={colors.textTertiary}
                    value={opt}
                    onChangeText={(v) => setOpt(q.id, oi, v)}
                  />
                  <Pressable
                    onPress={() => pickCorrect(q.id, oi)}
                    style={[s.markBtn, on && s.markBtnOn]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={isBn ? 'সঠিক উত্তর' : 'Mark correct'}
                  >
                    <Text style={[s.markT, on && s.markTOn]}>✓</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}

        <Button title={isBn ? 'সংরক্ষণ করুন' : 'Save as draft'} variant="secondary" size="lg" loading={saving} onPress={() => save(false)} />
        <Button title={isBn ? 'প্রকাশ করুন' : 'Publish quiz'} variant="primary" size="lg" loading={saving} onPress={() => save(true)} />
      </ScrollView>
    </SafeAreaView>
  );
}

function blank() {
  return Array.from({ length: OPTION_COUNT }, () => '');
}
function normalise(raw) {
  const list = Array.isArray(raw) ? raw.slice(0, OPTION_COUNT).map((o) => String(o ?? '')) : [];
  while (list.length < OPTION_COUNT) list.push('');
  return list;
}
/** "YYYY-MM-DD HH:MM" in the device's local time. */
function toInput(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fromInput(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(str || '').trim());
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0, 0);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12 },
  back: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  backT: { fontSize: 30, color: colors.textPrimary, marginTop: -4 },
  title: { fontSize: 20, fontFamily: 'HindSiliguri-SemiBold', color: colors.textPrimary },
  body: { paddingHorizontal: 20, paddingBottom: 48, gap: 12 },
  label: { fontSize: 15, fontFamily: 'HindSiliguri-SemiBold', color: colors.textPrimary, marginTop: 8 },
  subLabel: { fontSize: 13, fontFamily: 'HindSiliguri-SemiBold', color: colors.textSecondary, marginTop: 4 },
  hint: { fontSize: 12, fontFamily: 'HindSiliguri-Regular', color: colors.textTertiary },
  input: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-Regular',
    minHeight: 48,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    color: colors.textPrimary,
  },
  area: { minHeight: 72, paddingTop: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBtn: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  addT: { color: colors.primary, fontFamily: 'HindSiliguri-SemiBold', fontSize: 14 },
  preview: { backgroundColor: colors.surfaceMuted, borderRadius: radius.input, padding: 12 },
  previewT: { fontSize: 12, fontFamily: 'HindSiliguri-Regular', color: colors.textSecondary },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1.5, borderColor: colors.border, padding: 14, gap: 10 },
  qHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qNum: { fontSize: 15, fontFamily: 'HindSiliguri-SemiBold', color: colors.textPrimary },
  iconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  iconT: { fontSize: 15, color: colors.textPrimary },
  danger: { color: '#E5484D' },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optLetter: { width: 28, height: 28, borderRadius: 14, textAlign: 'center', lineHeight: 28, fontSize: 13, fontFamily: 'HindSiliguri-SemiBold', color: colors.textSecondary, backgroundColor: colors.background, overflow: 'hidden' },
  optLetterOn: { color: '#FFFFFF', backgroundColor: colors.primary },
  optInput: { flex: 1, minHeight: 44 },
  optInputOn: { borderColor: colors.primary },
  markBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border },
  markBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  markT: { fontSize: 16, color: colors.textTertiary },
  markTOn: { color: '#FFFFFF' },
});
