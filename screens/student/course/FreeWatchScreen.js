import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';
import { getClassLevelName } from '../../../lib/classLevel';
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

function PlayIcon({ size = 20, color = colors.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 5v14l11-7Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
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
 * FreeWatchScreen - Real free-video watch page (same pattern as
 * CQWatchScreen: player, title, description, Prev/Next footer,
 * Library bottom sheet with the full list to jump anywhere).
 * Copy is provisional Bangla (no prototype screen exists).
 *
 * Playlist = ALL free_videos for the student's class level, ordered
 * (all levels when unknown). Free needs no purchase gate and records
 * no watch state (no tracking table exists for free videos).
 */
export default function FreeWatchScreen({ navigation, route }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { profile } = useUser();

  const initialVideoId = route?.params?.videoId || null;

  const [levelName, setLevelName] = useState('');
  const [playlist, setPlaylist] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);

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
        const name = await getClassLevelName(profile?.class_level_id);
        if (!cancelled && name) setLevelName(name);
        let query = supabase
          .from('free_videos')
          .select('id, title, youtube_url, description')
          .order('order_index');
        if (profile?.class_level_id) {
          query = query.eq('class_level_id', profile.class_level_id);
        }
        const { data, error } = await query;
        if (error) throw error;
        if (cancelled) return;
        const list = data || [];
        setPlaylist(list);
        setIndex(Math.max(0, list.findIndex((v) => v.id === initialVideoId)));
      } catch (err) {
        console.warn('FreeWatch: could not load playlist:', err?.message);
        if (!cancelled) setPlaylist([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [profile?.class_level_id]);

  const current = playlist[index] || null;
  const currentVideoId = current ? youtubeIdFromUrl(current.youtube_url) : null;
  const hasPrev = index > 0;
  const hasNext = index < playlist.length - 1;

  const jumpTo = (videoId) => {
    const at = playlist.findIndex((v) => v.id === videoId);
    if (at >= 0) setIndex(at);
    setLibraryOpen(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.headRow}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={isBn ? 'ফ্রি ক্লাসে ফিরে যান' : 'Back to free classes'}
        >
          <BackIcon size={24} />
        </Pressable>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>{isBn ? 'ফ্রি ক্লাস' : 'Free Classes'}</Text>
          <Text style={styles.headSub}>
            {levelName
              ? `${levelName} · ${isBn ? 'সবসময় ফ্রি' : 'Always free'}`
              : (isBn ? 'সবসময় ফ্রি' : 'Always free')}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !current ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>
            {isBn ? 'এখনো কোনো ফ্রি ভিডিও নেই।' : 'No free videos yet.'}
          </Text>
        </View>
      ) : (
        <View style={styles.body}>
          {/* Player */}
          <View style={styles.playerWrap}>
            {currentVideoId ? (
              <YoutubeIframe key={current.id} height={playerHeight} width={screenWidth} videoId={currentVideoId} />
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
            </Text>
            {!!current.description && (
              <Text style={styles.videoDesc}>{current.description}</Text>
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
                  ? `${fmtNum(playlist.length)}টি ফ্রি ভিডিও`
                  : `${fmtNum(playlist.length)} free videos`}
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
              {playlist.map((v, i) => {
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
                    <View style={styles.sheetThumb}>
                      <PlayIcon size={20} color={active ? colors.primary : colors.textSecondary} />
                    </View>
                    <View style={styles.sheetBody}>
                      <Text
                        style={[styles.sheetRowTitle, active && styles.sheetRowActiveText]}
                        numberOfLines={2}
                      >
                        {v.title}
                      </Text>
                      <Text style={styles.sheetRowSub}>
                        {isBn ? `পর্ব ${fmtNum(i + 1)}` : `Part ${fmtNum(i + 1)}`}
                      </Text>
                    </View>
                  </Pressable>
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
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  headSub: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 24,
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
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sheetRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  sheetThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    flex: 1,
    gap: 2,
  },
  sheetRowTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textPrimary,
  },
  sheetRowActiveText: {
    color: colors.primary,
    fontFamily: 'HindSiliguri-SemiBold',
  },
  sheetRowSub: {
    fontSize: 12,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
});
