import supabase from '../lib/supabase.js';
import { analyzeTranscript } from '../services/claude.js';

const verifyAppOwnership = async (appId, userId) => {
  const { data } = await supabase
    .from('applications')
    .select('id, job_id')
    .eq('id', appId)
    .eq('user_id', userId)
    .single();
  return data;
};

export const createTranscript = async (req, res) => {
  const { id: appId } = req.params;
  const app = await verifyAppOwnership(appId, req.user.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });

  const { interviewDate, interviewerName, interviewType, durationMinutes, transcriptText } = req.body;
  if (!interviewDate || !transcriptText) {
    return res.status(400).json({ error: 'interviewDate and transcriptText required' });
  }

  const { data: transcript, error: tErr } = await supabase
    .from('transcripts')
    .insert({
      application_id: appId,
      interview_date: interviewDate,
      interviewer_name: interviewerName,
      interview_type: interviewType,
      duration_minutes: durationMinutes,
      transcript_text: transcriptText,
    })
    .select()
    .single();

  if (tErr) return res.status(500).json({ error: tErr.message });

  const { data: job } = await supabase.from('jobs').select('description').eq('id', app.job_id).single();

  let coaching;
  try {
    coaching = await analyzeTranscript(transcriptText, job?.description ?? '');
  } catch (err) {
    return res.status(201).json({ success: true, transcript, warning: 'Coaching analysis failed' });
  }

  const inserts = coaching.coachingInsights.map((i) => ({
    transcript_id: transcript.id,
    insight_type: i.type,
    feedback: i.feedback,
    key_moment: i.keyMoment,
    suggestion: i.suggestion,
  }));
  await supabase.from('coaching_insights').insert(inserts);

  await supabase
    .from('transcripts')
    .update({ coaching_json: coaching, next_steps: coaching.nextSteps })
    .eq('id', transcript.id);

  res.status(201).json({
    success: true,
    transcript: { ...transcript, coachingInsights: coaching.coachingInsights, nextSteps: coaching.nextSteps },
  });
};

export const listTranscripts = async (req, res) => {
  const { id: appId } = req.params;
  if (!(await verifyAppOwnership(appId, req.user.id))) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const { data, error } = await supabase
    .from('transcripts')
    .select('*, coaching_insights(*)')
    .eq('application_id', appId)
    .order('interview_date', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

export const deleteTranscript = async (req, res) => {
  const { id } = req.params;
  const { data: t } = await supabase.from('transcripts').select('application_id').eq('id', id).single();

  if (!t) return res.status(404).json({ error: 'Transcript not found' });

  const app = await verifyAppOwnership(t.application_id, req.user.id);
  if (!app) return res.status(404).json({ error: 'Transcript not found' });

  const { error } = await supabase.from('transcripts').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};
