import { supabase } from '../../../lib/supabase';

/**
 * Shared purchase gate for the Course Home flow (screens/student/course).
 * Calls the REAL is_purchased(course_id) RPC (verified in
 * current-schema-reference.md; teachers/owners bypass server-side).
 * Returns { allowed: true } or { allowed: false }.
 * Throws real errors for the caller to alert on — EXCEPT the bypass
 * case (no session: TEMP DEV BYPASS, see STATUS.md), where it warns
 * and allows read-only preview so the flow stays reviewable.
 */
export async function checkCourseAccess(courseId, userId) {
  if (!userId) {
    console.warn('TEMP DEV BYPASS: no live session, previewing course content without purchase check');
    return { allowed: true, preview: true };
  }
  const { data, error } = await supabase.rpc('is_purchased', { p_course_id: courseId });
  if (error) throw error;
  return { allowed: data === true, preview: false };
}

export function isNoSessionError(err) {
  return (
    err?.message === 'Not authenticated' ||
    err?.name === 'AuthSessionMissingError' ||
    (typeof err?.message === 'string' && err.message.includes('Auth session missing'))
  );
}
