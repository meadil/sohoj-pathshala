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
import { useAlert } from '../../../components/CustomAlert';
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';
import { MONTHS, toBn } from '../../../lib/subjectIcons';
import { colors, radius } from '../../../theme/theme';

function Chevron({ size = 22, color = colors.textTertiary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m9 6 6 6-6 6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * TeacherStudentsScreen - Students tab (teacher.html + owner.html
 * #/students). One screen, role-aware: teacher sub ("Your course's
 * students", roster from own courses) vs owner sub ("Owner — all
 * students, app-wide", roster across all courses). Search filters the
 * loaded roster by name or phone. Rows (initial + name +
 * enrolled-date + paid/pending chip + chevron → StudentDetail).
 * Copy verbatim from both prototypes.
 *
 * DATA IS REAL: roster via the get_course_students(course_id) RPC
 * (verified security-definer, instructors/owner only) per course, with
 * the course title attached client-side. Purchase status comes from
 * the roster row itself (confirmed/paid → green, anything else amber).
 * StudentDetail is not built yet → rows show a placeholder alert.
 */
export default function TeacherStudentsScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { session, isOwner } = useUser();
  const alert = useAlert();

  const [query, setQuery] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const isBn = lang === 'bn';
  const months = isBn ? MONTHS.bn : MONTHS.en;

  // Client-side filter over the already-loaded roster. Matches name or
  // phone, case-insensitive, so a partial Bangla/English name or a phone
  // fragment both work.
  const q = query.trim().toLowerCase();
  const visibleRows = q
    ? rows.filter((s) =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q)
      )
    : rows;
  const fmtDate = (iso) => {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return '—';
    const toBnLocal = (n) => (isBn ? toBn(n) : String(n));
    return `${toBnLocal(dt.getDate())} ${months[dt.getMonth()]}`;
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
        let courseIds = [];
        if (isOwner) {
          const { data: courses, error } = await supabase
            .from('courses')
            .select('id, title');
          if (error) throw error;
          courseIds = (courses || []).map((c) => ({ id: c.id, title: c.title }));
        } else {
          const { data: links, error: linkError } = await supabase
            .from('course_instructors')
            .select('course_id, courses(id, title)')
            .eq('teacher_id', session.user.id);
          if (linkError) throw linkError;
          courseIds = (links || [])
            .filter((l) => l.courses)
            .map((l) => ({ id: l.courses.id, title: l.courses.title }));
        }
        const merged = [];
        for (const c of courseIds) {
          try {
            const { data: roster, error: rosterError } = await supabase.rpc(
              'get_course_students',
              { p_course_id: c.id }
            );
            if (rosterError) throw rosterError;
            (roster || []).forEach((r, i) => {
              merged.push({
                key: `${c.id}-${r.phone || r.name || i}`,
                name: r.name || (isBn ? 'বন্ধু' : 'friend'),
                phone: r.phone || '',
                guardian: r.guardian_name || '',
                course: c.title,
                date: r.enrolled_at || r.created_at || null,
                paid: r.status === 'confirmed' || r.status === 'paid' || r.purchase_status === 'confirmed',
              });
            });
          } catch (courseErr) {
            console.warn(`TeacherStudents: roster unavailable for course ${c.id}:`, courseErr?.message);
          }
          if (cancelled) return;
        }
        if (!cancelled) setRows(merged);
      } catch (err) {
        console.warn('TeacherStudents: could not load students:', err?.message);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, isOwner, isBn]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header (.gen-head) */}
      <View style={styles.headRow}>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>{isBn ? 'শিক্ষার্থীরা' : 'Students'}</Text>
          <Text style={styles.headSub}>
            {isOwner
              ? (isBn ? 'মালিক — সব শিক্ষার্থী, পুরো অ্যাপে' : 'Owner — all students, app-wide')
              : (isBn ? 'আপনার কোর্সের শিক্ষার্থীরা' : "Your course's students")}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search — filters the loaded roster by name or phone */}
        <View style={styles.field}>
          <TextInput
            style={styles.input}
            placeholder={isBn ? 'শিক্ষার্থী খুঁজুন…' : 'Search students…'}
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            accessibilityLabel={isBn ? 'শিক্ষার্থী খুঁজুন' : 'Search students'}
          />
          <Text style={styles.helperText}>
            {isBn
              ? 'নাম বা ফোন দিয়ে খুঁজুন — তালিকা ছেঁকে আসবে।'
              : 'Search by name or phone — the list filters as you type.'}
          </Text>
        </View>

        {/* Student Rows (#stu-list → .row-card) */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <View style={styles.list}>
            {visibleRows.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => navigation?.navigate?.('StudentDetail', { student: s })}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.ava}>
                  <Text style={styles.avaLetter}>
                    {((s.name || 'A').trim().charAt(0) || 'A').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{s.name}</Text>
                  <Text style={styles.rowSub}>
                    {isBn ? 'ভর্তি' : 'Enrolled'} · {s.date ? fmtDate(s.date) : '—'}
                  </Text>
                </View>
                <Text style={[styles.chip, s.paid ? styles.chipGreen : styles.chipAmber]}>
                  {s.paid ? (isBn ? 'পরিশোধিত' : 'Paid') : (isBn ? 'অপেক্ষমাণ' : 'Pending')}
                </Text>
                <Chevron size={22} />
              </Pressable>
            ))}
          </View>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 44,
    gap: 14,
  },
  field: {
    gap: 6,
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
  helperText: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  list: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  ava: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avaLetter: {
    fontSize: 18,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  rowSub: {
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
  chipGreen: {
    color: colors.successDeep,
    backgroundColor: colors.successSubtle,
  },
  chipAmber: {
    color: colors.warningPressed,
    backgroundColor: colors.warningSubtle,
  },
});
