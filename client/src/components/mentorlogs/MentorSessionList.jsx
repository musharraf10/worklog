import { Link } from 'react-router-dom';
import { formatDisplayTime, formatMinutes } from '../../utils/timeUtils';

export default function MentorSessionList({
  sessions,
  selectedSession,
  onSelectSession,
  onSelectToday,
  selectedDate,
  todayDate,
}) {
  return (
    <section className="rounded-2xl border border-brand-primary/25 bg-brand-light p-3 sm:p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between border-b border-brand-primary/20 px-1 pb-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-brand-dark flex items-center gap-1.5">
            <span>Mentoring Sessions</span>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-dark">
              {sessions.length}
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-brand-dark/65">
            Select a session to view or enter questions
          </p>
        </div>
      </div>

      <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
        {sessions.length > 0 ? (
          sessions.map((session) => {
            const isSelected = selectedSession?._id === session._id;
            return (
              <button
                type="button"
                key={session._id}
                onClick={() => onSelectSession(session)}
                className={`w-full rounded-xl border p-3 text-left transition-all duration-150 ${
                  isSelected
                    ? 'border-brand-dark bg-brand-soft/75 shadow-xs ring-1 ring-brand-dark/20'
                    : 'border-brand-primary/15 hover:bg-brand-soft/30 hover:border-brand-primary/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-sm text-brand-dark leading-snug line-clamp-2">
                    {session.task}
                  </p>
                  {session.hasMentorLog ? (
                    <span className="shrink-0 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[11px] font-bold ring-1 ring-emerald-600/20">
                      ✓ Saved
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-dark/70 border border-brand-primary/20">
                      + Setup
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-dark/65">
                  <span className="font-medium">
                    {formatDisplayTime(session.timeFrom)} – {formatDisplayTime(session.timeTo)}
                  </span>
                  <span>•</span>
                  <span className="font-semibold text-brand-dark/80">
                    {formatMinutes(session.spentMinutes)}
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px] text-brand-dark/55">
                  <span className="truncate">{session.activityType || 'Mentoring'}</span>
                  {isSelected && (
                    <span className="font-bold text-brand-primary flex items-center gap-0.5">
                      Selected ➔
                    </span>
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-brand-primary/25 px-4 py-10 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand-dark text-lg">
              🔍
            </div>
            <p className="font-bold text-sm text-brand-dark">No mentoring sessions found</p>
            <p className="mt-1 text-xs text-brand-dark/65 leading-relaxed max-w-xs mx-auto">
              Work Logs with activity <strong className="text-brand-dark">"Mentoring Session"</strong> or <strong className="text-brand-dark">"Doubt Clarification"</strong> will appear here automatically.
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {selectedDate !== todayDate && onSelectToday && (
                <button
                  type="button"
                  onClick={onSelectToday}
                  className="rounded-lg border border-brand-dark/20 bg-brand-soft/50 px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-soft transition"
                >
                  Jump to Today
                </button>
              )}
              <Link
                to="/worklogs"
                className="rounded-lg bg-brand-dark px-3 py-1.5 text-xs font-bold text-brand-light hover:bg-brand-dark/90 shadow-xs transition"
              >
                Go to Work Logs ➔
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
