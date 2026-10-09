import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
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

function ArrowRight({ size = 22, color = '#FFFFFF', strokeWidth = 2.4 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
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
 * PayTrxIDScreen - Payment step 2 of 3 (scr-pay-trxid).
 * Matches index.html: sp-head (back → PayIntro, "Payment 2 of 3",
 * 3-segment progress), lead, TrxID field (label/placeholder/helper),
 * reminder pay-card with the REAL bKash number, primary CTA
 * "Submit & verify", ghost "One step back" link. Copy verbatim.
 *
 * Submit inserts a REAL course_purchases row (student_id, course_id,
 * amount = course price, trx_id, status 'pending') then → PayPending.
 * No payer_phone input exists in the prototype, so none is invented —
 * payer_number is omitted from the insert (surfaces as a real error if
 * the column ever becomes required). TrxID is uppercased (bKash codes
 * are uppercase alphanumerics) and required non-empty. Bypass
 * (no session): insert skipped with warn, still advances to Pending.
 */
export default function PayTrxIDScreen({ navigation, route }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { session } = useUser();
  const alert = useAlert();

  const paramCourseId = route?.params?.courseId || null;
  // Deep-link entry (payment/:trxId) carries no courseId — resolve it
  // from the student's own purchase row by TrxID.
  const paramTrxId = route?.params?.trxId || null;

  const [courseId, setCourseId] = useState(paramCourseId);
  const [trxId, setTrxId] = useState(paramTrxId || '');
  const [price, setPrice] = useState(null);
  const [bkashNumber, setBkashNumber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBn = lang === 'bn';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        let activeCourseId = paramCourseId;
        if (!activeCourseId && paramTrxId && session?.user?.id) {
          const { data: found, error: findError } = await supabase
            .from('course_purchases')
            .select('course_id')
            .eq('student_id', session.user.id)
            .eq('trx_id', paramTrxId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          if (findError) throw findError;
          activeCourseId = found?.course_id || null;
          if (!cancelled && activeCourseId) {
            setCourseId(activeCourseId);
          }
        }
        if (activeCourseId) {
          const { data: row, error: courseError } = await supabase
            .from('courses')
            .select('price')
            .eq('id', activeCourseId)
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
        console.warn('PayTrxID: could not load payment info:', err?.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [paramCourseId, paramTrxId, session?.user?.id]);

  const handleSubmit = async () => {
    const code = trxId.trim().toUpperCase();
    if (!code) {
      alert(
        isBn ? 'TrxID প্রয়োজন' : 'TrxID Required',
        isBn
          ? 'তোমার bKash TrxID লিখো।'
          : 'Please enter your bKash TrxID.'
      );
      return;
    }
    setTrxId(code);
    setIsSubmitting(true);
    try {
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      const { error } = await supabase.from('course_purchases').insert({
        student_id: session.user.id,
        course_id: courseId,
        amount: price ?? 0,
        trx_id: code,
        status: 'pending',
      });
      if (error) throw error;
      navigation?.navigate?.('PayPending', { courseId, trxId: code });
    } catch (err) {
      if (isNoSessionError(err)) {
        // TEMP DEV BYPASS (see STATUS.md): no live session — skip the
        // insert, still advance so the flow stays reviewable.
        console.warn('TEMP DEV BYPASS: no live session, skipping purchase insert:', err?.message);
        navigation?.navigate?.('PayPending', { courseId, trxId: code });
      } else {
        alert(
          'Could Not Submit',
          err?.message || 'Could not submit the TrxID. Please try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header (.sp-head, Payment 2 of 3) */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable
            onPress={() => navigation?.goBack?.()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={isBn ? 'পেমেন্টে ফিরে যান' : 'Back to payment'}
          >
            <BackIcon size={24} />
          </Pressable>
          <View style={styles.headerTextStack}>
            <Text style={styles.title}>{isBn ? 'TrxID দিন' : 'Enter TrxID'}</Text>
            <Text style={styles.stepIndicator}>
              {isBn ? 'পেমেন্ট ' : 'Payment '}
              <Text style={styles.stepCurrent}>{isBn ? '২' : '2'}</Text>
              {isBn ? ' / ৩' : ' of 3'}
            </Text>
          </View>
        </View>
        <View style={styles.progressContainer} accessibilityRole="progressbar">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.progressSegment, i < 2 && styles.progressSegmentFilled]}
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
        ) : (
          <>
            {/* Lead (.sp-lead) */}
            <Text style={styles.leadText}>
              {isBn
                ? 'টাকা পাঠানোর পর যে bKash TrxID পেয়েছেন সেটি এখানে লিখুন।'
                : 'Paste the bKash TrxID you received after sending the money.'}
            </Text>

            {/* TrxID Field (.od-field, .sp-fld) */}
            <View style={styles.field}>
              <Text style={styles.label}>{isBn ? 'বিকাশ TrxID' : 'bKash TrxID'}</Text>
              <TextInput
                style={styles.input}
                placeholder={isBn ? 'যেমন: 9XH7K2L4M' : 'e.g. 9XH7K2L4M'}
                placeholderTextColor={colors.textTertiary}
                value={trxId}
                onChangeText={setTrxId}
                autoCapitalize="characters"
                autoComplete="off"
              />
              <Text style={styles.helperText}>
                {isBn
                  ? 'বিকাশ হিস্ট্রিতে ১০ অক্ষরের কোডটি পাবেন।'
                  : 'Find it inside your bKash history as a 10-character code.'}
              </Text>
            </View>

            {/* Reminder Card (.pay-card) */}
            <View style={styles.payCard}>
              <Text style={styles.payLabel}>{isBn ? 'টাকা পাঠান এই নম্বরে' : 'Send money to'}</Text>
              <Text style={styles.payNum}>{bkashNumber || '—'}</Text>
              <Text style={styles.payVia}>
                {isBn ? 'বিকাশ পার্সোনাল · সেন্ডিং ফি নেই' : 'bKash Personal · no sending fee'}
              </Text>
            </View>

            {/* Primary CTA */}
            <View style={styles.ctaWrapper}>
              <Button
                title={isBn ? 'জমা দিন ও যাচাই করুন' : 'Submit & verify'}
                variant="primary"
                size="lg"
                loading={isSubmitting}
                onPress={handleSubmit}
                rightIcon={<ArrowRight size={22} color="#FFFFFF" strokeWidth={2.4} />}
              />
            </View>

            {/* Ghost Link */}
            <Pressable
              onPress={() => navigation?.goBack?.()}
              style={styles.ghostLink}
            >
              <Text style={styles.ghostText}>{isBn ? 'এক ধাপ পেছনে' : 'One step back'}</Text>
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
  leadText: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
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
    letterSpacing: 1,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
    marginTop: 2,
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
  ctaWrapper: {
    marginTop: 12,
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
