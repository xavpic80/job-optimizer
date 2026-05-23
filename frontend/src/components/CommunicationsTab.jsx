import React, { useState, useMemo } from 'react';
import {
  Mail, Phone, Video, MessageSquare, Plus, X, Trash2, FileText,
  Loader, Pencil, Check,
} from 'lucide-react';
import api from '../api/client.js';

const COMM_TYPES = [
  { value: 'email',      label: 'Email',      icon: Mail },
  { value: 'phone_call', label: 'Phone Call',  icon: Phone },
  { value: 'video_call', label: 'Video Call',  icon: Video },
  { value: 'text',       label: 'Text',        icon: MessageSquare },
];

const INTERVIEW_TYPES = [
  'phone_screen', 'technical', 'behavioral', 'case_study', 'final_round', 'other',
];
const INTERVIEW_TYPE_LABELS = {
  phone_screen: 'Phone Screen', technical: 'Technical', behavioral: 'Behavioral',
  case_study: 'Case Study', final_round: 'Final Round', other: 'Interview',
};

const ME = 'me';

// Format a contact ID or 'me' into a display name
function resolveParty(id, contacts) {
  if (!id || id === ME) return { name: 'Me', initials: 'Me', isMe: true };
  const c = contacts.find((x) => x.id === id);
  if (!c) return { name: 'Unknown', initials: '?', isMe: false };
  const initials = `${c.first_name?.[0] ?? ''}${c.last_name?.[0] ?? ''}`.toUpperCase();
  const name = `${c.first_name} ${c.last_name}${c.role ? ` · ${c.role}` : ''}`;
  return { name, initials, isMe: false };
}

// Who sent this message — from_id if present, else fall back to direction
function getSender(comm) {
  if (comm.from_id) return comm.from_id;
  if (comm.direction === 'sent') return ME;
  return null; // unknown
}

function formatDate(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Contact party selector ────────────────────────────────────────────────────
function PartySelect({ label, value, onChange, contacts }) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
      >
        <option value={ME}>Me</option>
        {contacts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.first_name} {c.last_name}{c.role ? ` · ${c.role}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Inline edit form (shown inside a bubble) ──────────────────────────────────
function EditForm({ comm, contacts, onSave, onCancel }) {
  const [type, setType] = useState(comm.type ?? 'email');
  const [date, setDate] = useState(comm.date_sent?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [fromId, setFromId] = useState(getSender(comm) ?? ME);
  const [toId, setToId] = useState(comm.to_id ?? ME);
  const [notes, setNotes] = useState(comm.notes || comm.body || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const { communication } = await api.patch(`/api/communications/${comm.id}`, {
        type, dateSent: date, notes, fromId, toId,
      });
      onSave(communication);
    } catch (err) {
      setError(err.error ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 p-3 bg-slate-800 border border-slate-600 rounded-xl text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-cyan-500">
            {COMM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-cyan-500" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <PartySelect label="From" value={fromId} onChange={setFromId} contacts={contacts} />
        <PartySelect label="To"   value={toId}   onChange={setToId}   contacts={contacts} />
      </div>
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-cyan-500 resize-none" />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex items-center gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-medium hover:bg-cyan-500 disabled:opacity-50 transition-colors">
          {saving ? <Loader className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="text-xs text-slate-400 hover:text-white transition-colors">Cancel</button>
      </div>
    </div>
  );
}

// ── Single message bubble ─────────────────────────────────────────────────────
function MessageBubble({ comm, contacts, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const senderId = getSender(comm);
  const isMe = !senderId || senderId === ME;
  const sender = resolveParty(senderId, contacts);
  const recipient = resolveParty(comm.to_id, contacts);
  const TypeIcon = COMM_TYPES.find((t) => t.value === comm.type)?.icon ?? Mail;
  const text = comm.notes || comm.body || '';

  if (editing) {
    return (
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className="w-full max-w-[85%]">
          <EditForm
            comm={comm}
            contacts={contacts}
            onSave={(updated) => { onUpdate(updated); setEditing(false); }}
            onCancel={() => setEditing(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex mb-3 gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar — left side only */}
      {!isMe && (
        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0 mt-1">
          {sender.initials}
        </div>
      )}

      <div className={`max-w-[78%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Sender label — left side only */}
        {!isMe && (
          <p className="text-xs text-slate-500 mb-1 ml-1">{sender.name}</p>
        )}

        {/* Bubble */}
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isMe
            ? 'bg-cyan-600 text-white rounded-br-sm'
            : 'bg-slate-800 text-slate-100 rounded-bl-sm'
        }`}>
          {text || <span className="italic opacity-60">(no notes)</span>}
        </div>

        {/* Meta row */}
        <div className={`flex items-center gap-1.5 mt-1 mx-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          <TypeIcon className="w-3 h-3 text-slate-500" />
          <span className="text-xs text-slate-500">
            {comm.to_id && comm.to_id !== ME && !isMe
              ? null
              : comm.to_id && comm.to_id !== ME
                ? `→ ${resolveParty(comm.to_id, contacts).name}`
                : null}
          </span>
          <button
            onClick={() => setEditing(true)}
            className="text-slate-600 hover:text-slate-300 transition-colors"
            title="Edit"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDelete(comm.id)}
            className="text-slate-600 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Avatar — right side (me) */}
      {isMe && (
        <div className="w-7 h-7 rounded-full bg-cyan-700 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0 mt-1">
          Me
        </div>
      )}
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
              <button onClick={() => onDelete(t.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

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
  const [communications, setCommunications] = useState(
    // Sort oldest → newest for chat display
    [...initialCommunications].sort((a, b) => new Date(a.date_sent) - new Date(b.date_sent))
  );
  const [transcripts, setTranscripts] = useState(initialTranscripts);

  // ── Comm log form state ──────────────────────────────────────────────────
  const [showCommForm, setShowCommForm] = useState(false);
  const [commForm, setCommForm] = useState({
    fromId: ME,
    toId: contacts[0]?.id ?? ME,
    date: new Date().toISOString().slice(0, 10),
    type: 'email',
    notes: '',
  });
  const [savingComm, setSavingComm] = useState(false);
  const [commError, setCommError] = useState('');

  // Reset toId when contacts first load
  const defaultToId = contacts.length > 0 ? contacts[0].id : ME;

  // ── Transcript form state ────────────────────────────────────────────────
  const [showTxForm, setShowTxForm] = useState(false);
  const [txForm, setTxForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'behavioral', interviewer: '', text: '',
  });
  const [savingTx, setSavingTx] = useState(false);
  const [txError, setTxError] = useState('');
  const [txAnalyzing, setTxAnalyzing] = useState(false);

  // Group messages by date for separators
  const grouped = useMemo(() => {
    const groups = [];
    let lastDate = null;
    for (const comm of communications) {
      const dateLabel = formatDate(comm.date_sent);
      if (dateLabel !== lastDate) {
        groups.push({ type: 'date', label: dateLabel });
        lastDate = dateLabel;
      }
      groups.push({ type: 'message', comm });
    }
    return groups;
  }, [communications]);

  const logComm = async (e) => {
    e.preventDefault();
    setSavingComm(true);
    setCommError('');
    try {
      const { communication } = await api.post(`/api/applications/${appId}/communications`, {
        type: commForm.type,
        dateSent: commForm.date,
        notes: commForm.notes,
        fromId: commForm.fromId,
        toId: commForm.toId,
      });
      setCommunications((prev) => [...prev, communication]);
      setCommForm({ fromId: ME, toId: defaultToId, date: new Date().toISOString().slice(0, 10), type: 'email', notes: '' });
      setShowCommForm(false);
    } catch (err) {
      setCommError(err.error ?? 'Failed to log communication');
    } finally {
      setSavingComm(false);
    }
  };

  const updateComm = (updated) => {
    setCommunications((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const deleteComm = async (id) => {
    try {
      await api.delete(`/api/communications/${id}`);
      setCommunications((prev) => prev.filter((c) => c.id !== id));
    } catch {}
  };

  const addTranscript = async (e) => {
    e.preventDefault();
    if (!txForm.text.trim()) { setTxError('Transcript text is required'); return; }
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
      {/* ── Communication Thread ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
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

        {/* Log form */}
        {showCommForm && (
          <form onSubmit={logComm} className="mb-5 p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-3">
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
            <div className="grid grid-cols-2 gap-3">
              <PartySelect
                label="From"
                value={commForm.fromId}
                onChange={(v) => setCommForm((f) => ({ ...f, fromId: v }))}
                contacts={contacts}
              />
              <PartySelect
                label="To"
                value={commForm.toId}
                onChange={(v) => setCommForm((f) => ({ ...f, toId: v }))}
                contacts={contacts}
              />
            </div>
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

        {/* Thread */}
        {communications.length === 0 && !showCommForm ? (
          <p className="text-sm text-slate-500">No communications logged yet.</p>
        ) : (
          <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 space-y-1">
            {grouped.map((item, i) =>
              item.type === 'date' ? (
                <div key={`date-${i}`} className="flex items-center gap-3 py-3">
                  <div className="flex-1 border-t border-slate-800" />
                  <span className="text-xs text-slate-600 flex-shrink-0">{item.label}</span>
                  <div className="flex-1 border-t border-slate-800" />
                </div>
              ) : (
                <MessageBubble
                  key={item.comm.id}
                  comm={item.comm}
                  contacts={contacts}
                  onUpdate={updateComm}
                  onDelete={deleteComm}
                />
              )
            )}
          </div>
        )}
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
