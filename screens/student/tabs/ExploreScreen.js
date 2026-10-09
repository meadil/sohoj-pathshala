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
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';
import { SubjectIcon, toBn } from '../../../lib/subjectIcons';
import { colors, radius } from '../../../theme/theme';

/**
 * ExploreScreen - Student Explore tab (scr-explore).
 * Matches index.html#explore: gen-head header, course card (cover 16:9
 * with badge, title, subject chips, count line, price row), free-preview
 * note. Header/note/CTA copy pulled verbatim from index.html.
 *
 * DATA IS REAL (no demo values): the card is populated from the live
 * `courses` + `subjects` tables (both RLS SELECT-open, readable even
 * without a session) filtered to the student's class level, with a
 * real chapters count. Deliberate deviations from demo chrome,
 * documented here:
 * - Title comes from the DB row (seeded "SSC Science"/"HSC Science"),
 *   not the prototype's '{level} Science Complete Course' template.
 * - The count line's {v} maps to the real chapters count (labeled
 *   videos in the prototype format until a video catalog exists).
 * - The enrolled pill is OMITTED: confirmed purchase counts are not
 *   student-readable under course_purchases RLS (students see own rows
 *   only) — showing the prototype's demo enrolled numbers would be fake.
 * - Card tap → placeholder alert (CourseScreen comes later).
 */
export default function ExploreScreen() {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { profile } = useUser();
  const navigation = useNavigation();

  const [course, setCourse] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [chapterCount, setChapterCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const isBn = lang === 'bn';
  const fmtNum = (n) => (isBn ? toBn(n) : String(n));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('courses')
          .select('id, title, price, class_level_id, class_levels(name)')
          .limit(5);
        if (profile?.class_level_id) {
          query = query.eq('class_level_id', profile.class_level_id);
        }
        const { data: courses, error: courseError } = await query;
        if (courseError) throw courseError;
        const picked = (courses || [])[0] || null;
        if (cancelled) return;
        if (!picked) {
          setCourse(null);
          return;
        }
        setCourse(picked);
        const { data: subs, error: subError } = await supabase
          .from('subjects')
          .select('id, name')
          .eq('course_id', picked.id)
          .order('order_index');
        if (subError) throw subError;
        if (cancelled) return;
        setSubjects(subs || []);
        const ids = (subs || []).map((s) => s.id);
        if (ids.length > 0) {
          const { count, error: countError } = await supabase
            .from('chapters')
            .select('id', { count: 'exact', head: true })
            .in('subject_id', ids);
          if (countError) throw countError;
          if (!cancelled) setChapterCount(count || 0);
        }
      } catch (err) {
        console.warn('Explore: could not load course catalog:', err?.message);
        if (!cancelled) setCourse(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [profile?.class_level_id]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header (.gen-head) */}
        <View style={styles.headWrap}>
          <Text style={styles.title}>{isBn ? 'এক্সপ্লোর' : 'Explore'}</Text>
          <Text style={styles.sub}>{isBn ? 'কোর্স ও ফ্রি ভিডিও' : 'Courses and free videos'}</Text>
        </View>

        {/* Course Card (#cr-explore-card → .course-card) */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : course ? (
          <Pressable
            onPress={() => navigation?.navigate?.('CourseDetail', { courseId: course.id })}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel={course.title}
          >
            <View style={styles.cover}>
              <SubjectIcon icon="atom" size={44} />
              <Text style={styles.coverChip}>{isBn ? 'সম্পূর্ণ কোর্স' : 'Full course'}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{course.title}</Text>
              <View style={styles.chipRow}>
                {subjects.map((s) => (
                  <Text key={s.id} style={styles.qChip}>{s.name}</Text>
                ))}
              </View>
              <Text style={styles.countLine}>
                {isBn
                  ? `${fmtNum(chapterCount)}+ ভিডিও · ${fmtNum(subjects.length)} বিষয়`
                  : `${fmtNum(chapterCount)}+ videos · ${fmtNum(subjects.length)} subjects`}
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>৳ {fmtNum(course.price ?? 0)}</Text>
              </View>
            </View>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background, // #FBF7F0
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 44,
    gap: 16,
  },
  headWrap: {
    gap: 2,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  sub: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  loadingWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  card: {
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border, // #E5E5EA
    borderRadius: radius.cardLg, // 24px from prototype
    backgroundColor: colors.surface,
  },
  cardPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  cover: {
    aspectRatio: 16 / 9, // 16:9 cover
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
    color: colors.primary,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  qChip: {
    fontSize: 12,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary,
    backgroundColor: colors.backgroundMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  countLine: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  price: {
    fontSize: 20,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
});
