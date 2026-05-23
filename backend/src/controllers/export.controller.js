import PDFDocument from 'pdfkit';
import supabase from '../lib/supabase.js';

const STATUS_LABELS = {
  saved: 'Saved',
  applied: 'Applied',
  screening: 'Screening',
  interview_scheduled: 'Interview Scheduled',
  interview_completed: 'Interview Completed',
  final_round: 'Final Round',
  offer: 'Offer',
  rejected: 'Rejected',
};

export const exportApplication = async (req, res) => {
  const { id: appId } = req.params;
  const { includeTranscript = 'true', includeCoaching = 'true' } = req.query;

  const { data: app } = await supabase
    .from('applications')
    .select(`*, jobs(*), communications(*), transcripts(*, coaching_insights(*))`)
    .eq('id', appId)
    .eq('user_id', req.user.id)
    .single();

  if (!app) return res.status(404).json({ error: 'Application not found' });

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${app.jobs.company}-${app.jobs.title}.pdf"`
  );
  doc.pipe(res);

  const job = app.jobs;

  doc.fontSize(20).text(`${job.title}`, { underline: true });
  doc.fontSize(14).text(`${job.company}${job.location ? ` — ${job.location}` : ''}`);
  doc.fontSize(12).text(`Status: ${STATUS_LABELS[app.status] ?? app.status}`);
  if (app.match_score) doc.text(`Match Score: ${app.match_score}%`);
  if (app.applied_date) doc.text(`Applied: ${app.applied_date}`);
  if (app.notes) { doc.moveDown().text('Notes:', { underline: true }).text(app.notes); }

  if (app.communications?.length) {
    doc.addPage().fontSize(16).text('Communication History', { underline: true });
    for (const c of app.communications) {
      doc.moveDown().fontSize(12)
        .text(`[${c.type.toUpperCase()}] ${c.subject ?? '(no subject)'} — ${new Date(c.date_sent).toLocaleDateString()}`)
        .fontSize(10).text(c.body);
    }
  }

  if (includeTranscript === 'true' && app.transcripts?.length) {
    doc.addPage().fontSize(16).text('Interview Transcripts', { underline: true });
    for (const t of app.transcripts) {
      doc.moveDown().fontSize(13).text(`Interview — ${new Date(t.interview_date).toLocaleDateString()}`);
      if (t.interviewer_name) doc.fontSize(11).text(`Interviewer: ${t.interviewer_name}`);
      doc.fontSize(10).text(t.transcript_text);

      if (includeCoaching === 'true' && t.coaching_insights?.length) {
        doc.moveDown().fontSize(13).text('Coaching Insights', { underline: true });
        for (const i of t.coaching_insights) {
          doc.fontSize(11).text(`[${i.insight_type}] ${i.feedback}`);
          if (i.suggestion) doc.fontSize(10).text(`Suggestion: ${i.suggestion}`);
        }
      }
    }
  }

  doc.end();
};

export const exportAllApplications = async (req, res) => {
  const { filterStatus, includeCoaching = 'false' } = req.query;
  let query = supabase
    .from('applications')
    .select('*, jobs(*)')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (filterStatus) query = query.eq('status', filterStatus);

  const { data: apps } = await query;

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="all-applications.pdf"');
  doc.pipe(res);

  const counts = {};
  for (const app of apps ?? []) {
    counts[app.status] = (counts[app.status] ?? 0) + 1;
  }

  doc.fontSize(22).text('Job Application Summary', { underline: true });
  doc.fontSize(14).text(`Total: ${apps?.length ?? 0} applications`);
  doc.moveDown();
  for (const [status, count] of Object.entries(counts)) {
    doc.fontSize(12).text(`${STATUS_LABELS[status] ?? status}: ${count}`);
  }

  if (apps?.length) {
    doc.addPage().fontSize(16).text('Applications', { underline: true });
    for (const app of apps) {
      doc.moveDown()
        .fontSize(13).text(`${app.jobs.title} at ${app.jobs.company}`)
        .fontSize(11).text(`Status: ${STATUS_LABELS[app.status] ?? app.status}`)
        .text(`Applied: ${app.applied_date ?? 'N/A'}`)
        .text(`Match: ${app.match_score ?? 'N/A'}%`);
    }
  }

  doc.end();
};
