export const ActivityBreakdown = ({ activities = [], totalWorkedMinutes = 0 }) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 text-center text-sm text-brand-dark/70">
        No activity type data available.
      </div>
    );
  }

  return (
    <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 shadow-xs text-left">
      <div className="pb-3.5 mb-5 border-b border-brand-primary/20">
        <h3 className="text-lg sm:text-xl font-bold text-brand-dark">Activity Type Breakdown</h3>
        <p className="text-sm text-brand-dark/75 mt-1">
          Distribution by task activity type
        </p>
      </div>

      <div className="space-y-4">
        {activities.map((item) => {
          const percentage =
            totalWorkedMinutes > 0
              ? Math.round(((item.workedMinutes || 0) / totalWorkedMinutes) * 100)
              : 0;

          return (
            <div key={item.activityType} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm sm:text-base text-brand-dark">
                <span className="font-bold">{item.activityType}</span>
                <div className="flex items-center gap-3.5">
                  <span className="text-brand-dark/75 font-medium">
                    {item.tasks} {item.tasks === 1 ? 'task' : 'tasks'} ({percentage}%)
                  </span>
                  <span className="font-extrabold text-brand-dark">{item.workedHours}</span>
                </div>
              </div>

              <div className="w-full h-2.5 bg-brand-soft/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-dark/70 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
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
