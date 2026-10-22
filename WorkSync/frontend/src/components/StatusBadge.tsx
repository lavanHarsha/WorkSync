import React from 'react';
import { CheckCircle2, XCircle, Clock, AlertCircle, PlayCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'success' | 'failed' | 'running' | 'active' | 'inactive' | 'skipped' | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = (status || '').toLowerCase();

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  if (norm === 'success') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 ${sizeClasses}`}
      >
        <CheckCircle2 size={12} className="text-emerald-500" />
        Success
      </span>
    );
  }

  if (norm === 'failed') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 ${sizeClasses}`}
      >
        <XCircle size={12} className="text-rose-500" />
        Failed
      </span>
    );
  }

  if (norm === 'running') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 ${sizeClasses}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
        Running
      </span>
    );
  }

  if (norm === 'active' || norm === 'true') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 ${sizeClasses}`}
      >
        <span className="w-2 h-2 rounded-full bg-indigo-500" />
        Active
      </span>
    );
  }

  if (norm === 'inactive' || norm === 'false') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200 ${sizeClasses}`}
      >
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        Paused
      </span>
    );
  }

  if (norm === 'skipped') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200 ${sizeClasses}`}
      >
        <AlertCircle size={12} className="text-slate-400" />
        Skipped
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}
    >
      <Clock size={12} className="text-slate-400" />
      {status}
    </span>
  );
};
