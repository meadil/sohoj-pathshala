import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '../../components/CustomAlert';
import Button from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../contexts/UserContext';
import { colors, radius } from '../../theme/theme';

const OPTION_COUNT = 4;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * TeacherMCQEditorScreen - one MCQ deck's questions.
 *
 * The schema already existed and needed no migration: mcq_decks holds
 * chapter_id/title/minutes_per_question/order_index, and mcq_deck_questions
 * holds question_text + options (jsonb array of strings) +
 * correct_option_index. So this screen is CRUD over those two tables.
 *
 * Questions are staged locally and flushed on Save, mirroring the pattern
 * used by the course editor: one write pass in order_index sequence rather
 * than a round trip per keystroke.
 */
export default function TeacherMCQEditorScreen({ navigation, route }) {
  const { lang } = useUser();
  const alert = useAlert();
  const isBn = lang === 'bn';

  const deckId = route?.params?.deckId || null;
  const chapterTitle = route?.params?.chapterTitle || '';

  const [deck, setDeck] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    if (!deckId) {
      setLoading(false);
      return;
    }
    try {
      const { data: deckRow, error: deckErr } = await supabase
        .from('mcq_decks')
        .select('id, title, minutes_per_question, order_index')
        .eq('id', deckId)
        .single();
      if (deckErr) throw deckErr;
      setDeck(deckRow);
      setTitle(deckRow?.title || '');

      const { data: qs, error: qErr } = await supabase
        .from('mcq_deck_questions')
        .select('id, question_text, options, correct_option_index, order_index')
        .eq('deck_id', deckId)
        .order('order_index', { ascending: true });
      if (qErr) throw qErr;

      setQuestions(
        (qs || []).map((q) => ({
          id: q.id,
          text: q.question_text || '',
          options: normaliseOptions(q.options),
          correct: typeof q.correct_option_index === 'number' ? q.correct_option_index : -1,
        }))
      );
      setDirty(false);
    } catch (err) {
      console.warn('TeacherMCQEditor: load failed:', err?.message);
      alert(isBn ? 'লোড করা যায়নি' : 'Could not load', err?.message);
    } finally {
      setLoading(false);
    }
  }, [deckId, isBn, alert]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- local edits ------------------------------------------------------
  const touch = () => setDirty(true);

  const addQuestion = () => {
    touch();
    setQuestions((prev) => [
      ...prev,
      { id: `new-${Date.now()}-${prev.length}`, text: '', options: blankOptions(), correct: -1 },
    ]);
  };

  const setQuestionText = (id, text) => {
    touch();
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, text } : q)));
  };

  const setOption = (id, index, value) => {
    touch();
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, options: q.options.map((o, i) => (i === index ? value : o)) } : q
      )
    );
  };

  // Tapping an option both fills it and marks it correct - one gesture,
  // which is the whole point of "choose the correct option from four".
  const chooseCorrect = (id, index) => {
    touch();
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, correct: index } : q)));
  };

  const removeQuestion = (id) => {
    touch();
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // ---- save -------------------------------------------------------------
  const save = async () => {
    if (!title.trim()) {
      alert(isBn ? 'শিরোনাম দিন' : 'Title required', isBn ? 'ডেকের নাম লিখুন।' : 'Enter a title for this MCQ set.');
      return;
    }
    const incomplete = questions.findIndex(
      (q) => !q.text.trim() || q.correct < 0 || q.options[q.correct]?.trim() === ''
    );
    if (incomplete > -1) {
      alert(
        isBn ? 'প্রশ্ন সম্পূর্ণ নয়' : 'Question incomplete',
        isBn
          ? `${incomplete + 1} নম্বর প্রশ্নে লেখা ও সঠিক অপশন বেছে নিতে হবে।`
          : `Question ${incomplete + 1} needs text and a correct option chosen.`
      );
      return;
    }

    setSaving(true);
    try {
      const { error: deckErr } = await supabase
        .from('mcq_decks')
        .update({ title: title.trim() })
        .eq('id', deckId);
      if (deckErr) throw deckErr;

      const keepIds = questions.map((q) => q.id).filter((id) => !String(id).startsWith('new-'));

      if (keepIds.length > 0) {
        const { error: delErr } = await supabase
          .from('mcq_deck_questions')
          .delete()
          .eq('deck_id', deckId)
          .not('id', 'in', `(${keepIds.join(',')})`);
        if (delErr) throw delErr;
      } else {
        const { error: delErr } = await supabase
          .from('mcq_deck_questions')
          .delete()
          .eq('deck_id', deckId);
        if (delErr) throw delErr;
      }

      for (let i = 0; i < questions.length; i += 1) {
        const q = questions[i];
        const payload = {
          question_text: q.text.trim(),
          options: q.options,
          correct_option_index: q.correct,
          order_index: i,
        };
        if (String(q.id).startsWith('new-')) {
          const { error } = await supabase
            .from('mcq_deck_questions')
            .insert({ ...payload, deck_id: deckId });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('mcq_deck_questions')
            .update(payload)
            .eq('id', q.id);
          if (error) throw error;
        }
      }

      setDirty(false);
      alert('', isBn ? 'সংরক্ষিত হয়েছে' : 'Saved');
      route?.params?.onChanged?.();
      navigation?.goBack?.();
    } catch (err) {
      console.warn('TeacherMCQEditor: save failed:', err?.message);
      alert(isBn ? 'সংরক্ষণ করা যায়নি' : 'Could not save', err?.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmExit = () => {
    if (!dirty) {
      navigation?.goBack?.();
      return;
    }
    alert(isBn ? 'বের হবেন?' : 'Leave without saving?', isBn ? 'পরিবর্তন সংরক্ষণ হয়নি।' : 'Your changes will be lost.', [
      { text: isBn ? 'থাকো' : 'Stay', style: 'cancel', onPress: () => {} },
      { text: isBn ? 'বের হও' : 'Leave', style: 'destructive', onPress: () => navigation?.goBack?.() },
    ]);
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
        <Pressable onPress={confirmExit} style={s.back} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={s.backT}>‹</Text>
        </Pressable>
        <Text style={s.title} numberOfLines={1}>
          {isBn ? 'MCQ' : 'MCQ'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {!!chapterTitle && (
          <Text style={s.chapterNote} numberOfLines={1}>
            {isBn ? `অধ্যায়: ${chapterTitle}` : `Chapter: ${chapterTitle}`}
          </Text>
        )}

        <Text style={s.label}>{isBn ? 'MCQ সেটের নাম' : 'MCQ set title'}</Text>
        <TextInput
          style={s.input}
          placeholder={isBn ? 'যেমন: বিজ্ঞান মডেল টেস্ট' : 'e.g. Science model test'}
          placeholderTextColor={colors.textTertiary}
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            touch();
          }}
        />

        <View style={s.rowBetween}>
          <Text style={s.label}>
            {isBn ? 'প্রশ্ন' : 'Questions'} ({questions.length})
          </Text>
          <Pressable onPress={addQuestion} style={s.addBtn} accessibilityRole="button">
            <Text style={s.addT}>{isBn ? '+ প্রশ্ন' : '+ Question'}</Text>
          </Pressable>
        </View>

        {questions.length === 0 && (
          <Text style={s.empty}>{isBn ? 'এখনো কোনো প্রশ্ন নেই।' : 'No questions yet.'}</Text>
        )}

        {questions.map((q, qi) => (
          <View key={String(q.id)} style={s.card}>
            <View style={s.qHead}>
              <Text style={s.qNum}>{isBn ? `প্রশ্ন ${qi + 1}` : `Question ${qi + 1}`}</Text>
              <Pressable onPress={() => removeQuestion(q.id)} style={s.iconBtn} accessibilityRole="button" accessibilityLabel={isBn ? 'মুছুন' : 'Delete'}>
                <Text style={[s.iconT, s.iconDanger]}>✕</Text>
              </Pressable>
            </View>

            <TextInput
              style={[s.input, s.area]}
              placeholder={isBn ? 'প্রশ্ন লিখুন' : 'Write the question'}
              placeholderTextColor={colors.textTertiary}
              value={q.text}
              onChangeText={(v) => setQuestionText(q.id, v)}
              multiline
            />

            {q.options.slice(0, OPTION_COUNT).map((opt, oi) => {
              const on = q.correct === oi;
              return (
                <View key={String(oi)} style={s.optRow}>
                  <Text style={[s.optLetter, on && s.optLetterOn]}>{LETTERS[oi]}</Text>
                  <TextInput
                    style={[s.input, s.optInput, on && s.optInputOn]}
                    placeholder={`${isBn ? 'অপশন' : 'Option'} ${LETTERS[oi]}`}
                    placeholderTextColor={colors.textTertiary}
                    value={opt}
                    onChangeText={(v) => setOption(q.id, oi, v)}
                  />
                  <Pressable
                    onPress={() => chooseCorrect(q.id, oi)}
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

        <Button
          title={isBn ? 'সংরক্ষণ করুন' : 'Save MCQ set'}
          variant="primary"
          size="lg"
          loading={saving}
          onPress={save}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function blankOptions() {
  return Array.from({ length: OPTION_COUNT }, () => '');
}

function normaliseOptions(raw) {
  const list = Array.isArray(raw) ? raw.slice(0, OPTION_COUNT).map((o) => String(o ?? '')) : [];
  while (list.length < OPTION_COUNT) list.push('');
  return list;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12 },
  back: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  backT: { fontSize: 30, color: colors.textPrimary, marginTop: -4 },
  title: { fontSize: 20, fontFamily: 'HindSiliguri-SemiBold', color: colors.textPrimary },
  body: { paddingHorizontal: 20, paddingBottom: 48, gap: 12 },
  chapterNote: { fontSize: 13, fontFamily: 'HindSiliguri-Regular', color: colors.textTertiary },
  label: { fontSize: 15, fontFamily: 'HindSiliguri-SemiBold', color: colors.textPrimary, marginTop: 8 },
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
  area: { minHeight: 76, paddingTop: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addT: { color: colors.primary, fontFamily: 'HindSiliguri-SemiBold', fontSize: 14 },
  empty: { fontSize: 14, fontFamily: 'HindSiliguri-Regular', color: colors.textTertiary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  qHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qNum: { fontSize: 15, fontFamily: 'HindSiliguri-SemiBold', color: colors.textPrimary },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  iconT: { fontSize: 15, color: colors.textPrimary },
  iconDanger: { color: '#E5484D' },
  hint: { fontSize: 12, fontFamily: 'HindSiliguri-Regular', color: colors.textTertiary },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 13,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  optLetterOn: { color: '#FFFFFF', backgroundColor: colors.primary },
  optInput: { flex: 1, minHeight: 44 },
  optInputOn: { borderColor: colors.primary },
  markBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  markBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  markT: { fontSize: 16, color: colors.textTertiary },
  markTOn: { color: '#FFFFFF' },
});
