import React, { useCallback, useEffect, useState } from 'react';
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
import { useAlert } from '../../../components/CustomAlert';
import Button from '../../../components/Button';
import { useUser } from '../../../contexts/UserContext';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';
import { SubjectIcon, iconForSubjectName, toBn } from '../../../lib/subjectIcons';
import { colors, radius } from '../../../theme/theme';

function BackIcon({ size = 24, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Chevron({ size = 22, color = colors.textTertiary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m9 6 6 6-6 6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function BoxIcon({ size = 40, color = colors.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 6.5 12 3l8 3.5v11L12 21l-8-3.5Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M4 6.5 12 10l8-3.5M12 10v11" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

function ClapperIcon({ size = 24, color = colors.textSecondary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m8 9 8-4v10l-8-4Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M5 17v3h14v-3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * TeacherCoursesScreen - Courses tab (teacher.html + owner.html
 * #/courses). One screen, role-aware: teacher sub ("Teachers can edit
 * the courses they're listed on") vs owner sub ("Owner — can edit any
 * course"); per-card chips (draft / editable / view-only for teachers;
 * draft / editable / OVERRIDE for owners); Edit vs View vs
 * Edit-override CTA; shared Free Videos row. Copy verbatim from both
 * prototypes.
 *
 * DATA IS REAL: courses + subjects (grouped client-side) + listed-set
 * from course_instructors (teacher) or everything (owner). Deliberate
 * deviations: enrolled counts OMITTED (not teacher-readable under RLS
 * — demo numbers would be fake); draft chip has no separate
 * view-only/draft combo text beyond the prototype's own combos;
 * Edit/View CTA → placeholder (CourseEditor comes later); Free Videos
 * row → placeholder.
 */
export default function TeacherCoursesScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { profile, session, isOwner } = useUser();
  const alert = useAlert();

  const [courses, setCourses] = useState([]);
  const [subjectsByCourse, setSubjectsByCourse] = useState({});
  const [listedIds, setListedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const isBn = lang === 'bn';
  const fmtNum = (n) => (isBn ? toBn(n) : String(n));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!session?.user?.id) {
        setCourses([]);
        setSubjectsByCourse({});
        setListedIds(new Set());
        return;
      }
      const { data: rows, error } = await supabase
        .from('courses')
        .select('id, title, price, is_published')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCourses(rows || []);

      const ids = (rows || []).map((c) => c.id);
      if (ids.length > 0) {
        const { data: subs, error: subError } = await supabase
          .from('subjects')
          .select('id, name, course_id')
          .in('course_id', ids)
          .order('order_index');
        if (subError) throw subError;
        const grouped = {};
        (subs || []).forEach((s) => {
          if (!grouped[s.course_id]) grouped[s.course_id] = [];
          grouped[s.course_id].push(s);
        });
        setSubjectsByCourse(grouped);
      }

      if (!isOwner) {
        const { data: links, error: linkError } = await supabase
          .from('course_instructors')
          .select('course_id')
          .eq('teacher_id', session.user.id);
        if (linkError) throw linkError;
        setListedIds(new Set((links || []).map((l) => l.course_id)));
      } else {
        setListedIds(new Set(ids));
      }
    } catch (err) {
      console.warn('TeacherCourses: could not load courses:', err?.message);
      setCourses([]);
      setSubjectsByCourse({});
      setListedIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, isOwner]);

  // Reload every time the Courses tab is focused — so a course created,
  // edited, or deleted in the editor is reflected the moment the user
  // returns here. (Previously it loaded once on mount and never refreshed,
  // which is why deleting "didn't work" visually.)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const comingSoon = (message) => {
    alert('', message);
  };

  // Create a fresh draft course, auto-list the creator as an instructor,
  // then open it in the editor. RLS allows INSERT by any approved
  // teacher/owner.
  const handleCreate = async () => {
    if (!session?.user?.id) {
      alert(isBn ? 'সেশন নেই' : 'No session', isBn ? 'আবার সাইন ইন করুন।' : 'Please sign in again.');
      return;
    }
    setCreating(true);
    try {
      // courses.group_id AND class_level_id are both NOT NULL — resolve real
      // rows to satisfy them. (A teacher's own profile.class_level_id is
      // always null, so it can't be used here.)
      const [{ data: groups }, { data: levels }] = await Promise.all([
        supabase.from('groups').select('id').order('order_index').limit(1),
        supabase.from('class_levels').select('id').order('order_index').limit(1),
      ]);
      const groupId = groups?.[0]?.id || null;
      const classLevelId = levels?.[0]?.id || null;

      const { data: course, error } = await supabase
        .from('courses')
        .insert({
          title: isBn ? 'নতুন কোর্স' : 'New course',
          price: 0,
          is_published: false,
          created_by: session.user.id,
          class_level_id: classLevelId,
          group_id: groupId,
        })
        .select('id')
        .single();
      if (error) throw error;

      // NOTE: do NOT insert course_instructors here. The DB trigger
      // trg_add_creator_instructor already adds the creator with
      // is_creator=true right after the course insert — a manual insert
      // duplicates it and trips the (course_id, teacher_id) unique
      // constraint. This was the root cause of the repeated
      // "duplicate key value violates unique constraint" error.

      navigation?.navigate?.('CourseEditor', { courseId: course.id });
    } catch (err) {
      alert(
        isBn ? 'কোর্স তৈরি হয়নি' : 'Could not create course',
        err?.message || (isBn ? 'আবার চেষ্টা করুন।' : 'Please try again.')
      );
    } finally {
      setCreating(false);
    }
  };

  const chipFor = (course) => {
    const draft = !course.is_published;
    if (isOwner) {
      if (draft) return { cls: styles.chipAmber, txt: isBn ? 'ড্রাফ্ট · চলমান' : 'Draft · in progress' };
      if (listedIds.has(course.id)) return { cls: styles.chipGreen, txt: isBn ? 'আপনি তালিকাভুক্ত · এডিটযোগ্য' : 'You are listed · editable' };
      return { cls: styles.chipGold, txt: isBn ? 'তালিকাভুক্ত নন · ওনার ওভাররাইড' : 'Not listed · Owner override' };
    }
    if (draft) {
      if (listedIds.has(course.id)) return { cls: styles.chipAmber, txt: isBn ? 'ড্রাফ্ট · চলমান' : 'Draft · in progress' };
      return { cls: styles.chipAmber, txt: isBn ? 'তালিকাভুক্ত নন · শুধু দেখা · ড্রাফ্ট' : 'View only · Draft' };
    }
    if (listedIds.has(course.id)) return { cls: styles.chipGreen, txt: isBn ? 'আপনি তালিকাভুক্ত · এডিটযোগ্য' : 'You are listed · editable' };
    return { cls: styles.chipMute, txt: isBn ? 'তালিকাভুক্ত নন · শুধু দেখা' : 'Not listed · view only' };
  };

  const ctaFor = (course) => {
    if (isOwner) {
      return listedIds.has(course.id)
        ? (isBn ? 'কোর্স এডিট করুন' : 'Edit course')
        : (isBn ? 'কোর্স এডিট করুন (ওনার ওভাররাইড)' : 'Edit course (Owner override)');
    }
    return listedIds.has(course.id)
      ? (isBn ? 'কোর্স এডিট করুন' : 'Edit course')
      : (isBn ? 'কোর্স দেখুন' : 'View course');
  };

  // A teacher only ever sees courses they're listed on — never a colleague's.
  // Owners see everything.
  const visibleCourses = isOwner ? courses : courses.filter((c) => listedIds.has(c.id));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header (.gen-head) */}
      <View style={styles.headRow}>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>{isBn ? 'কোর্স' : 'Courses'}</Text>
          <Text style={styles.headSub}>
            {isOwner
              ? (isBn ? 'মালিক — যেকোনো কোর্স এডিট করতে পারেন' : 'Owner — can edit any course')
              : (isBn ? 'আপনি যেসব কোর্সে তালিকাভুক্ত, সেগুলো এডিট করতে পারেন' : "Teachers can edit the courses they're listed on")}
          </Text>
        </View>
        <Pressable
          onPress={handleCreate}
          disabled={creating}
          style={({ pressed }) => [styles.createBtn, pressed && styles.createBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={isBn ? 'নতুন কোর্স' : 'New course'}
        >
          <Text style={styles.createBtnText}>{creating ? '…' : '+'}</Text>
        </Pressable>
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
          {/* Course Cards (#course-list → .course-card) */}
          {visibleCourses.map((c) => {
            const chip = chipFor(c);
            const subs = subjectsByCourse[c.id] || [];
            return (
              <View key={c.id} style={styles.card}>
                <View style={styles.cover}>
                  <Text style={[styles.coverChip, chip.cls]}>{chip.txt}</Text>
                  <BoxIcon size={40} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{c.title}</Text>
                  <View style={styles.subjRow}>
                    {subs.map((s) => (
                      <View key={s.id} style={styles.subjIco}>
                        <SubjectIcon icon={iconForSubjectName(s.name)} size={17} />
                      </View>
                    ))}
                  </View>
                  <Text style={styles.countLine}>
                    ৳ {fmtNum(c.price ?? 0)} · {fmtNum(subs.length)} {isBn ? 'বিষয়' : 'subjects'}
                  </Text>
                  <Button
                    title={ctaFor(c)}
                    variant="secondary"
                    size="md"
                    onPress={() => navigation?.navigate?.('CourseEditor', { courseId: c.id })}
                  />
                </View>
              </View>
            );
          })}

          {/* Free Videos Row (.row-card → free-videos) */}
          <Pressable
            onPress={() => navigation?.navigate?.('FreeVideos')}
            style={({ pressed }) => [styles.rowCard, pressed && styles.rowPressed]}
          >
            <View style={styles.rowIcon}>
              <ClapperIcon size={24} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{isBn ? 'ফ্রি ভিডিও' : 'Free Videos'}</Text>
              <Text style={styles.rowSub}>
                {isBn
                  ? 'কোর্স থেকে আলাদা · SSC/HSC · যেকোনো শিক্ষক এডিট করতে পারেন'
                  : 'Separate from courses · SSC/HSC · editable by any teacher'}
              </Text>
            </View>
            <BackIcon size={22} color={colors.textTertiary} />
          </Pressable>
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
  createBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnPressed: {
    backgroundColor: colors.primaryStrong,
  },
  createBtnText: {
    fontSize: 26,
    lineHeight: 30,
    color: colors.textInverse,
    fontFamily: 'HindSiliguri-SemiBold',
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
    gap: 16,
  },
  card: {
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.cardLg,
    backgroundColor: colors.surface,
  },
  cover: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverChip: {
    position: 'absolute',
    top: 12,
    left: 12,
    fontSize: 12,
    fontFamily: 'HindSiliguri-SemiBold',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  chipGreen: {
    color: colors.successDeep,
    backgroundColor: colors.surface,
  },
  chipAmber: {
    color: colors.warningPressed,
    backgroundColor: colors.surface,
  },
  chipMute: {
    color: colors.textSecondary,
    backgroundColor: colors.surface,
  },
  chipGold: {
    color: colors.secondaryPressed,
    backgroundColor: colors.surface,
  },
  cardBody: {
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 19,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  subjRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  subjIco: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#F6EADB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countLine: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  rowCard: {
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
  rowPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
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
});
