import supabase from '../lib/supabase.js';
import {
  isUrl,
  parseRawJobText,
  scrapeIndeed,
  scrapeLinkedIn,
  scrapeGeneric,
  extractKeywords,
  calculateMatchScore,
  checkDuplicate,
} from '../services/scraper.js';

export const parseJob = async (req, res) => {
  const { input, userCV } = req.body;
  const userId = req.user.id;

  if (!input) return res.status(400).json({ error: 'input required' });

  let jobData;
  try {
    if (isUrl(input)) {
      if (input.includes('linkedin.com')) {
        jobData = await scrapeLinkedIn(input);
      } else if (input.includes('indeed.com')) {
        jobData = await scrapeIndeed(input);
      } else {
        jobData = await scrapeGeneric(input);
      }
    } else {
      jobData = await parseRawJobText(input);
    }
  } catch (err) {
    return res.status(422).json({ error: err.message });
  }

  jobData.keywords = extractKeywords(jobData.description);
  jobData.match_score = userCV ? calculateMatchScore(jobData.description, userCV) : 0;

  const { data: existing } = await supabase
    .from('jobs')
    .select('id, title, company, location')
    .eq('user_id', userId);

  const { isDuplicate, existingJobId } = checkDuplicate(jobData, existing ?? []);
  if (isDuplicate) {
    return res.status(409).json({ error: 'Duplicate job', existingJobId });
  }

  const { data: saved, error } = await supabase
    .from('jobs')
    .insert({
      user_id: userId,
      title: jobData.title,
      company: jobData.company,
      location: jobData.location,
      description: jobData.description,
      source: jobData.source,
      source_url: jobData.source_url ?? null,
      keywords: jobData.keywords,
      match_score: jobData.match_score,
      remote_type: jobData.remote_type ?? null,
      posted_date: jobData.posted_date ?? null,
      parsed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, job: saved });
};

export const listJobs = async (req, res) => {
  const { source, limit = 20, offset = 0 } = req.query;
  let query = supabase
    .from('jobs')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (source) query = query.eq('source', source);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

export const getJob = async (req, res) => {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Job not found' });
  res.json(data);
};

export const deleteJob = async (req, res) => {
  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};
