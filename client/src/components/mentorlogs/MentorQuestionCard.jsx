import { useState } from 'react';

export default function MentorQuestionCard({
  question,
  index,
  onEdit,
  onDelete,
  onToggleStatus,
  isToggling = false,
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isSolved = question.status === 'Solved';

  return (
    <article
      className={`mentor-card-enter rounded-xl border transition-all duration-200 ${
        isSolved
          ? 'border-brand-primary/20 bg-brand-light hover:border-brand-primary/40'
          : 'border-amber-500/25 bg-amber-500/5 hover:border-amber-500/40'
      } p-4 sm:p-5 shadow-xs`}
    >
      {/* Header: Badges and Action Buttons */}
      <div className="flex flex-wrap items-start justify-between gap-2.5 pb-2.5 border-b border-brand-primary/10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-soft text-[11px] font-bold text-brand-dark/70">
            {index + 1}
          </span>

          {/* 1-Tap Status Toggle Button */}
          <button
            type="button"
            disabled={isToggling}
            onClick={() => onToggleStatus && onToggleStatus(question)}
            title="Click to switch status (Solved ↔ Carry Forward)"
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold transition-all active:scale-95 cursor-pointer ${
              isSolved
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 ring-1 ring-emerald-600/20'
                : 'bg-amber-100 text-amber-900 hover:bg-amber-200 ring-1 ring-amber-600/20'
            }`}
          >
            <span>{isSolved ? '✓' : '⏱'}</span>
            <span>{question.status}</span>
            <span className="text-[10px] opacity-60 ml-0.5">⇄</span>
          </button>

          {/* Category Pill */}
          <span className="rounded-lg bg-brand-soft/60 px-2 py-0.5 text-xs font-medium text-brand-dark/75 border border-brand-primary/15">
            {question.category || 'General'}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(question)}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-brand-dark/80 hover:bg-brand-soft hover:text-brand-dark transition-colors"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(question)}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Main Question Body */}
      <div className="mt-3">
        <h4 className="text-sm sm:text-base font-bold text-brand-dark leading-snug">
          {question.question}
        </h4>

        {/* Resolution Section */}
        {question.resolution && (
          <div className="mt-3 rounded-xl border border-brand-primary/15 bg-brand-soft/25 p-3 text-xs sm:text-sm text-brand-dark/85">
            <div className="flex items-center justify-between font-bold text-brand-dark/70 text-xs mb-1">
              <span className="flex items-center gap-1">
                <span>{isSolved ? '💡 Resolution / Solution:' : '📋 Next Steps / Reason:'}</span>
              </span>
              {question.resolution.length > 180 && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-brand-primary hover:underline font-semibold"
                >
                  {isExpanded ? 'Show less' : 'Show all'}
                </button>
              )}
            </div>
            <p className={`whitespace-pre-wrap leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>
              {question.resolution}
            </p>
          </div>
        )}

        {/* Remarks (if any) */}
        {question.remarks && (
          <div className="mt-2.5 flex items-start gap-1.5 text-xs text-brand-dark/65">
            <span className="font-semibold text-brand-dark/75 shrink-0">Note:</span>
            <p className="italic">{question.remarks}</p>
          </div>
        )}
      </div>
    </article>
  );
}
