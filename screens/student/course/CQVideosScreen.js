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

function CheckIcon({ size = 18, color = colors.success }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m5 12.5 4.5 4.5L19 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * CQVideosScreen - CQ chapter video list (scr-cq-videos).
 * Matches index.html: gen-head (back → CQSubject, chapterFmt title +
 * subject sub), video rows (thumb icon + title + "Part {n}" sub +
 * watch checkmark). Copy verbatim.
 *
 * Rows are REAL cq_videos; checkmarks are REAL cq_video_views rows for
 * the student (own rows only; empty while bypassed). Tapping a row
 * opens the CQWatchScreen watch page (full player, prev/next, library
 * sheet); watch state is recorded there on play completion.
 * No durations shown (unknowable without a metadata API — the
 * prototype's duration chips were demo text).
 */
export default function CQVideosScreen({ navigation, route }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { session } = useUser();
  const alert = useAlert();

  const courseId = route?.params?.courseId || null;
  const subjectId = route?.params?.subjectId || null;
  const chapterId = route?.params?.chapterId || null;

  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterIndex, setChapterIndex] = useState(0);
  const [subjectName, setSubjectName] = useState('');
  const [subjectIcon, setSubjectIcon] = useState('atom');
  const [videos, setVideos] = useState([]);
  const [watchedIds, setWatchedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const isBn = lang === 'bn';
  const fmtNum = (n) => (isBn ? toBn(n) : String(n));

  const load = async () => {
    try {
      const access = await checkCourseAccess(courseId, session?.user?.id);
      if (!access.allowed) {
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
      setSubjectName(sub?.name || '');
      setSubjectIcon(iconForSubjectName(sub?.name));

      const { data: chaps, error: chapError } = await supabase
        .from('chapters')
        .select('id, title')
        .eq('subject_id', subjectId)
        .order('order_index');
      if (chapError) throw chapError;
      const idx = Math.max(0, (chaps || []).findIndex((c) => c.id === chapterId));
      const chapter = (chaps || [])[idx];
      if (!chapter) {
        setVideos([]);
        return;
      }
      setChapterTitle(chapter.title || '');
      setChapterIndex(idx);

      const { data: vids, error: vidError } = await supabase
        .from('cq_videos')
        .select('id, title, youtube_url, description')
        .eq('chapter_id', chapter.id)
        .order('order_index');
      if (vidError) throw vidError;
      setVideos(vids || []);

      if (session?.user?.id && (vids || []).length > 0) {
        const { data: views, error: viewError } = await supabase
          .from('cq_video_views')
          .select('video_id')
          .eq('student_id', session.user.id)
          .in('video_id', vids.map((v) => v.id));
        if (viewError) throw viewError;
        setWatchedIds(new Set((views || []).map((v) => v.video_id)));
      } else {
        setWatchedIds(new Set());
      }
    } catch (err) {
      console.warn('CQVideos: could not load videos:', err?.message);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [courseId, subjectId, chapterId, session?.user?.id]);

  const openVideo = (video) => {
    navigation?.navigate?.('CQWatch', {
      courseId,
      subjectId,
      chapterId,
      videoId: video.id,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header (.gen-head) */}
      <View style={styles.headRow}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={isBn ? 'অধ্যায়ে ফিরে যান' : 'Back to chapters'}
        >
          <BackIcon size={24} />
        </Pressable>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>
            {chapterTitle
              ? (isBn ? `অধ্যায় ${fmtNum(chapterIndex + 1)}: ${chapterTitle}` : `Chapter ${fmtNum(chapterIndex + 1)}: ${chapterTitle}`)
              : (isBn ? 'অধ্যায়ের ভিডিও' : 'Chapter videos')}
          </Text>
          <Text style={styles.headSub}>{subjectName || '—'}</Text>
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
          {/* Video Rows (.vid-list → .vid-row) */}
          {videos.map((v, i) => {
            const watched = watchedIds.has(v.id);
            return (
              <Pressable
                key={v.id}
                onPress={() => openVideo(v)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.thumb}>
                  <SubjectIcon icon={subjectIcon} size={24} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{v.title}</Text>
                  <Text style={styles.rowSub}>
                    {isBn ? `পর্ব ${fmtNum(i + 1)}` : `Part ${fmtNum(i + 1)}`}
                  </Text>
                </View>
                {watched && (
                  <View style={styles.check}>
                    <CheckIcon size={18} />
                  </View>
                )}
              </Pressable>
            );
          })}
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
    fontSize: 20,
    lineHeight: 26,
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
    paddingVertical: 12,
  },
  rowPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  thumb: {
    width: 52,
    height: 52,
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
  rowSub: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.successSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
