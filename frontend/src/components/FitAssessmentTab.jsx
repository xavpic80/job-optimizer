import React, { useState } from 'react';
import { Target, TrendingUp, AlertCircle, Globe, Briefcase, CheckCircle, Loader, RefreshCw } from 'lucide-react';
import api from '../api/client.js';

const TYPE_COLORS = {
  news: 'text-blue-300',
  culture: 'text-purple-300',
  growth: 'text-green-300',
  risk: 'text-red-300',
  hiring: 'text-yellow-300',
};

function ScoreRing({ score }) {
  if (score === null) {
    return (
      <div className="flex-shrink-0 w-16 h-16 rounded-full border-2 border-slate-600 flex items-center justify-center bg-slate-800">
        <span className="text-slate-400 text-xs text-center leading-tight">No CV</span>
      </div>
    );
  }
  const color = score >= 70 ? 'border-green-400 text-green-400' : score >= 50 ? 'border-yellow-400 text-yellow-400' : 'border-red-400 text-red-400';
  return (
    <div className={`flex-shrink-0 w-16 h-16 rounded-full border-2 flex items-center justify-center ${color}`}>
      <span className="font-bold text-sm">{score}%</span>
    </div>
  );
}

export default function FitAssessmentTab({ appId, job, existingScore }) {
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runAssessment = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.post(`/api/applications/${appId}/fit-assessment`);
      setAssessment(data);
    } catch (err) {
      setError(err.error ?? 'Assessment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Initial score chip (before full assessment) */}
      {!assessment && existingScore > 0 && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
          <ScoreRing score={existingScore} />
          <div>
            <p className="text-white font-medium">Initial Match Score</p>
            <p className="text-slate-400 text-sm">Quick keyword comparison from when this job was added.</p>
          </div>
        </div>
      )}

      {/* CTA */}
      {!assessment && (
        <div className="text-center py-10">
          <Target className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
          <p className="text-slate-300 font-medium mb-1">Full Fit Assessment</p>
          <p className="text-slate-500 text-sm mb-6">
            Claude analyses your CV against the job requirements, then searches the web for company news,
            culture signals, and other open roles — and gives you honest, specific feedback.
          </p>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <button
            onClick={runAssessment}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Target className="w-5 h-5" />}
            {loading ? 'Analysing… this may take 30 s' : 'Run Fit Assessment'}
          </button>
        </div>
      )}

      {/* Results */}
      {assessment && (
        <div className="space-y-4">
          {/* Score + Summary */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <ScoreRing score={assessment.fitScore} />
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Fit Assessment</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{assessment.fitSummary}</p>
              </div>
            </div>
            {assessment.disclaimer && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-300">{assessment.disclaimer}</p>
              </div>
            )}
          </div>

          {/* Strengths */}
          {assessment.strengths?.length > 0 && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" /> Strengths
              </h3>
              <div className="space-y-3">
                {assessment.strengths.map((s, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium text-green-400">{s.title}</p>
                    <p className="text-sm text-slate-300 mt-0.5">{s.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gaps */}
          {assessment.gaps?.length > 0 && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" /> Gaps
              </h3>
              <div className="space-y-3">
                {assessment.gaps.map((g, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium text-yellow-400">{g.title}</p>
                    <p className="text-sm text-slate-300 mt-0.5">{g.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Company Insights */}
          {assessment.companyInsights?.length > 0 && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" /> Company Insights
              </h3>
              <div className="space-y-3">
                {assessment.companyInsights.map((ins, i) => (
                  <div key={i} className={i > 0 ? 'border-t border-slate-800 pt-3' : ''}>
                    <p className={`text-sm font-medium ${TYPE_COLORS[ins.type] ?? 'text-slate-300'}`}>{ins.title}</p>
                    <p className="text-sm text-slate-300 mt-0.5">{ins.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Openings */}
          {assessment.otherOpenings?.length > 0 && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-400" /> Other Openings at {job?.company}
              </h3>
              <div className="space-y-3">
                {assessment.otherOpenings.map((o, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium text-purple-300">{o.title}</p>
                    <p className="text-sm text-slate-400 mt-0.5">{o.relevance}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prep Tips */}
          {assessment.preparationTips?.length > 0 && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-cyan-400" /> Preparation Tips
              </h3>
              <ul className="space-y-2">
                {assessment.preparationTips.map((tip, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-cyan-400 flex-shrink-0 mt-0.5">•</span> {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={runAssessment}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-run assessment
          </button>
        </div>
      )}
    </div>
  );
}
