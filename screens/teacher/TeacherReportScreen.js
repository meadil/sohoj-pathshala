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
import { useUser } from '../../contexts/UserContext';
import { supabase } from '../../lib/supabase';
import { toBn } from '../../lib/subjectIcons';
import { colors, radius } from '../../theme/theme';

function BackIcon({ size = 22, color = colors.textPrimary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 6l-6 6 6 6" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * TeacherReportScreen - Course report (teacher.html + owner.html
 * #/report). Gen-head (back → More, "Report" + scope sub), metric
 * grid, Most/Least watched lists, owner-only revenue-by-course
 * breakdown. Copy verbatim from both prototypes.
 *
 * VALUES ARE REAL: students = unique roster count via
 * get_course_students per scoped course; revenue = confirmed-purchase
 * sums (OWNER ONLY — teachers have zero payment-data access by schema
 * design, so teachers see no revenue card or breakdown); videos =
 * live CQ+MCQ counts; most/least = get_course_video_stats merged and
 * ranked (real view counts, no attention chips — no real rule for
 * them). Prototype demo numbers (1240, ৳3.1M, 124, 68%) are NOT
 * reproduced. Teacher scope = own listed courses; owner = all courses.
 */
export default function TeacherReportScreen({ navigation }) {
  const [lang] = useState('bn'); // 'bn' | 'en'
  const { session, isOwner } = useUser();

  const [courses, setCourses] = useState([]);
  const [studentCount, setStudentCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [revenueByCourse, setRevenueByCourse] = useState([]);
  const [videoCount, setVideoCount] = useState(0);
  const [mostWatched, setMostWatched] = useState([]);
  const [leastWatched, setLeastWatched] = useState([]);
  const [loading, setLoading] = useState(true);

  const isBn = lang === 'bn';
  const fmtNum = (n) => (isBn ? toBn(n) : String(n));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (!session?.user?.id) {
          return;
        }
        let scoped = [];
        if (isOwner) {
          const { data, error } = await supabase
            .from('courses')
            .select('id, title')
            .order('created_at', { ascending: true });
          if (error) throw error;
          scoped = data || [];
        } else {
          const { data: links, error } = await supabase
            .from('course_instructors')
            .select('course_id, courses(id, title)')
            .eq('teacher_id', session.user.id);
          if (error) throw error;
          scoped = (links || []).filter((l) => l.courses).map((l) => l.courses);
        }
        if (cancelled) return;
        setCourses(scoped);

        const studentIds = new Set();
        const allStats = [];
        const revenueRows = [];
        let videos = 0;
        for (const c of scoped) {
          try {
            const { data: roster, error: rosterError } = await supabase.rpc(
              'get_course_students',
              { p_course_id: c.id }
            );
            if (rosterError) throw rosterError;
            (roster || []).forEach((r, i) => {
              studentIds.add(r.phone || r.name || `${c.id}-${i}`);
            });
          } catch (rosterErr) {
            console.warn(`TeacherReport: roster unavailable for course ${c.id}:`, rosterErr?.message);
          }
          try {
            const { data: stats, error: statsError } = await supabase.rpc(
              'get_course_video_stats',
              { p_course_id: c.id }
            );
            if (statsError) throw statsError;
            (stats || []).forEach((s) => {
              allStats.push({ title: s.title, views: s.view_count || 0 });
            });
          } catch (statsErr) {
            console.warn(`TeacherReport: video stats unavailable for course ${c.id}:`, statsErr?.message);
          }
          if (isOwner) {
            try {
              const { data: confirmed, error: revError } = await supabase
                .from('course_purchases')
                .select('amount')
                .eq('course_id', c.id)
                .eq('status', 'confirmed');
              if (revError) throw revError;
              const total = (confirmed || []).reduce((n, p) => n + (p.amount || 0), 0);
              revenueRows.push({ title: c.title, total });
            } catch (revErr) {
              console.warn(`TeacherReport: revenue unreadable for course ${c.id}:`, revErr?.message);
            }
          }
          try {
            const { data: subs } = await supabase
              .from('subjects')
              .select('id')
              .eq('course_id', c.id);
            const ids = (subs || []).map((s) => s.id);
            if (ids.length > 0) {
              const { data: chaps } = await supabase
                .from('chapters')
                .select('id')
                .in('subject_id', ids);
              const chapIds = (chaps || []).map((ch) => ch.id);
              if (chapIds.length > 0) {
                const { count: cq } = await supabase
                  .from('cq_videos')
                  .select('id', { count: 'exact', head: true })
                  .in('chapter_id', chapIds);
                videos += cq || 0;
              }
            }
          } catch (vidErr) {
            console.warn(`TeacherReport: video count failed for course ${c.id}:`, vidErr?.message);
          }
          if (cancelled) return;
        }
        if (cancelled) return;
        setStudentCount(studentIds.size);
        setVideoCount(videos);
        const ranked = [...allStats].sort((a, b) => b.views - a.views);
        setMostWatched(ranked.slice(0, 3));
        setLeastWatched(ranked.slice(-3).reverse());
        if (isOwner) {
          setRevenue(revenueRows.reduce((n, r) => n + r.total, 0));
          setRevenueByCourse(revenueRows);
        }
      } catch (err) {
        console.warn('TeacherReport: could not load report:', err?.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, isOwner]);

  const repSub = isOwner
    ? (isBn
      ? 'সব কোর্সের সমন্বিত সংখ্যা। সাধারণ শিক্ষক শুধু নিজের কোর্স দেখবেন।'
      : 'Aggregated across all courses. A regular teacher would only see their own.')
    : courses.map((c) => c.title).join(' · ') ||
      (isBn ? 'আপনার কোর্সের সংখ্যা।' : "your course's numbers.");

  const metricCard = (value, label) => (
    <View style={styles.metricCard}>
      <Text style={styles.metricNum}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );

  const watchRow = (item, rank) => (
    <View key={`${item.title}-${rank}`} style={styles.watchRow}>
      <Text style={styles.watchRank}>{fmtNum(rank)}</Text>
      <Text style={styles.watchTitle}>{item.title}</Text>
      <Text style={styles.watchViews}>{fmtNum(item.views)}</Text>
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
          accessibilityLabel={isBn ? 'আরও স্ক্রিনে ফিরে যান' : 'Back to More'}
        >
          <BackIcon size={22} />
        </Pressable>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>{isBn ? 'রিপোর্ট' : 'Report'}</Text>
          {!!repSub && <Text style={styles.headSub}>{repSub}</Text>}
        </View>
        {isOwner && (
          <Text style={styles.chipGold}>{isBn ? 'মালিক' : 'Owner'}</Text>
        )}
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
          {/* Metric Grid (.metric-grid) */}
          <View style={styles.metricGrid}>
            {metricCard(fmtNum(studentCount), isBn ? 'মোট শিক্ষার্থী' : 'Total students')}
            {isOwner && metricCard(`৳ ${fmtNum(revenue)}`, isBn ? 'মোট আয়' : 'Total revenue')}
            {metricCard(fmtNum(videoCount), isBn ? 'প্রকাশিত ভিডিও' : 'Videos published')}
          </View>

          {/* Revenue By Course (owner only, .breakdown-list) */}
          {isOwner && revenueByCourse.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.secTitle}>{isBn ? 'কোর্স অনুযায়ী আয়' : 'Revenue by course'}</Text>
              <View style={styles.breakdownList}>
                {revenueByCourse.map((r) => (
                  <View key={r.title} style={styles.breakdownItem}>
                    <View style={styles.breakdownTop}>
                      <Text style={styles.breakdownName}>{r.title}</Text>
                      <Text style={styles.breakdownValue}>৳ {fmtNum(r.total)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Most Watched */}
          <View style={styles.section}>
            <Text style={styles.secTitle}>{isBn ? 'সবচেয়ে বেশি দেখা' : 'Most watched'}</Text>
            <View style={styles.watchList}>
              {mostWatched.map((item, i) => watchRow(item, i + 1))}
            </View>
          </View>

          {/* Least Watched */}
          <View style={styles.section}>
            <Text style={styles.secTitle}>{isBn ? 'সবচেয়ে কম দেখা' : 'Least watched'}</Text>
            <View style={styles.watchList}>
              {leastWatched.map((item, i) => watchRow(item, i + 1))}
            </View>
          </View>
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
  chipGold: {
    fontSize: 12,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.secondaryPressed,
    backgroundColor: colors.secondarySubtle,
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 44,
    gap: 18,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
    gap: 2,
  },
  metricNum: {
    fontSize: 22,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  metricLabel: {
    fontSize: 13,
    fontFamily: 'HindSiliguri-Regular',
    color: colors.textSecondary,
  },
  section: {
    gap: 10,
  },
  secTitle: {
    fontSize: 17,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  breakdownList: {
    gap: 10,
  },
  breakdownItem: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  breakdownTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  breakdownName: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  breakdownValue: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
  watchList: {
    gap: 10,
  },
  watchRow: {
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
  watchRank: {
    fontSize: 16,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textSecondary,
    minWidth: 20,
    textAlign: 'center',
  },
  watchTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.textPrimary,
  },
  watchViews: {
    fontSize: 14,
    fontFamily: 'HindSiliguri-SemiBold',
    color: colors.primary,
  },
});
