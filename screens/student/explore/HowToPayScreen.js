import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../../../theme/theme';

function BackIcon({ size = 24, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
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
 * HowToPayScreen - "How to pay" video page (course detail row target).
 * No prototype screen exists (the row showed a placeholder note) —
 * layout follows the app's video conventions. Title is FIXED
 * (owner edits only the video URL, never the title).
 *
 * Video URL is REAL: payment_settings.how_to_pay_video_url (singleton
 * id=1, SELECT-open). Empty state when the owner hasn't set one yet.
 */
export default function HowToPayScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'

  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(true);

  const isBn = lang === 'bn';
  const videoId = youtubeIdFromUrl(videoUrl);
  // Exact 16:9 from screen width (body has 20px padding each side) —
  // a fixed height taller than the ratio leaves a black bar.
  const { width: screenWidth } = useWindowDimensions();
  const playerWidth = screenWidth - 40;
  const playerHeight = Math.round((playerWidth * 9) / 16);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('payment_settings')
          .select('how_to_pay_video_url')
          .eq('id', 1)
          .single();
        if (error) throw error;
        if (!cancelled) setVideoUrl(data?.how_to_pay_video_url || '');
      } catch (err) {
        console.warn('HowToPay: could not load video URL:', err?.message);
        if (!cancelled) setVideoUrl('');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
          <Text style={styles.headTitle}>{isBn ? 'কীভাবে পেমেন্ট করবেন' : 'How to pay'}</Text>
          <Text style={styles.headSub}>
            {isBn ? 'বিকাশ · ভিডিও গাইড' : 'bKash · video guide'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !videoId ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>
            {isBn ? 'এই মুহূর্তে কোনো ভিডিও গাইড নেই।' : 'No video guide right now.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.playerWrap}>
            <YoutubeIframe height={playerHeight} width={playerWidth} videoId={videoId} />
          </View>
          <Text style={styles.helper}>
            {isBn
              ? 'ভিডিওতে দেখানো ধাপগুলো অনুসরণ করে পেমেন্ট পাঠান, তারপর TrxID জমা দিন।'
              : 'Follow the steps in the video to send the payment, then submit your TrxID.'}
          </Text>
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
  body: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 44,
  },
  playerWrap: {
    backgroundColor: '#000000',
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  helper: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
});
