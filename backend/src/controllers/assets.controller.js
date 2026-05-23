import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import supabase from '../lib/supabase.js';

export const listAssets = async (req, res) => {
  const { data, error } = await supabase
    .from('profile_assets')
    .select('id, name, asset_type, extracted_text, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
};

export const createAsset = async (req, res) => {
  const { name, assetType = 'other', text } = req.body;
  if (!name || !text) return res.status(400).json({ error: 'name and text required' });

  const { data, error } = await supabase
    .from('profile_assets')
    .insert({ user_id: req.user.id, name, asset_type: assetType, extracted_text: text })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ success: true, asset: data });
};

export const uploadAssetPdf = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });
  const { name, assetType = 'other' } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  try {
    const parsed = await pdfParse(req.file.buffer);
    const text = parsed.text.replace(/\n{3,}/g, '\n\n').trim();
    if (!text) return res.status(422).json({ error: 'Could not extract text from PDF' });

    // Upload to Supabase Storage (same cvs bucket, assets subfolder)
    let filePath = null;
    const storagePath = `${req.user.id}/assets/${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('cvs')
      .upload(storagePath, req.file.buffer, { contentType: 'application/pdf', upsert: true });
    if (!uploadError) filePath = storagePath;

    const { data: asset, error } = await supabase
      .from('profile_assets')
      .insert({ user_id: req.user.id, name, asset_type: assetType, file_path: filePath, extracted_text: text })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ success: true, asset });
  } catch (err) {
    res.status(422).json({ error: 'Failed to parse PDF: ' + err.message });
  }
};

export const deleteAsset = async (req, res) => {
  const { id } = req.params;
  const { data: existing } = await supabase
    .from('profile_assets')
    .select('id, file_path')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (!existing) return res.status(404).json({ error: 'Asset not found' });

  if (existing.file_path) {
    await supabase.storage.from('cvs').remove([existing.file_path]);
  }

  const { error } = await supabase.from('profile_assets').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};
