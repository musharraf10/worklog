import { formatDate } from '../../utils/dateUtils';

export const TimeSummary = ({ dailyData = [] }) => {
  if (!dailyData || dailyData.length === 0) {
    return (
      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 shadow-xs text-center text-sm text-brand-dark/70">
        No daily records found for this timeframe.
      </div>
    );
  }

  const maxMinutes = Math.max(...dailyData.map((d) => d.workedMinutes || 0), 60);

  return (
    <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-5 sm:p-6 shadow-xs text-left flex flex-col justify-between">
      <div className="pb-3.5 mb-5 border-b border-brand-primary/20">
        <h3 className="text-lg sm:text-xl font-bold text-brand-dark">Daily Time Breakdown</h3>
        <p className="text-sm text-brand-dark/75 mt-1">
          Hours and tasks logged per active day
        </p>
      </div>

      <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1.5">
        {dailyData.map((item) => {
          const percentage = Math.min(
            100,
            Math.round(((item.workedMinutes || 0) / maxMinutes) * 100),
          );

          return (
            <div key={item.date} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm sm:text-base text-brand-dark gap-2">
                <span className="font-bold truncate">{formatDate(item.date, true)}</span>
                <div className="flex items-center gap-3 shrink-0 text-right">
                  <span className="text-xs sm:text-sm text-brand-dark/75 font-medium">
                    {item.totalTasks} {item.totalTasks === 1 ? 'task' : 'tasks'}
                  </span>
                  <span className="font-extrabold text-brand-dark text-sm sm:text-base min-w-[55px]">
                    {item.workedHours}
                  </span>
                </div>
              </div>

              <div className="w-full h-2.5 bg-brand-soft/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-primary rounded-full transition-all duration-300"
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

export default TimeSummary;
