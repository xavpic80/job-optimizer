import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Zap, Download,
  ChevronDown, Trash2,
} from 'lucide-react';
import api from '../api/client.js';
import FitAssessmentTab from '../components/FitAssessmentTab.jsx';
import CommunicationsTab from '../components/CommunicationsTab.jsx';
import MeetingPrepTab from '../components/MeetingPrepTab.jsx';

const STATUS_OPTIONS = [
  'saved', 'applied', 'screening', 'interview_scheduled',
  'interview_completed', 'final_round', 'offer', 'rejected',
];

const STATUS_LABELS = {
  saved: 'Saved', applied: 'Applied', screening: 'Screening',
  interview_scheduled: 'Interview Scheduled', interview_completed: 'Interview Completed',
  final_round: 'Final Round', offer: 'Offer', rejected: 'Rejected',
};

const TABS = ['Overview', 'Fit Assessment', 'Optimize', 'Communications', 'Meeting Prep', 'Transcripts'];

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Overview');
  const [optimizing, setOptimizing] = useState(false);
  const [optimizations, setOptimizations] = useState(null);
  const [statusChanging, setStatusChanging] = useState(false);

  useEffect(() => {
    api.get(`/api/applications/${id}`)
      .then(setApp)
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (status) => {
    setStatusChanging(true);
    try {
      const updated = await api.patch(`/api/applications/${id}`, { status });
      setApp((prev) => ({ ...prev, ...updated.application }));
    } finally {
      setStatusChanging(false);
    }
  };

  const runOptimize = async () => {
    setOptimizing(true);
    try {
      const data = await api.post(`/api/applications/${id}/optimize`, {
        outputFormats: ['cv', 'cover_letter', 'email', 'interview_prep'],
      });
      setOptimizations(data.optimizations);
    } catch (err) {
      alert(err.error ?? 'Optimization failed');
    } finally {
      setOptimizing(false);
    }
  };

  const deleteApp = async () => {
    if (!confirm('Delete this application?')) return;
    await api.delete(`/api/applications/${id}`);
    navigate('/');
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-slate-400">Loading...</div>;
  if (!app) return null;

  const job = app.jobs ?? {};

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link to="/" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-white truncate">{job.title}</h1>
            <p className="text-xs text-slate-400">{job.company}</p>
          </div>
          <button onClick={deleteApp} className="text-slate-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Status + score */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">Status:</label>
            <select
              value={app.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={statusChanging}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          {job.match_score > 0 && (
            <span className="text-sm text-cyan-400 font-medium">{job.match_score}% match</span>
          )}
          <a
            href={`/api/applications/${id}/export/pdf`}
            target="_blank"
            className="ml-auto inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <Download className="w-4 h-4" /> Export PDF
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-900 p-1 rounded-lg overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-shrink-0 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'Overview' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-3">Job Description</h2>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{job.description}</p>
            </div>
            {app.notes && (
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                <h2 className="font-semibold text-white mb-2">Notes</h2>
                <p className="text-sm text-slate-300">{app.notes}</p>
              </div>
            )}
            {job.keywords?.length > 0 && (
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                <h2 className="font-semibold text-white mb-3">Keywords</h2>
                <div className="flex flex-wrap gap-2">
                  {job.keywords.map((k) => (
                    <span key={k} className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs rounded-full">{k}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'Fit Assessment' && (
          <FitAssessmentTab appId={id} job={job} existingScore={job.match_score} />
        )}

        {tab === 'Optimize' && (
          <div className="space-y-4">
            {!optimizations && (
              <div className="text-center py-10">
                <Zap className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                <p className="text-slate-400 mb-6">Generate AI-powered optimizations for your CV, cover letter, email, and interview prep.</p>
                <button
                  onClick={runOptimize} disabled={optimizing}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  <Zap className="w-5 h-5" />
                  {optimizing ? 'Optimizing...' : 'Run Optimization'}
                </button>
              </div>
            )}
            {optimizations && (
              <div className="space-y-4">
                {optimizations.cv && (
                  <Section title="CV Optimization" score={optimizations.cv.matchScore}>
                    {optimizations.cv.strengths?.length > 0 && (
                      <div><p className="text-sm font-medium text-green-400 mb-1">Strengths</p>
                        <ul className="text-sm text-slate-300 space-y-1">{optimizations.cv.strengths.map((s, i) => <li key={i}>• {s}</li>)}</ul>
                      </div>
                    )}
                    {optimizations.cv.gaps?.length > 0 && (
                      <div><p className="text-sm font-medium text-yellow-400 mb-1">Gaps</p>
                        <ul className="text-sm text-slate-300 space-y-1">{optimizations.cv.gaps.map((g, i) => <li key={i}>• {g}</li>)}</ul>
                      </div>
                    )}
                  </Section>
                )}
                {optimizations.cover_letter && (
                  <Section title="Cover Letter">
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{optimizations.cover_letter.coverLetter}</p>
                  </Section>
                )}
                {optimizations.email && (
                  <Section title="Application Email">
                    <p className="text-sm font-medium text-slate-400">Subject: <span className="text-white">{optimizations.email.subject}</span></p>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap mt-2">{optimizations.email.body}</p>
                  </Section>
                )}
                {optimizations.interview_prep && (
                  <Section title="Interview Prep">
                    {optimizations.interview_prep.keyQuestions?.map((q, i) => (
                      <div key={i} className="border-t border-slate-700 pt-3 mt-3 first:border-0 first:pt-0 first:mt-0">
                        <p className="text-sm font-semibold text-white mb-1">{q.question}</p>
                        <p className="text-sm text-slate-300">{q.sampleAnswer}</p>
                      </div>
                    ))}
                  </Section>
                )}
                <button onClick={runOptimize} disabled={optimizing} className="text-sm text-cyan-400 hover:underline">
                  Re-run optimization
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'Communications' && (
          <CommunicationsTab
            appId={id}
            initialCommunications={app.communications ?? []}
          />
        )}

        {tab === 'Meeting Prep' && (
          <MeetingPrepTab appId={id} />
        )}

        {tab === 'Transcripts' && (
          <div>
            <p className="text-slate-400 text-sm mb-4">
              {app.transcripts?.length ?? 0} interview transcripts.
            </p>
            <div className="space-y-4">
              {(app.transcripts ?? []).map((t) => (
                <div key={t.id} className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                  <p className="font-semibold text-white mb-1">
                    {t.interview_type ? `${t.interview_type} interview` : 'Interview'} — {new Date(t.interview_date).toLocaleDateString()}
                  </p>
                  {t.interviewer_name && <p className="text-sm text-slate-400 mb-3">with {t.interviewer_name}</p>}
                  {t.coaching_insights?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Coaching Insights</p>
                      {t.coaching_insights.map((ins) => (
                        <div key={ins.id} className="text-sm p-3 bg-slate-800 rounded-lg">
                          <span className={`text-xs font-medium ${ins.insight_type === 'strength' ? 'text-green-400' : ins.insight_type === 'opportunity' ? 'text-yellow-400' : 'text-blue-400'}`}>
                            [{ins.insight_type}]
                          </span>
                          <span className="text-slate-300 ml-2">{ins.feedback}</span>
                          {ins.suggestion && <p className="text-slate-400 mt-1">→ {ins.suggestion}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, score, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-white">{title}</h3>
          {score && <span className="text-xs text-cyan-400 font-medium">{score}% match</span>}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}
