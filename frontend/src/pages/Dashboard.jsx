import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, FileText, LogOut, Plus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';
import JobParseForm from '../components/JobParseForm.jsx';
import ApplicationCard from '../components/ApplicationCard.jsx';

const STATUSES = [
  'all', 'saved', 'applied', 'screening',
  'interview_scheduled', 'interview_completed', 'final_round', 'offer', 'rejected',
];

const STATUS_LABELS = {
  all: 'All', saved: 'Saved', applied: 'Applied', screening: 'Screening',
  interview_scheduled: 'Interview', interview_completed: 'Interviewed',
  final_round: 'Final Round', offer: 'Offer', rejected: 'Rejected',
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [applications, setApplications] = useState([]);
  const [currentCV, setCurrentCV] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showAddJob, setShowAddJob] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/applications'),
      api.get('/api/cv/current').catch(() => null),
    ]).then(([apps, cv]) => {
      setApplications(apps ?? []);
      setCurrentCV(cv);
    }).finally(() => setLoading(false));
  }, []);

  const handleJobParsed = async (job) => {
    const app = await api.post('/api/applications', { jobId: job.id });
    setApplications((prev) => [{ ...app.application, jobs: job }, ...prev]);
    setShowAddJob(false);
  };

  const filtered = filter === 'all'
    ? applications
    : applications.filter((a) => a.status === filter);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-cyan-400" />
            <span className="font-bold text-white">JobOptimizer 3000</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/cv" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
              <FileText className="w-4 h-4" /> CV
            </Link>
            <span className="text-slate-600">|</span>
            <span className="text-sm text-slate-400">{user?.full_name ?? user?.email}</span>
            <button onClick={logout} className="text-slate-500 hover:text-white transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Add Job Panel */}
        {showAddJob ? (
          <div className="mb-8 bg-slate-900 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Add New Job</h2>
              <button onClick={() => setShowAddJob(false)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {!currentCV && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-300">
                Add your CV first to get match scores.{' '}
                <Link to="/cv" className="underline">Upload CV →</Link>
              </div>
            )}
            <JobParseForm onJobParsed={handleJobParsed} userCV={currentCV?.cv_text} />
          </div>
        ) : (
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Applications</h1>
              <p className="text-slate-400 text-sm mt-1">{applications.length} total</p>
            </div>
            <button
              onClick={() => setShowAddJob(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" /> Add Job
            </button>
          </div>
        )}

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === s
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Application List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-900 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            {filter === 'all' ? 'No applications yet. Add your first job above.' : `No ${STATUS_LABELS[filter]} applications.`}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((app) => (
              <ApplicationCard key={app.id} application={app} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
