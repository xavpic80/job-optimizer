import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import supabase from '../lib/supabase.js';
import { generateContactBackground } from '../services/claude.js';
import { researchContact } from '../services/research.js';

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

export const uploadLinkedinPdf = async (req, res) => {
  const { id: appId, contactId } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });

  const { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('id', contactId)
    .eq('user_id', req.user.id)
    .single();
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  try {
    const pdfData = await pdfParse(req.file.buffer);
    const text = pdfData.text.replace(/\n{3,}/g, '\n\n').trim();

    // Upload to storage (graceful — same cvs bucket, different path)
    let pdfPath = null;
    const storagePath = `${req.user.id}/contacts/${contactId}-${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('cvs')
      .upload(storagePath, req.file.buffer, { contentType: 'application/pdf', upsert: true });
    if (!uploadError) pdfPath = storagePath;

    const { data: updated, error } = await supabase
      .from('contacts')
      .update({ linkedin_pdf_path: pdfPath, linkedin_pdf_text: text, updated_at: new Date().toISOString() })
      .eq('id', contactId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, contact: updated });
  } catch (err) {
    res.status(422).json({ error: 'Failed to parse PDF: ' + err.message });
  }
};

export const generateBackground = async (req, res) => {
  const { id: appId, contactId } = req.params;

  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .eq('user_id', req.user.id)
    .single();
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  const { data: app } = await supabase
    .from('applications')
    .select('*, jobs(company)')
    .eq('id', appId)
    .eq('user_id', req.user.id)
    .single();
  if (!app) return res.status(404).json({ error: 'Application not found' });

  const company = app.jobs?.company ?? '';

  // Research contact online
  const webSnippets = await researchContact(
    contact.first_name,
    contact.last_name,
    company,
    contact.role
  );

  const contactInfo = [
    `Name: ${contact.first_name} ${contact.last_name}`,
    `Role: ${contact.role ?? 'Unknown'}`,
    `Company: ${company}`,
    `LinkedIn: ${contact.linkedin_url ?? 'Not provided'}`,
  ].join('\n');

  try {
    const result = await generateContactBackground(
      contactInfo,
      contact.linkedin_pdf_text ?? null,
      webSnippets.join('\n\n') || null
    );

    const { data: updated, error } = await supabase
      .from('contacts')
      .update({ ai_background: result, ai_background_at: new Date().toISOString() })
      .eq('id', contactId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, background: result, contact: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
