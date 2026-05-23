import React, { useState } from 'react';
import { Mail, Phone, Video, MessageSquare, Plus, X, Trash2, FileText, Loader } from 'lucide-react';
import api from '../api/client.js';

const COMM_TYPES = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone_call', label: 'Phone Call', icon: Phone },
  { value: 'video_call', label: 'Video Call', icon: Video },
  { value: 'text', label: 'Text', icon: MessageSquare },
];

const INTERVIEW_TYPES = [
  'phone_screen', 'technical', 'behavioral', 'case_study', 'final_round', 'other',
];

const INTERVIEW_TYPE_LABELS = {
  phone_screen: 'Phone Screen', technical: 'Technical', behavioral: 'Behavioral',
  case_study: 'Case Study', final_round: 'Final Round', other: 'Interview',
};

// ── Communication card ────────────────────────────────────────────────────────
function CommCard({ comm, contacts }) {
  const TypeIcon = COMM_TYPES.find((t) => t.value === comm.type)?.icon ?? Mail;
  const contact = contacts.find((c) => c.id === comm.contact_id);
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
          <TypeIcon className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white capitalize">{comm.type.replace('_', ' ')}</span>
            {contact && (
              <span className="text-xs text-slate-400">
                with {contact.first_name} {contact.last_name}
                {contact.role && ` · ${contact.role}`}
              </span>
            )}
            <span className="text-xs text-slate-500 ml-auto">
              {new Date(comm.date_sent).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          {(comm.notes || comm.body) && (
            <p className="text-sm text-slate-300 mt-1.5 whitespace-pre-wrap">{comm.notes || comm.body}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Transcript card ───────────────────────────────────────────────────────────
function TranscriptCard({ transcript, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const t = transcript;
  const typeName = INTERVIEW_TYPE_LABELS[t.interview_type] ?? 'Interview';

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-white text-sm">
              {typeName} — {new Date(t.interview_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            {t.interviewer_name && (
              <p className="text-xs text-slate-400 mt-0.5">with {t.interviewer_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {t.transcript_text && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                {expanded ? 'Hide' : 'Show'} transcript
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(t.id)}
                className="text-slate-600 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Coaching insights */}
        {t.coaching_insights?.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Coaching Insights</p>
            {t.coaching_insights.map((ins) => (
              <div key={ins.id} className="text-sm p-3 bg-slate-800 rounded-lg">
                <span className={`text-xs font-medium ${
                  ins.insight_type === 'strength' ? 'text-green-400'
                  : ins.insight_type === 'opportunity' ? 'text-yellow-400'
                  : 'text-blue-400'
                }`}>
                  [{ins.insight_type}]
                </span>
                <span className="text-slate-300 ml-2">{ins.feedback}</span>
                {ins.suggestion && <p className="text-slate-400 mt-1 text-xs">→ {ins.suggestion}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Full transcript text */}
        {expanded && t.transcript_text && (
          <div className="mt-3 p-3 bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-400 mb-2 font-medium">Transcript</p>
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{t.transcript_text}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CommunicationsTab({ appId, contacts = [], initialCommunications = [], initialTranscripts = [] }) {
  const [communications, setCommunications] = useState(initialCommunications);
  const [transcripts, setTranscripts] = useState(initialTranscripts);

  // ── Comm log form state ──────────────────────────────────────────────────
  const [showCommForm, setShowCommForm] = useState(false);
  const [commForm, setCommForm] = useState({
    contactId: '', date: new Date().toISOString().slice(0, 10), type: 'email', notes: '',
  });
  const [savingComm, setSavingComm] = useState(false);
  const [commError, setCommError] = useState('');

  // ── Transcript form state ────────────────────────────────────────────────
  const [showTxForm, setShowTxForm] = useState(false);
  const [txForm, setTxForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'behavioral',
    interviewer: '',
    text: '',
  });
  const [savingTx, setSavingTx] = useState(false);
  const [txError, setTxError] = useState('');
  const [txAnalyzing, setTxAnalyzing] = useState(false);

  const logComm = async (e) => {
    e.preventDefault();
    setSavingComm(true);
    setCommError('');
    try {
      const { communication } = await api.post(`/api/applications/${appId}/communications`, {
        type: commForm.type,
        contactId: commForm.contactId || null,
        dateSent: commForm.date,
        notes: commForm.notes,
      });
      setCommunications((prev) => [communication, ...prev]);
      setCommForm({ contactId: '', date: new Date().toISOString().slice(0, 10), type: 'email', notes: '' });
      setShowCommForm(false);
    } catch (err) {
      setCommError(err.error ?? 'Failed to log communication');
    } finally {
      setSavingComm(false);
    }
  };

  const addTranscript = async (e) => {
    e.preventDefault();
    if (!txForm.text.trim()) {
      setTxError('Transcript text is required');
      return;
    }
    setSavingTx(true);
    setTxAnalyzing(false);
    setTxError('');
    try {
      setTxAnalyzing(true);
      const { transcript } = await api.post(`/api/applications/${appId}/transcripts`, {
        interviewDate: txForm.date,
        interviewType: txForm.type,
        interviewerName: txForm.interviewer || null,
        transcriptText: txForm.text,
      });
      setTranscripts((prev) => [transcript, ...prev]);
      setTxForm({ date: new Date().toISOString().slice(0, 10), type: 'behavioral', interviewer: '', text: '' });
      setShowTxForm(false);
    } catch (err) {
      setTxError(err.error ?? 'Failed to save transcript');
    } finally {
      setSavingTx(false);
      setTxAnalyzing(false);
    }
  };

  const deleteTranscript = async (id) => {
    try {
      await api.delete(`/api/transcripts/${id}`);
      setTranscripts((prev) => prev.filter((t) => t.id !== id));
    } catch {}
  };

  return (
    <div className="space-y-8">
      {/* ── Communication Log ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-400" /> Communication Log
          </h2>
          {!showCommForm && (
            <button
              onClick={() => setShowCommForm(true)}
              className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <Plus className="w-4 h-4" /> Log
            </button>
          )}
        </div>

        {showCommForm && (
          <form onSubmit={logComm} className="mb-4 p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Type *</label>
                <select
                  value={commForm.type}
                  onChange={(e) => setCommForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  {COMM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Date *</label>
                <input
                  type="date"
                  value={commForm.date}
                  onChange={(e) => setCommForm((f) => ({ ...f, date: e.target.value }))}
                  required
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
            {contacts.length > 0 && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Contact</label>
                <select
                  value={commForm.contactId}
                  onChange={(e) => setCommForm((f) => ({ ...f, contactId: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">— None —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.role ? ` · ${c.role}` : ''}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Notes</label>
              <textarea
                value={commForm.notes}
                onChange={(e) => setCommForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="What was discussed, key takeaways, next steps…"
                rows={4}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>
            {commError && <p className="text-sm text-red-400">{commError}</p>}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={savingComm}
                className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-400 disabled:opacity-50 transition-colors"
              >
                {savingComm ? 'Saving…' : 'Log Communication'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCommForm(false); setCommError(''); }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {communications.length === 0 && !showCommForm && (
          <p className="text-sm text-slate-500">No communications logged yet.</p>
        )}
        <div className="space-y-3">
          {communications.map((c) => (
            <CommCard key={c.id} comm={c} contacts={contacts} />
          ))}
        </div>
      </section>

      {/* ── Interview Transcripts ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" /> Interview Transcripts
          </h2>
          {!showTxForm && (
            <button
              onClick={() => setShowTxForm(true)}
              className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>

        {showTxForm && (
          <form onSubmit={addTranscript} className="mb-4 p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Interview Type</label>
                <select
                  value={txForm.type}
                  onChange={(e) => setTxForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  {INTERVIEW_TYPES.map((t) => (
                    <option key={t} value={t}>{INTERVIEW_TYPE_LABELS[t] ?? t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Date *</label>
                <input
                  type="date"
                  value={txForm.date}
                  onChange={(e) => setTxForm((f) => ({ ...f, date: e.target.value }))}
                  required
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Interviewer Name</label>
              <input
                value={txForm.interviewer}
                onChange={(e) => setTxForm((f) => ({ ...f, interviewer: e.target.value }))}
                placeholder="Optional"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Transcript / Notes *</label>
              <textarea
                value={txForm.text}
                onChange={(e) => setTxForm((f) => ({ ...f, text: e.target.value }))}
                placeholder="Paste transcript or write notes from the interview…"
                rows={6}
                required
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none font-mono"
              />
            </div>
            {txError && <p className="text-sm text-red-400">{txError}</p>}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={savingTx}
                className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-400 disabled:opacity-50 transition-colors"
              >
                {savingTx ? (
                  <span className="flex items-center gap-2">
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                    {txAnalyzing ? 'Analyzing with AI…' : 'Saving…'}
                  </span>
                ) : 'Save & Analyze'}
              </button>
              <button
                type="button"
                onClick={() => { setShowTxForm(false); setTxError(''); }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {savingTx && (
              <p className="text-xs text-slate-500">
                Claude is analyzing the transcript for coaching insights — this may take 15–30 seconds.
              </p>
            )}
          </form>
        )}

        {transcripts.length === 0 && !showTxForm && (
          <p className="text-sm text-slate-500">No transcripts yet. Add notes or paste a recording transcript after an interview.</p>
        )}
        <div className="space-y-3">
          {transcripts.map((t) => (
            <TranscriptCard key={t.id} transcript={t} onDelete={deleteTranscript} />
          ))}
        </div>
      </section>
    </div>
  );
}
