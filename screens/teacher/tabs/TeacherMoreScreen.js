import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import Button from '../../../components/Button';
import { askSignOut } from '../../../components/SignOutButton';
import { useAlert } from '../../../components/CustomAlert';
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../../../theme/theme';

function Chevron({ size = 22, color = colors.textTertiary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m9 6 6 6-6 6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChartIcon({ size = 24, color = colors.textSecondary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 20h16" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M7.5 16.5v-5M12 16.5V7M16.5 16.5v-3.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function PlayIcon({ size = 24, color = colors.textSecondary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m8 9 8-4v10l-8-4Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M5 17v3h14v-3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function UsersCheckIcon({ size = 24, color = colors.textSecondary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth={1.8} />
      <Path d="m16 11 2 2 4-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MegaIcon({ size = 24, color = colors.textSecondary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 9h3l8-4v14l-8-4H4Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M17 9a4 4 0 0 1 0 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function BannerIcon({ size = 24, color = colors.textSecondary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 4h14v10H5Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M5 8h14M9 12h6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function CardIcon({ size = 24, color = colors.textSecondary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M3 10h18" stroke={color} strokeWidth={1.8} />
      <Path d="M7 15h4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
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

/**
 * TeacherMoreScreen - More tab (teacher.html + owner.html #/more).
 * Prof-card (avatar initial + name + "Role · course titles"), ed-panel
 * (name + bio inputs + Save → real updateProfile), Account menu group
 * (teacher: Report, Free Videos; owner adds Approvals, Announcements,
 * Payment settings → Payments tab). Copy verbatim from both prototypes.
 *
 * Unbuilt targets (Report, Free Videos, Approvals, Announcements) →
 * placeholder alerts. Sign-out row added beyond the prototypes (neither
 * has one) because the main app otherwise has no sign-out path —
 * flagged in STATUS.md.
 */
export default function TeacherMoreScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { profile, session, isOwner, updateProfile, signOut } = useUser();
  const alert = useAlert();

  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [courseTitles, setCourseTitles] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const isBn = lang === 'bn';
  const displayName =
    (profile?.nickname || '').trim() ||
    (profile?.name || '').trim() ||
    (isBn ? 'বন্ধু' : 'friend');
  const initial = (displayName.charAt(0) || 'K').toUpperCase();

  useEffect(() => {
    setName(profile?.name || '');
    setBio(profile?.bio || '');
  }, [profile?.name, profile?.bio]);

  useEffect(() => {
    let cancelled = false;
    const loadCourses = async () => {
      if (!session?.user?.id) {
        if (!cancelled) setCourseTitles([]);
        return;
      }
      try {
        if (isOwner) {
          const { data, error } = await supabase
            .from('courses')
            .select('title')
            .order('created_at', { ascending: true });
          if (error) throw error;
          if (!cancelled) setCourseTitles((data || []).map((c) => c.title).filter(Boolean));
        } else {
          const { data: links, error } = await supabase
            .from('course_instructors')
            .select('course_id, courses(title)')
            .eq('teacher_id', session.user.id);
          if (error) throw error;
          if (!cancelled) {
            setCourseTitles(
              (links || []).map((l) => l.courses?.title).filter(Boolean)
            );
          }
        }
      } catch (err) {
        console.warn('TeacherMore: could not load course titles:', err?.message);
        if (!cancelled) setCourseTitles([]);
      }
    };
    loadCourses();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, isOwner]);

  const subLine = [
    isBn ? (isOwner ? 'মালিক' : 'শিক্ষক') : (isOwner ? 'Owner' : 'Teacher'),
    ...courseTitles,
  ].join(' · ');

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedBio = bio.trim();
    if (!trimmedName) {
      alert(
        isBn ? 'নাম প্রয়োজন' : 'Name Required',
        isBn ? 'অনুগ্রহ করে তোমার নাম লিখো।' : 'Please enter your name.'
      );
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({ name: trimmedName, bio: trimmedBio || null });
      alert('', isBn ? 'প্রোফাইল সংরক্ষিত' : 'Profile saved');
    } catch (err) {
      alert(isBn ? 'সংরক্ষণ করতে পারলাম না' : 'Could Not Save', err?.message || 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const menuRow = (icon, label, onPress, chip) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {icon}
      <Text style={styles.rowLabel}>{label}</Text>
      {!!chip && <Text style={styles.rowChip}>{chip}</Text>}
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
          <View style={styles.profAva}>
            <Text style={styles.profAvaLetter}>{initial}</Text>
          </View>
          <View style={styles.profText}>
            <Text style={styles.profName}>{displayName}</Text>
            {!!subLine && <Text style={styles.profSub}>{subLine}</Text>}
          </View>
        </View>

        {/* Edit Panel (.ed-panel) */}
        <View style={styles.panel}>
          <Text style={styles.secTitle}>
            {isBn ? 'ইনস্ট্রাক্টর প্রোফাইল' : 'Instructor profile'}
          </Text>
          <Text style={styles.panelHint}>
            {isBn
              ? 'একবারই সংরক্ষণ — যেসব কোর্সে আপনি তালিকাভুক্ত, সব জায়গায় ব্যবহৃত হয়।'
              : 'Saved once, reused on every course that lists you.'}
          </Text>
          <View style={styles.field}>
            <Text style={styles.label}>{isBn ? 'নাম' : 'Name'}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{isBn ? 'সংক্ষিপ্ত জীবনী' : 'Short bio'}</Text>
            <TextInput
              style={[styles.input, styles.area]}
              placeholder={isBn ? 'যেমন: পদার্থ ও গণিত শিক্ষক, ঢাকা' : 'e.g. Physics & Mathematics teacher, Dhaka'}
              placeholderTextColor={colors.textTertiary}
              value={bio}
              onChangeText={setBio}
              multiline
            />
          </View>
          <Button
            title={isBn ? 'প্রোফাইল সংরক্ষণ করুন' : 'Save profile'}
            variant="secondary"
            size="lg"
            loading={isSaving}
            onPress={handleSave}
          />
        </View>

        {/* Account Menu (.menu-card) */}
        <View>
          <Text style={styles.groupLabel}>{isBn ? 'অ্যাকাউন্ট' : 'Account'}</Text>
          <View style={styles.menuCard}>
            {isOwner && (
              <>
                {menuRow(
                  <UsersCheckIcon size={24} />,
                  isBn ? 'শিক্ষক অনুমোদন' : 'Teacher Approvals',
                  () => navigation?.navigate?.('Approvals'),
                  isBn ? 'শুধু মালিক' : 'Owner only'
                )}
                {menuRow(
                  <MegaIcon size={24} />,
                  isBn ? 'ঘোষণা' : 'Announcements',
                  () => navigation?.navigate?.('Announcements'),
                  isBn ? 'শুধু মালিক' : 'Owner only'
                )}
                {menuRow(
                  <BannerIcon size={24} />,
                  isBn ? 'ব্যানার' : 'Banners',
                  () => navigation?.navigate?.('Banners'),
                  isBn ? 'শুধু মালিক' : 'Owner only'
                )}
              </>
            )}
            {menuRow(
              <ChartIcon size={24} />,
              isBn ? 'রিপোর্ট' : 'Report',
              () => navigation?.navigate?.('Report')
            )}
            {menuRow(
              <PlayIcon size={24} />,
              isBn ? 'ফ্রি ভিডিও' : 'Free Videos',
              () => navigation?.navigate?.('FreeVideos')
            )}
            {menuRow(
              <CardIcon size={24} />,
              isBn ? 'সাপ্তাহিক কুইজ' : 'Weekly quizzes',
              () => navigation?.navigate?.('Quizzes'),
              isBn ? 'প্রকাশ ও সময়সূচি' : 'publish and schedule'
            )}
            {isOwner &&
              menuRow(
                <CardIcon size={24} />,
                isBn ? 'পেমেন্ট সেটিংস' : 'Payment settings',
                () => navigation?.navigate?.('Payments')
              )}
          </View>
        </View>

        {/* Sign Out (no sign-out row exists in either prototype — added
            because the main app otherwise has no sign-out path;
            documented in STATUS.md) */}
        <View style={styles.menuCard}>
          <Pressable
            onPress={() => askSignOut({ alert, signOut, isBn })}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <LogoutIcon size={24} />
            <Text style={[styles.rowLabel, { color: colors.danger }]}>
              {isBn ? 'সাইন আউট' : 'Sign out'}
            </Text>
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
  panelHint: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
    marginTop: -8,
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
  area: {
    minHeight: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  groupLabel: {
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    marginBottom: 8,
    fontFamily: 'HindSiliguri-SemiBold',
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
  rowChip: {
    fontSize: 12,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.warningPressed,
    backgroundColor: colors.warningSubtle,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
});
