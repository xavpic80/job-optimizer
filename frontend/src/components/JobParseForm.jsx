import React, { useState } from 'react';
import { Zap, AlertCircle } from 'lucide-react';
import api from '../api/client.js';

export default function JobParseForm({ onJobParsed, userCV }) {
  const [input, setInput]           = useState('');
  const [postingDate, setPostingDate] = useState('');
  const [titleOverride, setTitleOverride]     = useState('');
  const [companyOverride, setCompanyOverride] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return setError('Please enter a job URL or description');
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/api/jobs/parse', {
        input,
        userCV,
        postingDate: postingDate || null,
        titleOverride: titleOverride.trim() || null,
        companyOverride: companyOverride.trim() || null,
      });
      onJobParsed(data.job);
      setInput('');
      setPostingDate('');
      setTitleOverride('');
      setCompanyOverride('');
    } catch (err) {
      setError(err.error ?? 'Failed to parse job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Job title + company row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Job Title <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={titleOverride}
            onChange={(e) => setTitleOverride(e.target.value)}
            placeholder="Auto-detected from description"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Company <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={companyOverride}
            onChange={(e) => setCompanyOverride(e.target.value)}
            placeholder="Auto-detected from description"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Job URL or Description
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a job URL (Indeed, company page) or raw job description text..."
          rows={5}
          className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-slate-200 text-sm focus:outline-none focus:border-cyan-500 resize-none"
        />
        <p className="text-xs text-slate-500 mt-1">
          LinkedIn blocks automated scraping — paste the job description as text instead.
        </p>
      </div>

      {/* Posting date */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Posting Date <span className="text-slate-500 font-normal">(optional)</span>
        </label>
        <input
          type="date"
          value={postingDate}
          onChange={(e) => setPostingDate(e.target.value)}
          className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
        />
      </div>

      {error && (
        <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !input.trim()}
        className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
      >
        <Zap className="w-5 h-5" />
        {loading ? 'Parsing...' : 'Parse & Add Job'}
      </button>
    </form>
  );
}
