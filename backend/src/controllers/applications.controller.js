import supabase from '../lib/supabase.js';
import { assessFit, generateMeetingPrep } from '../services/claude.js';
import { researchCompany, researchContact } from '../services/research.js';

export const createApplication = async (req, res) => {
  const { jobId, status = 'saved', notes = '' } = req.body;
  const userId = req.user.id;

  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  if (!job) return res.status(404).json({ error: 'Job not found' });

  const { data, error } = await supabase
    .from('applications')
    .insert({
      user_id: userId,
      job_id: jobId,
      status,
      notes,
      applied_date: status === 'applied' ? new Date().toISOString().split('T')[0] : null,
      last_activity_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Application already exists' });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json({ success: true, application: data });
};

export const listApplications = async (req, res) => {
  const { status, limit = 20, offset = 0, sort = 'newest' } = req.query;
  let query = supabase
    .from('applications')
    .select(`*, jobs(*)`)
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: sort !== 'newest' })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

export const getApplication = async (req, res) => {
  const { data: app, error } = await supabase
    .from('applications')
    .select(`*, jobs(*), communications(*), transcripts(*, coaching_insights(*))`)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (error || !app) return res.status(404).json({ error: 'Application not found' });
  res.json(app);
};

export const updateApplication = async (req, res) => {
  const { status, notes } = req.body;
  const { data: existing } = await supabase
    .from('applications')
    .select('id, applied_date')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (!existing) return res.status(404).json({ error: 'Application not found' });

  const updates = {
    last_activity_date: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString(),
  };
  if (status !== undefined) {
    updates.status = status;
    if (status === 'applied' && !existing.applied_date) {
      updates.applied_date = new Date().toISOString().split('T')[0];
    }
  }
  if (notes !== undefined) updates.notes = notes;

  const { data, error } = await supabase
    .from('applications')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, application: data });
};

export const fitAssessment = async (req, res) => {
  const userId = req.user.id;

  const [{ data: app, error }, { data: cvData }, { data: assetsData }] = await Promise.all([
    supabase
      .from('applications')
      .select('*, jobs(*)')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single(),
    supabase
      .from('cv_versions')
      .select('cv_text')
      .eq('user_id', userId)
      .eq('is_current', true)
      .single(),
    supabase
      .from('profile_assets')
      .select('name, asset_type, extracted_text')
      .eq('user_id', userId),
  ]);

  if (error || !app) return res.status(404).json({ error: 'Application not found' });

  const job = app.jobs;
  const userCV = cvData?.cv_text ?? '';
  const profileAssets = assetsData?.length > 0
    ? assetsData.map((a) => `[${a.asset_type.toUpperCase()}] ${a.name}:\n${a.extracted_text}`).join('\n\n---\n\n')
    : null;

  const research = await researchCompany(job.company);
  const newsText = research.news.length > 0 ? research.news.join('\n\n') : null;
  const openingsText = research.openings.length > 0 ? research.openings.join('\n\n') : null;

  try {
    const result = await assessFit(job.description, userCV, newsText, openingsText, profileAssets);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const meetingPrep = async (req, res) => {
  const { contactId } = req.body;
  const userId = req.user.id;

  const [{ data: app }, { data: cvData }, { data: mpAssetsData }] = await Promise.all([
    supabase
      .from('applications')
      .select('*, jobs(*), communications(*), transcripts(*)')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single(),
    supabase
      .from('cv_versions')
      .select('cv_text')
      .eq('user_id', userId)
      .eq('is_current', true)
      .single(),
    supabase
      .from('profile_assets')
      .select('name, asset_type, extracted_text')
      .eq('user_id', userId),
  ]);

  if (!app) return res.status(404).json({ error: 'Application not found' });

  const job = app.jobs;
  const userCV = cvData?.cv_text ?? '';
  const mpProfileAssets = mpAssetsData?.length > 0
    ? mpAssetsData.map((a) => `[${a.asset_type.toUpperCase()}] ${a.name}:\n${a.extracted_text}`).join('\n\n---\n\n')
    : null;

  // Fetch selected contact (optional)
  let contact = null;
  if (contactId) {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', userId)
      .single();
    contact = data;
  }

  // Research the contact online
  let contactResearch = [];
  if (contact) {
    contactResearch = await researchContact(
      contact.first_name,
      contact.last_name,
      job.company,
      contact.role
    );
  }

  const contactInfo = contact
    ? `Name: ${contact.first_name} ${contact.last_name}\nRole: ${contact.role ?? 'Unknown'}\nLinkedIn: ${contact.linkedin_url ?? 'Not provided'}`
    : '(No specific contact selected — prep for the meeting generically)';

  const commsText = app.communications?.length > 0
    ? app.communications.map((c) =>
        `[${(c.type ?? 'communication').replace('_', ' ')} · ${new Date(c.date_sent).toLocaleDateString()}]\n${c.notes || c.body || ''}`
      ).join('\n\n')
    : null;

  const transcriptsText = app.transcripts?.length > 0
    ? app.transcripts.map((t) =>
        `[Interview · ${new Date(t.interview_date).toLocaleDateString()}]\n${t.transcript_text}`
      ).join('\n\n---\n\n')
    : null;

  try {
    const result = await generateMeetingPrep(
      job.description,
      userCV,
      contactInfo,
      contactResearch.join('\n\n') || null,
      commsText,
      transcriptsText,
      mpProfileAssets
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteApplication = async (req, res) => {
  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};
