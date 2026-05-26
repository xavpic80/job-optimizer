import supabase from '../lib/supabase.js';
import { generateCommsCoach } from '../services/claude.js';
import { saveAiOutput } from '../services/aiOutputCache.js';

export const commsCoach = async (req, res) => {
  const userId = req.user.id;

  const [{ data: app }, { data: cvData }] = await Promise.all([
    supabase
      .from('applications')
      .select('*, jobs(*), communications(*), transcripts(*, coaching_insights(*))')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single(),
    supabase
      .from('cv_versions')
      .select('cv_text')
      .eq('user_id', userId)
      .eq('is_current', true)
      .single(),
  ]);

  if (!app) return res.status(404).json({ error: 'Application not found' });

  const job = app.jobs;
  const userCV = cvData?.cv_text ?? '';

  // Format all communications into readable text
  const comms = [...(app.communications ?? [])].sort(
    (a, b) => new Date(a.date_sent) - new Date(b.date_sent)
  );

  const communicationsText = comms.length > 0
    ? comms.map((c) => {
        const from = c.from_id === 'me' ? 'Me' : (c.from_id ? `Contact (${c.from_id})` : 'Unknown');
        const to   = c.to_id   === 'me' ? 'Me' : (c.to_id   ? `Contact (${c.to_id})`   : 'Unknown');
        const type = (c.type ?? 'communication').replace('_', ' ');
        const date = new Date(c.date_sent).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `[${type} · ${date} · From: ${from} → To: ${to}]\n${c.notes || c.body || '(no content)'}`;
      }).join('\n\n')
    : null;

  // Format transcripts
  const transcripts = app.transcripts ?? [];
  const transcriptsText = transcripts.length > 0
    ? transcripts.map((t) => {
        const date = new Date(t.interview_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const type = (t.interview_type ?? 'interview').replace('_', ' ');
        const interviewer = t.interviewer_name ? ` with ${t.interviewer_name}` : '';
        return `[${type}${interviewer} · ${date}]\n${t.transcript_text || '(no transcript text)'}`;
      }).join('\n\n---\n\n')
    : null;

  try {
    const result = await generateCommsCoach(
      job.description,
      userCV,
      communicationsText,
      transcriptsText
    );
    await saveAiOutput(userId, req.params.id, 'comms_coach', null, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
