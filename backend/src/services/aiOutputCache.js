import supabase from '../lib/supabase.js';

/**
 * Encode a type + optional contactId into a single cache key.
 * 'meeting_prep' + contactId → 'meeting_prep:contact-uuid'
 * 'meeting_prep' + null     → 'meeting_prep:none'
 * 'fit_assessment'          → 'fit_assessment'
 */
export function buildType(type, contactId = null) {
  if (type === 'meeting_prep') {
    return `meeting_prep:${contactId ?? 'none'}`;
  }
  return type;
}

/**
 * Upsert an AI output for an application.
 * Fire-and-forget safe — catch errors at call site.
 */
export async function saveAiOutput(userId, applicationId, type, contactId, data) {
  const cacheType = buildType(type, contactId);
  const { data: existing } = await supabase
    .from('ai_outputs')
    .select('id')
    .eq('application_id', applicationId)
    .eq('type', cacheType)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('ai_outputs')
      .update({ data, generated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase.from('ai_outputs').insert({
      user_id: userId,
      application_id: applicationId,
      type: cacheType,
      data,
      generated_at: new Date().toISOString(),
    });
  }
}

/**
 * Fetch a cached AI output. Returns { data, generated_at } or null.
 */
export async function getAiOutput(applicationId, type, contactId = null) {
  const cacheType = buildType(type, contactId);
  const { data } = await supabase
    .from('ai_outputs')
    .select('data, generated_at')
    .eq('application_id', applicationId)
    .eq('type', cacheType)
    .maybeSingle();
  return data ?? null;
}
