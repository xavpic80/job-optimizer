import supabase from '../lib/supabase.js';

const verifyAppOwnership = async (appId, userId) => {
  const { data } = await supabase
    .from('applications')
    .select('id')
    .eq('id', appId)
    .eq('user_id', userId)
    .single();
  return !!data;
};

export const listContacts = async (req, res) => {
  const { id: appId } = req.params;
  if (!(await verifyAppOwnership(appId, req.user.id))) {
    return res.status(404).json({ error: 'Application not found' });
  }
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('application_id', appId)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

export const createContact = async (req, res) => {
  const { id: appId } = req.params;
  if (!(await verifyAppOwnership(appId, req.user.id))) {
    return res.status(404).json({ error: 'Application not found' });
  }
  const { firstName, lastName, role, linkedinUrl } = req.body;
  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'firstName and lastName required' });
  }
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      user_id: req.user.id,
      application_id: appId,
      first_name: firstName,
      last_name: lastName,
      role: role ?? null,
      linkedin_url: linkedinUrl ?? null,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ success: true, contact: data });
};

export const updateContact = async (req, res) => {
  const { contactId } = req.params;
  const { firstName, lastName, role, linkedinUrl } = req.body;

  const { data: existing } = await supabase
    .from('contacts')
    .select('id')
    .eq('id', contactId)
    .eq('user_id', req.user.id)
    .single();
  if (!existing) return res.status(404).json({ error: 'Contact not found' });

  const updates = { updated_at: new Date().toISOString() };
  if (firstName !== undefined) updates.first_name = firstName;
  if (lastName !== undefined) updates.last_name = lastName;
  if (role !== undefined) updates.role = role;
  if (linkedinUrl !== undefined) updates.linkedin_url = linkedinUrl;

  const { data, error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', contactId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, contact: data });
};

export const deleteContact = async (req, res) => {
  const { contactId } = req.params;
  const { data: existing } = await supabase
    .from('contacts')
    .select('id')
    .eq('id', contactId)
    .eq('user_id', req.user.id)
    .single();
  if (!existing) return res.status(404).json({ error: 'Contact not found' });

  const { error } = await supabase.from('contacts').delete().eq('id', contactId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};
