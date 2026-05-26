import supabase from '../lib/supabase.js';

/**
 * Encode a type + optional contactId into a single string stored in
 * optimization_history.optimization_type.
 * e.g. 'meeting_prep' + uuid  → 'meeting_prep:uuid'
 *      'meeting_prep' + null  → 'meeting_prep:none'
 *      'fit_assessment'       → 'fit_assessment'
 */
export function buildType(type, contactId = null) {
  if (type === 'meeting_prep') {
    return `meeting_prep:${contactId ?? 'none'}`;
  }
  return type;
}

/**
 * Persist an AI output to optimization_history.
 * Always inserts a new row — the latest row wins on fetch.
 * Logs (does not throw) on DB error so callers can fire-and-forget safely.
 */
export async function saveAiOutput(_userId, applicationId, type, contactId, data) {
  const cacheType = buildType(type, contactId);
  const { error } = await supabase.from('optimization_history').insert({
    application_id: applicationId,
    optimization_type: cacheType,
    optimized_content: JSON.stringify(data),
    claude_model: 'claude-sonnet-4-6',
  });
  if (error) {
    console.error('[aiOutputCache] saveAiOutput failed for', cacheType, ':', error.message);
  }
}

/**
 * Fetch the most recent cached AI output for an application + type.
 * Returns { data, generated_at } or null on miss / error.
 */
export async function getAiOutput(applicationId, type, contactId = null) {
  const cacheType = buildType(type, contactId);
  const { data: row, error } = await supabase
    .from('optimization_history')
    .select('optimized_content, created_at')
    .eq('application_id', applicationId)
    .eq('optimization_type', cacheType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[aiOutputCache] getAiOutput failed for', cacheType, ':', error.message);
    return null;
  }
  if (!row) return null;

  try {
    return { data: JSON.parse(row.optimized_content), generated_at: row.created_at };
  } catch (parseErr) {
    console.error('[aiOutputCache] JSON.parse failed for', cacheType, ':', parseErr.message);
    return null;
  }
}
