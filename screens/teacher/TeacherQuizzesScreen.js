import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAlert } from '../../components/CustomAlert';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../contexts/UserContext';
import { colors, radius } from '../../theme/theme';

/**
 * TeacherQuizzesScreen - list of the weekly quizzes this teacher authored.
 *
 * Owners see every weekly quiz, teachers see only their own. A weekly quiz is
 * not course content, so nothing here is scoped to a course or subject.
 */
export default function TeacherQuizzesScreen({ navigation }) {
  const { lang, isOwner, session } = useUser();
  const alert = useAlert();
  const isBn = lang === 'bn';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('quizzes')
        .select('id, title, published, opens_at, closes_at, hides_at, created_by')
        .order('created_at', { ascending: false });
      if (!isOwner) q = q.eq('created_by', session?.user?.id ?? '00000000-0000-0000-0000-000000000000');
      const { data, error } = await q;
      if (error) throw error;

      const ids = (data || []).map((r) => r.id);
      const counts = {};
      if (ids.length > 0) {
        const { data: qs } = await supabase
          .from('quiz_questions')
          .select('quiz_id')
          .in('quiz_id', ids);
        for (const row of qs || []) counts[row.quiz_id] = (counts[row.quiz_id] || 0) + 1;
      }
      setRows((data || []).map((r) => ({ ...r, questionCount: counts[r.id] || 0 })));
    } catch (err) {
      console.warn('TeacherQuizzes: load failed:', err?.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [isOwner, session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const remove = (row) => {
    alert(isBn ? 'কুইজ মুছবেন?' : 'Delete quiz?', row.title, [
      { text: isBn ? 'বাদ দাও' : 'Cancel', style: 'cancel', onPress: () => {} },
      {
        text: isBn ? 'মুছুন' : 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('quiz_questions').delete().eq('quiz_id', row.id);
          await supabase.from('quizzes').delete().eq('id', row.id);
          load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.head}>
        <Pressable onPress={() => navigation?.goBack?.()} style={s.back} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={s.backT}>‹</Text>
        </Pressable>
        <Text style={s.title}>{isBn ? 'সাপ্তাহিক কুইজ' : 'Weekly quizzes'}</Text>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.body}>
          <Pressable
            onPress={() => navigation?.navigate?.('QuizEditor', { userId: session?.user?.id, onChanged: load })}
            style={s.newBtn}
            accessibilityRole="button"
          >
            <Text style={s.newT}>{isBn ? '+ নতুন কুইজ' : '+ New quiz'}</Text>
          </Pressable>

          {rows.length === 0 && (
            <Text style={s.empty}>{isBn ? 'এখনো কোনো কুইজ নেই।' : 'No quizzes yet.'}</Text>
          )}

          {rows.map((row) => (
            <Pressable
              key={row.id}
              onPress={() => navigation?.navigate?.('QuizEditor', { quizId: row.id, onChanged: load })}
              onLongPress={() => remove(row)}
              delayLongPress={400}
              style={s.card}
              accessibilityRole="button"
            >
              <View style={s.cardTop}>
                <Text style={s.cardTitle} numberOfLines={1}>{row.title}</Text>
                <View style={[s.badge, row.published ? s.badgeLive : s.badgeDraft]}>
                  <Text style={[s.badgeT, row.published ? s.badgeTLive : s.badgeTDraft]}>
                    {row.published ? (isBn ? 'প্রকাশিত' : 'Live') : isBn ? 'খসড়া' : 'Draft'}
                  </Text>
                </View>
              </View>
              <Text style={s.cardMeta}>
                {isBn ? 'প্রশ্ন' : 'Questions'}: {row.questionCount}
              </Text>
              <Text style={s.cardMeta}>
                {fmt(row.opens_at)} → {fmt(row.closes_at)}
              </Text>
              <Text style={s.hintLong}>{isBn ? 'মুছতে দীর্ঘ চাপ দিন' : 'Long-press to delete'}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12 },
  back: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  backT: { fontSize: 30, color: colors.textPrimary, marginTop: -4 },
  title: { fontSize: 20, fontFamily: 'HindSiliguri-SemiBold', color: colors.textPrimary },
  body: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  newBtn: { alignSelf: 'flex-start', borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8 },
  newT: { color: colors.primary, fontFamily: 'HindSiliguri-SemiBold', fontSize: 15 },
  empty: { fontSize: 14, fontFamily: 'HindSiliguri-Regular', color: colors.textTertiary },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1.5, borderColor: colors.border, padding: 14, gap: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontFamily: 'HindSiliguri-SemiBold', color: colors.textPrimary },
  cardMeta: { fontSize: 13, fontFamily: 'HindSiliguri-Regular', color: colors.textSecondary },
  hintLong: { fontSize: 11, fontFamily: 'HindSiliguri-Regular', color: colors.textTertiary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  badgeLive: { backgroundColor: colors.successSubtle },
  badgeDraft: { backgroundColor: colors.surfaceMuted },
  badgeT: { fontSize: 11, fontFamily: 'HindSiliguri-SemiBold' },
  badgeTLive: { color: colors.success },
  badgeTDraft: { color: colors.textTertiary },
});
