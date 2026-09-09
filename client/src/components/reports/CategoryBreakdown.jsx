export const CategoryBreakdown = ({ categories = [], totalWorkedMinutes = 0 }) => {
  if (!categories || categories.length === 0) {
    return (
      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 text-center text-sm text-brand-dark/70">
        No category data available.
      </div>
    );
  }

  return (
    <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 shadow-xs text-left">
      <div className="pb-3.5 mb-5 border-b border-brand-primary/20">
        <h3 className="text-lg sm:text-xl font-bold text-brand-dark">Category Breakdown</h3>
        <p className="text-sm text-brand-dark/75 mt-1">
          Distribution of work across categories
        </p>
      </div>

      <div className="space-y-4">
        {categories.map((item) => {
          const percentage =
            totalWorkedMinutes > 0
              ? Math.round(((item.workedMinutes || 0) / totalWorkedMinutes) * 100)
              : 0;

          return (
            <div key={item.category} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm sm:text-base text-brand-dark">
                <span className="font-bold">{item.category}</span>
                <div className="flex items-center gap-3.5">
                  <span className="text-brand-dark/75 font-medium">
                    {item.tasks} {item.tasks === 1 ? 'task' : 'tasks'} ({percentage}%)
                  </span>
                  <span className="font-extrabold text-brand-dark">{item.workedHours}</span>
                </div>
              </div>

              <div className="w-full h-2.5 bg-brand-soft/40 rounded-full overflow-hidden">
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

export default CategoryBreakdown;
