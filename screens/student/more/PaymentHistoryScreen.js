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
import { MONTHS, toBn } from '../../../lib/subjectIcons';
import { colors, radius } from '../../../theme/theme';

function BackIcon({ size = 24, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * PaymentHistoryScreen - Payment history (scr-payment-history).
 * Matches index.html: gen-head (back → More, "Payment history"),
 * purchase cards (course title + date · status chip + TrxID ref +
 * ৳ amount), empty state verbatim. Copy verbatim.
 *
 * Rows are REAL course_purchases for the student (own rows only)
 * joined to course titles, newest first. Status chips use the
 * verbatim pending/confirmed labels; 'বাতিল'/'Rejected' has NO
 * prototype equivalent (demo only knew pending/confirmed) and is
 * flagged as the one invented label.
 */
export default function PaymentHistoryScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { session } = useUser();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const isBn = lang === 'bn';
  const fmtNum = (n) => (isBn ? toBn(n) : String(n));
  const months = isBn ? MONTHS.bn : MONTHS.en;
  const fmtDate = (iso) => {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return '—';
    return `${fmtNum(dt.getDate())} ${months[dt.getMonth()]}`;
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (!session?.user?.id) {
          if (!cancelled) setRows([]);
          return;
        }
        const { data, error } = await supabase
          .from('course_purchases')
          .select('id, amount, trx_id, status, created_at, courses(title)')
          .eq('student_id', session.user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!cancelled) setRows(data || []);
      } catch (err) {
        console.warn('PaymentHistory: could not load purchases:', err?.message);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // 'বাতিল'/'Rejected' has NO prototype equivalent (demo knew only
  // pending/confirmed) — kept deliberately so rejected rows are
  // labeled truthfully instead of blank/misfiled. Confirm with human.
  const statusLabel = (status) => {
    if (status === 'confirmed') return isBn ? 'নিশ্চিত' : 'Confirmed';
    if (status === 'pending') return isBn ? 'মুলতুবি' : 'Pending';
    return isBn ? 'বাতিল' : 'Rejected';
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header (.gen-head) */}
      <View style={styles.headRow}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={isBn ? 'আরও স্ক্রিনে ফিরে যান' : 'Back to More'}
        >
          <BackIcon size={24} />
        </Pressable>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>{isBn ? 'পেমেন্ট ইতিহাস' : 'Payment history'}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            {isBn
              ? 'এখনো কোনো পেমেন্ট নেই। পেমেন্ট ইতিহাস এখানে দেখা যাবে।'
              : 'No payments yet. Your payment history will appear here.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {/* Purchase Cards (.ph-wrap → .ph-card) */}
          {rows.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardBody}>
                <Text style={styles.cardSeq}>{r.courses?.title || '—'}</Text>
                <Text style={styles.cardDate}>
                  {fmtDate(r.created_at)} · {statusLabel(r.status)}
                </Text>
                {!!r.trx_id && (
                  <Text style={styles.cardRef}>
                    {isBn ? `TrxID: ${r.trx_id}` : `TrxID: ${r.trx_id}`}
                  </Text>
                )}
              </View>
              <Text style={styles.cardAmt}>৳ {fmtNum(r.amount ?? 0)}</Text>
            </View>
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardSeq: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  cardDate: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  cardRef: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  cardAmt: {
    fontSize: 18,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
});
