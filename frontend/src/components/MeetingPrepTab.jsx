import React, { useState, useEffect } from 'react';
import {
  CalendarCheck, Loader, RefreshCw, MessageSquare, HelpCircle,
  TrendingUp, AlertCircle, Target, Info, ChevronDown, ChevronUp, User,
} from 'lucide-react';
import api from '../api/client.js';


function Section({ icon: Icon, color, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/40 transition-colors"
      >
        <span className="flex items-center gap-2 font-semibold text-white">
          <Icon className={`w-4 h-4 ${color}`} /> {title}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

function Card({ label, sub, labelColor = 'text-white' }) {
  return (
    <div className="text-sm border-t border-slate-800 pt-3 first:border-0 first:pt-0">
      <p className={`font-medium ${labelColor}`}>{label}</p>
      {sub && <p className="text-slate-400 mt-0.5 leading-relaxed">{sub}</p>}
    </div>
  );
}

export default function MeetingPrepTab({ appId }) {
  const [contacts, setContacts] = useState([]);
  const [contactId, setContactId] = useState('');
  const [prep, setPrep] = useState(null);
  const [prepAt, setPrepAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');

  // Load contacts
  useEffect(() => {
    api.get(`/api/applications/${appId}/contacts`)
      .then((data) => {
        setContacts(data);
        if (data.length > 0) setContactId(data[0].id);
      })
      .catch(() => {});
  }, [appId]);

  // Fetch server cache when contact selection changes
  useEffect(() => {
    setPrep(null);
    setPrepAt(null);
    setFetching(true);
    const qs = contactId ? `?type=meeting_prep&contactId=${contactId}` : '?type=meeting_prep';
    api.get(`/api/applications/${appId}/ai-output${qs}`)
      .then(({ data, generatedAt }) => {
        if (data) { setPrep(data); setPrepAt(generatedAt); }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [appId, contactId]);

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.post(`/api/applications/${appId}/meeting-prep`, {
        contactId: contactId || null,
      });
      setPrep(data);
      setPrepAt(new Date().toISOString());
    } catch (err) {
      setError(err.error ?? 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedContact = contacts.find((c) => c.id === contactId);

  // Detect when AI Background was generated after the last prep run → stale
  const hasBg = !!selectedContact?.ai_background;
  const bgAt = selectedContact?.ai_background_at;
  const prepIsStale = hasBg && prepAt && bgAt && new Date(bgAt) > new Date(prepAt);
  const bgNeverUsed = hasBg && !prepAt; // bg exists but no prep yet

  return (
    <div className="space-y-4">
      {/* Contact selector */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
        <label className="text-xs text-slate-400 block mb-2">Who are you meeting with?</label>
        {contacts.length === 0 ? (
          <p className="text-sm text-slate-500">
            No contacts yet — add contacts in the <span className="text-cyan-400">Contacts</span> tab first.
          </p>
        ) : (
          <select
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="">— No specific contact (generic prep) —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}{c.role ? ` · ${c.role}` : ''}
                {c.ai_background ? ' ✦' : ''}
              </option>
            ))}
          </select>
        )}
        {selectedContact && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {selectedContact.linkedin_url && (
              <p className="text-xs text-slate-500">
                LinkedIn: <a href={selectedContact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">{selectedContact.linkedin_url}</a>
              </p>
            )}
            {hasBg ? (
              <span className="text-xs text-purple-400 flex items-center gap-1">
                ✦ AI Background ready
                {bgAt && <span className="text-slate-600">· {new Date(bgAt).toLocaleDateString()}</span>}
              </span>
            ) : (
              <span className="text-xs text-slate-600">No AI Background — generate one in the Contacts tab for richer prep</span>
            )}
          </div>
        )}
      </div>

      {/* Loading from server */}
      {fetching && (
        <div className="flex justify-center py-8">
          <Loader className="w-5 h-5 animate-spin text-slate-500" />
        </div>
      )}

      {/* Stale-prep banner */}
      {(prepIsStale || bgNeverUsed) && !loading && (
        <div className="flex items-start gap-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
          <AlertCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-purple-300 font-medium">
              {prepIsStale
                ? 'AI Background was updated after this prep was generated'
                : 'AI Background is ready — not yet included in this prep'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Regenerate to include {selectedContact?.first_name}'s full AI-researched profile in the prep.
            </p>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="text-xs text-purple-400 hover:text-purple-300 font-medium flex-shrink-0 disabled:opacity-50"
          >
            Regenerate →
          </button>
        </div>
      )}

      {/* CTA */}
      {!prep && (
        <div className="text-center py-8">
          <CalendarCheck className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
          <p className="text-slate-300 font-medium mb-1">Meeting Preparation</p>
          <p className="text-slate-500 text-sm mb-6">
            Claude researches the contact online, then combines their profile with the job description,
            your CV, and your communication history to build a targeted prep guide.
          </p>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <button
            onClick={generate}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading
              ? <Loader className="w-5 h-5 animate-spin" />
              : <CalendarCheck className="w-5 h-5" />}
            {loading ? 'Preparing… this may take 30 s' : 'Generate Meeting Prep'}
          </button>
        </div>
      )}

      {/* Results */}
      {prep && (
        <div className="space-y-3">
          {/* Overview */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
            <p className="text-sm text-slate-300 leading-relaxed">{prep.overview}</p>
            {prep.disclaimer && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-300">{prep.disclaimer}</p>
              </div>
            )}
          </div>

          {/* Closing goal */}
          {prep.closingGoal && (
            <div className="flex items-start gap-3 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
              <Target className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wide mb-0.5">Goal for this meeting</p>
                <p className="text-sm text-white">{prep.closingGoal}</p>
              </div>
            </div>
          )}

          {/* Talking points */}
          {prep.talkingPoints?.length > 0 && (
            <Section icon={MessageSquare} color="text-blue-400" title="Talking Points">
              {prep.talkingPoints.map((t, i) => (
                <Card key={i} label={t.topic} sub={t.detail} labelColor="text-blue-300" />
              ))}
            </Section>
          )}

          {/* Questions to ask */}
          {prep.questionsToAsk?.length > 0 && (
            <Section icon={HelpCircle} color="text-purple-400" title="Questions to Ask">
              {prep.questionsToAsk.map((q, i) => (
                <div key={i} className="text-sm border-t border-slate-800 pt-3 first:border-0 first:pt-0">
                  <p className="font-medium text-purple-300">"{q.question}"</p>
                  <p className="text-slate-400 mt-0.5">{q.purpose}</p>
                </div>
              ))}
            </Section>
          )}

          {/* Strengths to highlight */}
          {prep.strengthsToHighlight?.length > 0 && (
            <Section icon={TrendingUp} color="text-green-400" title="Strengths to Highlight">
              {prep.strengthsToHighlight.map((s, i) => (
                <Card key={i} label={s.strength} sub={s.evidence} labelColor="text-green-300" />
              ))}
            </Section>
          )}

          {/* Contact insights */}
          {prep.contactInsights?.length > 0 && (
            <Section icon={User} color="text-yellow-400" title="Contact Insights">
              {prep.contactInsights.map((ins, i) => (
                <div key={i} className="text-sm border-t border-slate-800 pt-3 first:border-0 first:pt-0">
                  <p className="text-yellow-300 font-medium">{ins.insight}</p>
                  {ins.source && <p className="text-slate-500 text-xs mt-0.5">Source: {ins.source}</p>}
                </div>
              ))}
            </Section>
          )}

          {/* Gaps to address */}
          {prep.gapsToAddress?.length > 0 && (
            <Section icon={AlertCircle} color="text-orange-400" title="Gaps to Address Proactively" defaultOpen={false}>
              {prep.gapsToAddress.map((g, i) => (
                <div key={i} className="text-sm border-t border-slate-800 pt-3 first:border-0 first:pt-0">
                  <p className="text-orange-300 font-medium">{g.gap}</p>
                  <p className="text-slate-400 mt-0.5">{g.strategy}</p>
                </div>
              ))}
            </Section>
          )}

          {/* History context */}
          {prep.historyContext && (
            <Section icon={Info} color="text-slate-400" title="From Your History" defaultOpen={false}>
              <p className="text-sm text-slate-300 leading-relaxed">{prep.historyContext}</p>
            </Section>
          )}

          {/* Re-run */}
          <div className="flex items-center gap-4 pt-1">
            <button
              onClick={generate}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Regenerating…' : 'Regenerate'}
            </button>
            {prepAt && !loading && (
              <span className="text-xs text-slate-600">
                Generated {new Date(prepAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
