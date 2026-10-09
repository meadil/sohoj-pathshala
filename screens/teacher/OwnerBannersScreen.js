import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { useAlert } from '../../components/CustomAlert';
import { useUser } from '../../contexts/UserContext';
import { supabase } from '../../lib/supabase';
import { BANNER_TARGETS, bannerTargetLabel } from '../../lib/bannerTargets';
import { colors, radius, spacing } from '../../theme/theme';

function BackIcon({ size = 24, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlusIcon({ size = 20, color = colors.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

const EMPTY_FORM = {
  tag: '',
  title: '',
  description: '',
  target_path: 'explore',
  is_active: true,
};

/**
 * OwnerBannersScreen — CRUD for the student Dashboard promo banners.
 * 4 content fields: tag, title, description, target_path (which page the
 * banner opens). Plus an active toggle and a manual order index.
 *
 * All writes are owner-only (banners RLS). Copy is provisional Bangla where
 * the prototype has no string — flagged TODO(copy).
 */
export default function OwnerBannersScreen({ navigation }) {
  const [lang] = useState('bn');
  const { isOwner } = useUser();
  const alert = useAlert();
  const isBn = lang === 'bn';

  const [banners, setBanners] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // banner row being edited, or 'new'
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('id, tag, title, description, target_path, is_active, order_index')
        .order('order_index', { ascending: true });
      if (error) throw error;
      setBanners(data || []);

      // Course options for the course-specific targets.
      const { data: cs } = await supabase
        .from('courses')
        .select('id, title')
        .order('title');
      setCourses(cs || []);
    } catch (err) {
      alert(
        isBn ? 'লোড হয়নি' : 'Could not load',
        err?.message || (isBn ? 'ব্যানার লোড করা যায়নি।' : 'Could not load banners.')
      );
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, [alert, isBn]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditing('new');
  };

  const openEdit = (b) => {
    setForm({
      tag: b.tag || '',
      title: b.title || '',
      description: b.description || '',
      target_path: b.target_path || 'explore',
      is_active: !!b.is_active,
    });
    setEditing(b.id);
  };

  const closeForm = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  // Course-specific targets store "<prefix>/<uuid>"; everything else is bare.
  const resolvePath = (prefix, courseId) =>
    prefix === 'course' || prefix === 'course-home' ? `${prefix}/${courseId}` : prefix;

  const handleSave = async () => {
    if (!form.title.trim()) {
      alert(isBn ? 'শিরোনাম প্রয়োজন' : 'Title required', isBn ? 'ব্যানারের শিরোনাম লিখুন।' : 'Enter a banner title.');
      return;
    }
    const prefix = String(form.target_path).split('/')[0];
    const needsCourse = BANNER_TARGETS.find((t) => t.path === prefix)?.needsCourse;
    if (needsCourse && !form.courseId) {
      alert(isBn ? 'কোর্স বাছুন' : 'Pick a course', isBn ? 'এই পেজের জন্য একটি কোর্স বাছুন।' : 'Choose a course for this target.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tag: form.tag.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        target_path: resolvePath(prefix, form.courseId),
        is_active: !!form.is_active,
        order_index: banners.length,
      };
      const { error } = editing === 'new'
        ? await supabase.from('banners').insert(payload)
        : await supabase.from('banners').update(payload).eq('id', editing);
      if (error) throw error;
      closeForm();
      await load();
    } catch (err) {
      alert(isBn ? 'সেভ হয়নি' : 'Save failed', err?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (b) => {
    alert(
      isBn ? 'মুছে ফেলবেন?' : 'Delete banner?',
      b.title || '',
      [
        { text: isBn ? 'বাদ দাও' : 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: isBn ? 'মুছুন' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('banners').delete().eq('id', b.id);
            if (error) {
              alert(isBn ? 'মুছা যায়নি' : 'Delete failed', error.message);
              return;
            }
            await load();
          },
        },
      ]
    );
  };

  const handleToggle = async (b, value) => {
    const { error } = await supabase
      .from('banners')
      .update({ is_active: value })
      .eq('id', b.id);
    if (error) {
      alert(isBn ? 'আপডেট হয়নি' : 'Update failed', error.message);
      return;
    }
    setBanners((prev) => prev.map((x) => (x.id === b.id ? { ...x, is_active: value } : x)));
  };

  if (!isOwner) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.headRow}>
          <Pressable onPress={() => navigation?.goBack?.()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back">
            <BackIcon />
          </Pressable>
          <Text style={styles.headTitle}>{isBn ? 'ব্যানার' : 'Banners'}</Text>
        </View>
        <Text style={styles.emptyMark}>{isBn ? 'শুধু মালিক দেখতে পারবেন।' : 'Owners only.'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headRow}>
        <Pressable onPress={() => navigation?.goBack?.()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <BackIcon />
        </Pressable>
        <Text style={styles.headTitle}>{isBn ? 'ব্যানার' : 'Banners'}</Text>
        <Pressable onPress={openNew} style={styles.addBtn} accessibilityRole="button" accessibilityLabel={isBn ? 'নতুন ব্যানার' : 'New banner'}>
          <PlusIcon size={18} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : banners.length === 0 ? (
          <Text style={styles.emptyMark}>
            {isBn ? 'এখনো কোনো ব্যানার নেই। উপরের + চাপে যোগ করুন।' : 'No banners yet. Tap + to add one.'}
          </Text>
        ) : (
          banners.map((b) => (
            <Card key={b.id} variant="flat" style={styles.row}>
              <View style={styles.rowTop}>
                <View style={styles.rowTitleWrap}>
                  {!!b.tag && (
                    <View style={styles.tagChip}>
                      <Text style={styles.tagText}>{b.tag}</Text>
                    </View>
                  )}
                  <Text style={styles.rowTitle} numberOfLines={1}>{b.title}</Text>
                </View>
                <Switch
                  value={!!b.is_active}
                  onValueChange={(v) => handleToggle(b, v)}
                  trackColor={{ true: colors.success, false: colors.border }}
                  thumbColor={colors.surface}
                  accessibilityLabel={isBn ? 'সক্রিয়' : 'Active'}
                />
              </View>
              {!!b.description && (
                <Text style={styles.rowDesc} numberOfLines={2}>{b.description}</Text>
              )}
              <Text style={styles.rowTarget}>
                {isBn ? 'পেজ: ' : 'Page: '}
                {bannerTargetLabel(b.target_path, isBn)}
              </Text>
              <View style={styles.rowActions}>
                <Button
                  title={isBn ? 'এডিট' : 'Edit'}
                  variant="secondary"
                  size="sm"
                  onPress={() => openEdit(b)}
                />
                <Button
                  title={isBn ? 'মুছুন' : 'Delete'}
                  variant="ghost"
                  size="sm"
                  onPress={() => handleDelete(b)}
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Add / Edit sheet */}
      {editing !== null && (
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {editing === 'new'
                ? (isBn ? 'নতুন ব্যানার' : 'New banner')
                : (isBn ? 'ব্যানার এডিট' : 'Edit banner')}
            </Text>

            <Text style={styles.fieldLabel}>{isBn ? 'ট্যাগ' : 'Tag'}</Text>
            <TextInput
              style={styles.input}
              placeholder={isBn ? 'যেমন নতুন, ফ্রি, হট' : 'e.g. New, Free, Hot'}
              placeholderTextColor={colors.textTertiary}
              value={form.tag}
              onChangeText={(v) => setForm((p) => ({ ...p, tag: v }))}
            />

            <Text style={styles.fieldLabel}>{isBn ? 'শিরোনাম' : 'Title'}</Text>
            <TextInput
              style={styles.input}
              placeholder={isBn ? 'ব্যানারের শিরোনাম' : 'Banner title'}
              placeholderTextColor={colors.textTertiary}
              value={form.title}
              onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
            />

            <Text style={styles.fieldLabel}>{isBn ? 'বিবরণ' : 'Description'}</Text>
            <TextInput
              style={[styles.input, styles.area]}
              placeholder={isBn ? 'এক লাইনের বিবরণ' : 'One-line description'}
              placeholderTextColor={colors.textTertiary}
              value={form.description}
              onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
              multiline
            />

            <Text style={styles.fieldLabel}>{isBn ? 'কোন পেজে যাবে' : 'Which page it opens'}</Text>
            <View style={styles.targetGrid}>
              {BANNER_TARGETS.map((t) => {
                const selected = String(form.target_path).split('/')[0] === t.path;
                return (
                  <Pressable
                    key={t.path}
                    onPress={() => setForm((p) => ({ ...p, target_path: t.path }))}
                    style={[styles.targetChip, selected && styles.targetChipOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.targetText, selected && styles.targetTextOn]}>
                      {isBn ? t.labelBn : t.labelEn}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {BANNER_TARGETS.find((t) => t.path === String(form.target_path).split('/')[0])?.needsCourse && (
              <>
                <Text style={styles.fieldLabel}>{isBn ? 'কোর্স বাছুন' : 'Pick a course'}</Text>
                <View style={styles.targetGrid}>
                  {courses.map((c) => {
                    const selected = form.courseId === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => setForm((p) => ({ ...p, courseId: c.id }))}
                        style={[styles.targetChip, selected && styles.targetChipOn]}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                      >
                        <Text style={[styles.targetText, selected && styles.targetTextOn]} numberOfLines={1}>
                          {c.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <View style={styles.sheetActions}>
              <Button
                title={isBn ? 'বাদ দাও' : 'Cancel'}
                variant="ghost"
                size="md"
                onPress={closeForm}
              />
              <Button
                title={isBn ? 'সেভ' : 'Save'}
                variant="primary"
                size="md"
                loading={saving}
                onPress={handleSave}
              />
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headTitle: { flex: 1, fontSize: 22, lineHeight: 28, fontFamily: 'HindSiliguri-SemiBold', color: colors.textPrimary },
  addBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySubtle },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  emptyMark: { textAlign: 'center', color: colors.textSecondary, marginTop: 40, fontSize: 15 },
  row: { marginBottom: 0 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  tagChip: { backgroundColor: colors.secondarySubtle, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 12, fontFamily: 'HindSiliguri-SemiBold', color: '#92400E' },
  rowTitle: { flex: 1, fontSize: 17, fontFamily: 'HindSiliguri-SemiBold', color: colors.textPrimary },
  rowDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 6 },
  rowTarget: { fontSize: 12, color: colors.textTertiary, marginTop: 6 },
  rowActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
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
    padding: spacing.xl,
    paddingBottom: 32,
    gap: 6,
  },
  sheetTitle: { fontSize: 20, fontFamily: 'HindSiliguri-SemiBold', color: colors.textPrimary, marginBottom: 6 },
  fieldLabel: { fontSize: 13, fontFamily: 'HindSiliguri-SemiBold', color: colors.textSecondary, marginTop: 8 },
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
  area: { minHeight: 72, paddingTop: 12 },
  targetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  targetChip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  targetChipOn: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
  targetText: { fontSize: 13, color: colors.textSecondary },
  targetTextOn: { color: colors.primary, fontFamily: 'HindSiliguri-SemiBold' },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
});
