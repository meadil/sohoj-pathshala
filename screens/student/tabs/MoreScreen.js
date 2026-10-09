import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useAlert } from '../../../components/CustomAlert';
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';
import { getClassLevelName } from '../../../lib/classLevel';
import { AVATAR_PRESETS } from '../../../lib/subjectIcons';
import { colors, radius } from '../../../theme/theme';

function Chevron({ size = 22, color = colors.textTertiary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function HomeIcon({ size = 24, color = colors.textSecondary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 10.5 12 4l8 6.5V19a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 19Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M9.5 20.5v-6h5v6" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

function CardIcon({ size = 24, color = colors.textSecondary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="5" width="16" height="16" rx="4" stroke={color} strokeWidth={1.8} />
      <Path d="M4 9.5h16M8 15.5h8M8 12.5h5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function ShieldIcon({ size = 24, color = colors.textSecondary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3v7.5l5.5 3.2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M12 3 5 5.6V11c0 4.7 3 7.6 7 10 4-2.4 7-5.3 7-10V5.6Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

function DocIcon({ size = 24, color = colors.textSecondary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 3.5h8A2.5 2.5 0 0 1 18.5 6v12A2.5 2.5 0 0 1 16 20.5H8A2.5 2.5 0 0 1 5.5 18V6A2.5 2.5 0 0 1 8 3.5Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M9 8.5h6M9 12.5h6M9 16.5h3.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function LogoutIcon({ size = 24, color = colors.danger }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M10 12h10M16 8l4 4-4 4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 4.5H6A1.5 1.5 0 0 0 4.5 6v12A1.5 1.5 0 0 0 6 19.5h8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function isNoSessionError(err) {
  return (
    err?.message === 'Not authenticated' ||
    err?.name === 'AuthSessionMissingError' ||
    (typeof err?.message === 'string' && err.message.includes('Auth session missing'))
  );
}

/**
 * MoreScreen - Student More tab (scr-more).
 * Matches index.html#more: gen-head header, profile card (avatar +
 * displayName + "{Level} Science · {email}"), inline edit panel (name +
 * nickname inputs, saved via real updateProfile on submit), menu card
 * (My course, Payment history, Privacy policy, Terms & conditions),
 * sign-out row. All Bangla/English strings pulled verbatim from
 * index.html.
 *
 * Deliberate deviations from demo chrome, documented here:
 * - The prototype's db-card (None/Pending/Confirmed payment-state
 *   switcher) is prototype-only debug tooling with no real equivalent —
 *   OMITTED. Unlock state will come from real course_purchases rows.
 * - Sign out is REAL (supabase signOut). The prototype disables it
 *   ("Signing out is disabled in this prototype") — not matched, since
 *   a real sign-out exists here.
 * - No Delete Account row: not present in the prototype — not invented.
 * - My course / Payment history / Privacy / Terms → placeholder alerts
 *   (those screens come later).
 */
export default function MoreScreen() {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { profile, updateProfile, signOut, session } = useUser();
  const navigation = useNavigation();
  const alert = useAlert();

  const [name, setName] = useState(profile?.name || '');
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [levelName, setLevelName] = useState(null);

  const isBn = lang === 'bn';
  const displayName =
    (profile?.nickname || '').trim() ||
    (profile?.name || '').trim().split(/\s+/)[0] ||
    (isBn ? 'বন্ধু' : 'friend');
  const initial = (displayName.charAt(0) || 'A').toUpperCase();
  // Preset avatar color from profile (photo wins when avatar_url set).
  const presetIndex =
    typeof profile?.avatar_preset === 'number' &&
    profile.avatar_preset >= 0 &&
    profile.avatar_preset < AVATAR_PRESETS.length
      ? profile.avatar_preset
      : null;
  const avatarBg = presetIndex !== null ? AVATAR_PRESETS[presetIndex].bg : colors.primary;

  useEffect(() => {
    setName(profile?.name || '');
    setNickname(profile?.nickname || '');
  }, [profile?.name, profile?.nickname]);

  useEffect(() => {
    let cancelled = false;
    const loadLevel = async () => {
      const name = await getClassLevelName(profile?.class_level_id);
      if (!cancelled && name) {
        setLevelName(name);
      }
    };
    loadLevel();
    return () => {
      cancelled = true;
    };
  }, [profile?.class_level_id]);

  const subLine = [levelName ? `${levelName} Science` : null, profile?.email || null]
    .filter(Boolean)
    .join(' · ');

  const saveField = async (updates) => {
    try {
      await updateProfile(updates);
    } catch (err) {
      if (isNoSessionError(err)) {
        console.warn('TEMP DEV BYPASS: no live session, profile edit kept locally only:', err?.message);
        return;
      }
      alert(
        'Could Not Save',
        err?.message || 'Could not save the profile. Please try again.'
      );
    }
  };

  const handleMyCourse = async () => {
    // Open the newest confirmed course (first catalog course while
    // bypassed, mirroring the Dashboard preview entry).
    try {
      if (!session?.user?.id) {
        const { data, error } = await supabase
          .from('courses')
          .select('id')
          .limit(1);
        if (error) throw error;
        if (data?.[0]?.id) {
          navigation?.navigate?.('Dashboard', { screen: 'CourseHome', params: { courseId: data[0].id } });
          return;
        }
      } else {
        const { data, error } = await supabase
          .from('course_purchases')
          .select('course_id')
          .eq('student_id', session.user.id)
          .eq('status', 'confirmed')
          .order('created_at', { ascending: false })
          .limit(1);
        if (error) throw error;
        if (data?.[0]?.course_id) {
          navigation?.navigate?.('Dashboard', { screen: 'CourseHome', params: { courseId: data[0].course_id } });
          return;
        }
      }
      alert('', isBn ? 'আপনার কোনো কোর্স নেই।' : 'You have no course yet.');
    } catch (err) {
      alert('Could Not Open Course', err?.message || 'Please try again.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      alert('Could Not Sign Out', err?.message || 'Please try again.');
    }
  };

  const menuRow = (icon, label, onPress, labelColor) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {icon}
      <Text style={[styles.rowLabel, labelColor && { color: labelColor }]}>{label}</Text>
      <Chevron size={22} />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header (.gen-head) */}
        <View style={styles.headWrap}>
          <Text style={styles.title}>{isBn ? 'আরও' : 'More'}</Text>
        </View>

        {/* Profile Card (.prof-card) */}
        <View style={styles.profCard}>
          <View style={[styles.profAva, { backgroundColor: avatarBg }]}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.profAvaImage} />
            ) : (
              <Text style={styles.profAvaLetter}>{initial}</Text>
            )}
          </View>
          <View style={styles.profText}>
            <Text style={styles.profName}>{displayName}</Text>
            {!!subLine && <Text style={styles.profSub}>{subLine}</Text>}
          </View>
        </View>

        {/* Edit Panel (.ed-panel) */}
        <View style={styles.panel}>
          <Text style={styles.secTitle}>{isBn ? 'প্রোফাইল সম্পাদনা' : 'Edit profile'}</Text>
          <View style={styles.field}>
            <Text style={styles.label}>{isBn ? 'আপনার নাম' : 'Your name'}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="done"
              onSubmitEditing={() => {
                const v = name.trim();
                if (v && v !== profile?.name) {
                  saveField({ name: v });
                }
              }}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{isBn ? 'ডাক নাম' : 'Nickname'}</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="words"
              autoComplete="nickname"
              returnKeyType="done"
              onSubmitEditing={() => {
                const v = nickname.trim();
                if (v && v !== profile?.nickname) {
                  saveField({ nickname: v });
                }
              }}
            />
          </View>
        </View>

        {/* Menu (.menu-card) */}
        <View style={styles.menuCard}>
          {menuRow(<HomeIcon size={24} />, isBn ? 'আমার কোর্স' : 'My course', handleMyCourse)}
          {menuRow(<CardIcon size={24} />, isBn ? 'পেমেন্ট ইতিহাস' : 'Payment history', () =>
            navigation?.navigate?.('PaymentHistory')
          )}
          {menuRow(<ShieldIcon size={24} />, isBn ? 'গোপনীয়তা নীতি' : 'Privacy policy', () =>
            navigation?.navigate?.('Legal', { doc: 'privacy' })
          )}
          {menuRow(<DocIcon size={24} />, isBn ? 'শর্তাবলি' : 'Terms & conditions', () =>
            navigation?.navigate?.('Legal', { doc: 'terms' })
          )}
        </View>

        {/* Sign Out (.menu-card) */}
        <View style={styles.menuCard}>
          {menuRow(
            <LogoutIcon size={24} />,
            isBn ? 'সাইন আউট' : 'Sign out',
            handleSignOut,
            colors.danger
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background, // #FBF7F0
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 16,
  },
  headWrap: {
    gap: 2,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  profCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
  },
  profAva: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profAvaImage: {
    width: '100%',
    height: '100%',
  },
  profAvaLetter: {
    fontSize: 24,
    fontFamily: 'HindSiliguri-SemiBold',
    color: '#FFFFFF',
  },
  profText: {
    flex: 1,
    gap: 3,
  },
  profName: {
    fontSize: 18,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  profSub: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  panel: {
    gap: 12,
  },
  secTitle: {
    fontSize: 18,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  input: {
    fontSize: 17,
    fontFamily: 'HindSiliguri-Regular',
    minHeight: 52,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: 16,
    color: colors.textPrimary,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
});
