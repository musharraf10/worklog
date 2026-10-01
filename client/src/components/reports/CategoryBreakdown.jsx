import { useMemo } from 'react';

export const CategoryBreakdown = ({ categories = [], totalWorkedMinutes = 0 }) => {
  const sortedCategories = useMemo(() => {
    return [...(categories || [])].sort(
      (a, b) => (b.workedMinutes || 0) - (a.workedMinutes || 0),
    );
  }, [categories]);

  if (!sortedCategories || sortedCategories.length === 0) {
    return (
      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 shadow-xs text-center">
        <h3 className="text-lg sm:text-xl font-bold text-brand-dark mb-1">Time by Category</h3>
        <p className="text-sm text-brand-dark/70">No category data available for this period.</p>
      </div>
    );
  }

  const maxMinutes = sortedCategories[0]?.workedMinutes || 1;

  return (
    <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
      <div className="pb-3.5 mb-5 border-b border-brand-primary/20">
        <h3 className="text-lg sm:text-xl font-bold text-brand-dark">Time by Category</h3>
        <p className="text-sm text-brand-dark/75 mt-1">
          Distribution of work across categories (sorted by worked time)
        </p>
      </div>

      <div className="space-y-4">
        {sortedCategories.map((item) => {
          const percentage =
            totalWorkedMinutes > 0
              ? Math.round(((item.workedMinutes || 0) / totalWorkedMinutes) * 100)
              : 0;

          const barPercentage = Math.max(
            3,
            Math.min(100, Math.round(((item.workedMinutes || 0) / maxMinutes) * 100)),
          );

          return (
            <div key={item.category} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm sm:text-base text-brand-dark gap-2">
                <span className="font-bold truncate" title={item.category}>
                  {item.category}
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
                  className="h-full bg-brand-primary rounded-full transition-all duration-300"
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

export default CategoryBreakdown;
