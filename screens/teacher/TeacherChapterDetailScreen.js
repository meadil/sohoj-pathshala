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

function PencilIcon({ size = 16, color = colors.danger }) {
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

function TrashIcon({ size = 16, color = colors.danger }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Blank video form for the add/edit sheet.
const EMPTY_VIDEO = { title: '', youtube_url: '', description: '' };

/**
 * TeacherChapterDetailScreen - one chapter's videos.
 * Rename the chapter, reorder videos (long-press), and full video CRUD:
 * add, edit (title / YouTube link / description), delete. Direct writes,
 * no staging — same model as the subject screen.
 */
export default function TeacherChapterDetailScreen({ navigation, route }) {
  const { chapterId } = route?.params || {};
  const [lang] = useState('bn'); // 'bn' | 'en'
  const isBn = lang === 'bn';
  const alert = useAlert();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [videos, setVideos] = useState([]);
  const [saving, setSaving] = useState(false);

  // Add / edit sheet state. mode: 'new' | 'edit'.
  const [sheet, setSheet] = useState(null);
  const [form, setForm] = useState(EMPTY_VIDEO);
  const [savingVideo, setSavingVideo] = useState(false);
  const [deletingVideo, setDeletingVideo] = useState(null);

  // MCQ decks for this chapter. The table already existed in the schema;
  // only the teacher UI was missing.
  const [decks, setDecks] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const { data: chap } = await supabase.from('chapters').select('id, title').eq('id', chapterId).single();
      setTitle(chap?.title || '');
      const { data: vids } = await supabase
        .from('cq_videos')
        .select('id, title, youtube_url, description')
        .eq('chapter_id', chapterId)
        .order('order_index');
      setVideos(vids || []);
      const { data: deckRows } = await supabase
        .from('mcq_decks')
        .select('id, title, order_index')
        .eq('chapter_id', chapterId)
        .order('order_index');
      setDecks(deckRows || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [chapterId]);

  // ---- MCQ decks --------------------------------------------------------
  const createDeck = () => {
    alert(
      isBn ? 'নতুন MCQ সেট' : 'New MCQ set',
      isBn ? 'একটি নাম দিন।' : 'Give it a name. You can add questions on the next screen.',
      [
        { text: isBn ? 'বাদ দাও' : 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: isBn ? 'তৈরি করুন' : 'Create',
          onPress: async () => {
            const { data, error } = await supabase
              .from('mcq_decks')
              .insert({
                chapter_id: chapterId,
                title: isBn ? 'নতুন MCQ' : 'New MCQ',
                order_index: decks.length,
              })
              .select('id')
              .single();
            if (error) {
              alert(isBn ? 'তৈরি করা যায়নি' : 'Could not create', error.message);
              return;
            }
            navigation?.navigate?.('MCQEditor', {
              deckId: data.id,
              chapterTitle: title,
              onChanged: load,
            });
          },
        },
      ]
    );
  };

  const deleteDeck = (deck) => {
    alert(
      isBn ? 'MCQ সেট মুছবেন?' : 'Delete MCQ set?',
      deck.title,
      [
        { text: isBn ? 'বাদ দাও' : 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: isBn ? 'মুছুন' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('mcq_deck_questions').delete().eq('deck_id', deck.id);
            if (error) {
              alert(isBn ? 'মুছা যায়নি' : 'Could not delete', error.message);
              return;
            }
            const { error: dErr } = await supabase.from('mcq_decks').delete().eq('id', deck.id);
            if (dErr) {
              alert(isBn ? 'মুছা যায়নি' : 'Could not delete', dErr.message);
              return;
            }
            load();
          },
        },
      ]
    );
  };

  // ---- Notes ------------------------------------------------------------
  // Notes (title + Drive link per video) are added on the video form itself,
  // in TeacherVideoNotes, rather than as a separate chapter-level section.

  const saveTitle = async () => {
    const v = title.trim();
    if (!v) return;
    setSaving(true);
    const { error } = await supabase.from('chapters').update({ title: v }).eq('id', chapterId);
    setSaving(false);
    if (error) {
      alert('', error.message);
      return;
    }
    alert('', isBn ? 'অধ্যায়ের নাম বদলানো হয়েছে' : 'Chapter renamed');
    route?.params?.onChanged?.();
  };

  // ---- video CRUD -------------------------------------------------------

  const openNewVideo = () => {
    setForm(EMPTY_VIDEO);
    setSheet('new');
  };

  const openEditVideo = (v) => {
    setForm({ id: v.id, title: v.title || '', youtube_url: v.youtube_url || '', description: v.description || '' });
    setSheet('edit');
  };

  const closeSheet = () => {
    setSheet(null);
    setForm(EMPTY_VIDEO);
  };

  const saveVideo = async () => {
    const t = form.title.trim();
    if (!t) {
      alert(isBn ? 'ভিডিওর শিরোনাম প্রয়োজন' : 'Video title required', isBn ? 'একটি শিরোনাম লিখুন।' : 'Enter a video title.');
      return;
    }
    setSavingVideo(true);
    try {
      if (sheet === 'new') {
        const { error } = await supabase.from('cq_videos').insert({
          chapter_id: chapterId,
          title: t,
          youtube_url: form.youtube_url.trim(),
          description: form.description.trim(),
          order_index: videos.length,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cq_videos')
          .update({ title: t, youtube_url: form.youtube_url.trim(), description: form.description.trim() })
          .eq('id', form.id);
        if (error) throw error;
      }
      closeSheet();
      await load();
    } catch (e) {
      alert(isBn ? 'সেভ হয়নি' : 'Save failed', e?.message || (isBn ? 'আবার চেষ্টা করুন।' : 'Please try again.'));
    } finally {
      setSavingVideo(false);
    }
  };

  const deleteVideo = (v) => {
    alert(
      isBn ? 'ভিডিওটি মুছে ফেলবেন?' : 'Delete video?',
      v.title || '',
      [
        { text: isBn ? 'বাদ দাও' : 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: isBn ? 'মুছুন' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingVideo(v.id);
            try {
              const { error } = await supabase.from('cq_videos').delete().eq('id', v.id);
              if (error) throw error;
              await load();
            } catch (e) {
              alert('', e?.message || (isBn ? 'মুছা যায়নি।' : 'Could not delete.'));
            } finally {
              setDeletingVideo(null);
            }
          },
        },
      ]
    );
  };

  const moveVideo = async (idx, dir) => {
    const to = idx + dir;
    if (to < 0 || to >= videos.length) return;
    const next = [...videos];
    const removed = next.splice(idx, 1);
    next.splice(to, 0, removed[0]);
    setVideos(next);
    for (const [i, v] of next.entries()) {
      await supabase.from('cq_videos').update({ order_index: i }).eq('id', v.id);
    }
  };

  const openMoveMenu = (idx) => {
    alert(
      isBn ? 'ক্রম বদলান' : 'Reorder',
      (idx + 1) + ' / ' + videos.length,
      [
        { text: isBn ? 'বাদ দাও' : 'Cancel', style: 'cancel', onPress: () => {} },
        { text: isBn ? 'উপরে' : 'Move up', onPress: () => moveVideo(idx, -1) },
        { text: isBn ? 'নিচে' : 'Move down', onPress: () => moveVideo(idx, 1) },
      ]
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.head}>
        <Pressable onPress={() => navigation?.goBack?.()} style={s.back} accessibilityRole="button" accessibilityLabel="Back">
          <BackIcon size={24} />
        </Pressable>
        <Text style={s.title}>{isBn ? 'অধ্যায়' : 'Chapter'}</Text>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} /> : (
        <GestureScrollView contentContainerStyle={s.body}>
          <Text style={s.label}>{isBn ? 'অধ্যায়ের শিরোনাম' : 'Chapter title'}</Text>
          <View style={s.renameRow}>
            <TextInput style={[s.input, { flex: 1 }]} value={title} onChangeText={setTitle} />
            <Pressable onPress={saveTitle} disabled={saving} style={s.saveBtn} accessibilityRole="button" accessibilityLabel={isBn ? 'সেভ' : 'Save'}>
              <Text style={s.saveT}>{saving ? '…' : (isBn ? 'সেভ' : 'Save')}</Text>
            </Pressable>
          </View>

          <View style={s.vidHead}>
            <Text style={s.label}>
              {isBn ? 'ভিডিও' : 'Videos'} ({videos.length})
            </Text>
            <Pressable
              onPress={openNewVideo}
              style={s.addBtn}
              accessibilityRole="button"
              accessibilityLabel={isBn ? 'ভিডিও যোগ করুন' : 'Add video'}
            >
              <Text style={s.addT}>{isBn ? '+ ভিডিও' : '+ Video'}</Text>
            </Pressable>
          </View>

          {videos.map((item, idx) => (
            <View key={String(item.id)} style={s.block}>
              <Pressable
                style={{ flex: 1 }}
                onLongPress={() => openMoveMenu(idx)}
                delayLongPress={400}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                <Text style={s.blockTitle} numberOfLines={1}>{item.title}</Text>
                {!!item.youtube_url && (
                  <Text style={s.blockUrl} numberOfLines={1}>{item.youtube_url}</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() =>
                  navigation?.navigate?.('VideoNotes', {
                    videoId: item.id,
                    videoTitle: item.title,
                    onChanged: load,
                  })
                }
                style={s.notesBtn}
                accessibilityRole="button"
                accessibilityLabel={isBn ? 'নোট' : 'Notes'}
              >
                <Text style={s.notesT}>{isBn ? 'নোট' : 'Notes'}</Text>
              </Pressable>
              <Pressable
                onPress={() => openEditVideo(item)}
                style={s.iconBtn}
                accessibilityRole="button"
                accessibilityLabel={isBn ? 'এডিট' : 'Edit'}
              >
                <PencilIcon size={15} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => deleteVideo(item)}
                disabled={deletingVideo === item.id}
                style={s.iconBtn}
                accessibilityRole="button"
                accessibilityLabel={isBn ? 'মুছুন' : 'Delete'}
              >
                <TrashIcon size={15} />
              </Pressable>
            </View>
          ))}

          {/* ---- MCQ section ---- */}
          <View style={s.vidHead}>
            <Text style={s.label}>{isBn ? 'MCQ' : 'MCQ'} ({decks.length})</Text>
            <Pressable
              onPress={createDeck}
              style={s.addBtn}
              accessibilityRole="button"
              accessibilityLabel={isBn ? 'MCQ সেট যোগ করুন' : 'Add MCQ set'}
            >
              <Text style={s.addT}>{isBn ? '+ MCQ সেট' : '+ MCQ set'}</Text>
            </Pressable>
          </View>

          {decks.length === 0 && (
            <Text style={s.emptyLine}>{isBn ? 'এখনো কোনো MCQ সেট নেই।' : 'No MCQ sets yet.'}</Text>
          )}

          {decks.map((deck) => (
            <View key={String(deck.id)} style={s.block}>
              <Pressable
                style={{ flex: 1 }}
                onPress={() =>
                  navigation?.navigate?.('MCQEditor', {
                    deckId: deck.id,
                    chapterTitle: title,
                    onChanged: load,
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={deck.title}
              >
                <Text style={s.blockTitle} numberOfLines={1}>{deck.title}</Text>
                <Text style={s.blockUrl}>{isBn ? 'প্রশ্ন সম্পাদনা করুন' : 'Edit questions'}</Text>
              </Pressable>
              <Pressable
                onPress={() => deleteDeck(deck)}
                style={s.iconBtn}
                accessibilityRole="button"
                accessibilityLabel={isBn ? 'মুছুন' : 'Delete'}
              >
                <TrashIcon size={15} />
              </Pressable>
            </View>
          ))}

        </GestureScrollView>
      )}

      {/* Add / edit video sheet */}
      {sheet !== null && (
        <View style={s.sheetBackdrop}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>
              {sheet === 'new'
                ? (isBn ? 'নতুন ভিডিও' : 'New video')
                : (isBn ? 'ভিডিও এডিট' : 'Edit video')}
            </Text>

            <Text style={s.fieldLabel}>{isBn ? 'শিরোনাম' : 'Title'}</Text>
            <TextInput
              style={s.input}
              placeholder={isBn ? 'যেমন: নিউটনের সূত্র' : 'e.g. Newton’s Laws'}
              placeholderTextColor={colors.textTertiary}
              value={form.title}
              onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
            />

            <Text style={s.fieldLabel}>{isBn ? 'ইউটিউব লিংক' : 'YouTube link'}</Text>
            <TextInput
              style={s.input}
              placeholder="https://www.youtube.com/watch?v=..."
              placeholderTextColor={colors.textTertiary}
              value={form.youtube_url}
              onChangeText={(v) => setForm((p) => ({ ...p, youtube_url: v }))}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={s.fieldLabel}>{isBn ? 'বিবরণ' : 'Description'}</Text>
            <TextInput
              style={[s.input, s.area]}
              placeholder={isBn ? 'ভিডিওটি কী নিয়ে' : 'What this video covers'}
              placeholderTextColor={colors.textTertiary}
              value={form.description}
              onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
              multiline
            />

            <View style={s.sheetActions}>
              <Pressable onPress={closeSheet} style={s.cancelBtn} accessibilityRole="button">
                <Text style={s.cancelT}>{isBn ? 'বাদ দাও' : 'Cancel'}</Text>
              </Pressable>
              <Pressable onPress={saveVideo} disabled={savingVideo} style={s.saveSheetBtn} accessibilityRole="button">
                <Text style={s.saveT}>{savingVideo ? '…' : (isBn ? 'সেভ' : 'Save')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
  input: { fontSize: 17, fontFamily: 'HindSiliguri-Regular', minHeight: 52, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, borderRadius: radius.input, paddingHorizontal: 16, color: colors.textPrimary },
  area: { minHeight: 72, paddingTop: 12 },
  renameRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.input, paddingHorizontal: 14, paddingVertical: 14 },
  saveT: { color: '#fff', fontFamily: 'HindSiliguri-SemiBold' },
  vidHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
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
  block: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, borderRadius: radius.card, padding: 14, marginBottom: 12 },
  blockTitle: { flex: 1, fontSize: 16, fontFamily: 'HindSiliguri-SemiBold', color: colors.textPrimary },
  blockUrl: { flex: 1, fontSize: 12, color: colors.textTertiary },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.backgroundMuted, alignItems: 'center', justifyContent: 'center' },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26,21,18,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.cardLg,
    borderTopRightRadius: radius.cardLg,
    padding: 20,
    paddingBottom: 32,
    gap: 6,
  },
  sheetTitle: { fontSize: 20, fontFamily: 'HindSiliguri-SemiBold', color: colors.textPrimary, marginBottom: 6 },
  fieldLabel: { fontSize: 13, fontFamily: 'HindSiliguri-SemiBold', color: colors.textSecondary, marginTop: 8 },
  emptyLine: { fontSize: 13, fontFamily: 'HindSiliguri-Regular', color: colors.textTertiary },
  notesBtn: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  notesT: { fontSize: 12, fontFamily: 'HindSiliguri-SemiBold', color: colors.primary },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.input, borderWidth: 1.5, borderColor: colors.border },
  cancelT: { fontSize: 15, fontFamily: 'HindSiliguri-SemiBold', color: colors.textSecondary },
  saveSheetBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.input, backgroundColor: colors.primary },
});
