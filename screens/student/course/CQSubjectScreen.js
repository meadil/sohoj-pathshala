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
 * CQSubjectScreen - CQ chapter list (scr-cq-subject).
 * Matches index.html: gen-head (back → CQList, subject name +
 * "Step-by-step video solutions"), chapter rows (icon + chapterFmt
 * title + video count + chevron → CQVideos). Copy verbatim.
 *
 * Chapters and per-chapter video counts are REAL (live chapters +
 * cq_videos queries) — the prototype's fixed "3 videos" demo text is
 * NOT reproduced.
 */
export default function CQSubjectScreen({ navigation, route }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { session } = useUser();
  const alert = useAlert();

  const courseId = route?.params?.courseId || null;
  const subjectId = route?.params?.subjectId || null;

  const [subjectName, setSubjectName] = useState('');
  const [subjectIcon, setSubjectIcon] = useState('atom');
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
        const { data: sub, error: subError } = await supabase
          .from('subjects')
          .select('id, name')
          .eq('id', subjectId)
          .single();
        if (subError) throw subError;
        if (cancelled) return;
        setSubjectName(sub?.name || '');
        setSubjectIcon(iconForSubjectName(sub?.name));

        const { data: chaps, error: chapError } = await supabase
          .from('chapters')
          .select('id, title')
          .eq('subject_id', subjectId)
          .order('order_index');
        if (chapError) throw chapError;
        const chapIds = (chaps || []).map((c) => c.id);
        let videos = [];
        if (chapIds.length > 0) {
          const { data: vids, error: vidError } = await supabase
            .from('cq_videos')
            .select('id, chapter_id')
            .in('chapter_id', chapIds);
          if (vidError) throw vidError;
          videos = vids || [];
        }
        if (cancelled) return;
        setRows(
          (chaps || []).map((c, i) => ({
            ...c,
            index: i,
            videoCount: videos.filter((v) => v.chapter_id === c.id).length,
          }))
        );
      } catch (err) {
        console.warn('CQSubject: could not load chapters:', err?.message);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [courseId, subjectId, session?.user?.id]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header (.gen-head) */}
      <View style={styles.headRow}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={isBn ? 'CQ বিষয়ে ফিরে যান' : 'Back to CQ subjects'}
        >
          <BackIcon size={24} />
        </Pressable>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>{subjectName || (isBn ? 'CQ প্র্যাকটিস' : 'CQ practice')}</Text>
          <Text style={styles.headSub}>{isBn ? 'ধাপে ধাপে ভিডিও সমাধান' : 'Step-by-step video solutions'}</Text>
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
          {/* Chapter Rows (.vid-list → .row-card) */}
          {rows.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => navigation?.navigate?.('CQVideos', { courseId, subjectId, chapterId: c.id })}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.rowIcon}>
                <SubjectIcon icon={subjectIcon} size={26} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>
                  {isBn ? `অধ্যায় ${fmtNum(c.index + 1)}: ${c.title}` : `Chapter ${fmtNum(c.index + 1)}: ${c.title}`}
                </Text>
                <Text style={styles.rowSub}>
                  {isBn ? `${fmtNum(c.videoCount)} ভিডিও` : `${fmtNum(c.videoCount)} videos`}
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
