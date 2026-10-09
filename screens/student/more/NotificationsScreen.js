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
import Svg, { Circle, Path } from 'react-native-svg';
import { useAlert } from '../../../components/CustomAlert';
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

// Type icons — visual mapping only (prototype used per-item demo
// icons): play for free videos, bolt for quiz windows, card for
// payment status, bell for announcements.
function TypeIcon({ type, size = 26, color = colors.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {type === 'free_video' && (
        <>
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.8} />
          <Path d="M10 8.5v7l6-3.5Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        </>
      )}
      {(type === 'quiz_window' || type === 'quiz_reminder_1h' || type === 'quiz_reminder_30m') && (
        <Path d="M13 3 5.5 13.5H11l-1 7.5 7.5-11H11Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      )}
      {type === 'payment_status' && (
        <>
          <Path d="M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
          <Path d="M4 9.5h16M8.5 15h5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </>
      )}
      {(type === 'announcement' || !type) && (
        <>
          <Path d="M6 16v-4.5a6 6 0 0 1 12 0V16l1.5 2.5h-15Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
          <Path d="M10 20.5a2.2 2.2 0 0 0 4 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

/**
 * NotificationsScreen - Notifications list (scr-notifications).
 * Matches index.html: gen-head (back → More, "Notifications"),
 * notification cards (icon + title + body + time). Header copy
 * verbatim (notifTitle).
 *
 * Rows are REAL notifications for the student (own rows only), newest
 * first — the prototype's hardcoded NOTIFS demo entries are NOT
 * reproduced. Tapping marks read_at (real update) and routes by type:
 * payment_status → PaymentHistory; quiz_reminder_1h/30m → WeeklyQuiz
 * (cross-tab); free_video / quiz_window / announcement targets are
 * unbuilt → placeholder alert. Empty list renders the section quietly
 * (prototype has no empty-state copy).
 */
export default function NotificationsScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { session } = useUser();
  const alert = useAlert();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const isBn = lang === 'bn';
  const months = isBn ? MONTHS.bn : MONTHS.en;
  const fmtDate = (iso) => {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return '—';
    const toBnLocal = (n) => (isBn ? toBn(n) : String(n));
    return `${toBnLocal(dt.getDate())} ${months[dt.getMonth()]}`;
  };

  const load = async () => {
    try {
      if (!session?.user?.id) {
        setRows([]);
        return;
      }
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, body, related_id, read_at, created_at')
        .eq('student_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.warn('Notifications: could not load:', err?.message);
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

  const handleTap = async (n) => {
    if (!n.read_at && session?.user?.id) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', n.id);
        if (error) throw error;
        setRows((prev) => prev.map((r) => (r.id === n.id ? { ...r, read_at: new Date().toISOString() } : r)));
      } catch (err) {
        console.warn('Notifications: could not mark read:', err?.message);
      }
    }
    if (n.type === 'payment_status') {
      navigation?.navigate?.('PaymentHistory');
      return;
    }
    if (n.type === 'quiz_reminder_1h' || n.type === 'quiz_reminder_30m') {
      navigation?.navigate?.('Dashboard', { screen: 'WeeklyQuiz' });
      return;
    }
    alert('', isBn ? 'এই নোটিফিকেশনের আলাদা পেজ নেই।' : 'This notification has no separate page.');
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
          <Text style={styles.headTitle}>{isBn ? 'বিজ্ঞপ্তি' : 'Notifications'}</Text>
        </View>
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
          {/* Notification Cards (.notif-list → .notif-card) */}
          {rows.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => handleTap(n)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.cardIcon}>
                <TypeIcon type={n.type} size={26} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{n.title}</Text>
                {!!n.body && <Text style={styles.cardSub}>{n.body}</Text>}
              </View>
              <View style={styles.cardSide}>
                <Text style={styles.cardTime}>{fmtDate(n.created_at)}</Text>
                {!n.read_at && <View style={styles.unreadDot} />}
              </View>
            </Pressable>
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
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  cardPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  cardSub: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  cardSide: {
    alignItems: 'flex-end',
    gap: 6,
  },
  cardTime: {
    fontSize: 12,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});
