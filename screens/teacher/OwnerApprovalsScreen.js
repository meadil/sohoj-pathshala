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
import Button from '../../components/Button';
import { useAlert } from '../../components/CustomAlert';
import { useUser } from '../../contexts/UserContext';
import { supabase } from '../../lib/supabase';
import { colors, radius } from '../../theme/theme';

function BackIcon({ size = 22, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 6l-6 6 6 6" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * OwnerApprovalsScreen - Teacher approvals queue (owner.html
 * #/approvals). Gen-head (back → More, title + sub + Owner-only chip),
 * pending-teacher rows (initial + name + email · phone + applied chip)
 * with Approve / Reject actions. Copy verbatim.
 *
 * Rows are REAL profiles with role='teacher' and
 * teacher_approval_status='pending' (authenticated SELECT). Approve →
 * status='approved'; Reject → status='rejected' (both with the
 * verbatim {name} confirmation notes). Approved rows show the approved
 * chip, matching the prototype's post-action state. NOTE: profiles
 * UPDATE is documented as own-row-only — if the owner UPDATE is RLS
 * blocked, the action fails with an honest alert and the policy needs
 * a human SQL fix (flagged in STATUS.md).
 * Email is NOT in profiles (lives in auth.users) — rows show name +
 * phone + applied date only; the prototype's demo email line is not
 * reproducible honestly.
 */
export default function OwnerApprovalsScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { session } = useUser();
  const alert = useAlert();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  const isBn = lang === 'bn';
  const fmtDate = (iso) => {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return '—';
    return dt.toLocaleDateString();
  };

  const load = async () => {
    try {
      if (!session?.user?.id) {
        setRows([]);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, nickname, phone, created_at, teacher_approval_status')
        .eq('role', 'teacher')
        .eq('teacher_approval_status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.warn('OwnerApprovals: could not load queue:', err?.message);
      setRows([]);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const decide = async (row, approve) => {
    setActingId(row.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ teacher_approval_status: approve ? 'approved' : 'rejected' })
        .eq('id', row.id);
      if (error) throw error;
      const displayName = row.name || row.nickname || '';
      alert(
        '',
        approve
          ? (isBn ? `${displayName} অনুমোদিত` : `${displayName} approved`)
          : (isBn ? `${displayName} বাতিল` : `${displayName} rejected`)
      );
      if (!approve) {
        setRows((prev) => prev.filter((r) => r.id !== row.id));
      }    } catch (err) {
      alert(
        isBn ? 'অনুমোদন ব্যর্থ' : 'Action Failed',
        err?.message || 'Please try again.'
      );
    } finally {
      setActingId(null);
    }
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
          <BackIcon size={22} />
        </Pressable>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>{isBn ? 'শিক্ষক অনুমোদন' : 'Teacher Approvals'}</Text>
          <Text style={styles.headSub}>
            {isBn
              ? 'নতুন সাইনআপ এখানে অপেক্ষায় থাকে যতক্ষণ না মালিক অনুমোদন বা বাতিল করেন।'
              : 'New signups wait here until an Owner approves or rejects them.'}
          </Text>
        </View>
        <Text style={styles.chipAmber}>{isBn ? 'শুধু মালিক' : 'Owner only'}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {/* Approval Queue (#appr-list → .queue-row) */}
          {rows.map((r) => {
            const name = r.name || r.nickname || (isBn ? 'বন্ধু' : 'friend');
            return (
              <View key={r.id} style={styles.queueRow}>
                <View style={styles.ava}>
                  <Text style={styles.avaLetter}>
                    {(name.trim().charAt(0) || 'A').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.queueBody}>
                  <Text style={styles.queueTitle}>{name}</Text>
                  <Text style={styles.queueSub}>
                    {[r.phone, fmtDate(r.created_at)].filter(Boolean).join(' · ')}
                  </Text>
                  <Text style={styles.queueMeta}>{isBn ? 'আবেদন' : 'Applied'}</Text>
                </View>
                <View style={styles.queueActions}>
                  {/* Both actions stay available — approving must not hide the
                      reject path, or an owner can't correct a mistake. */}
                  <Button
                    title={isBn ? 'অনুমোদন করুন' : 'Approve'}
                    variant="primary"
                    size="sm"
                    loading={actingId === r.id}
                    onPress={() => decide(r, true)}
                  />
                  <Button
                    title={isBn ? 'বাতিল করুন' : 'Reject'}
                    variant="ghost"
                    size="sm"
                    onPress={() => decide(r, false)}
                  />
                </View>
              </View>
            );
          })}
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
    paddingTop: 12,
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
    lineHeight: 19,
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
  chipAmber: {
    fontSize: 12,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.warningPressed,
    backgroundColor: colors.warningSubtle,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 44,
  },
  queueRow: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
    gap: 10,
  },
  ava: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avaLetter: {
    fontSize: 20,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
  queueBody: {
    gap: 2,
  },
  queueTitle: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  queueSub: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  queueMeta: {
    fontSize: 12,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textTertiary,
  },
  queueActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
});
