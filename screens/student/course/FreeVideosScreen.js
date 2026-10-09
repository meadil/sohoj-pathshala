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

function PlayIcon({ size = 26, color = colors.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 12h.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M8 5v14l11-7Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * FreeVideosScreen - Free Classes page (dashboard tile target).
 * No prototype screen exists for the list itself (only the dashboard
 * tile + copy) — layout follows the app's video-list conventions.
 * Copy is provisional Bangla.
 *
 * Rows are REAL free_videos for the student's class level (all levels
 * when unknown/session-less — free means free). Tapping a row opens
 * the FreeWatchScreen watch page (full player, prev/next, library
 * sheet). Free videos need no purchase and record no watch state.
 */
export default function FreeVideosScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { profile, session } = useUser();

  const [levelName, setLevelName] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const isBn = lang === 'bn';
  const fmtNum = (n) => (isBn ? toBn(n) : String(n));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const name = await getClassLevelName(profile?.class_level_id);
        if (!cancelled && name) setLevelName(name);
        let query = supabase
          .from('free_videos')
          .select('id, title, youtube_url, description, class_level_id')
          .order('order_index');
        if (profile?.class_level_id) {
          query = query.eq('class_level_id', profile.class_level_id);
        }
        const { data, error } = await query;
        if (error) throw error;
        if (!cancelled) setVideos(data || []);
      } catch (err) {
        console.warn('FreeVideos: could not load videos:', err?.message);
        if (!cancelled) setVideos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [profile?.class_level_id, session?.user?.id]);

  const openVideo = (video) => {
    navigation?.navigate?.('FreeWatch', { videoId: video.id });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.headRow}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={isBn ? 'পেছনে যান' : 'Go back'}
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
      ) : videos.length === 0 ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>
            {isBn ? 'এখনো কোনো ফ্রি ভিডিও নেই।' : 'No free videos yet.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.countLine}>
            {isBn
              ? `${fmtNum(videos.length)}টি ফ্রি ভিডিও`
              : `${fmtNum(videos.length)} free videos`}
          </Text>
          {videos.map((v, i) => (
            <Pressable
              key={v.id}
              onPress={() => openVideo(v)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.thumb}>
                <PlayIcon size={26} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {v.title}
                </Text>
                {!!v.description && (
                  <Text style={styles.rowSub} numberOfLines={2}>
                    {v.description}
                  </Text>
                )}
              </View>
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
  list: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 44,
  },
  countLine: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary,
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
    lineHeight: 21,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  rowSub: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
});
