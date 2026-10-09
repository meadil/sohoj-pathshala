import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useAlert } from '../../../components/CustomAlert';
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../../../theme/theme';

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

function toBn(n) {
  return String(n).replace(/[0-9]/g, (d) => BENGALI_DIGITS[parseInt(d, 10)]);
}

// Tile icons — path data pulled verbatim from teacher.html/owner.html.
function TileIcon({ icon, size = 30, color = colors.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {icon === 'users' && (
        <>
          <Circle cx="9" cy="8" r="3.2" stroke={color} strokeWidth={1.8} />
          <Path d="M3.5 19.5c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
          <Path d="M15.5 5.5a3 3 0 0 1 0 5.6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
          <Path d="M16.5 14.6c2.2.7 3.6 2.4 4 4.9" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </>
      )}
      {icon === 'chart' && (
        <>
          <Path d="M4 20h16" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
          <Path d="M7.5 16.5v-5M12 16.5V7M16.5 16.5v-3.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </>
      )}
      {icon === 'play' && (
        <>
          <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={1.8} />
          <Path d="m10 9 5 3-5 3Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        </>
      )}
      {icon === 'card' && (
        <>
          <Rect x="3" y="6" width="18" height="13" rx="2.5" stroke={color} strokeWidth={1.8} />
          <Path d="M3 10h18" stroke={color} strokeWidth={1.8} />
          <Path d="M7 15h4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </>
      )}
      {icon === 'mega' && (
        <>
          <Path d="M4 9h3l8-4v14l-8-4H4Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
          <Path d="M17 9a4 4 0 0 1 0 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

function PencilIcon({ size = 22, color = colors.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 19l-1-4 11-11a2.8 2.8 0 0 1 4 4L8 19Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="m13 6 4 4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * TeacherDashboardScreen - Teacher/Owner home tab (teacher.html and
 * owner.html #/dashboard). One screen, role-aware: green Teacher chip
 * vs gold Owner chip; 3 vs 4 shortcut tiles; draft section shows real
 * unpublished courses (empty text when the teacher has none).
 * All Bangla/English strings pulled verbatim from both prototypes.
 *
 * Deliberate deviations from demo chrome, documented:
 * - Badge numbers are REAL or absent: owner Pending-payments shows the
 *   live pending-purchase count; enrollment badges are omitted (no real
 *   per-teacher new-enrollment count exists yet — the prototype's
 *   5/8/3 demo numbers are NOT reproduced).
 * - Draft cards show title + verbatim sub + Continue editing but NO
 *   progress bar/percentage (no real completion metric exists).
 * - Tiles whose screens aren't built yet (Report, Free videos,
 *   Announcements, CourseEditor) show placeholder alerts; Students /
 *   Payments / Courses tiles navigate to their (stub) tabs for real.
 */
export default function TeacherDashboardScreen() {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { profile, session, isOwner } = useUser();
  const navigation = useNavigation();
  const alert = useAlert();

  const [drafts, setDrafts] = useState([]);
  const [pendingCount, setPendingCount] = useState(null);
  const [loading, setLoading] = useState(true);

  const isBn = lang === 'bn';
  const fmtNum = (n) => (isBn ? toBn(n) : String(n));
  const nickname =
    (profile?.nickname || '').trim() ||
    (profile?.name || '').trim().split(/\s+/)[0] ||
    (isBn ? 'বন্ধু' : 'friend');
  const initial = (nickname.charAt(0) || 'R').toUpperCase();

  // useFocusEffect, not useEffect: the draft rail must re-query every time the
  // tab regains focus, otherwise a course deleted in the Courses tab keeps
  // showing here as a stale card that navigates to a page which no longer exists.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!session?.user?.id) {
        setDrafts([]);
        setPendingCount(null);
        return;
      }
      if (isOwner) {
        const { data: rows, error } = await supabase
          .from('courses')
          .select('id, title')
          .eq('is_published', false)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setDrafts(rows || []);

        const { count, error: countError } = await supabase
          .from('course_purchases')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        if (countError) throw countError;
        setPendingCount(count || 0);
      } else {
        const { data: links, error: linkError } = await supabase
          .from('course_instructors')
          .select('course_id')
          .eq('teacher_id', session.user.id);
        if (linkError) throw linkError;
        const ids = (links || []).map((l) => l.course_id);
        if (ids.length > 0) {
          const { data: rows, error } = await supabase
            .from('courses')
            .select('id, title')
            .in('id', ids)
            .eq('is_published', false)
            .order('created_at', { ascending: false });
          if (error) throw error;
          setDrafts(rows || []);
        } else {
          setDrafts([]);
        }
        setPendingCount(null);
      }
    } catch (err) {
      console.warn('TeacherDashboard: could not load dashboard data:', err?.message);
      setDrafts([]);
      setPendingCount(null);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, isOwner]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const comingSoon = (message) => {
    alert('', message);
  };

  const tiles = isOwner
    ? [
        { icon: 'card', titleBn: 'অপেক্ষমাণ পেমেন্ট', titleEn: 'Pending payments', subBn: 'আপনার রিভিউয়ের অপেক্ষায়', subEn: 'awaiting your review', badge: pendingCount, tab: 'Payments' },
        { icon: 'users', titleBn: 'সাম্প্রতিক ভর্তি', titleEn: 'Recent enrollments', subBn: 'এই সপ্তাহে নতুন', subEn: 'new this week', badge: null, tab: 'Students' },
        { icon: 'chart', titleBn: 'রিপোর্ট', titleEn: 'Reports', subBn: 'সব কোর্স মিলিয়ে', subEn: 'all courses combined', badge: null, crossTab: 'More', crossScreen: 'Report' },
        { icon: 'mega', titleBn: 'ঘোষণা', titleEn: 'Announcements', subBn: 'শুধু মালিক', subEn: 'Owner only', badge: null, crossTab: 'More', crossScreen: 'Announcements' },
      ]
    : [
        { icon: 'users', titleBn: 'সাম্প্রতিক ভর্তি', titleEn: 'Recent enrollments', subBn: 'এই সপ্তাহে নতুন', subEn: 'new this week', badge: null, tab: 'Students' },
        { icon: 'chart', titleBn: 'রিপোর্ট', titleEn: 'Reports', subBn: 'আপনার কোর্সের সংখ্যা', subEn: "your course's numbers", badge: null, crossTab: 'More', crossScreen: 'Report' },
        { icon: 'play', titleBn: 'ফ্রি ভিডিও', titleEn: 'Free videos', subBn: 'ফ্রি রিলিজ পরিচালনা করুন', subEn: 'manage free releases', badge: null, crossTab: 'Courses', crossScreen: 'FreeVideos' },
      ];

  const handleTile = (tile) => {
    if (tile.tab) {
      navigation.navigate(tile.tab);
      return;
    }
    if (tile.crossTab) {
      navigation.navigate(tile.crossTab, { screen: tile.crossScreen });
      return;
    }
    comingSoon(isBn ? tile.noteBn : tile.noteEn);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header (.dash-header) */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{initial}</Text>
          </View>
          <View style={styles.greetWrap}>
            <Text style={styles.greet}>
              {isBn ? 'হ্যালো' : 'Hello'}, {nickname}
            </Text>
            <Text style={styles.greetSmall}>
              {isBn ? 'শিক্ষক ওয়ার্কস্পেস' : 'Teacher workspace'}
            </Text>
          </View>
          <Text style={[styles.chip, isOwner ? styles.chipGold : styles.chipGreen]}>
            {isOwner ? (isBn ? 'মালিক' : 'Owner') : (isBn ? 'শিক্ষক' : 'Teacher')}
          </Text>
        </View>

        {/* Shortcuts (.launch-grid) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isBn ? 'শর্টকাট' : 'Shortcuts'}</Text>
          <View style={styles.grid}>
            {tiles.map((tile) => (
              <Pressable
                key={tile.titleEn}
                onPress={() => handleTile(tile)}
                style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
              >
                <TileIcon icon={tile.icon} size={30} />
                {tile.badge !== null && tile.badge !== undefined && (
                  <Text style={styles.badgeNum}>{fmtNum(tile.badge)}</Text>
                )}
                <Text style={styles.tileTitle}>{isBn ? tile.titleBn : tile.titleEn}</Text>
                <Text style={styles.tileSub}>{isBn ? tile.subBn : tile.subEn}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* In Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isBn ? 'চলমান' : 'In progress'}</Text>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : drafts.length === 0 ? (
            !isOwner ? (
              <View style={styles.emptyPanel}>
                <Text style={styles.emptyText}>
                  {isBn
                    ? 'কোনো ড্রাফ্ট কোর্স নেই। এসএসসি সায়েন্স ইতিমধ্যে প্রকাশিত।'
                    : 'No draft courses. SSC Science is already published.'}
                </Text>
              </View>
            ) : null
          ) : (
            drafts.map((d) => (
              <View key={d.id} style={styles.draftCard}>
                <View style={styles.draftAva}>
                  <Text style={styles.draftAvaLetter}>
                    {((d.title || 'H').trim().charAt(0) || 'H').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.draftBody}>
                  <Text style={styles.draftTitle}>{d.title}</Text>
                  <Text style={styles.draftSub}>
                    {isBn
                      ? 'এখনো তৈরি চলছে — প্রকাশিত না হওয়া পর্যন্ত ছাত্ররা দেখবে না।'
                      : 'Still being built — not public until published.'}
                  </Text>
                  <Pressable
                    onPress={() =>
                      navigation.navigate('Courses', { screen: 'CourseEditor', params: { courseId: d.id } })
                    }
                    style={({ pressed }) => [styles.resumeBtn, pressed && styles.resumeBtnPressed]}
                  >
                    <PencilIcon size={22} />
                    <Text style={styles.resumeText}>
                      {isBn ? 'এডিট চালিয়ে যান' : 'Continue editing'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
          <Pressable
            onPress={() => navigation.navigate('Courses')}
            style={styles.linkRow}
          >
            <Text style={styles.linkText}>{isBn ? 'সব কোর্স দেখুন' : 'View all courses'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 22,
    fontFamily: 'HindSiliguri-SemiBold',
    color: '#FFFFFF',
  },
  greetWrap: {
    flex: 1,
    gap: 1,
  },
  greet: {
    fontSize: 20,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  greetSmall: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  chip: {
    fontSize: 12,
    fontFamily: 'HindSiliguri-SemiBold',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  chipGreen: {
    color: colors.successDeep,
    backgroundColor: colors.successSubtle,
  },
  chipGold: {
    color: colors.secondaryPressed,
    backgroundColor: colors.secondarySubtle,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
    gap: 6,
  },
  tilePressed: {
    backgroundColor: colors.backgroundMuted,
  },
  badgeNum: {
    fontSize: 20,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
  tileTitle: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  tileSub: {
    fontSize: 12,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  emptyPanel: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  draftCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
  },
  draftAva: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftAvaLetter: {
    fontSize: 20,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
  draftBody: {
    flex: 1,
    gap: 4,
  },
  draftTitle: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  draftSub: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 6,
  },
  resumeBtnPressed: {
    opacity: 0.7,
  },
  resumeText: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
  linkRow: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  linkText: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
});
