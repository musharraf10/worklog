import { useMemo } from 'react';

export const ActivityBreakdown = ({ activities = [], totalWorkedMinutes = 0 }) => {
  const sortedActivities = useMemo(() => {
    return [...(activities || [])].sort(
      (a, b) => (b.workedMinutes || 0) - (a.workedMinutes || 0),
    );
  }, [activities]);

  if (!sortedActivities || sortedActivities.length === 0) {
    return (
      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 shadow-xs text-center">
        <h3 className="text-lg sm:text-xl font-bold text-brand-dark mb-1">Activity Type Breakdown</h3>
        <p className="text-sm text-brand-dark/70">No activity type data available for this period.</p>
      </div>
    );
  }

  const maxMinutes = sortedActivities[0]?.workedMinutes || 1;

  return (
    <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
      <div className="pb-3.5 mb-5 border-b border-brand-primary/20">
        <h3 className="text-lg sm:text-xl font-bold text-brand-dark">Activity Type Breakdown</h3>
        <p className="text-sm text-brand-dark/75 mt-1">
          Distribution by task activity type (sorted by worked time)
        </p>
      </div>

      <div className="space-y-4">
        {sortedActivities.map((item) => {
          const percentage =
            totalWorkedMinutes > 0
              ? Math.round(((item.workedMinutes || 0) / totalWorkedMinutes) * 100)
              : 0;

          const barPercentage = Math.max(
            3,
            Math.min(100, Math.round(((item.workedMinutes || 0) / maxMinutes) * 100)),
          );

          return (
            <div key={item.activityType} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm sm:text-base text-brand-dark gap-2">
                <span className="font-bold truncate" title={item.activityType}>
                  {item.activityType}
                </span>
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
                  className="h-full bg-brand-dark/80 rounded-full transition-all duration-300"
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

export default ActivityBreakdown;
