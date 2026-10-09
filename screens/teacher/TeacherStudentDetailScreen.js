import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { MONTHS, toBn } from '../../lib/subjectIcons';
import { colors, radius } from '../../theme/theme';

function BackIcon({ size = 22, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 6l-6 6 6 6" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * TeacherStudentDetailScreen - Student detail (teacher.html +
 * owner.html #/student-detail). Read-only: prof-card (initial + name
 * + course + status chip) and kv panel (phone, courses, enroll date,
 * guardian, status). All data arrives via route params from the
 * Students roster row (real get_course_students fields) — no re-query.
 * Copy verbatim from both prototypes (identical markup).
 */
export default function TeacherStudentDetailScreen({ navigation, route }) {
  const [lang] = useState('bn'); // 'bn' | 'en'

  const student = route?.params?.student || {};
  const isBn = lang === 'bn';
  const name = student.name || (isBn ? 'বন্ধু' : 'friend');

  // Roster rows carry ISO dates; format like the Students list does.
  const months = isBn ? MONTHS.bn : MONTHS.en;
  const fmtDate = (iso) => {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso || '—';
    const toBnLocal = (n) => (isBn ? toBn(n) : String(n));
    return `${toBnLocal(dt.getDate())} ${months[dt.getMonth()]}`;
  };
  const dateLabel = student.date ? fmtDate(student.date) : '—';

  const kv = (label, value) => (
    <View style={styles.kv}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header (.gen-head) */}
      <View style={styles.headRow}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={isBn ? 'শিক্ষার্থীদের কাছে ফিরে যান' : 'Back to Students'}
        >
          <BackIcon size={22} />
        </Pressable>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>{name}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card (.prof-card) */}
        <View style={styles.profCard}>
          <View style={styles.profAva}>
            <Text style={styles.profAvaLetter}>
              {((name || 'A').trim().charAt(0) || 'A').toUpperCase()}
            </Text>
          </View>
          <View style={styles.profText}>
            <Text style={styles.profName}>{name}</Text>
            {!!student.course && <Text style={styles.profSub}>{student.course}</Text>}
          </View>
          <Text style={[styles.chip, student.paid ? styles.chipGreen : styles.chipAmber]}>
            {student.paid ? (isBn ? 'পরিশোধিত' : 'Paid') : (isBn ? 'অপেক্ষমাণ' : 'Pending')}
          </Text>
        </View>

        {/* Detail Panel (.ed-panel → .kv rows) */}
        <View style={styles.panel}>
          {kv(isBn ? 'ফোন' : 'Phone', student.phone || '—')}
          {kv(isBn ? 'ভর্তি হওয়া কোর্স' : 'Enrolled course(s)', student.course || '—')}
          {kv(isBn ? 'ভর্তির তারিখ' : 'Enrolled on', dateLabel)}
          {kv(
            isBn ? 'পিতামাতা' : 'Parent/guardian',
            student.guardian || (isBn ? 'পিতামাতার তথ্য নেই' : 'No guardian on file')
          )}
          {kv(
            isBn ? 'পেমেন্ট স্ট্যাটাস' : 'Payment status',
            student.paid ? (isBn ? 'পরিশোধিত' : 'Paid') : (isBn ? 'অপেক্ষমাণ' : 'Pending')
          )}
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 44,
    gap: 16,
  },
  profCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  chip: {
    fontSize: 12,
    fontFamily: 'HindSiliguri-SemiBold',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
    gap: 12,
  },
  kv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  kvLabel: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  kvValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
    textAlign: 'right',
  },
});
