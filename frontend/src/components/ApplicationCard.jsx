import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, TrendingUp } from 'lucide-react';

const STATUS_STYLES = {
  saved:                 'bg-slate-600/30 text-slate-300',
  applied:               'bg-blue-500/20 text-blue-300',
  screening:             'bg-yellow-500/20 text-yellow-300',
  interview_scheduled:   'bg-purple-500/20 text-purple-300',
  interview_completed:   'bg-indigo-500/20 text-indigo-300',
  final_round:           'bg-orange-500/20 text-orange-300',
  offer:                 'bg-green-500/20 text-green-300',
  rejected:              'bg-red-500/20 text-red-300',
};

const STATUS_LABELS = {
  saved: 'Saved', applied: 'Applied', screening: 'Screening',
  interview_scheduled: 'Interview Scheduled', interview_completed: 'Interview Completed',
  final_round: 'Final Round', offer: 'Offer', rejected: 'Rejected',
};

export default function ApplicationCard({ application }) {
  const job = application.jobs ?? {};
  const statusStyle = STATUS_STYLES[application.status] ?? STATUS_STYLES.saved;

  return (
    <Link
      to={`/applications/${application.id}`}
      className="block bg-slate-900 border border-slate-700 rounded-xl p-5 hover:border-cyan-500/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-white truncate">{job.title ?? 'Unknown Role'}</h3>
          <p className="text-slate-400 text-sm">{job.company}</p>
        </div>
        <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle}`}>
          {STATUS_LABELS[application.status] ?? application.status}
        </span>
      </div>
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
        {job.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> {job.location}
          </span>
        )}
        {application.applied_date && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Applied {application.applied_date}
          </span>
        )}
        {application.match_score > 0 && (
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> {application.match_score}% match
          </span>
        )}
      </div>
    </Link>
  );
}
