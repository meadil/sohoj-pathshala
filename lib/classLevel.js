import { supabase } from './supabase';

/**
 * Shared class_levels helpers (single source of truth). Extracted from
 * per-screen copies (CODE_AUDIT fix). Verified against
 * Supabase/current-schema-reference.md: class_levels(id uuid PK,
 * name text UNIQUE e.g. "SSC"/"HSC", order_index int), RLS
 * authenticated-only (callers must session-gate while bypassed).
 */

// UUID for an exact level name. Throws on lookup failure for the
// caller to handle (alert + stay). Never hardcode UUIDs.
export async function getClassLevelId(name) {
  const { data: row, error } = await supabase
    .from('class_levels')
    .select('id')
    .eq('name', name)
    .single();
  if (error) throw error;
  return row.id;
}

// Canonical level name for a row id. Returns null when unreadable;
// callers fall back to their default (usually 'SSC').
export async function getClassLevelName(id) {
  if (!id) return null;
  try {
    const { data: row, error } = await supabase
      .from('class_levels')
      .select('name')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (row?.name === 'SSC' || row?.name === 'HSC') return row.name;
    return null;
  } catch (err) {
    console.warn('classLevel: could not load level name:', err?.message);
    return null;
  }
}
