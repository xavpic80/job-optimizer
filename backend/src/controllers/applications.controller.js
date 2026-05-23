import supabase from '../lib/supabase.js';

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

export const deleteApplication = async (req, res) => {
  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};
