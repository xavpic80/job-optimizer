import supabase from '../lib/supabase.js';

export const saveCV = async (req, res) => {
  const { cvText } = req.body;
  const userId = req.user.id;
  if (!cvText) return res.status(400).json({ error: 'cvText required' });

  // Unset previous current
  await supabase.from('cv_versions').update({ is_current: false }).eq('user_id', userId).eq('is_current', true);

  const { data: latest } = await supabase
    .from('cv_versions')
    .select('version_number')
    .eq('user_id', userId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();

  const nextVersion = (latest?.version_number ?? 0) + 1;

  const { data, error } = await supabase
    .from('cv_versions')
    .insert({ user_id: userId, cv_text: cvText, version_number: nextVersion, is_current: true })
    .select('id, version_number, is_current, created_at')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
};

export const getCurrentCV = async (req, res) => {
  const { data, error } = await supabase
    .from('cv_versions')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('is_current', true)
    .single();

  if (error || !data) return res.status(404).json({ error: 'No current CV found' });
  res.json(data);
};

export const listCVVersions = async (req, res) => {
  const { data, error } = await supabase
    .from('cv_versions')
    .select('id, version_number, is_current, created_at')
    .eq('user_id', req.user.id)
    .order('version_number', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

export const setCurrentCV = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const { data: target } = await supabase
    .from('cv_versions')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!target) return res.status(404).json({ error: 'CV version not found' });

  await supabase.from('cv_versions').update({ is_current: false }).eq('user_id', userId);
  const { data, error } = await supabase
    .from('cv_versions')
    .update({ is_current: true })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

export const updateCV = async (req, res) => {
  const { cvText } = req.body;
  const { id } = req.params;

  const { data: existing } = await supabase
    .from('cv_versions')
    .select('id')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (!existing) return res.status(404).json({ error: 'CV version not found' });

  const { data, error } = await supabase
    .from('cv_versions')
    .update({ cv_text: cvText })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};
