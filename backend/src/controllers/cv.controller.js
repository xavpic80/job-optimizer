import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import supabase from '../lib/supabase.js';

export const parsePDF = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });
  if (req.file.mimetype !== 'application/pdf') {
    return res.status(400).json({ error: 'File must be a PDF' });
  }
  try {
    const data = await pdfParse(req.file.buffer);
    const text = data.text.replace(/\n{3,}/g, '\n\n').trim();
    if (!text) return res.status(422).json({ error: 'Could not extract text from PDF' });

    // Upload PDF to Supabase Storage (graceful degradation if bucket doesn't exist)
    let pdfPath = null;
    const storagePath = `${req.user.id}/${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('cvs')
      .upload(storagePath, req.file.buffer, { contentType: 'application/pdf', upsert: true });
    if (!uploadError) pdfPath = storagePath;

    res.json({ text, pages: data.numpages, pdfPath });
  } catch (err) {
    res.status(422).json({ error: 'Failed to parse PDF: ' + err.message });
  }
};

export const saveCV = async (req, res) => {
  const { cvText, pdfPath } = req.body;
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
    .insert({ user_id: userId, cv_text: cvText, version_number: nextVersion, is_current: true, pdf_path: pdfPath ?? null })
    .select('id, version_number, is_current, created_at, pdf_path')
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

  let pdfUrl = null;
  if (data.pdf_path) {
    const { data: signed } = await supabase.storage
      .from('cvs')
      .createSignedUrl(data.pdf_path, 86400); // 24h
    pdfUrl = signed?.signedUrl ?? null;
  }

  res.json({ ...data, pdf_url: pdfUrl });
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
