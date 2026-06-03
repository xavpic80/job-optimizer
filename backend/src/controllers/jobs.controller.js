import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import supabase from '../lib/supabase.js';
import {
  isUrl,
  parseRawJobText,
  scrapeIndeed,
  scrapeLinkedIn,
  scrapeGeneric,
  extractKeywords,
  checkDuplicate,
} from '../services/scraper.js';
import { scoreMatch } from '../services/claude.js';

export const parseJobPdf = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });
  const userId = req.user.id;

  try {
    const parsed = await pdfParse(req.file.buffer);
    const text = parsed.text.replace(/\n{3,}/g, '\n\n').trim();
    if (!text) return res.status(422).json({ error: 'Could not extract text from PDF' });

    // Upload original PDF to storage so we can display it later
    const storagePath = `${userId}/jobs/${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('cvs')
      .upload(storagePath, req.file.buffer, { contentType: 'application/pdf', upsert: false });

    const filePath = uploadError ? null : storagePath;
    res.json({ text, filePath });
  } catch (err) {
    res.status(422).json({ error: 'Failed to parse PDF: ' + err.message });
  }
};

export const getJobPdfUrl = async (req, res) => {
  const { data: job } = await supabase
    .from('jobs')
    .select('pdf_path')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (!job.pdf_path) return res.status(404).json({ error: 'No PDF stored for this job' });

  const { data, error } = await supabase.storage
    .from('cvs')
    .createSignedUrl(job.pdf_path, 3600); // 1-hour signed URL

  if (error) return res.status(500).json({ error: error.message });
  res.json({ url: data.signedUrl });
};

export const parseJob = async (req, res) => {
  const { input, userCV, titleOverride, companyOverride, pdfPath } = req.body;
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

  // Apply manual overrides — user knows better than the parser
  if (titleOverride?.trim())   jobData.title   = titleOverride.trim();
  if (companyOverride?.trim()) jobData.company = companyOverride.trim();

  // Final guard: company is NOT NULL in the DB
  if (!jobData.company) return res.status(422).json({ error: 'Could not detect company name — please fill in the Company field.' });
  if (!jobData.title)   jobData.title = 'Untitled';

  jobData.keywords = extractKeywords(jobData.description);
  if (userCV) {
    try {
      const result = await scoreMatch(jobData.description, userCV);
      jobData.match_score = result.score ?? 0;
      jobData.match_summary = result.summary ?? null;
    } catch {
      jobData.match_score = 0;
      jobData.match_summary = null;
    }
  } else {
    jobData.match_score = 0;
    jobData.match_summary = null;
  }

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
      posting_date: req.body.postingDate ?? null,
      pdf_path: pdfPath ?? null,
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

export const updateJob = async (req, res) => {
  const { postingDate, title, company, description, pdfPath } = req.body;
  const { data: existing } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (!existing) return res.status(404).json({ error: 'Job not found' });

  const updates = {};
  if (postingDate  !== undefined) updates.posting_date = postingDate || null;
  if (title        !== undefined && title.trim())       updates.title       = title.trim();
  if (company      !== undefined && company.trim())     updates.company     = company.trim();
  if (description  !== undefined && description.trim()) updates.description = description.trim();
  if (pdfPath      !== undefined)                       updates.pdf_path    = pdfPath || null;

  const { data, error } = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, job: data });
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
