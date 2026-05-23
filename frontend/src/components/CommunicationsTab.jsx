import React, { useState, useEffect } from 'react';
import { Mail, Phone, Video, Plus, X, Trash2, User, ExternalLink } from 'lucide-react';
import api from '../api/client.js';

const COMM_TYPES = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone_call', label: 'Phone Call', icon: Phone },
  { value: 'video_call', label: 'Video Call', icon: Video },
];

function initials(c) {
  return `${c.first_name?.[0] ?? ''}${c.last_name?.[0] ?? ''}`.toUpperCase();
}

function ContactCard({ contact, onDelete }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
      <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-semibold text-cyan-300">{initials(contact)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{contact.first_name} {contact.last_name}</p>
        {contact.role && <p className="text-xs text-slate-400">{contact.role}</p>}
      </div>
      <div className="flex items-center gap-2">
        {contact.linkedin_url && (
          <a
            href={contact.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-cyan-400 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button onClick={() => onDelete(contact.id)} className="text-slate-600 hover:text-red-400 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

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

export default function CommunicationsTab({ appId, initialCommunications = [] }) {
  const [contacts, setContacts] = useState([]);
  const [communications, setCommunications] = useState(initialCommunications);

  useEffect(() => {
    api.get(`/api/applications/${appId}/contacts`)
      .then(setContacts)
      .catch(() => setContacts([]));
  }, [appId]);

  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ firstName: '', lastName: '', role: '', linkedinUrl: '' });
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState('');

  const [showCommForm, setShowCommForm] = useState(false);
  const [commForm, setCommForm] = useState({ contactId: '', date: new Date().toISOString().slice(0, 10), type: 'email', notes: '' });
  const [savingComm, setSavingComm] = useState(false);
  const [commError, setCommError] = useState('');

  const addContact = async (e) => {
    e.preventDefault();
    setSavingContact(true);
    setContactError('');
    try {
      const { contact } = await api.post(`/api/applications/${appId}/contacts`, contactForm);
      setContacts((prev) => [...prev, contact]);
      setContactForm({ firstName: '', lastName: '', role: '', linkedinUrl: '' });
      setShowContactForm(false);
    } catch (err) {
      setContactError(err.error ?? 'Failed to save contact');
    } finally {
      setSavingContact(false);
    }
  };

  const deleteContact = async (contactId) => {
    try {
      await api.delete(`/api/applications/${appId}/contacts/${contactId}`);
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      setCommunications((prev) => prev.map((c) => c.contact_id === contactId ? { ...c, contact_id: null } : c));
    } catch {
      // silently ignore — contact may already be gone
    }
  };

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

  return (
    <div className="space-y-8">
      {/* ── Contacts ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" /> Contacts
          </h2>
          {!showContactForm && (
            <button
              onClick={() => setShowContactForm(true)}
              className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>

        {showContactForm && (
          <form onSubmit={addContact} className="mb-3 p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">First Name *</label>
                <input
                  value={contactForm.firstName}
                  onChange={(e) => setContactForm((f) => ({ ...f, firstName: e.target.value }))}
                  required
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Last Name *</label>
                <input
                  value={contactForm.lastName}
                  onChange={(e) => setContactForm((f) => ({ ...f, lastName: e.target.value }))}
                  required
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Role / Title</label>
              <input
                value={contactForm.role}
                onChange={(e) => setContactForm((f) => ({ ...f, role: e.target.value }))}
                placeholder="e.g. Talent Acquisition Manager"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">LinkedIn Profile URL</label>
              <input
                value={contactForm.linkedinUrl}
                onChange={(e) => setContactForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
                placeholder="https://linkedin.com/in/..."
                type="url"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            {contactError && <p className="text-sm text-red-400">{contactError}</p>}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={savingContact}
                className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-400 disabled:opacity-50 transition-colors"
              >
                {savingContact ? 'Saving…' : 'Save Contact'}
              </button>
              <button
                type="button"
                onClick={() => { setShowContactForm(false); setContactError(''); }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {contacts.length === 0 && !showContactForm && (
          <p className="text-sm text-slate-500">No contacts yet. Add someone you spoke to about this role.</p>
        )}
        <div className="space-y-2">
          {contacts.map((c) => (
            <ContactCard key={c.id} contact={c} onDelete={deleteContact} />
          ))}
        </div>
      </section>

      {/* ── Communication Log ─────────────────────────────────── */}
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
    </div>
  );
}
