import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import Button from '../../../components/Button';
import { useAlert } from '../../../components/CustomAlert';
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';
import { colors, radius } from '../../../theme/theme';

function BackIcon({ size = 24, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function HourglassIcon({ size = 56, color = colors.warning }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v7.2l4.6 2.7"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

/**
 * PayPendingScreen - Payment step 3 of 3 (scr-pay-pending).
 * Matches index.html: sp-head (back → Course, "Payment 3 of 3",
 * 3-segment progress), centered status (hourglass icon, title, lead),
 * TrxID recap card, "Check status" CTA + "Back to course" link.
 * Copy verbatim.
 *
 * Check status re-reads the REAL purchase row: confirmed → placeholder
 * (Course Home later); otherwise the prototype's own debounce note
 * ("We'll check again shortly"). Back rows pop back to CourseDetail.
 * No CTAs invented beyond the prototype's two buttons.
 */
export default function PayPendingScreen({ navigation, route }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { session } = useUser();
  const alert = useAlert();

  const courseId = route?.params?.courseId || null;
  const trxId = route?.params?.trxId || null;

  const [isChecking, setIsChecking] = useState(false);

  const isBn = lang === 'bn';

  const handleCheckStatus = async () => {
    if (!session?.user?.id || !courseId) {
      alert('', isBn ? 'একটু পর আবার দেখবো।' : "We'll check again shortly.");
      return;
    }
    setIsChecking(true);
    try {
      const { data: rows, error } = await supabase
        .from('course_purchases')
        .select('status')
        .eq('student_id', session.user.id)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      if (rows?.[0]?.status === 'confirmed') {
        alert('', isBn ? 'আপনার পেমেন্ট নিশ্চিত হয়েছে।' : 'Your payment has been confirmed.');
      } else {
        alert('', isBn ? 'একটু পর আবার দেখবো।' : "We'll check again shortly.");
      }
    } catch (err) {
      alert(
        'Could Not Check Status',
        err?.message || 'Please try again shortly.'
      );
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header (.sp-head, Payment 3 of 3) */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable
            onPress={() => navigation?.navigate?.('CourseDetail', { courseId })}
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={isBn ? 'কোর্সে ফিরে যান' : 'Back to course'}
          >
            <BackIcon size={24} />
          </Pressable>
          <View style={styles.headerTextStack}>
            <Text style={styles.title}>{isBn ? 'পেমেন্ট স্ট্যাটাস' : 'Payment status'}</Text>
            <Text style={styles.stepIndicator}>
              {isBn ? 'পেমেন্ট ' : 'Payment '}
              <Text style={styles.stepCurrent}>{isBn ? '৩' : '3'}</Text>
              {isBn ? ' / ৩' : ' of 3'}
            </Text>
          </View>
        </View>
        <View style={styles.progressContainer} accessibilityRole="progressbar">
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.progressSegment, styles.progressSegmentFilled]} />
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.statusWrap}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Icon (.pay-status-ico) */}
        <View style={styles.statusIcon}>
          <HourglassIcon size={56} />
        </View>

        {/* Title + Lead */}
        <Text style={styles.statusTitle}>
          {isBn ? 'আমরা আপনার পেমেন্ট যাচাই করছি' : "We're checking your payment"}
        </Text>
        <Text style={styles.leadText}>
          {isBn
            ? 'সাধারণত কয়েক মিনিট লাগে। নিশ্চিত হওয়ার সঙ্গে সঙ্গে আপনার কোর্স নিজে থেকেই খুলে যাবে।'
            : "It usually takes just a few minutes. The moment it's confirmed, your course unlocks automatically."}
        </Text>

        {/* TrxID Recap Card (.pay-card) */}
        <View style={styles.payCard}>
          <Text style={styles.payLabel}>{isBn ? 'আপনার লেখা TrxID' : 'TrxID you entered'}</Text>
          <Text style={styles.payNum}>{trxId || '—'}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actionStack}>
          {/* Primary is going home, not re-checking: the course unlocks on its
              own once the payment clears, so making the student sit here
              tapping a status button is the wrong thing to ask of them. */}
          <Button
            title={isBn ? 'হোম পেজে ফিরে যান' : 'Go to home page'}
            variant="primary"
            size="lg"
            onPress={() => navigation?.navigate?.('Dashboard')}
          />
          <Pressable
            onPress={handleCheckStatus}
            disabled={isChecking}
            style={styles.ghostLink}
            accessibilityRole="button"
            accessibilityLabel={isBn ? 'আবার চেক করুন' : 'Check status'}
          >
            <Text style={styles.ghostText}>
              {isChecking ? (isBn ? 'যাচাই করছি…' : 'Checking…') : isBn ? 'আবার চেক করুন' : 'Check status'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => navigation?.navigate?.('CourseDetail', { courseId })}
            style={styles.ghostLink}
          >
            <Text style={styles.ghostText}>{isBn ? 'কোর্সে ফিরে যান' : 'Back to course'}</Text>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    backgroundColor: '#F0E7D8',
  },
  headerTextStack: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  stepIndicator: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary,
    marginTop: 2,
  },
  stepCurrent: {
    color: colors.primaryStrong,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 14,
    width: '100%',
  },
  progressSegment: {
    flex: 1,
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  progressSegmentFilled: {
    backgroundColor: colors.primary,
  },
  statusWrap: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 44,
    gap: 14,
  },
  statusIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.warningSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  leadText: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  payCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
    gap: 4,
    alignItems: 'center',
  },
  payLabel: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  payNum: {
    fontSize: 22,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  actionStack: {
    gap: 4,
    width: '100%',
    marginTop: 4,
  },
  ghostLink: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  ghostText: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
});
