import supabase from '../lib/supabase.js';
import { getAiOutput } from '../services/aiOutputCache.js';

export const fetchAiOutput = async (req, res) => {
  const { id: appId } = req.params;
  const { type, contactId } = req.query;

  if (!type) return res.status(400).json({ error: 'type query param required' });

  // Verify ownership
  const { data: app } = await supabase
    .from('applications')
    .select('id')
    .eq('id', appId)
    .eq('user_id', req.user.id)
    .single();

  if (!app) return res.status(404).json({ error: 'Application not found' });

  try {
    const result = await getAiOutput(appId, type, contactId ?? null);
    if (!result) return res.json({ data: null, generatedAt: null });
    return res.json({ data: result.data, generatedAt: result.generated_at });
  } catch (err) {
    // Return a cache miss rather than a 500 so the UI degrades gracefully
    console.error('[fetchAiOutput] unexpected error:', err.message);
    return res.json({ data: null, generatedAt: null });
  }
};
