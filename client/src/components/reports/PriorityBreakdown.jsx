import { useMemo } from 'react';

const PRIORITY_THEME = {
  Highest: {
    bar: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  High: {
    bar: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  Medium: {
    bar: 'bg-sky-500',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  Low: {
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  Adhoc: {
    bar: 'bg-purple-500',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
  },
};

const getPriorityStyle = (priority) => {
  return (
    PRIORITY_THEME[priority] || {
      bar: 'bg-brand-primary',
      badge: 'bg-brand-soft text-brand-dark border-brand-primary/30',
    }
  );
};

export const PriorityBreakdown = ({ priorities = [], totalWorkedMinutes = 0 }) => {
  const sortedPriorities = useMemo(() => {
    return [...(priorities || [])].sort(
      (a, b) => (b.workedMinutes || 0) - (a.workedMinutes || 0),
    );
  }, [priorities]);

  if (!sortedPriorities || sortedPriorities.length === 0) {
    return (
      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 shadow-xs text-center">
        <h3 className="text-lg sm:text-xl font-bold text-brand-dark mb-1">Work by Priority</h3>
        <p className="text-sm text-brand-dark/70">No priority data available for this period.</p>
      </div>
    );
  }

  const maxMinutes = sortedPriorities[0]?.workedMinutes || 1;

  return (
    <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
      <div className="pb-3.5 mb-5 border-b border-brand-primary/20">
        <h3 className="text-lg sm:text-xl font-bold text-brand-dark">Work by Priority</h3>
        <p className="text-sm text-brand-dark/75 mt-1">
          Distribution of work across priority levels (sorted by worked time)
        </p>
      </div>

      <div className="space-y-4">
        {sortedPriorities.map((item) => {
          const style = getPriorityStyle(item.priority);
          const percentage =
            totalWorkedMinutes > 0
              ? Math.round(((item.workedMinutes || 0) / totalWorkedMinutes) * 100)
              : 0;

          const barPercentage = Math.max(
            3,
            Math.min(100, Math.round(((item.workedMinutes || 0) / maxMinutes) * 100)),
          );

          return (
            <div key={item.priority} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm sm:text-base text-brand-dark gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${style.badge}`}
                  >
                    {item.priority}
                  </span>
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

              <div className="w-full h-2.5 bg-brand-soft/50 rounded-full overflow-hidden">
                <div
                  className={`h-full ${style.bar} rounded-full transition-all duration-300`}
                  style={{ width: `${barPercentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PriorityBreakdown;
