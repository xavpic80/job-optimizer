import React, { useState, useEffect } from 'react';
import {
  Sparkles, Loader, RefreshCw, AlertCircle, CheckCircle2,
  ArrowRight, Zap, Rocket, ChevronDown, ChevronUp,
} from 'lucide-react';
import api from '../api/client.js';

const TONE_COLORS = {
  positive: 'bg-green-500/10 border-green-500/20 text-green-300',
  neutral:  'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
  negative: 'bg-orange-500/10 border-orange-500/20 text-orange-300',
};

function toneColor(label = '') {
  const l = label.toLowerCase();
  if (l.includes('confident') || l.includes('specific') || l.includes('compelling')) return TONE_COLORS.positive;
  if (l.includes('passive') || l.includes('vague') || l.includes('generic') || l.includes('weak')) return TONE_COLORS.negative;
  return TONE_COLORS.neutral;
}

function Section({ icon: Icon, color, title, defaultOpen = true, children }) {
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

function BeforeAfter({ before, after }) {
  return (
    <div className="mt-2 space-y-1.5">
      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-xs font-semibold text-red-400 mb-1 uppercase tracking-wide">Before</p>
        <p className="text-sm text-slate-300 italic">"{before}"</p>
      </div>
      <div className="flex justify-center">
        <ArrowRight className="w-4 h-4 text-slate-500" />
      </div>
      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
        <p className="text-xs font-semibold text-green-400 mb-1 uppercase tracking-wide">After</p>
        <p className="text-sm text-slate-200">"{after}"</p>
      </div>
    </div>
  );
}

export default function CommsCoachTab({ appId }) {
  const [coaching, setCoaching] = useState(null);
  const [coachedAt, setCoachedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  // Load from server cache on mount (cross-device)
  useEffect(() => {
    setFetching(true);
    api.get(`/api/applications/${appId}/ai-output?type=comms_coach`)
      .then(({ data, generatedAt }) => {
        if (data) { setCoaching(data); setCoachedAt(generatedAt); }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [appId]);

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.post(`/api/applications/${appId}/comms-coach`, {});
      setCoaching(data);
      setCoachedAt(new Date().toISOString());
    } catch (err) {
      setError(err.error ?? 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="flex justify-center py-12"><Loader className="w-5 h-5 animate-spin text-slate-500" /></div>;

  return (
    <div className="space-y-4">
      {/* Empty state / CTA */}
      {!coaching && (
        <div className="text-center py-10">
          <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <p className="text-slate-300 font-medium mb-1">Communications Coach</p>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            Claude reads every email, text, call, and interview transcript you've logged, then gives you
            brutally honest coaching — specific rewrites, tone analysis, and bold moves to make you unforgettable.
          </p>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <button
            onClick={generate}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading
              ? <Loader className="w-5 h-5 animate-spin" />
              : <Sparkles className="w-5 h-5" />}
            {loading ? 'Analysing your comms… 30s' : 'Get Coaching'}
          </button>
        </div>
      )}

      {/* Results */}
      {coaching && (
        <div className="space-y-3">
          {/* Tone pill + overview */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-3">
            {coaching.toneLabel && (
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${toneColor(coaching.toneLabel)}`}>
                <Sparkles className="w-3.5 h-3.5" />
                {coaching.toneLabel}
              </div>
            )}
            {coaching.toneDescription && (
              <p className="text-sm text-slate-400 leading-relaxed">{coaching.toneDescription}</p>
            )}
            {coaching.overallAssessment && (
              <p className="text-sm text-slate-200 leading-relaxed border-t border-slate-800 pt-3">{coaching.overallAssessment}</p>
            )}
            {coaching.disclaimer && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-300">{coaching.disclaimer}</p>
              </div>
            )}
          </div>

          {/* Strengths */}
          {coaching.strengths?.length > 0 && (
            <Section icon={CheckCircle2} color="text-green-400" title="What You're Doing Well">
              {coaching.strengths.map((s, i) => (
                <div key={i} className="border-t border-slate-800 pt-3 first:border-0 first:pt-0">
                  <p className="font-medium text-green-300 text-sm">{s.title}</p>
                  <p className="text-slate-400 text-sm mt-0.5">{s.detail}</p>
                  {s.quote && (
                    <p className="mt-1.5 text-xs text-slate-500 italic border-l-2 border-green-500/30 pl-2">"{s.quote}"</p>
                  )}
                </div>
              ))}
            </Section>
          )}

          {/* Opportunities with before/after */}
          {coaching.opportunities?.length > 0 && (
            <Section icon={AlertCircle} color="text-orange-400" title="Where to Level Up">
              {coaching.opportunities.map((o, i) => (
                <div key={i} className="border-t border-slate-800 pt-3 first:border-0 first:pt-0">
                  <p className="font-medium text-orange-300 text-sm">{o.title}</p>
                  <p className="text-slate-400 text-sm mt-0.5">{o.detail}</p>
                  {o.before && o.after && (
                    <BeforeAfter before={o.before} after={o.after} />
                  )}
                </div>
              ))}
            </Section>
          )}

          {/* Quick wins */}
          {coaching.quickWins?.length > 0 && (
            <Section icon={Zap} color="text-cyan-400" title="Quick Wins">
              <ul className="space-y-2">
                {coaching.quickWins.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <Zap className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Stand-out moves */}
          {coaching.standOutMoves?.length > 0 && (
            <Section icon={Rocket} color="text-purple-400" title="Stand-Out Moves" defaultOpen={false}>
              <ul className="space-y-2">
                {coaching.standOutMoves.map((move, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <Rocket className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                    {move}
                  </li>
                ))}
              </ul>
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
            {coachedAt && !loading && (
              <span className="text-xs text-slate-600">
                Generated {new Date(coachedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
