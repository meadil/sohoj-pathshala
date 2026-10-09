import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import YoutubeIframe from 'react-native-youtube-iframe';
import { useAlert } from '../../../components/CustomAlert';
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';
import { checkCourseAccess, isNoSessionError } from './gate';
import { toBn } from '../../../lib/subjectIcons';
import { colors, radius } from '../../../theme/theme';

function BackIcon({ size = 24, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PrevIcon({ size = 20, color = '#FFFFFF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14.5 5.5 8 12l6.5 6.5" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function NextIcon({ size = 20, color = '#FFFFFF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9.5 5.5 16 12l-6.5 6.5" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LibraryIcon({ size = 22, color = colors.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 6.5 12 3l8 3.5v11L12 21l-8-3.5Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M4 6.5 12 10l8-3.5M12 10v11" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

function CloseIcon({ size = 22, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6 6 18" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

function CheckIcon({ size = 16, color = colors.success }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m5 12.5 4.5 4.5L19 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronDownIcon({ size = 18, color = colors.textSecondary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m6 9 6 6 6-6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function youtubeIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const m =
    url.match(/[?&]v=([^&#]{6,})/) ||
    url.match(/youtu\.be\/([^?&#/]{6,})/) ||
    url.match(/\/embed\/([^?&#/]{6,})/) ||
    url.match(/\/shorts\/([^?&#/]{6,})/);
  return m ? m[1] : null;
}

/**
 * CQWatchScreen - Real CQ video watch page.
 * Header (back → list, chapter title + subject sub), YouTube player,
 * title + description, Prev/Next buttons, and a Library button
 * (bottom-left) opening a bottom sheet with every chapter and video
 * in the subject — tap any row to jump straight to it.
 *
 * Playlist = ALL videos of ALL chapters in the subject, ordered by
 * chapter order_index then video order_index. Initial video comes
 * from route params (videoId). Completion inserts a real
 * cq_video_views row (warn-tolerant while bypassed).
 */
export default function CQWatchScreen({ navigation, route }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { session } = useUser();
  const alert = useAlert();

  const courseId = route?.params?.courseId || null;
  const subjectId = route?.params?.subjectId || null;
  const initialVideoId = route?.params?.videoId || null;

  const [subjectName, setSubjectName] = useState('');
  const [groups, setGroups] = useState([]); // [{ chapterId, chapterTitle, videos: [] }]
  const [playlist, setPlaylist] = useState([]); // flat, each with chapterTitle
  const [notes, setNotes] = useState([]); // study notes for the current video
  const [index, setIndex] = useState(0);
  const [watchedIds, setWatchedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [expanded, setExpanded] = useState({}); // chapterId -> bool

  const isBn = lang === 'bn';
  const fmtNum = (n) => (isBn ? toBn(n) : String(n));
  // Full-bleed player: exact 16:9 from screen width, no black bar.
  const { width: screenWidth } = useWindowDimensions();
  const playerHeight = Math.round((screenWidth * 9) / 16);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
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
        if (cancelled) return;
        setSubjectName(sub?.name || '');

        const { data: chaps, error: chapError } = await supabase
          .from('chapters')
          .select('id, title')
          .eq('subject_id', subjectId)
          .order('order_index');
        if (chapError) throw chapError;
        const chapters = chaps || [];
        if (chapters.length === 0) {
          if (!cancelled) {
            setGroups([]);
            setPlaylist([]);
          }
          return;
        }

        const { data: vids, error: vidError } = await supabase
          .from('cq_videos')
          .select('id, title, youtube_url, description, chapter_id')
          .in('chapter_id', chapters.map((c) => c.id))
          .order('order_index');
        if (vidError) throw vidError;

        const byChapter = {};
        (vids || []).forEach((v) => {
          if (!byChapter[v.chapter_id]) byChapter[v.chapter_id] = [];
          byChapter[v.chapter_id].push(v);
        });
        const built = chapters.map((c) => ({
          chapterId: c.id,
          chapterTitle: c.title || '',
          videos: byChapter[c.id] || [],
        }));
        const flat = [];
        built.forEach((g) => {
          g.videos.forEach((v) => flat.push({ ...v, chapterTitle: g.chapterTitle }));
        });
        if (cancelled) return;
        setGroups(built);
        setPlaylist(flat);
        const startAt = Math.max(0, flat.findIndex((v) => v.id === initialVideoId));
        setIndex(startAt);
        const startVideo = flat[startAt];
        if (startVideo) {
          setExpanded({ [startVideo.chapter_id]: true });
        }

        if (session?.user?.id && flat.length > 0) {
          const { data: views, error: viewError } = await supabase
            .from('cq_video_views')
            .select('video_id')
            .eq('student_id', session.user.id)
            .in('video_id', flat.map((v) => v.id));
          if (viewError) throw viewError;
          if (!cancelled) setWatchedIds(new Set((views || []).map((v) => v.video_id)));
        } else if (!cancelled) {
          setWatchedIds(new Set());
        }
      } catch (err) {
        console.warn('CQWatch: could not load playlist:', err?.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [courseId, subjectId, session?.user?.id]);

  const markWatched = async (videoId) => {
    setWatchedIds((prev) => new Set(prev).add(videoId));
    try {
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      const { error } = await supabase
        .from('cq_video_views')
        .upsert({ video_id: videoId, student_id: session.user.id }, { onConflict: 'video_id,student_id' });
      if (error) throw error;
    } catch (err) {
      if (isNoSessionError(err)) {
        console.warn('TEMP DEV BYPASS: no live session, watch state kept locally only:', err?.message);
      } else {
        console.warn('CQWatch: could not record watch:', err?.message);
      }
    }
  };

  const current = playlist[index] || null;
  const currentVideoId = current ? youtubeIdFromUrl(current.youtube_url) : null;
  const hasPrev = index > 0;
  const hasNext = index < playlist.length - 1;

  const jumpTo = (videoId) => {
    const at = playlist.findIndex((v) => v.id === videoId);
    if (at >= 0) setIndex(at);
    setLibraryOpen(false);
  };

  // Study notes for the current video. They sit directly under the
  // description so the student never has to leave the video to find them.
  // Tapping opens the teacher's Drive link, so this intentionally leaves the
  // app for now (an in-app PDF reader is a later step).
  useEffect(() => {
    let cancelled = false;
    const vid = (playlist[index] || {}).id;
    if (!vid) {
      setNotes([]);
      return undefined;
    }
    supabase
      .from('video_notes')
      .select('id, title, drive_url')
      .eq('video_id', vid)
      .order('order_index', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('CQWatch: notes load failed:', error?.message);
          setNotes([]);
          return;
        }
        setNotes(data || []);
      });
    return () => {
      cancelled = true;
    };
  }, [playlist, index]);

  const openNote = (url) => {
    Linking.canOpenURL(url)
      .then((ok) => (ok ? Linking.openURL(url) : null))
      .catch(() => {});
  };

  const toggleChapter = (chapterId) => {
    setExpanded((prev) => ({ ...prev, [chapterId]: !prev[chapterId] }));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.headRow}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={isBn ? 'ভিডিও তালিকায় ফিরে যান' : 'Back to videos'}
        >
          <BackIcon size={24} />
        </Pressable>
        <View style={styles.headText}>
          <Text style={styles.headTitle} numberOfLines={2}>
            {current?.chapterTitle || (isBn ? 'ভিডিও দেখুন' : 'Watch video')}
          </Text>
          <Text style={styles.headSub}>{subjectName || '—'}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !current ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>
            {isBn ? 'কোনো ভিডিও পাওয়া যায়নি।' : 'No videos found.'}
          </Text>
        </View>
      ) : (
        <View style={styles.body}>
          {/* Player */}
          <View style={styles.playerWrap}>
            {currentVideoId ? (
              <YoutubeIframe
                key={current.id}
                height={playerHeight}
                width={screenWidth}
                videoId={currentVideoId}
                // hq=1 forces 360p for the first frames instead of letting
                // YouTube negotiate HD, which is the bulk of the black-screen
                // delay on a slow connection. playsinline stops iOS taking
                // over the screen, rel/modestbranding trim the iframe chrome.
                playerVars={{
                  hq: '1',
                  playsinline: '1',
                  rel: '0',
                  modestbranding: '1',
                  controls: '1',
                }}
                onChangeState={(state) => {
                  if (state === 'ended') markWatched(current.id);
                }}
              />
            ) : (
              <Text style={styles.noVideo}>
                {isBn ? 'ভিডিও লিংক পাওয়া যায়নি।' : 'No video link available.'}
              </Text>
            )}
          </View>

          {/* Title + meta */}
          <ScrollView
            contentContainerStyle={styles.metaScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.videoTitle}>{current.title}</Text>
            <Text style={styles.videoMeta}>
              {isBn
                ? `পর্ব ${fmtNum(index + 1)} / ${fmtNum(playlist.length)}`
                : `Part ${fmtNum(index + 1)} of ${fmtNum(playlist.length)}`}
              {watchedIds.has(current.id) && (isBn ? ' · দেখা হয়েছে' : ' · Watched')}
            </Text>
            {!!current.description && (
              <Text style={styles.videoDesc}>{current.description}</Text>
            )}

            {/* Notes sit with the video so the student never has to leave
                the player to find study material. Opens the teacher's Drive
                link for now; an in-app PDF reader comes later. */}
            {notes.length > 0 && (
              <View style={styles.notesBlock}>
                <Text style={styles.notesHeading}>
                  {isBn ? 'নোট' : 'Notes'}
                </Text>
                {notes.map((n) => (
                  <Pressable
                    key={String(n.id)}
                    onPress={() => openNote(n.drive_url)}
                    style={({ pressed }) => [styles.noteCard, pressed && styles.noteCardPressed]}
                    accessibilityRole="link"
                    accessibilityLabel={n.title}
                  >
                    <View style={styles.noteIcon}>
                      <Text style={styles.noteIconT}>PDF</Text>
                    </View>
                    <Text style={styles.noteTitle} numberOfLines={2}>
                      {n.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Bottom bar: Library (left) + Prev/Next */}
          <View style={styles.footer}>
            <Pressable
              onPress={() => setLibraryOpen(true)}
              style={({ pressed }) => [styles.libraryBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel={isBn ? 'লাইব্রেরি খুলুন' : 'Open library'}
            >
              <LibraryIcon size={22} />
              <Text style={styles.libraryText}>{isBn ? 'লাইব্রেরি' : 'Library'}</Text>
            </Pressable>
            <View style={styles.navBtns}>
              <Pressable
                onPress={() => hasPrev && setIndex(index - 1)}
                disabled={!hasPrev}
                style={({ pressed }) => [
                  styles.navBtn,
                  !hasPrev && styles.navBtnDisabled,
                  pressed && hasPrev && styles.btnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={isBn ? 'আগের ভিডিও' : 'Previous video'}
              >
                <PrevIcon size={20} color={hasPrev ? '#FFFFFF' : colors.textSecondary} />
                <Text style={[styles.navText, !hasPrev && styles.navTextDisabled]}>
                  {isBn ? 'আগেরটি' : 'Prev'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => hasNext && setIndex(index + 1)}
                disabled={!hasNext}
                style={({ pressed }) => [
                  styles.navBtn,
                  !hasNext && styles.navBtnDisabled,
                  pressed && hasNext && styles.btnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={isBn ? 'পরের ভিডিও' : 'Next video'}
              >
                <Text style={[styles.navText, !hasNext && styles.navTextDisabled]}>
                  {isBn ? 'পরেরটি' : 'Next'}
                </Text>
                <NextIcon size={20} color={hasNext ? '#FFFFFF' : colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Library bottom sheet */}
      <Modal
        visible={libraryOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLibraryOpen(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{isBn ? 'লাইব্রেরি' : 'Library'}</Text>
              <Text style={styles.sheetSub}>
                {isBn
                  ? `${fmtNum(groups.length)}টি অধ্যায় · ${fmtNum(playlist.length)}টি ভিডিও`
                  : `${fmtNum(groups.length)} chapters · ${fmtNum(playlist.length)} videos`}
              </Text>
              <Pressable
                onPress={() => setLibraryOpen(false)}
                style={styles.sheetClose}
                accessibilityRole="button"
                accessibilityLabel={isBn ? 'বন্ধ করুন' : 'Close'}
              >
                <CloseIcon />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.sheetList}
              showsVerticalScrollIndicator={false}
            >
              {groups.map((g) => {
                const open = !!expanded[g.chapterId];
                return (
                  <View key={g.chapterId} style={styles.sheetChapter}>
                    <Pressable
                      onPress={() => toggleChapter(g.chapterId)}
                      style={({ pressed }) => [styles.sheetChapterHead, pressed && styles.btnPressed]}
                    >
                      <Text style={styles.sheetChapterTitle} numberOfLines={2}>
                        {g.chapterTitle}
                      </Text>
                      <Text style={styles.sheetChapterCount}>
                        {fmtNum(g.videos.length)}
                      </Text>
                      <View style={[styles.chev, open && styles.chevOpen]}>
                        <ChevronDownIcon size={18} />
                      </View>
                    </Pressable>
                    {open &&
                      g.videos.map((v, i) => {
                        const active = current && v.id === current.id;
                        return (
                          <Pressable
                            key={v.id}
                            onPress={() => jumpTo(v.id)}
                            style={({ pressed }) => [
                              styles.sheetRow,
                              active && styles.sheetRowActive,
                              pressed && styles.btnPressed,
                            ]}
                          >
                            <Text style={[styles.sheetRowNum, active && styles.sheetRowActiveText]}>
                              {fmtNum(i + 1)}
                            </Text>
                            <Text
                              style={[styles.sheetRowTitle, active && styles.sheetRowActiveText]}
                              numberOfLines={2}
                            >
                              {v.title}
                            </Text>
                            {watchedIds.has(v.id) && <CheckIcon size={16} />}
                          </Pressable>
                        );
                      })}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  emptyText: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  body: {
    flex: 1,
  },
  playerWrap: {
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  noVideo: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-Regular',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingVertical: 60,
  },
  metaScroll: {
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    flexGrow: 1,
  },
  videoTitle: {
    fontSize: 19,
    lineHeight: 26,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  videoMeta: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary,
  },
  videoDesc: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
    marginTop: 4,
  },
  notesBlock: { marginTop: 18, gap: 8 },
  notesHeading: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  noteCardPressed: { backgroundColor: colors.surfaceMuted },
  noteIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerSubtle,
  },
  noteIconT: {
    fontSize: 12,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  noteTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  libraryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  libraryText: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
  navBtns: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    paddingVertical: 12,
  },
  navBtnDisabled: {
    backgroundColor: colors.backgroundMuted,
  },
  navText: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: '#FFFFFF',
  },
  navTextDisabled: {
    color: colors.textSecondary,
  },
  btnPressed: {
    opacity: 0.85,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(29,29,31,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.cardLg,
    borderTopRightRadius: radius.cardLg,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 28,
    maxHeight: '85%',
    gap: 10,
  },
  sheetHead: {
    gap: 2,
    paddingRight: 48,
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  sheetSub: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  sheetClose: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundMuted,
  },
  sheetList: {
    gap: 10,
    paddingBottom: 8,
  },
  sheetChapter: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  sheetChapterHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  sheetChapterTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  sheetChapterCount: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  chev: {
    transform: [{ rotate: '0deg' }],
  },
  chevOpen: {
    transform: [{ rotate: '180deg' }],
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sheetRowActive: {
    backgroundColor: colors.primarySubtle,
  },
  sheetRowNum: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary,
    minWidth: 22,
    textAlign: 'center',
  },
  sheetRowTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textPrimary,
  },
  sheetRowActiveText: {
    color: colors.primary,
    fontFamily: 'HindSiliguri-SemiBold',
  },
});
