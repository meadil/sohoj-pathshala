import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
  Modal,
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
import { toBn } from '../../../lib/subjectIcons';
import { colors, radius } from '../../../theme/theme';

function CloseIcon({ size = 22, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6 6 18" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * CopyIcon — clipboard glyph for the one-click TrxID copy button.
 * Svg, not a unicode character (learn.md #4).
 */
function CopyIcon({ size = 16, color = colors.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 8h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * TeacherPaymentsOwner - Owner payments body (owner.html#/payments).
 * Pending-review cards (name + ৳ + TrxID + course · date + amber chip)
 * with Confirm (direct update) and Reject (modal with reason input →
 * update + rejection_reason), all-payments list with status chips,
 * receiving-numbers form (real payment_settings singleton read +
 * owner-only update). Copy verbatim from owner.html.
 *
 * Writes require an owner session (UPDATE is owner-only per RLS).
 * Without one the lists render empty and saves fail honestly.
 */
export default function TeacherPaymentsOwner() {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { session } = useUser();
  const alert = useAlert();

  const [pending, setPending] = useState([]);
  const [allRows, setAllRows] = useState([]);
  // student_id -> display name, resolved separately so a profiles RLS
  // restriction degrades to the course title instead of breaking the list.
  const [names, setNames] = useState({});
  const [bkash, setBkash] = useState('');
  const [nagad, setNagad] = useState('');
  const [howpayUrl, setHowpayUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [actingTrx, setActingTrx] = useState(null);
  const [savingNumbers, setSavingNumbers] = useState(false);
  const [rejectRow, setRejectRow] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const isBn = lang === 'bn';
  const fmtNum = (n) => (isBn ? toBn(n) : String(n));

  // One-click TrxID copy. The owner then opens the bKash/Nagad app and
  // searches by that ID — no retyping, no misread digits.
  // RN core Clipboard is deprecated but still present and works in Expo Go
  // without a native rebuild; expo-clipboard is not installed.
  const copyTrx = (trxId) => {
    try {
      Clipboard.setString(trxId);
      alert(
        isBn ? 'কপি হয়েছে' : 'Copied',
        isBn
          ? `${trxId} কপি হয়েছে। এখন bKash/Nagad অ্যাপে গিয়ে খুঁজুন।`
          : `${trxId} copied. Now search for it in your bKash/Nagad app.`
      );
    } catch (e) {
      alert(isBn ? 'কপি হয়নি' : 'Could not copy', trxId);
    }
  };

  const load = async () => {
    try {
      const { data, error } = await supabase
        .from('course_purchases')
        .select('id, student_id, amount, trx_id, status, created_at, payer_number, courses(title)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = data || [];
      setPending(rows.filter((r) => r.status === 'pending'));
      setAllRows(rows);

      // Resolve payer names in one isolated query. If profiles is not
      // owner-readable this warns and the cards fall back to the course
      // title — the payment list itself is unaffected.
      const ids = [...new Set(rows.map((r) => r.student_id).filter(Boolean))];
      if (ids.length > 0) {
        try {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', ids);
          const map = {};
          (profs || []).forEach((p) => { map[p.id] = p.name; });
          setNames(map);
        } catch (e) {
          console.warn('OwnerPayments: could not load payer names:', e?.message);
        }
      }
    } catch (err) {
      console.warn('OwnerPayments: could not load payments:', err?.message);
      setPending([]);
      setAllRows([]);
    }
  };

  const loadNumbers = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('bkash_number, nagad_number, how_to_pay_video_url')
        .eq('id', 1)
        .single();
      if (error) throw error;
      setBkash(data?.bkash_number || '');
      setNagad(data?.nagad_number || '');
      setHowpayUrl(data?.how_to_pay_video_url || '');
    } catch (err) {
      console.warn('OwnerPayments: could not load numbers:', err?.message);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([load(), loadNumbers()]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const refresh = async () => {
    await load();
  };

  const handleConfirm = async (row) => {
    setActingTrx(row.trx_id);
    try {
      const { error } = await supabase
        .from('course_purchases')
        .update({ status: 'confirmed' })
        .eq('id', row.id);
      if (error) throw error;
      alert('', isBn ? 'পেমেন্ট নিশ্চিত' : 'Payment confirmed');
      await refresh();
    } catch (err) {
      alert(isBn ? 'নিশ্চিত করতে পারলাম না' : 'Could Not Confirm', err?.message || 'Please try again.');
    } finally {
      setActingTrx(null);
    }
  };

  const handleRejectSend = async () => {
    if (!rejectRow) return;
    setActingTrx(rejectRow.trx_id);
    try {
      const { error } = await supabase
        .from('course_purchases')
        .update({ status: 'rejected', rejection_reason: rejectReason.trim() || null })
        .eq('id', rejectRow.id);
      if (error) throw error;
      setRejectRow(null);
      setRejectReason('');
      alert('', isBn ? 'পেমেন্ট বাতিল' : 'Payment rejected');
      await refresh();
    } catch (err) {
      alert(isBn ? 'বাতিল করতে পারলাম না' : 'Could Not Reject', err?.message || 'Please try again.');
    } finally {
      setActingTrx(null);
    }
  };

  const handleSaveNumbers = async () => {
    setSavingNumbers(true);
    try {
      const { error } = await supabase
        .from('payment_settings')
        .update({
          bkash_number: bkash.trim(),
          nagad_number: nagad.trim(),
          how_to_pay_video_url: howpayUrl.trim() || null,
        })
        .eq('id', 1);
      if (error) throw error;
      alert('', isBn ? 'নাম্বার সংরক্ষণ হয়েছে।' : 'Numbers saved.');
    } catch (err) {
      alert(isBn ? 'সংরক্ষণ করতে পারলাম না' : 'Could Not Save', err?.message || 'Please try again.');
    } finally {
      setSavingNumbers(false);
    }
  };

  const statusChip = (status) => {
    if (status === 'confirmed') {
      return { cls: styles.chipGreen, txt: isBn ? 'নিশ্চিত' : 'Confirmed' };
    }
    if (status === 'rejected') {
      return { cls: styles.chipRed, txt: isBn ? 'বাতিল' : 'Rejected' };
    }
    return { cls: styles.chipAmber, txt: isBn ? 'অপেক্ষমাণ' : 'Pending' };
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headRow}>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>{isBn ? 'পেমেন্ট' : 'Payments'}</Text>
          <Text style={styles.headSub}>{isBn ? 'শুধু মালিক' : 'Owner only'}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Pending Review (.pay-rows) */}
          <View style={styles.section}>
            <Text style={styles.secTitle}>{isBn ? 'পর্যালোচনার অপেক্ষায়' : 'Pending review'}</Text>
            {pending.length === 0 ? (
              <Text style={styles.emptyMark}>—</Text>
            ) : (
              pending.map((p) => (
                <View key={p.id} style={styles.payCard}>
                  <View style={styles.payTopRow}>
                    <Text style={styles.payName}>
                      {names[p.student_id] || p.courses?.title || '—'}
                    </Text>
                    <Text style={styles.payAmt}>৳ {fmtNum(p.amount ?? 0)}</Text>
                  </View>
                  <View style={styles.payTrxRow}>
                    {!!p.trx_id && (
                      <Text style={styles.payTrx}>TrxID {p.trx_id}</Text>
                    )}
                    {!!p.trx_id && (
                      <Pressable
                        onPress={() => copyTrx(p.trx_id)}
                        style={styles.copyBtn}
                        accessibilityRole="button"
                        accessibilityLabel={isBn ? 'TrxID কপি করুন' : 'Copy TrxID'}
                      >
                        <CopyIcon size={15} color={colors.primary} />
                        <Text style={styles.copyBtnText}>{isBn ? 'কপি' : 'Copy'}</Text>
                      </Pressable>
                    )}
                  </View>
                  <View style={styles.payMetaRow}>
                    <Text style={styles.payMeta}>
                      {(p.courses?.title || '') + (p.created_at ? ` · ${new Date(p.created_at).toLocaleDateString()}` : '')}
                    </Text>
                    <Text style={[styles.chip, styles.chipAmber]}>
                      {isBn ? 'অপেক্ষমাণ' : 'Pending'}
                    </Text>
                  </View>
                  <View style={styles.payActions}>
                    <View style={styles.payActionHalf}>
                      <Button
                        title={isBn ? 'নিশ্চিত করুন' : 'Confirm'}
                        variant="primary"
                        size="md"
                        loading={actingTrx === p.trx_id}
                        onPress={() => handleConfirm(p)}
                      />
                    </View>
                    <View style={styles.payActionHalf}>
                      <Button
                        title={isBn ? 'বাতিল করুন' : 'Reject'}
                        variant="ghost"
                        size="md"
                        onPress={() => {
                          setRejectRow(p);
                          setRejectReason('');
                        }}
                      />
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* All Payments (.ph-wrap) */}
          <View style={styles.section}>
            <Text style={styles.secTitle}>{isBn ? 'সব পেমেন্ট' : 'All payments'}</Text>
            {allRows.map((p) => {
              const chip = statusChip(p.status);
              return (
                <View key={p.id} style={styles.phCard}>
                  <View style={styles.phBody}>
                    <Text style={styles.phSeq}>{p.courses?.title || '—'}</Text>
                    <Text style={styles.phDate}>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                    </Text>
                  </View>
                  <Text style={[styles.chip, chip.cls]}>{chip.txt}</Text>
                  <Text style={styles.phAmt}>৳ {fmtNum(p.amount ?? 0)}</Text>
                </View>
              );
            })}
          </View>

          {/* Receiving Numbers (.ed-panel) */}
          <View style={styles.panel}>
            <Text style={styles.secTitle}>{isBn ? 'রিসিভিং নাম্বার' : 'Receiving numbers'}</Text>
            <Text style={styles.helperText}>
              {isBn
                ? 'গ্লোবাল — প্রতিটি কোর্স কেনার পেজে দেখানো হয়।'
                : 'Global — shown on every course buy page.'}
            </Text>
            <View style={styles.field}>
              <Text style={styles.label}>bKash</Text>
              <TextInput
                style={styles.input}
                value={bkash}
                onChangeText={setBkash}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Nagad</Text>
              <TextInput
                style={styles.input}
                value={nagad}
                onChangeText={setNagad}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>
                {isBn ? 'কীভাবে পেমেন্ট করবেন — ভিডিও লিংক' : 'How-to-pay video link'}
              </Text>
              <TextInput
                style={styles.input}
                value={howpayUrl}
                onChangeText={setHowpayUrl}
                placeholder="https://www.youtube.com/watch?v=..."
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
            <Button
              title={isBn ? 'নাম্বার সংরক্ষণ করুন' : 'Save numbers'}
              variant="secondary"
              size="lg"
              loading={savingNumbers}
              onPress={handleSaveNumbers}
            />
            <Text style={styles.note}>
              {isBn
                ? 'এসব নাম্বার দলের বাইরে শেয়ার করবেন না।'
                : 'Do not share these numbers outside the team.'}
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Rejection Modal (#rej-modal) */}
      <Modal
        visible={!!rejectRow}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectRow(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>
                {isBn ? 'পেমেন্ট বাতিল করুন' : 'Reject payment'}
              </Text>
              <Pressable
                onPress={() => setRejectRow(null)}
                style={styles.modalClose}
                accessibilityRole="button"
                accessibilityLabel={isBn ? 'বন্ধ করুন' : 'Close'}
              >
                <CloseIcon />
              </Pressable>
            </View>
            <Text style={styles.modalHint}>
              {isBn
                ? 'কারণ জানান — ছাত্রের পেমেন্ট হিস্ট্রিতে কারণটি দেখানো হয়।'
                : 'Tell the student why — the reason is shown in their payment history.'}
            </Text>
            <TextInput
              style={[styles.input, styles.area]}
              placeholder={isBn ? 'কারণ (ছাত্রকে দেখানো হবে)…' : 'Reason (shown to the student)…'}
              placeholderTextColor={colors.textTertiary}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={styles.modalActions}>
              <View style={styles.modalActionHalf}>
                <Button
                  title={isBn ? 'বাতিল' : 'Cancel'}
                  variant="secondary"
                  size="md"
                  onPress={() => setRejectRow(null)}
                />
              </View>
              <View style={styles.modalActionHalf}>
                <Button
                  title={isBn ? 'বাতিলকরণ পাঠান' : 'Send rejection'}
                  variant="primary"
                  size="md"
                  loading={!!rejectRow && actingTrx === rejectRow.trx_id}
                  onPress={handleRejectSend}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headText: {
    gap: 2,
  },
  headTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  headSub: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 44,
    gap: 18,
  },
  section: {
    gap: 10,
  },
  secTitle: {
    fontSize: 17,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  emptyMark: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  payCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
    gap: 6,
  },
  payTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  payName: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  payAmt: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  payTrx: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  payTrxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  copyBtnText: {
    fontSize: 12,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
  payMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  payMeta: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  chip: {
    fontSize: 12,
    fontFamily: 'HindSiliguri-SemiBold',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  chipAmber: {
    color: colors.warningPressed,
    backgroundColor: colors.warningSubtle,
  },
  chipGreen: {
    color: colors.successDeep,
    backgroundColor: colors.successSubtle,
  },
  chipRed: {
    color: colors.danger,
    backgroundColor: colors.dangerSubtle,
  },
  payActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  payActionHalf: {
    flex: 1,
  },
  phCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  phBody: {
    flex: 1,
    gap: 2,
  },
  phSeq: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  phDate: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  phAmt: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  panel: {
    gap: 12,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 21,
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
  },
  area: {
    minHeight: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  note: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(29,29,31,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.cardLg,
    borderTopRightRadius: radius.cardLg,
    padding: 16,
    gap: 12,
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundMuted,
  },
  modalHint: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalActionHalf: {
    flex: 1,
  },
});
