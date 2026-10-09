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
import Button from '../../../components/Button';
import { useAlert } from '../../../components/CustomAlert';
import { supabase } from '../../../lib/supabase';
import { toBn } from '../../../lib/subjectIcons';
import { colors, radius } from '../../../theme/theme';

function BackIcon({ size = 24, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ArrowRight({ size = 22, color = '#FFFFFF', strokeWidth = 2.4 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * PayIntroScreen - Payment step 1 of 3 (scr-pay-intro).
 * Matches index.html: sp-head (back → Course, "Payment 1 of 3",
 * 3-segment progress), course-fee card, send-money card (bKash number
 * from the live payment_settings singleton), numbered steps helper,
 * primary CTA → PayTrxID, ghost trouble-paying link. Copy verbatim.
 *
 * bKash number is REAL (payment_settings id 1, RLS SELECT-open). Amount
 * is the REAL course price. No demo '01711-000000' placeholder.
 */
export default function PayIntroScreen({ navigation, route }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const alert = useAlert();

  const courseId = route?.params?.courseId || null;

  const [price, setPrice] = useState(null);
  const [bkashNumber, setBkashNumber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const isBn = lang === 'bn';
  const fmtNum = (n) => (isBn ? toBn(n) : String(n));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (courseId) {
          const { data: row, error: courseError } = await supabase
            .from('courses')
            .select('price')
            .eq('id', courseId)
            .single();
          if (courseError) throw courseError;
          if (!cancelled) setPrice(row?.price ?? 0);
        }
        const { data: settings, error: settingsError } = await supabase
          .from('payment_settings')
          .select('bkash_number')
          .eq('id', 1)
          .single();
        if (settingsError) throw settingsError;
        if (!cancelled) setBkashNumber(settings?.bkash_number || null);
      } catch (err) {
        console.warn('PayIntro: could not load payment info:', err?.message);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [courseId, retryKey]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header (.sp-head, Payment 1 of 3) */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable
            onPress={() => navigation?.goBack?.()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={isBn ? 'কোর্সে ফিরে যান' : 'Back to course'}
          >
            <BackIcon size={24} />
          </Pressable>
          <View style={styles.headerTextStack}>
            <Text style={styles.title}>{isBn ? 'বিকাশে পেমেন্ট' : 'Pay via bKash'}</Text>
            <Text style={styles.stepIndicator}>
              {isBn ? 'পেমেন্ট ' : 'Payment '}
              <Text style={styles.stepCurrent}>{isBn ? '১' : '1'}</Text>
              {isBn ? ' / ৩' : ' of 3'}
            </Text>
          </View>
        </View>
        <View style={styles.progressContainer} accessibilityRole="progressbar">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.progressSegment, i < 1 && styles.progressSegmentFilled]}
            />
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : loadError ? (
          // Never display a ৳ 0 / — amount as if real: block + explain.
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>
              {isBn
                ? 'পেমেন্ট তথ্য লোড করা যায়নি। আবার চেষ্টা করো।'
                : 'Could not load payment info. Please try again.'}
            </Text>
            <Button
              title={isBn ? 'আবার চেষ্টা করো' : 'Try again'}
              variant="secondary"
              size="lg"
              onPress={() => {
                setLoadError(false);
                setLoading(true);
                setRetryKey((k) => k + 1);
              }}
            />
          </View>
        ) : (
          <>
            {/* Course Fee Card (.pay-card) */}
            <View style={styles.payCard}>
              <Text style={styles.payLabel}>{isBn ? 'কোর্স ফি' : 'Course fee'}</Text>
              <Text style={styles.payAmount}>৳ {fmtNum(price ?? 0)}</Text>
            </View>

            {/* Send Money Card (.pay-card) */}
            <View style={styles.payCard}>
              <Text style={styles.payLabel}>{isBn ? 'টাকা পাঠান এই নম্বরে' : 'Send money to'}</Text>
              <Text style={styles.payNum}>{bkashNumber || '—'}</Text>
              <Text style={styles.payVia}>
                {isBn ? 'বিকাশ পার্সোনাল · সেন্ডিং ফি নেই' : 'bKash Personal · no sending fee'}
              </Text>
            </View>

            {/* Steps Helper (.sp-helper) */}
            <Text style={styles.helper}>
              {isBn
                ? '১) বিকাশ খুলুন এবং উপরের নম্বরে কোর্স ফি পাঠান। ২) TrxID কপি করুন। ৩) পরের স্ক্রিনে সেটি বসান।'
                : '1) Open bKash and send the course fee to the number above. 2) Copy the TrxID. 3) Paste it on the next screen.'}
            </Text>

            {/* Primary CTA */}
            <Button
              title={isBn ? 'আমি টাকা পাঠিয়েছি' : "I've sent the money"}
              variant="primary"
              size="lg"
              onPress={() => navigation?.navigate?.('PayTrxID', { courseId })}
              rightIcon={<ArrowRight size={22} color="#FFFFFF" strokeWidth={2.4} />}
            />

            {/* Ghost Link */}
            <Pressable
              onPress={() =>
                alert('', isBn ? 'পেমেন্টে সমস্যা?' : 'Trouble paying?')
              }
              style={styles.ghostLink}
            >
              <Text style={styles.ghostText}>{isBn ? 'পেমেন্টে সমস্যা?' : 'Trouble paying?'}</Text>
            </Pressable>
          </>
        )}
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
    backgroundColor: '#EAE1D0',
  },
  progressSegmentFilled: {
    backgroundColor: colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 44,
    gap: 16,
  },
  errorWrap: {
    gap: 14,
    alignItems: 'center',
    paddingVertical: 24,
  },
  errorText: {
    fontSize: 15,
    lineHeight: 23,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  payCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
    gap: 4,
  },
  payLabel: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  payAmount: {
    fontSize: 26,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  payNum: {
    fontSize: 22,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  payVia: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  helper: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
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
