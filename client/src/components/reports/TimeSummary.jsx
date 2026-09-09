import { formatDate } from '../../utils/dateUtils';

export const TimeSummary = ({ dailyData = [] }) => {
  if (!dailyData || dailyData.length === 0) {
    return (
      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 text-center text-sm text-brand-dark/70">
        No daily records found for this timeframe.
      </div>
    );
  }

  const maxMinutes = Math.max(...dailyData.map((d) => d.workedMinutes || 0), 60);

  return (
    <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 shadow-xs text-left">
      <div className="pb-3.5 mb-5 border-b border-brand-primary/20">
        <h3 className="text-lg sm:text-xl font-bold text-brand-dark">Daily Time Breakdown</h3>
        <p className="text-sm text-brand-dark/75 mt-1">
          Hours and tasks logged per day
        </p>
      </div>

      <div className="space-y-4">
        {dailyData.map((item) => {
          const percentage = Math.min(
            100,
            Math.round(((item.workedMinutes || 0) / maxMinutes) * 100),
          );

          return (
            <div key={item.date} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm sm:text-base text-brand-dark">
                <span className="font-bold">{formatDate(item.date, true)}</span>
                <div className="flex items-center gap-3.5">
                  <span className="text-brand-dark/75 font-medium">
                    {item.totalTasks} {item.totalTasks === 1 ? 'task' : 'tasks'}
                  </span>
                  <span className="font-extrabold text-brand-dark">{item.workedHours}</span>
                </div>
              </div>

              <div className="w-full h-2.5 bg-brand-soft/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-primary to-brand-dark/80 rounded-full transition-all duration-300"
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
