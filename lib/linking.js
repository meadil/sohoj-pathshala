/**
 * Deep-linking map (React Navigation `linking` config).
 * Schemes are per-target in app.config.js (sohojpathshala / sohojshikkhok);
 * both prefixes are listed so one config serves either binary — only the
 * mounted tree ever matches. Route names MUST stay in sync with the
 * navigators (Student*Stack, Teacher*Stack, tab route names).
 *
 * Name collisions are avoided on purpose: teacher tabs share the
 * Dashboard/More route names with student tabs, so only the
 * teacher-unique tab routes (Courses, Students, Payments) are mapped;
 * teacher Dashboard/More have no link targets and need no paths.
 *
 * Deliberate omissions, documented:
 * - `verified` / PKCE auth links have NO route here: UserContext's
 *   Linking listener already consumes them via exchangeCodeForSession,
 *   and the root guards route by session/profile afterward. A separate
 *   verified screen would duplicate (and could misroute) that flow.
 * - Teacher `course/:id/content` has no distinct path: the single
 *   `course/:courseId` entry lands on the editor's Page tab.
 * - StudentDetail takes a full student object via params (not an id),
 *   so it has no path — deep links can't reconstruct it.
 * - Links resolving while logged out (or mid-onboarding) match no
 *   mounted screen and are ignored with a warning — by design.
 */
export const linking = {
  prefixes: ['sohojpathshala://', 'sohojshikkhok://'],
  config: {
    screens: {
      // ---- Student: Explore tab stack ----
      Explore: {
        path: 'explore',
        screens: {
          ExploreMain: '',
          CourseDetail: 'course/:courseId',
          PayIntro: 'pay-intro/:courseId',
          PayTrxID: 'payment/:trxId',
          PayPending: 'pay-pending',
        },
      },
      // ---- Student: Dashboard tab stack ----
      Dashboard: {
        path: 'dashboard',
        screens: {
          DashboardMain: '',
          CourseHome: 'course-home/:courseId',
          CQList: 'cq/:courseId',
          CQSubject: 'cq/:courseId/:subjectId',
          CQVideos: 'cq/:courseId/:subjectId/:chapterId',
          MCQList: 'mcq/:courseId',
          MCQSubject: 'mcq/:courseId/:subjectId',
        },
      },
      // ---- Student: Report tab stack ----
      Report: {
        path: 'report',
        screens: {
          ReportMain: '',
          ReportDetail: 'detail',
        },
      },
      // ---- Student: More tab stack ----
      More: {
        path: 'more',
        screens: {
          MoreMain: '',
          PaymentHistory: 'payments',
          Legal: 'legal',
          Notifications: 'notifications',
        },
      },
      // ---- Teacher: unique tab routes only ----
      Courses: {
        path: 't-courses',
        screens: {
          CoursesMain: '',
          CourseEditor: 'course/:courseId',
          FreeVideos: 'free-videos',
        },
      },
      Students: {
        path: 't-students',
        screens: {
          StudentsMain: '',
        },
      },
      Payments: 't-payments',
    },
  },
};
