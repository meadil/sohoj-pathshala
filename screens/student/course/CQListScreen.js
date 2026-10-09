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

function Chevron({ size = 22, color = colors.textTertiary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * CQListScreen - CQ subject list (scr-cq).
 * Matches index.html: gen-head (back → CourseHome, "CQ practice" +
 * "Pick a subject"), subject rows (icon + title + chapter/video
 * counts + chevron → CQSubject). Copy verbatim.
 *
 * Counts are REAL (chapters + CQ videos per subject queried live) —
 * the prototype's fixed "3 chapters · 9 videos" demo text is NOT
 * reproduced. Entry gated by the shared purchase gate.
 */
export default function CQListScreen({ navigation, route }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { session } = useUser();
  const alert = useAlert();

  const courseId = route?.params?.courseId || null;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

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
        const { data: subs, error: subError } = await supabase
          .from('subjects')
          .select('id, name')
          .eq('course_id', courseId)
          .order('order_index');
        if (subError) throw subError;
        const ids = (subs || []).map((s) => s.id);
        let chapters = [];
        let videos = [];
        if (ids.length > 0) {
          const { data: chaps, error: chapError } = await supabase
            .from('chapters')
            .select('id, subject_id')
            .in('subject_id', ids);
          if (chapError) throw chapError;
          chapters = chaps || [];
          const chapIds = chapters.map((c) => c.id);
          if (chapIds.length > 0) {
            const { data: vids, error: vidError } = await supabase
              .from('cq_videos')
              .select('id, chapter_id')
              .in('chapter_id', chapIds);
            if (vidError) throw vidError;
            videos = vids || [];
          }
        }
        if (cancelled) return;
        setRows(
          (subs || []).map((s) => {
            const chaps = chapters.filter((c) => c.subject_id === s.id);
            const chapIds = new Set(chaps.map((c) => c.id));
            return {
              ...s,
              chapterCount: chaps.length,
              videoCount: videos.filter((v) => chapIds.has(v.chapter_id)).length,
            };
          })
        );
      } catch (err) {
        console.warn('CQList: could not load subjects:', err?.message);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [courseId, session?.user?.id]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header (.gen-head) */}
      <View style={styles.headRow}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={isBn ? 'কোর্স হোমে ফিরে যান' : 'Back to course home'}
        >
          <BackIcon size={24} />
        </Pressable>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>{isBn ? 'CQ প্র্যাকটিস' : 'CQ practice'}</Text>
          <Text style={styles.headSub}>{isBn ? 'একটি বিষয় বাছুন' : 'Pick a subject'}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {/* Subject Rows (.vid-list → .row-card) */}
          {rows.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => navigation?.navigate?.('CQSubject', { courseId, subjectId: s.id })}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.rowIcon}>
                <SubjectIcon icon={iconForSubjectName(s.name)} size={26} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{s.name}</Text>
                <Text style={styles.rowSub}>
                  {isBn
                    ? `${fmtNum(s.chapterCount)} অধ্যায় · ${fmtNum(s.videoCount)} ভিডিও`
                    : `${fmtNum(s.chapterCount)} chapters · ${fmtNum(s.videoCount)} videos`}
                </Text>
              </View>
              <Chevron size={22} />
            </Pressable>
          ))}
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
  headSub: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 44,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  rowSub: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
});
