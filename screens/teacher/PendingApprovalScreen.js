import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import Button from '../../components/Button';
import StatusChip from '../../components/StatusChip';
import { useUser } from '../../contexts/UserContext';
import { colors, spacing, typography } from '../../theme/theme';

function BackIcon({ size = 24, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ClockIcon({ size = 44, color = colors.warningPressed }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.8} />
      <Path d="M12 7v5l3.5 2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * PendingApprovalScreen - shown to a teacher whose application is awaiting
 * owner review. Read-only: "Check Status" re-reads the profile, Sign Out
 * leaves. No skip/shortcut — approval comes from the owner via the guard.
 */
export default function PendingApprovalScreen() {
  const [lang] = React.useState('bn'); // 'bn' | 'en'
  const { profile, refreshProfile, signOut } = useUser();
  const isBn = lang === 'bn';
  const name = profile?.nickname || profile?.name || (isBn ? 'শিক্ষক' : 'Teacher');

  // This screen is rendered by the root guard OUTSIDE any navigator, so
  // there is no navigation prop — "back" means "return to sign-in", which
  // is exactly what signOut does. Await it so a rejection can't leave the
  // button looking dead.
  const handleSignOut = async () => {
    try {
      await signOut?.();
    } catch (e) {
      console.warn('PendingApproval: signOut failed:', e?.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header (.gen-head) */}
      <View style={styles.headRow}>
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={isBn ? 'সাইন আউট' : 'Sign out'}
        >
          <BackIcon />
        </Pressable>
        <Text style={styles.headTitle}>{isBn ? 'অনুমোদনের অপেক্ষায়' : 'Approval Pending'}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <ClockIcon size={48} />
        </View>

        <View style={styles.chipRow}>
          <StatusChip
            label={isBn ? 'পর্যালোচনার অপেক্ষায়' : 'Under Review'}
            status="pending"
            size="md"
          />
        </View>

        <Text style={styles.title}>
          {isBn ? `শুভেচ্ছা ${name}` : `Hello ${name}`}
        </Text>
        <Text style={styles.subtitle}>
          {isBn
            ? 'আপনার শিক্ষক আবেদনটি পর্যালোচনার অপেক্ষায় আছে।'
            : 'Your teacher application is under review.'}
        </Text>

        <Text style={styles.description}>
          {isBn
            ? 'মালিক আপনার যোগ্যতা যাচাই করে অনুমোদন করলে আপনি কোর্স তৈরি, CQ ভিডিও ও MCQ কুইজ পরিচালনা করতে পারবেন।'
            : 'Once the owner verifies and approves your account, you will be able to create courses, manage CQ videos, and run MCQ quizzes.'}
        </Text>

        <View style={styles.actionColumn}>
          <Button
            title={isBn ? 'স্ট্যাটাস দেখুন' : 'Check Status'}
            variant="primary"
            size="lg"
            onPress={refreshProfile}
          />
          <Button
            title={isBn ? 'সাইন আউট' : 'Sign Out'}
            variant="ghost"
            size="md"
            onPress={signOut}
          />
        </View>
      </View>
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
    paddingBottom: 12,
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
  headTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 14,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.warningSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  chipRow: {
    alignSelf: 'center',
  },
  title: {
    ...typography.largeTitle,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyBold,
    color: colors.primary,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionColumn: {
    marginTop: 12,
    gap: spacing.sm,
  },
});
