import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import Button from '../../components/Button';
import { useAlert } from '../../components/CustomAlert';
import { useUser } from '../../contexts/UserContext';
import { supabase } from '../../lib/supabase';
import { getClassLevelId } from '../../lib/classLevel';
import { colors, radius } from '../../theme/theme';

function BackIcon({ size = 22, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 6l-6 6 6 6" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlayIcon({ size = 26, color = colors.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.8} />
      <Path d="M10 8.5v7l6-3.5Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

function PencilIcon({ size = 15, color = colors.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="m13.5 6.5 3 3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function TrashIcon({ size = 15, color = colors.danger }) {
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

const EMPTY_FORM = { classLevel: 'SSC', title: '', youtube_url: '', description: '' };

/**
 * TeacherFreeVideosScreen - Free videos manager. SSC/HSC toggle filters the
 * list; full CRUD (add / edit / delete) per video. Free videos are a separate
 * content pool from courses — classed by SSC/HSC, not linked to a course.
 */
export default function TeacherFreeVideosScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { session } = useUser();
  const alert = useAlert();
  const isBn = lang === 'bn';

  const [level, setLevel] = useState('SSC'); // 'SSC' | 'HSC'
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add / edit sheet.
  const [sheet, setSheet] = useState(null); // 'new' | 'edit'
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (!session?.user?.id) {
          if (!cancelled) setVideos([]);
          return;
        }
        const levelId = await getClassLevelId(level);
        const { data, error } = await supabase
          .from('free_videos')
          .select('id, title, youtube_url, description')
          .eq('class_level_id', levelId)
          .order('order_index');
        if (error) throw error;
        if (!cancelled) setVideos(data || []);
      } catch (err) {
        console.warn('TeacherFreeVideos: could not load videos:', err?.message);
        if (!cancelled) setVideos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [level, session?.user?.id]);

  const openNew = () => {
    setForm({ ...EMPTY_FORM, classLevel: level });
    setSheet('new');
  };

  const openEdit = (v) => {
    setForm({ classLevel: level, title: v.title || '', youtube_url: v.youtube_url || '', description: v.description || '' });
    setSheet('edit');
  };

  const closeSheet = () => {
    setSheet(null);
    setForm(EMPTY_FORM);
  };

  const saveVideo = async () => {
    const t = form.title.trim();
    if (!t) {
      alert(isBn ? 'ভিডিওর শিরোনাম প্রয়োজন' : 'Video title required', isBn ? 'একটি শিরোনাম লিখুন।' : 'Enter a video title.');
      return;
    }
    setSaving(true);
    try {
      const levelId = await getClassLevelId(form.classLevel);
      if (sheet === 'new') {
        const { error } = await supabase.from('free_videos').insert({
          class_level_id: levelId,
          title: t,
          youtube_url: form.youtube_url.trim(),
          description: form.description.trim(),
          order_index: videos.length,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('free_videos')
          .update({ title: t, youtube_url: form.youtube_url.trim(), description: form.description.trim() })
          .eq('id', form.id);
        if (error) throw error;
      }
      closeSheet();
      await load();
    } catch (e) {
      alert(isBn ? 'সেভ হয়নি' : 'Save failed', e?.message || (isBn ? 'আবার চেষ্টা করুন।' : 'Please try again.'));
    } finally {
      setSaving(false);
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
            setDeletingId(v.id);
            try {
              const { error } = await supabase.from('free_videos').delete().eq('id', v.id);
              if (error) throw error;
              await load();
            } catch (e) {
              alert('', e?.message || (isBn ? 'মুছা যায়নি।' : 'Could not delete.'));
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header (.gen-head) */}
      <View style={styles.headRow}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={isBn ? 'কোর্সে ফিরে যান' : 'Back to Courses'}
        >
          <BackIcon size={22} />
        </Pressable>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>{isBn ? 'ফ্রি ভিডিও' : 'Free Videos'}</Text>
          <Text style={styles.headSub}>
            {isBn
              ? 'পেইড কোর্স থেকে সম্পূর্ণ আলাদা · ক্লাস অনুযায়ী · যেকোনো অনুমোদিত শিক্ষক এডিট করতে পারেন'
              : 'Completely separate from paid courses · classed by class level · any approved teacher can edit'}
          </Text>
        </View>
      </View>

      {/* Class Toggle (.ed-toggle → .tag-toggle) */}
      <View style={styles.toggleWrap}>
        <View style={styles.tagToggle} accessibilityLabel={isBn ? 'ক্লাস লেভেল' : 'Class level'}>
          {['SSC', 'HSC'].map((lv) => (
            <Pressable
              key={lv}
              onPress={() => setLevel(lv)}
              style={[styles.tagPill, level === lv && styles.tagPillOn]}
            >
              <Text style={[styles.tagText, level === lv && styles.tagTextOn]}>{lv}</Text>
            </Pressable>
          ))}
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
          <Text style={styles.listTitle}>
            {level === 'SSC'
              ? (isBn ? 'এসএসসি ফ্রি ভিডিও' : 'SSC free videos')
              : (isBn ? 'এইচএসসি ফ্রি ভিডিও' : 'HSC free videos')}
          </Text>

          {/* Video Rows (.vid-list → .vid-row) */}
          <View style={styles.list}>
            {videos.length === 0 ? (
              <Text style={styles.emptyMark}>
                {isBn ? 'এই ক্লাসে এখনো কোনো ফ্রি ভিডিও নেই।' : 'No free videos for this class yet.'}
              </Text>
            ) : (
              videos.map((v) => (
                <View key={v.id} style={styles.row}>
                  <View style={styles.thumb}>
                    <PlayIcon size={26} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{v.title}</Text>
                    {!!v.description && (
                      <Text style={styles.rowDesc} numberOfLines={1}>{v.description}</Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => openEdit(v)}
                    style={styles.iconBtn}
                    accessibilityRole="button"
                    accessibilityLabel={isBn ? 'এডিট' : 'Edit'}
                  >
                    <PencilIcon size={15} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    onPress={() => deleteVideo(v)}
                    disabled={deletingId === v.id}
                    style={styles.iconBtn}
                    accessibilityRole="button"
                    accessibilityLabel={isBn ? 'মুছুন' : 'Delete'}
                  >
                    <TrashIcon size={15} />
                  </Pressable>
                </View>
              ))
            )}
          </View>

          <Button
            title={isBn ? 'ফ্রি ভিডিও যোগ করুন' : 'Add free video'}
            variant="secondary"
            size="lg"
            onPress={openNew}
          />
        </ScrollView>
      )}

      {/* Add / edit sheet */}
      {sheet !== null && (
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {sheet === 'new'
                ? (isBn ? 'নতুন ফ্রি ভিডিও' : 'New free video')
                : (isBn ? 'ফ্রি ভিডিও এডিট' : 'Edit free video')}
            </Text>

            <Text style={styles.fieldLabel}>{isBn ? 'ক্লাস লেভেল' : 'Class level'}</Text>
            <View style={styles.toggleWrap}>
              <View style={styles.tagToggle}>
                {['SSC', 'HSC'].map((lv) => (
                  <Pressable
                    key={lv}
                    onPress={() => setForm((p) => ({ ...p, classLevel: lv }))}
                    style={[styles.tagPill, form.classLevel === lv && styles.tagPillOn]}
                  >
                    <Text style={[styles.tagText, form.classLevel === lv && styles.tagTextOn]}>{lv}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Text style={styles.fieldLabel}>{isBn ? 'শিরোনাম' : 'Title'}</Text>
            <TextInput
              style={styles.input}
              placeholder={isBn ? 'যেমন: নিউটনের সূত্র' : 'e.g. Newton’s Laws'}
              placeholderTextColor={colors.textTertiary}
              value={form.title}
              onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
            />

            <Text style={styles.fieldLabel}>{isBn ? 'ইউটিউব লিংক' : 'YouTube link'}</Text>
            <TextInput
              style={styles.input}
              placeholder="https://www.youtube.com/watch?v=..."
              placeholderTextColor={colors.textTertiary}
              value={form.youtube_url}
              onChangeText={(v) => setForm((p) => ({ ...p, youtube_url: v }))}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={styles.fieldLabel}>{isBn ? 'বিবরণ' : 'Description'}</Text>
            <TextInput
              style={[styles.input, styles.area]}
              placeholder={isBn ? 'ভিডিওটি কী নিয়ে' : 'What this video covers'}
              placeholderTextColor={colors.textTertiary}
              value={form.description}
              onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
              multiline
            />

            <View style={styles.sheetActions}>
              <Pressable onPress={closeSheet} style={styles.cancelBtn} accessibilityRole="button">
                <Text style={styles.cancelT}>{isBn ? 'বাদ দাও' : 'Cancel'}</Text>
              </Pressable>
              <Pressable onPress={saveVideo} disabled={saving} style={styles.saveSheetBtn} accessibilityRole="button">
                <Text style={styles.saveT}>{saving ? '…' : (isBn ? 'সেভ' : 'Save')}</Text>
              </Pressable>
            </View>
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
    paddingTop: 12,
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
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  toggleWrap: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  tagToggle: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundMuted,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  tagPill: {
    flex: 1,
    borderRadius: radius.pill,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tagPillOn: {
    backgroundColor: colors.surface,
  },
  tagText: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary,
  },
  tagTextOn: {
    color: colors.textPrimary,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 44,
    gap: 12,
  },
  listTitle: {
    fontSize: 17,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  list: {
    gap: 10,
  },
  emptyMark: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  rowDesc: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  sheetTitle: {
    fontSize: 20,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary,
    marginTop: 8,
  },
  input: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-Regular',
    minHeight: 48,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    color: colors.textPrimary,
  },
  area: {
    minHeight: 72,
    paddingTop: 12,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cancelT: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary,
  },
  saveSheetBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.input,
    backgroundColor: colors.primary,
  },
  saveT: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: '#FFFFFF',
  },
});
