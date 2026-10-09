import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import { useAlert } from '../../components/CustomAlert';
import { supabase } from '../../lib/supabase';
import { colors, radius } from '../../theme/theme';

function ChevronRight({ size = 20, color = colors.textSecondary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function BackIcon({ size = 24, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PencilIcon({ size = 16, color = colors.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="m13.5 6.5 3 3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export default function TeacherSubjectDetailScreen({ navigation, route }) {
  const { courseId, subjectId } = route?.params || {};
  const [lang] = useState('bn'); // 'bn' | 'en'
  const isBn = lang === 'bn';
  const alert = useAlert();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [chapters, setChapters] = useState([]);
  const [saving, setSaving] = useState(false);
  const [addingChapter, setAddingChapter] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: sub } = await supabase.from('subjects').select('id, name').eq('id', subjectId).single();
      setName(sub?.name || '');
      const { data: chaps } = await supabase.from('chapters').select('id, title').eq('subject_id', subjectId).order('order_index');
      setChapters(chaps || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [subjectId]);

  const saveName = async () => {
    const v = name.trim();
    if (!v) return;
    setSaving(true);
    const { error } = await supabase.from('subjects').update({ name: v }).eq('id', subjectId);
    setSaving(false);
    if (error) {
      alert('', error.message);
      return;
    }
    alert('', isBn ? 'বিষয়ের নাম বদলানো হয়েছে' : 'Subject renamed');
    route?.params?.onChanged?.();
  };

  // Add a chapter to this subject. Direct write (no staging) — same
  // model as the rest of this screen.
  const addChapter = async () => {
    setAddingChapter(true);
    try {
      const { error } = await supabase.from('chapters').insert({
        subject_id: subjectId,
        title: isBn ? 'নতুন অধ্যায়' : 'New chapter',
        order_index: chapters.length,
      });
      if (error) throw error;
      await load();
    } catch (e) {
      alert('', e?.message || (isBn ? 'অধ্যায় যোগ হয়নি।' : 'Could not add chapter.'));
    } finally {
      setAddingChapter(false);
    }
  };

  const [deleting, setDeleting] = useState(false);

  const deleteSubject = () => {
    alert(
      isBn ? 'বিষয়টি মুছে ফেলবেন?' : 'Delete subject?',
      name,
      [
        { text: isBn ? 'বাদ দাও' : 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: isBn ? 'মুছুন' : 'Delete',
          style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            const ids = chapters.map((c) => c.id);
            if (ids.length > 0) {
              const { error: vidErr } = await supabase.from('cq_videos').delete().in('chapter_id', ids);
              if (vidErr) throw vidErr;
              const { error: chapErr } = await supabase.from('chapters').delete().in('id', ids);
              if (chapErr) throw chapErr;
            }
            const { error } = await supabase.from('subjects').delete().eq('id', subjectId);
            if (error) throw error;
            route?.params?.onChanged?.();
            navigation?.goBack?.();
          } catch (e) {
            alert('', e?.message || (isBn ? 'মুছা যায়নি।' : 'Could not delete.'));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const moveChapter = async (idx, dir) => {
    const to = idx + dir;
    if (to < 0 || to >= chapters.length) return;
    const next = [...chapters];
    const removed = next.splice(idx, 1);
    next.splice(to, 0, removed[0]);
    setChapters(next);
    for (const [i, c] of next.entries()) {
      await supabase.from('chapters').update({ order_index: i }).eq('id', c.id);
    }
  };

  const openMoveMenu = (idx) => {
    alert(
      isBn ? 'ক্রম বদলান' : 'Reorder',
      (idx + 1) + ' / ' + chapters.length,
      [
        { text: isBn ? 'বাদ দাও' : 'Cancel', style: 'cancel', onPress: () => {} },
        { text: isBn ? 'উপরে' : 'Move up', onPress: () => moveChapter(idx, -1) },
        { text: isBn ? 'নিচে' : 'Move down', onPress: () => moveChapter(idx, 1) },
      ]
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.head}>
        <Pressable onPress={() => navigation?.goBack?.()} style={s.back} accessibilityRole="button" accessibilityLabel="Back">
          <BackIcon size={24} />
        </Pressable>
        <Text style={s.title}>{isBn ? 'বিষয়' : 'Subject'}</Text>
      </View>
      {loading ? <ActivityIndicator size="large" color={colors.primary} /> : (
        <GestureScrollView contentContainerStyle={s.body}>
          <Text style={s.label}>{isBn ? 'বিষয়ের নাম' : 'Subject name'}</Text>
          <View style={s.renameRow}>
            <TextInput style={[s.input, { flex: 1 }]} value={name} onChangeText={setName} />
            <Pressable onPress={saveName} disabled={saving} style={s.saveBtn} accessibilityRole="button" accessibilityLabel={isBn ? 'সেভ' : 'Save'}>
              <Text style={s.saveT}>{saving ? '…' : (isBn ? 'সেভ' : 'Save')}</Text>
            </Pressable>
          </View>
          <View style={s.chapHead}>
            <Text style={s.label}>
              {isBn ? 'অধ্যায়' : 'Chapters'} ({chapters.length})
            </Text>
            <Pressable
              onPress={addChapter}
              disabled={addingChapter}
              style={s.addBtn}
              accessibilityRole="button"
              accessibilityLabel={isBn ? 'অধ্যায় যোগ করুন' : 'Add chapter'}
            >
              <Text style={s.addT}>{addingChapter ? '…' : (isBn ? '+ অধ্যায়' : '+ Chapter')}</Text>
            </Pressable>
          </View>
          {chapters.map((item, idx) => (
            <View key={String(item.id)} style={s.block}>
              <Pressable
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                onPress={() => navigation?.navigate?.('ChapterDetail', { courseId, chapterId: item.id, onChanged: load })}
                onLongPress={() => openMoveMenu(idx)}
                delayLongPress={400}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                <ChevronRight size={20} />
                <Text style={s.blockTitle}>{item.title}</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation?.navigate?.('ChapterDetail', { courseId, chapterId: item.id, onChanged: load })}
                style={s.editBtn}
                accessibilityRole="button"
                accessibilityLabel={isBn ? 'এডিট' : 'Edit'}
              >
                <PencilIcon size={16} />
              </Pressable>
            </View>
          ))}
          <Pressable onPress={deleteSubject} disabled={deleting} style={s.dangerBtn} accessibilityRole="button">
            <Text style={s.dangerText}>
              {deleting ? (isBn ? 'মুছে ফেলা হচ্ছে…' : 'Deleting…') : (isBn ? 'বিষয় মুছুন' : 'Delete subject')}
            </Text>
          </Pressable>
        </GestureScrollView>
      )}
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12 },
  back: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontFamily: 'HindSiliguri-SemiBold', color: colors.textPrimary },
  body: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  label: { fontSize: 15, fontFamily: 'HindSiliguri-SemiBold', color: colors.textPrimary, marginTop: 8 },
  chapHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addT: { fontSize: 13, fontFamily: 'HindSiliguri-SemiBold', color: colors.primary },
  input: { fontSize: 17, fontFamily: 'HindSiliguri-Regular', minHeight: 52, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, borderRadius: radius.input, paddingHorizontal: 16, color: colors.textPrimary },
  renameRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.input, paddingHorizontal: 14, paddingVertical: 14 },
  saveT: { color: '#fff', fontFamily: 'HindSiliguri-SemiBold' },
  block: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, borderRadius: radius.card, padding: 14, marginBottom: 12 },
  blockTitle: { flex: 1, fontSize: 16, fontFamily: 'HindSiliguri-SemiBold', color: colors.textPrimary },
  editBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.backgroundMuted, alignItems: 'center', justifyContent: 'center' },
  dangerBtn: {
    backgroundColor: colors.danger,
    borderRadius: radius.input,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  dangerText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'HindSiliguri-SemiBold' },
});
