/**
 * bannerTargets.js — the single source of truth for where a banner can point.
 *
 * A banner's `target_path` is one of the `path` values below. Course-specific
 * targets are stored as `course/<uuid>` / `course-home/<uuid>`; the resolver
 * splits on the first slash and looks the prefix up here.
 *
 * Teacher side (OwnerBannersScreen) uses BANNER_TARGETS to render the picker.
 * Student side (DashboardScreen) uses resolveBannerTarget() to navigate.
 *
 * These paths MUST stay in sync with the route names in
 * navigation/student/*StackNavigator.js and lib/linking.js.
 */

export const BANNER_TARGETS = [
  { path: 'explore', labelBn: 'এক্সপ্লোর (কোর্স তালিকা)', labelEn: 'Explore (course list)' },
  { path: 'report', labelBn: 'রিপোর্ট', labelEn: 'Report' },
  { path: 'more', labelBn: 'মোর', labelEn: 'More' },
  { path: 'free-videos', labelBn: 'ফ্রি ভিডিও', labelEn: 'Free videos' },
  { path: 'payments', labelBn: 'পেমেন্ট হিস্ট্রি', labelEn: 'Payment history' },
  { path: 'notifications', labelBn: 'নোটিফিকেশন', labelEn: 'Notifications' },
  { path: 'legal', labelBn: 'লিগ্যাল', labelEn: 'Legal' },
  {
    path: 'course',
    labelBn: 'নির্দিষ্ট কোর্সের ডিটেইল পেজ',
    labelEn: 'A specific course detail page',
    needsCourse: true,
  },
  {
    path: 'course-home',
    labelBn: 'নির্দিষ্ট কোর্সের হোম',
    labelEn: 'A specific course home',
    needsCourse: true,
  },
];

export function bannerTargetLabel(path, isBn = true) {
  const prefix = String(path || '').split('/')[0];
  const found = BANNER_TARGETS.find((t) => t.path === prefix);
  if (!found) return path || '';
  return isBn ? found.labelBn : found.labelEn;
}

/**
 * Resolve a stored target_path into a React Navigation action.
 * Returns null when the path is unknown or a course id is missing —
 * callers should treat null as "do nothing" rather than guessing.
 *
 * @param {string} path  e.g. 'explore', 'course/6f3a…'
 * @returns {{tab: string, screen?: string, params?: object}|null}
 */
export function resolveBannerTarget(path) {
  const raw = String(path || '').trim();
  if (!raw) return null;

  const [prefix, id] = raw.split('/');

  switch (prefix) {
    case 'explore':
      return { tab: 'Explore' };
    case 'report':
      return { tab: 'Report' };
    case 'more':
      return { tab: 'More' };
    case 'free-videos':
      return { tab: 'Dashboard', screen: 'FreeVideos' };
    case 'payments':
      return { tab: 'More', screen: 'PaymentHistory' };
    case 'notifications':
      return { tab: 'More', screen: 'Notifications' };
    case 'legal':
      return { tab: 'More', screen: 'Legal' };
    case 'course':
      return id
        ? { tab: 'Explore', screen: 'CourseDetail', params: { courseId: id } }
        : null;
    case 'course-home':
      return id
        ? { tab: 'Dashboard', screen: 'CourseHome', params: { courseId: id } }
        : null;
    default:
      return null;
  }
}
