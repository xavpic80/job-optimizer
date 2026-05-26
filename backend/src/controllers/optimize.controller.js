import supabase from '../lib/supabase.js';
import * as claude from '../services/claude.js';
import { saveAiOutput } from '../services/aiOutputCache.js';

export const optimizeApplication = async (req, res) => {
  const { id: appId } = req.params;
  const { outputFormats = ['cv', 'cover_letter', 'email', 'interview_prep'] } = req.body;
  const userId = req.user.id;

  const { data: app } = await supabase
    .from('applications')
    .select('*, jobs(*)')
    .eq('id', appId)
    .eq('user_id', userId)
    .single();

  if (!app) return res.status(404).json({ error: 'Application not found' });

  const { data: cv } = await supabase
    .from('cv_versions')
    .select('cv_text')
    .eq('user_id', userId)
    .eq('is_current', true)
    .single();

  if (!cv) return res.status(400).json({ error: 'No CV saved. Please upload your CV first.' });

  // Fetch profile assets to enrich AI context
  const { data: assetsData } = await supabase
    .from('profile_assets')
    .select('name, asset_type, extracted_text')
    .eq('user_id', userId);
  const profileAssets = assetsData?.length > 0
    ? assetsData.map((a) => `[${a.asset_type.toUpperCase()}] ${a.name}:\n${a.extracted_text}`).join('\n\n---\n\n')
    : null;

  const job = app.jobs;
  const optimizations = {};
  const errors = {};

  const run = async (key, fn) => {
    if (!outputFormats.includes(key)) return;
    try {
      optimizations[key] = await fn();
      await supabase.from('optimization_history').insert({
        application_id: appId,
        optimization_type: key,
        optimized_content: JSON.stringify(optimizations[key]),
        claude_model: 'claude-sonnet-4-6',
      });
    } catch (err) {
      errors[key] = err.message;
    }
  };

  await Promise.all([
    run('cv', () => claude.optimizeCV(job.description, cv.cv_text, profileAssets)),
    run('cover_letter', () => claude.generateCoverLetter(job, cv.cv_text, profileAssets)),
    run('email', () => claude.generateEmail(job, cv.cv_text, profileAssets)),
    run('interview_prep', () => claude.generateInterviewPrep(job, cv.cv_text, profileAssets)),
  ]);

  // Save bundle to cross-device cache
  if (Object.keys(optimizations).length > 0) {
    saveAiOutput(userId, appId, 'optimize', null, optimizations).catch((e) => console.error('[optimize] bundle cache save failed:', e.message));
  }

  res.json({ success: true, jobId: job.id, applicationId: appId, matchScore: job.match_score, optimizations, errors });
};

export const getOptimization = async (req, res) => {
  const { id: appId, type } = req.params;

  const { data: app } = await supabase
    .from('applications')
    .select('id')
    .eq('id', appId)
    .eq('user_id', req.user.id)
    .single();

  if (!app) return res.status(404).json({ error: 'Application not found' });

  const { data, error } = await supabase
    .from('optimization_history')
    .select('*')
    .eq('application_id', appId)
    .eq('optimization_type', type)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Optimization not found' });

  res.json({ ...data, content: JSON.parse(data.optimized_content) });
};
