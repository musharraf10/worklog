import { useMemo } from 'react';

const STATUS_COLORS = {
  Completed: {
    bg: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  'In Progress': {
    bg: 'bg-amber-500',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  Pending: {
    bg: 'bg-slate-400',
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  Cancelled: {
    bg: 'bg-rose-500',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
  },
};

const getStatusColor = (status) => {
  return (
    STATUS_COLORS[status] || {
      bg: 'bg-brand-primary',
      badgeBg: 'bg-brand-soft text-brand-dark border-brand-primary/30',
    }
  );
};

export const StatusBreakdown = ({ statuses = [], totalTasks = 0, totalWorkedMinutes = 0 }) => {
  const sortedStatuses = useMemo(() => {
    return [...(statuses || [])].sort(
      (a, b) => (b.workedMinutes || 0) - (a.workedMinutes || 0),
    );
  }, [statuses]);

  if (!sortedStatuses || sortedStatuses.length === 0) {
    return (
      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 shadow-xs text-center">
        <h3 className="text-lg sm:text-xl font-bold text-brand-dark mb-1">Task Status</h3>
        <p className="text-sm text-brand-dark/70">No status records available for this period.</p>
      </div>
    );
  }

  // Single status case: show compact status card without wasting chart space
  if (sortedStatuses.length === 1) {
    const single = sortedStatuses[0];
    const color = getStatusColor(single.status);

    return (
      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
        <div className="pb-3.5 mb-4 border-b border-brand-primary/20 flex items-center justify-between">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-brand-dark">Task Status</h3>
            <p className="text-sm text-brand-dark/75 mt-0.5">Summary of task completion</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${color.badgeBg}`}
          >
            {single.status}
          </span>
        </div>

        <div className="bg-brand-soft/40 border border-brand-primary/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-brand-dark">
                100%
              </span>
              <span className="text-sm font-semibold text-brand-dark/75">
                of all tasks {single.status.toLowerCase()}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-brand-dark/70 mt-1 font-medium">
              Every logged task has been marked as {single.status}.
            </p>
          </div>

          <div className="flex items-center gap-4 text-left sm:text-right shrink-0">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-dark/65 block">
                Total Tasks
              </span>
              <span className="text-lg font-extrabold text-brand-dark">
                {single.tasks}
              </span>
            </div>
            <div className="border-l border-brand-primary/25 pl-4">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-dark/65 block">
                Total Time
              </span>
              <span className="text-lg font-extrabold text-brand-dark">
                {single.workedHours}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 w-full h-2.5 bg-brand-soft/50 rounded-full overflow-hidden">
          <div className={`h-full ${color.bg} rounded-full w-full`} />
        </div>
      </div>
    );
  }

  // Multiple statuses case: show distribution breakdown
  return (
    <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
      <div className="pb-3.5 mb-5 border-b border-brand-primary/20">
        <h3 className="text-lg sm:text-xl font-bold text-brand-dark">Task Status</h3>
        <p className="text-sm text-brand-dark/75 mt-1">
          Distribution across execution states
        </p>
      </div>

      {/* Segmented bar */}
      <div className="w-full h-3 rounded-full overflow-hidden flex bg-brand-soft/50 mb-5">
        {sortedStatuses.map((item) => {
          const pct =
            totalWorkedMinutes > 0
              ? ((item.workedMinutes || 0) / totalWorkedMinutes) * 100
              : totalTasks > 0
              ? (item.tasks / totalTasks) * 100
              : 0;
          const color = getStatusColor(item.status);
          if (pct <= 0) return null;
          return (
            <div
              key={item.status}
              className={`h-full ${color.bg}`}
              style={{ width: `${pct}%` }}
              title={`${item.status}: ${item.tasks} tasks (${item.workedHours})`}
            />
          );
        })}
      </div>

      <div className="space-y-3.5">
        {sortedStatuses.map((item) => {
          const color = getStatusColor(item.status);
          const percentage =
            totalWorkedMinutes > 0
              ? Math.round(((item.workedMinutes || 0) / totalWorkedMinutes) * 100)
              : 0;

          return (
            <div
              key={item.status}
              className="flex items-center justify-between text-sm sm:text-base text-brand-dark gap-2"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${color.bg}`} />
                <span className="font-bold">{item.status}</span>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-right">
                <span className="text-xs sm:text-sm text-brand-dark/75 font-medium">
                  {item.tasks} {item.tasks === 1 ? 'task' : 'tasks'} ({percentage}%)
                </span>
                <span className="font-extrabold text-brand-dark text-sm sm:text-base min-w-[55px]">
                  {item.workedHours}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatusBreakdown;
