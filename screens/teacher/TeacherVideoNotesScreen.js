import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '../../components/CustomAlert';
import Button from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../contexts/UserContext';
import { colors, radius } from '../../theme/theme';

/**
 * TeacherVideoNotesScreen - study material attached to one lesson video.
 *
 * Deliberately NOT a file upload. The teacher pastes a Drive link per note
 * because storage is not affordable right now; the file itself stays on Drive.
 * Two fields per note: title + link, exactly as specified.
 *
 * Notes are keyed to cq_videos.id (the lesson videos table). cq_videos already
 * had an unused pdf_url column, but it can hold only one link per video, so a
 * separate table is used to allow several notes.
 */
export default function TeacherVideoNotesScreen({ navigation, route }) {
  const { lang } = useUser();
  const alert = useAlert();
  const isBn = lang === 'bn';

  const videoId = route?.params?.videoId || null;
  const videoTitle = route?.params?.videoTitle || '';

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!videoId) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('video_notes')
        .select('id, title, drive_url, order_index')
        .eq('video_id', videoId)
        .order('order_index', { ascending: true });
      if (error) throw error;
      setNotes(
        (data || []).map((n) => ({
          id: n.id,
          title: n.title || '',
          driveUrl: n.drive_url || '',
        }))
      );
    } catch (err) {
      console.warn('TeacherVideoNotes: load failed:', err?.message);
      alert(isBn ? 'লোড করা যায়নি' : 'Could not load', err?.message);
    } finally {
      setLoading(false);
    }
  }, [videoId, isBn, alert]);

  useEffect(() => {
    load();
  }, [load]);

  const addNote = () =>
    setNotes((p) => [...p, { id: `new-${Date.now()}-${p.length}`, title: '', driveUrl: '' }]);

  const setField = (id, key, value) =>
    setNotes((p) => p.map((n) => (n.id === id ? { ...n, [key]: value } : n)));

  const removeNote = (id) => setNotes((p) => p.filter((n) => n.id !== id));

  const openNote = async (url) => {
    const ok = await Linking.canOpenURL(url).catch(() => true);
    if (!ok) {
      alert(isBn ? 'লিংকটি খোলা যায়নি' : 'Could not open link', url);
      return;
    }
    await Linking.openURL(url).catch(() =>
      alert(isBn ? 'লিংকটি খোলা যায়নি' : 'Could not open link', url)
    );
  };

  const save = async () => {
    const incomplete = notes.findIndex((n) => !n.title.trim() || !n.driveUrl.trim());
    if (incomplete > -1) {
      alert(
        isBn ? 'নোট সম্পূর্ণ নয়' : 'Note incomplete',
        isBn
          ? `${incomplete + 1} নম্বর নোটে নাম ও লিংক দুটোই দিন।`
          : `Note ${incomplete + 1} needs both a title and a link.`
      );
      return;
    }

    setSaving(true);
    try {
      const keepIds = notes.map((n) => n.id).filter((id) => !String(id).startsWith('new-'));
      const { error: pruneErr } = await supabase
        .from('video_notes')
        .delete()
        .eq('video_id', videoId)
        .not('id', 'in', `(${keepIds.join(',')})`);
      if (pruneErr) throw pruneErr;

      for (let i = 0; i < notes.length; i += 1) {
        const n = notes[i];
        const body = {
          title: n.title.trim(),
          drive_url: n.driveUrl.trim(),
          order_index: i,
        };
        if (String(n.id).startsWith('new-')) {
          const { error } = await supabase
            .from('video_notes')
            .insert({ ...body, video_id: videoId });
          if (error) throw error;
        } else {
          const { error } = await supabase.from('video_notes').update(body).eq('id', n.id);
          if (error) throw error;
        }
      }
      alert('', isBn ? 'সংরক্ষিত হয়েছে' : 'Saved');
      route?.params?.onChanged?.();
      navigation?.goBack?.();
    } catch (err) {
      console.warn('TeacherVideoNotes: save failed:', err?.message);
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
        <Text style={s.title}>{isBn ? 'নোট' : 'Notes'}</Text>
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {!!videoTitle && (
          <Text style={s.videoNote} numberOfLines={2}>
            {isBn ? `ভিডিও: ${videoTitle}` : `Video: ${videoTitle}`}
          </Text>
        )}

        <Text style={s.hint}>
          {isBn
            ? 'প্রতিটি নোটে নাম ও Google Drive লিংক দিন। শিক্ষার্থী লিংকে চাপলে Drive-এ খুলবে।'
            : 'Each note is a title plus a Google Drive link. Students tap it to open Drive.'}
        </Text>

        <View style={s.rowBetween}>
          <Text style={s.label}>{isBn ? 'নোট' : 'Notes'} ({notes.length})</Text>
          <Pressable onPress={addNote} style={s.addBtn} accessibilityRole="button">
            <Text style={s.addT}>{isBn ? '+ নোট' : '+ Note'}</Text>
          </Pressable>
        </View>

        {notes.length === 0 && (
          <Text style={s.empty}>{isBn ? 'এখনো কোনো নোট নেই।' : 'No notes yet.'}</Text>
        )}

        {notes.map((n, i) => (
          <View key={String(n.id)} style={s.card}>
            <View style={s.qHead}>
              <Text style={s.qNum}>{isBn ? `নোট ${i + 1}` : `Note ${i + 1}`}</Text>
              <View style={s.headBtns}>
                <Pressable
                  onPress={() => openNote(n.driveUrl)}
                  disabled={!n.driveUrl.trim()}
                  style={[s.iconBtn, !n.driveUrl.trim() && s.iconBtnOff]}
                  accessibilityRole="button"
                  accessibilityLabel={isBn ? 'লিংক খুলুন' : 'Open link'}
                >
                  <Text style={s.iconT}>↗</Text>
                </Pressable>
                <Pressable onPress={() => removeNote(n.id)} style={s.iconBtn} accessibilityRole="button" accessibilityLabel={isBn ? 'মুছুন' : 'Delete'}>
                  <Text style={[s.iconT, s.danger]}>✕</Text>
                </Pressable>
              </View>
            </View>
            <TextInput
              style={s.input}
              placeholder={isBn ? 'নোটের নাম' : 'Note title'}
              placeholderTextColor={colors.textTertiary}
              value={n.title}
              onChangeText={(v) => setField(n.id, 'title', v)}
            />
            <TextInput
              style={s.input}
              placeholder="https://drive.google.com/..."
              placeholderTextColor={colors.textTertiary}
              value={n.driveUrl}
              onChangeText={(v) => setField(n.id, 'driveUrl', v)}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        ))}

        <Button title={isBn ? 'সংরক্ষণ করুন' : 'Save notes'} variant="primary" size="lg" loading={saving} onPress={save} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12 },
  back: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  backT: { fontSize: 30, color: colors.textPrimary, marginTop: -4 },
  title: { fontSize: 20, fontFamily: 'HindSiliguri-SemiBold', color: colors.textPrimary },
  body: { paddingHorizontal: 20, paddingBottom: 48, gap: 12 },
  videoNote: { fontSize: 13, fontFamily: 'HindSiliguri-Regular', color: colors.textTertiary },
  hint: { fontSize: 12, fontFamily: 'HindSiliguri-Regular', color: colors.textTertiary },
  label: { fontSize: 15, fontFamily: 'HindSiliguri-SemiBold', color: colors.textPrimary, marginTop: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBtn: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  addT: { color: colors.primary, fontFamily: 'HindSiliguri-SemiBold', fontSize: 14 },
  empty: { fontSize: 14, fontFamily: 'HindSiliguri-Regular', color: colors.textTertiary },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1.5, borderColor: colors.border, padding: 14, gap: 10 },
  qHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qNum: { fontSize: 15, fontFamily: 'HindSiliguri-SemiBold', color: colors.textPrimary },
  headBtns: { flexDirection: 'row', gap: 6 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  iconBtnOff: { opacity: 0.4 },
  iconT: { fontSize: 15, color: colors.textPrimary },
  danger: { color: '#E5484D' },
  input: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-Regular',
    minHeight: 48,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    color: colors.textPrimary,
  },
});
