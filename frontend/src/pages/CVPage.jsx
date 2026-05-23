import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Save, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '../api/client.js';

export default function CVPage() {
  const [cvText, setCvText] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/cv/current')
      .then((data) => setCvText(data.cv_text ?? ''))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const handleSave = async () => {
    if (!cvText.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/api/cv', { cvText });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.error ?? 'Failed to save CV');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </Link>
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-7 h-7 text-cyan-400" />
        <h1 className="text-2xl font-bold text-white">My CV</h1>
      </div>
      <p className="text-slate-400 mb-4 text-sm">
        Paste your full CV here. It will be used to generate match scores and optimizations.
      </p>
      {error && <p className="text-sm text-red-400 mb-4 bg-red-500/10 border border-red-500/20 rounded p-3">{error}</p>}
      {fetching ? (
        <div className="h-64 bg-slate-900 rounded-xl animate-pulse" />
      ) : (
        <textarea
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
          placeholder="Paste your CV text here..."
          className="w-full h-96 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 text-sm font-mono focus:outline-none focus:border-cyan-500 resize-none"
        />
      )}
      <button
        onClick={handleSave} disabled={loading || !cvText.trim()}
        className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {saved ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
        {saved ? 'Saved!' : loading ? 'Saving...' : 'Save CV'}
      </button>
    </div>
  );
}
