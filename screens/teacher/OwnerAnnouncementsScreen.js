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
import Button from '../../components/Button';
import { useAlert } from '../../components/CustomAlert';
import { useUser } from '../../contexts/UserContext';
import { supabase } from '../../lib/supabase';
import { getClassLevelId } from '../../lib/classLevel';
import { toBn } from '../../lib/subjectIcons';
import { colors, radius } from '../../theme/theme';

function BackIcon({ size = 22, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 6l-6 6 6 6" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SendIcon({ size = 22, color = '#FFFFFF', strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12 20 4l-4 17-4-6-4-3Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Path d="M12 15 20 4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

// 6 UI targets → announcements rows. Mapping is interpretive (the
// prototype demo never persisted): course-buyer targets use
// target_type='course' + the course id; level-wide targets use
// target_type='class_level' + the level id; the rest map 1:1 onto the
// verified target_type check ('free', 'all'). See STATUS.md.
const TARGETS = [
  { key: 'course-ssc', titleBn: 'এসএসসি সায়েন্সের ছাত্ররা', titleEn: 'SSC Science students' },
  { key: 'course-hsc', titleBn: 'এইচএসসি সায়েন্সের ছাত্ররা', titleEn: 'HSC Science students' },
  { key: 'level-ssc', titleBn: 'সব এসএসসি ছাত্র', titleEn: 'All SSC students' },
  { key: 'level-hsc', titleBn: 'সব এইচএসসি ছাত্র', titleEn: 'All HSC students' },
  { key: 'free', titleBn: 'ফ্রি ছাত্ররা', titleEn: 'Free students' },
  { key: 'all', titleBn: 'সবাই', titleEn: 'Everyone' },
];

/**
 * OwnerAnnouncementsScreen - Send announcement (owner.html
 * #/announcements). Gen-head (back → More, title + sub + Owner-only
 * chip), Send-to target picker (6 options verbatim), message field
 * with hint, Send CTA. Copy verbatim.
 *
 * Send inserts a REAL announcements row; the fanout_announcement
 * trigger fans out notifications server-side (verified in schema
 * ref). The {n} recipient count in the verbatim sentToast is filled
 * with a best-effort real head-count (class rosters / confirmed
 * buyers / free-pool estimate, all owner-readable); failures there
 * never block the send itself.
 */
export default function OwnerAnnouncementsScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { session } = useUser();
  const alert = useAlert();

  const [targetIndex, setTargetIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const isBn = lang === 'bn';
  const fmtNum = (n) => (isBn ? toBn(n) : String(n));

  const resolveTarget = async () => {
    const key = TARGETS[targetIndex].key;
    if (key === 'free') {
      return { target_type: 'free', target_course_id: null, target_class_level_id: null };
    }
    if (key === 'all') {
      return { target_type: 'all', target_course_id: null, target_class_level_id: null };
    }
    if (key === 'level-ssc' || key === 'level-hsc') {
      const levelId = await getClassLevelId(key === 'level-ssc' ? 'SSC' : 'HSC');
      return { target_type: 'class_level', target_course_id: null, target_class_level_id: levelId };
    }
    const levelId = await getClassLevelId(key === 'course-ssc' ? 'SSC' : 'HSC');
    const { data: course, error } = await supabase
      .from('courses')
      .select('id')
      .eq('class_level_id', levelId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();
    if (error) throw error;
    return { target_type: 'course', target_course_id: course.id, target_class_level_id: null };
  };

  const estimateRecipients = async (target) => {
    try {
      if (target.target_type === 'all') {
        const { count, error } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'student');
        if (error) throw error;
        return count || 0;
      }
      if (target.target_type === 'class_level' && target.target_class_level_id) {
        const { count, error } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'student')
          .eq('class_level_id', target.target_class_level_id);
        if (error) throw error;
        return count || 0;
      }
      if (target.target_type === 'course' && target.target_course_id) {
        const { count, error } = await supabase
          .from('course_purchases')
          .select('id', { count: 'exact', head: true })
          .eq('course_id', target.target_course_id)
          .eq('status', 'confirmed');
        if (error) throw error;
        return count || 0;
      }
      if (target.target_type === 'free') {
        const { data: confirmed, error } = await supabase
          .from('course_purchases')
          .select('student_id')
          .eq('status', 'confirmed');
        if (error) throw error;
        const buyers = new Set((confirmed || []).map((p) => p.student_id));
        const { data: students, error: studentError } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'student');
        if (studentError) throw studentError;
        return (students || []).filter((s) => !buyers.has(s.id)).length;
      }
    } catch (err) {
      console.warn('OwnerAnnouncements: recipient estimate failed:', err?.message);
    }
    return 0;
  };

  const handleSend = async () => {
    const text = message.trim();
    if (!text) {
      alert(
        isBn ? 'বার্তা প্রয়োজন' : 'Message Required',
        isBn ? 'অনুগ্রহ করে ঘোষণার বার্তা লিখো।' : 'Please write the announcement message.'
      );
      return;
    }
    if (!session?.user?.id) {
      alert('Not Signed In', 'Please sign in as the owner to send announcements.');
      return;
    }
    setIsSending(true);
    try {
      const target = await resolveTarget();
      const { error } = await supabase.from('announcements').insert({
        sender_id: session.user.id,
        target_type: target.target_type,
        target_course_id: target.target_course_id,
        target_class_level_id: target.target_class_level_id,
        message: text,
      });
      if (error) throw error;
      const count = await estimateRecipients(target);
      alert(
        '',
        isBn
          ? `ঘোষণা ${fmtNum(count)} জন ছাত্রের কাছে পাঠানো হয়েছে`
          : `Announcement sent to ${fmtNum(count)} students`
      );
      setMessage('');
    } catch (err) {
      alert(isBn ? 'পাঠাতে পারলাম না' : 'Could Not Send', err?.message || 'Please try again.');
    } finally {
      setIsSending(false);
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
          <Text style={styles.headTitle}>{isBn ? 'ঘোষণা' : 'Announcements'}</Text>
          <Text style={styles.headSub}>
            {isBn
              ? 'ছাত্রদের কাছে পুশ নোটিফিকেশন ও অ্যাপে বার্তা হিসেবে পৌঁছায়।'
              : 'Reaches students as a push notification and in-app message.'}
          </Text>
        </View>
        <Text style={styles.chipAmber}>{isBn ? 'শুধু মালিক' : 'Owner only'}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Target Picker (#ann-targets → .target-row) */}
        <View style={styles.section}>
          <Text style={styles.secTitle}>{isBn ? 'পাঠাবেন কার কাছে' : 'Send to'}</Text>
          <View style={styles.targetList}>
            {TARGETS.map((t, i) => {
              const selected = targetIndex === i;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTargetIndex(i)}
                  style={[
                    styles.targetRow,
                    selected && styles.targetRowOn,
                  ]}
                >
                  <Text style={styles.targetLabel}>
                    {isBn ? t.titleBn : t.titleEn}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Message Field (.sp-fld) */}
        <View style={styles.field}>
          <Text style={styles.label}>{isBn ? 'বার্তা' : 'Message'}</Text>
          <TextInput
            style={[styles.input, styles.area]}
            placeholder={isBn ? 'এখানে ঘোষণাটি লিখুন…' : 'Write your announcement here…'}
            placeholderTextColor={colors.textTertiary}
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <Text style={styles.helperText}>
            {isBn
              ? 'অ্যাপ ও নোটিফিকেশনে ছাত্রদের দেখানো হয়।'
              : 'Shown to students in the app and as a notification.'}
          </Text>
        </View>

        {/* Send CTA */}
        <Button
          title={isBn ? 'ঘোষণা পাঠান' : 'Send announcement'}
          variant="primary"
          size="lg"
          loading={isSending}
          onPress={handleSend}
          rightIcon={<SendIcon size={22} color="#FFFFFF" />}
        />
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
  headSub: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 44,
    gap: 16,
  },
  section: {
    gap: 10,
  },
  secTitle: {
    fontSize: 17,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  targetList: {
    gap: 8,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  targetRowOn: {
    borderColor: colors.primary,
    backgroundColor: '#FBEFE2',
  },
  targetLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
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
    minHeight: 110,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
});
