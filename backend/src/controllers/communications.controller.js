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

  const { type, contactId, dateSent, notes, fromId, toId, direction, fromAddress, toAddress, subject, body, status } = req.body;
  if (!type || !dateSent) {
    return res.status(400).json({ error: 'type and dateSent required' });
  }

  // Derive contact_id from whichever of from/to is not 'me'
  const derivedContactId = contactId
    ?? (fromId && fromId !== 'me' ? fromId : null)
    ?? (toId && toId !== 'me' ? toId : null)
    ?? null;

  const { data, error } = await supabase
    .from('communications')
    .insert({
      application_id: appId,
      type,
      contact_id: derivedContactId,
      date_sent: dateSent,
      notes: notes ?? null,
      from_id: fromId ?? null,
      to_id: toId ?? null,
      direction: direction ?? null,
      from_address: fromAddress ?? null,
      to_address: toAddress ?? null,
      subject: subject ?? null,
      body: body ?? notes ?? '',
      message_status: status ?? 'sent',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ success: true, communication: data });
};

export const updateCommunication = async (req, res) => {
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

  const { type, dateSent, notes, fromId, toId } = req.body;

  const updates = {};
  if (type !== undefined) updates.type = type;
  if (dateSent !== undefined) updates.date_sent = dateSent;
  if (notes !== undefined) { updates.notes = notes; updates.body = notes; }
  if (fromId !== undefined) {
    updates.from_id = fromId;
    // Keep contact_id in sync
    if (fromId !== 'me') updates.contact_id = fromId;
  }
  if (toId !== undefined) {
    updates.to_id = toId;
    if (toId !== 'me') updates.contact_id = toId;
  }

  const { data, error } = await supabase
    .from('communications')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, communication: data });
};

export const listCommunications = async (req, res) => {
  const { id: appId } = req.params;
  if (!(await verifyAppOwnership(appId, req.user.id))) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const { type, sort = 'oldest' } = req.query;
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
