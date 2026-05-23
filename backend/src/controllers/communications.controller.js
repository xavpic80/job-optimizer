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

export const createCommunication = async (req, res) => {
  const { id: appId } = req.params;
  if (!(await verifyAppOwnership(appId, req.user.id))) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const { type, direction, dateSent, fromAddress, toAddress, subject, body, status } = req.body;
  if (!type || !body || !dateSent) {
    return res.status(400).json({ error: 'type, body, dateSent required' });
  }

  const { data, error } = await supabase
    .from('communications')
    .insert({
      application_id: appId,
      type,
      direction,
      date_sent: dateSent,
      from_address: fromAddress,
      to_address: toAddress,
      subject,
      body,
      message_status: status ?? 'sent',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ success: true, communication: data });
};

export const listCommunications = async (req, res) => {
  const { id: appId } = req.params;
  if (!(await verifyAppOwnership(appId, req.user.id))) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const { type, sort = 'newest' } = req.query;
  let query = supabase
    .from('communications')
    .select('*')
    .eq('application_id', appId)
    .order('date_sent', { ascending: sort !== 'newest' });

  if (type) query = query.eq('type', type);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

export const deleteCommunication = async (req, res) => {
  const { id } = req.params;

  // Verify ownership via application
  const { data: comm } = await supabase
    .from('communications')
    .select('application_id')
    .eq('id', id)
    .single();

  if (!comm || !(await verifyAppOwnership(comm.application_id, req.user.id))) {
    return res.status(404).json({ error: 'Communication not found' });
  }

  const { error } = await supabase.from('communications').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};
