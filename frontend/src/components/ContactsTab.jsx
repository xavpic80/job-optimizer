import React, { useState, useEffect, useRef } from 'react';
import {
  User, Plus, X, Trash2, ExternalLink, FileText, Sparkles,
  Loader, ChevronDown, ChevronUp, AlertCircle,
} from 'lucide-react';
import api from '../api/client.js';

function initials(c) {
  return `${c.first_name?.[0] ?? ''}${c.last_name?.[0] ?? ''}`.toUpperCase();
}

const ASSET_TYPE_COLORS = {
  portfolio: 'text-blue-400',
  certification: 'text-green-400',
  recommendation: 'text-purple-400',
  note: 'text-slate-400',
  other: 'text-slate-400',
};

const MAX_PDF_BYTES = 4 * 1024 * 1024; // 4 MB — Vercel Hobby plan cap is 4.5 MB

function ContactCard({ contact, appId, onUpdate, onDelete }) {
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [generatingBg, setGeneratingBg] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);
  const [error, setError] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [linkedinText, setLinkedinText] = useState('');
  const [savingText, setSavingText] = useState(false);
  const fileInputRef = useRef(null);

  const uploadLinkedinPdf = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setError(
        `PDF is ${(file.size / 1024 / 1024).toFixed(1)} MB — too large for upload (4 MB limit). ` +
        `Use "Paste text" instead: open your LinkedIn PDF, select all, copy, and paste below.`
      );
      setShowTextInput(true);
      return;
    }
    setUploadingPdf(true);
    setError('');
    const form = new FormData();
    form.append('pdf', file);
    try {
      const { contact: updated } = await api.post(
        `/api/applications/${appId}/contacts/${contact.id}/linkedin-pdf`,
        form
      );
      onUpdate(updated);
    } catch (err) {
      const msg = err.error ?? 'Failed to upload PDF';
      // Surface the size-limit hint if the server also rejected with 413
      if (msg.includes('413') || msg.toLowerCase().includes('large') || msg.toLowerCase().includes('payload')) {
        setError('File too large for upload. Use "Paste text" instead.');
        setShowTextInput(true);
      } else {
        setError(msg);
      }
    } finally {
      setUploadingPdf(false);
    }
  };

  const saveLinkedinText = async () => {
    if (!linkedinText.trim()) return;
    setSavingText(true);
    setError('');
    try {
      const { contact: updated } = await api.post(
        `/api/applications/${appId}/contacts/${contact.id}/linkedin-pdf`,
        { linkedinText }
      );
      onUpdate(updated);
      setShowTextInput(false);
      setLinkedinText('');
    } catch (err) {
      setError(err.error ?? 'Failed to save');
    } finally {
      setSavingText(false);
    }
  };

  const generateBg = async () => {
    setGeneratingBg(true);
    setError('');
    try {
      const { contact: updated } = await api.post(
        `/api/applications/${appId}/contacts/${contact.id}/background`
      );
      onUpdate(updated);
      setBgOpen(true);
    } catch (err) {
      setError(err.error ?? 'Failed to generate background');
    } finally {
      setGeneratingBg(false);
    }
  };

  const bg = contact.ai_background;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      {/* Main contact row */}
      <div className="flex items-start gap-3 p-4">
        <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-sm font-semibold text-cyan-300">{initials(contact)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white">{contact.first_name} {contact.last_name}</p>
          {contact.role && <p className="text-xs text-slate-400 mt-0.5">{contact.role}</p>}
          {contact.linkedin_url && (
            <a
              href={contact.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline mt-1"
            >
              <ExternalLink className="w-3 h-3" /> LinkedIn
            </a>
          )}
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {/* LinkedIn PDF upload / paste */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadLinkedinPdf(e.target.files[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPdf || savingText}
            title={contact.linkedin_pdf_text ? 'Replace LinkedIn PDF export' : 'Upload LinkedIn PDF export (max 4 MB)'}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50 border border-slate-700 rounded px-2 py-1"
          >
            {uploadingPdf
              ? <Loader className="w-3.5 h-3.5 animate-spin" />
              : <FileText className="w-3.5 h-3.5" />}
            {contact.linkedin_pdf_text ? 'PDF ✓' : 'LinkedIn PDF'}
          </button>
          <button
            onClick={() => setShowTextInput((v) => !v)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors border border-slate-700 rounded px-2 py-1"
            title="Paste LinkedIn profile text instead (for large PDFs)"
          >
            Paste text
          </button>

          {/* AI Background */}
          <button
            onClick={generateBg}
            disabled={generatingBg}
            className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50 border border-purple-500/30 rounded px-2 py-1"
          >
            {generatingBg
              ? <Loader className="w-3.5 h-3.5 animate-spin" />
              : <Sparkles className="w-3.5 h-3.5" />}
            {bg ? 'Regenerate' : 'AI Background'}
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(contact.id)}
            className="text-slate-600 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Paste LinkedIn text panel */}
      {showTextInput && (
        <div className="border-t border-slate-800 p-4 space-y-2">
          <p className="text-xs text-slate-400">
            Open your LinkedIn PDF, select all text (Cmd/Ctrl+A), copy (Cmd/Ctrl+C), and paste below.
          </p>
          <textarea
            value={linkedinText}
            onChange={(e) => setLinkedinText(e.target.value)}
            placeholder="Paste LinkedIn profile text here…"
            rows={5}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none font-mono"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={saveLinkedinText}
              disabled={savingText || !linkedinText.trim()}
              className="px-3 py-1.5 bg-cyan-500 text-white rounded-lg text-xs font-medium hover:bg-cyan-400 disabled:opacity-50 transition-colors"
            >
              {savingText ? 'Saving…' : 'Save Profile Text'}
            </button>
            <button
              onClick={() => { setShowTextInput(false); setLinkedinText(''); setError(''); }}
              className="text-xs text-slate-500 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* AI Background panel */}
      {bg && (
        <div className="border-t border-slate-800">
          <button
            onClick={() => setBgOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-800/50 transition-colors"
          >
            <span className="flex items-center gap-1.5 text-xs font-medium text-purple-400">
              <Sparkles className="w-3.5 h-3.5" />
              AI Background
              {contact.ai_background_at && (
                <span className="text-slate-600 font-normal">
                  · {new Date(contact.ai_background_at).toLocaleDateString()}
                </span>
              )}
            </span>
            {bgOpen
              ? <ChevronUp className="w-4 h-4 text-slate-500" />
              : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>

          {bgOpen && (
            <div className="px-4 pb-4 space-y-3">
              {bg.disclaimer && (
                <div className="flex items-start gap-2 p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-300">{bg.disclaimer}</p>
                </div>
              )}

              {bg.summary && (
                <p className="text-sm text-slate-300 leading-relaxed">{bg.summary}</p>
              )}

              {bg.careerHighlights?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Career Highlights</p>
                  <div className="space-y-1.5">
                    {bg.careerHighlights.map((h, i) => (
                      <div key={i} className="text-sm">
                        <span className="text-slate-200">• {h.highlight}</span>
                        {h.source && (
                          <span className="text-xs text-slate-500 ml-1.5">({h.source})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bg.expertise?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Areas of Expertise</p>
                  <div className="flex flex-wrap gap-1.5">
                    {bg.expertise.map((e, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs rounded-full"
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {bg.connectionPoints?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Talking Points</p>
                  <ul className="text-sm text-slate-300 space-y-1">
                    {bg.connectionPoints.map((p, i) => (
                      <li key={i}>• {p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {bg.recentActivity?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Recent Activity</p>
                  <div className="space-y-1.5">
                    {bg.recentActivity.map((a, i) => (
                      <div key={i} className="text-sm">
                        <span className="text-slate-300">• {a.item}</span>
                        {a.source && (
                          <span className="text-xs text-slate-500 ml-1.5">({a.source})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ContactsTab({ appId }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', role: '', linkedinUrl: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    api.get(`/api/applications/${appId}/contacts`)
      .then(setContacts)
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, [appId]);

  const addContact = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const { contact } = await api.post(`/api/applications/${appId}/contacts`, form);
      setContacts((prev) => [...prev, contact]);
      setForm({ firstName: '', lastName: '', role: '', linkedinUrl: '' });
      setShowForm(false);
    } catch (err) {
      setFormError(err.error ?? 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const updateContact = (updated) => {
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const deleteContact = async (contactId) => {
    try {
      await api.delete(`/api/applications/${appId}/contacts/${contactId}`);
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    } catch {}
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
        </p>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Contact
          </button>
        )}
      </div>

      {/* Add Contact Form */}
      {showForm && (
        <form
          onSubmit={addContact}
          className="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">First Name *</label>
              <input
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                required
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Last Name *</label>
              <input
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                required
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Role / Title</label>
            <input
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="e.g. Talent Acquisition Manager"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">LinkedIn URL</label>
            <input
              value={form.linkedinUrl}
              onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
              placeholder="https://linkedin.com/in/..."
              type="url"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-400 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Contact'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(''); }}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* Contact list */}
      {loading ? (
        <div className="h-24 bg-slate-900 rounded-xl animate-pulse" />
      ) : contacts.length === 0 && !showForm ? (
        <div className="text-center py-10 bg-slate-900/50 border border-slate-800 rounded-xl">
          <User className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No contacts yet.</p>
          <p className="text-slate-500 text-xs mt-1">
            Add people you've been in touch with about this role.
            <br />Upload their LinkedIn PDF export for richer AI background analysis.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((c) => (
            <ContactCard
              key={c.id}
              contact={c}
              appId={appId}
              onUpdate={updateContact}
              onDelete={deleteContact}
            />
          ))}
        </div>
      )}
    </div>
  );
}
