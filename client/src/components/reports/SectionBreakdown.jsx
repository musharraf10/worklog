import { useMemo } from 'react';

export const SectionBreakdown = ({ sections = [], totalWorkedMinutes = 0 }) => {
  const sortedSections = useMemo(() => {
    return [...(sections || [])].sort(
      (a, b) => (b.workedMinutes || 0) - (a.workedMinutes || 0),
    );
  }, [sections]);

  if (!sortedSections || sortedSections.length === 0) {
    return (
      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 shadow-xs text-center">
        <h3 className="text-lg sm:text-xl font-bold text-brand-dark mb-1">Work by Hall / Section</h3>
        <p className="text-sm text-brand-dark/70">No hall or section records found for this period.</p>
      </div>
    );
  }

  const maxMinutes = sortedSections[0]?.workedMinutes || 1;

  return (
    <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
      <div className="pb-3.5 mb-5 border-b border-brand-primary/20">
        <h3 className="text-lg sm:text-xl font-bold text-brand-dark">Work by Hall / Section</h3>
        <p className="text-sm text-brand-dark/75 mt-1">
          Distribution across locations and halls (sorted by worked time)
        </p>
      </div>

      <div className="space-y-4">
        {sortedSections.map((item, idx) => {
          const rawSection = item.hallSection?.trim();
          const displayName = rawSection || 'Not Specified';
          const isNotSpecified = !rawSection;

          const percentage =
            totalWorkedMinutes > 0
              ? Math.round(((item.workedMinutes || 0) / totalWorkedMinutes) * 100)
              : 0;

          const barPercentage = Math.max(
            3,
            Math.min(100, Math.round(((item.workedMinutes || 0) / maxMinutes) * 100)),
          );

          return (
            <div key={`${displayName}-${idx}`} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm sm:text-base text-brand-dark gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`font-bold truncate ${
                      isNotSpecified ? 'italic text-brand-dark/70' : 'text-brand-dark'
                    }`}
                    title={displayName}
                  >
                    {displayName}
                  </span>
                  {isNotSpecified && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-brand-soft border border-brand-primary/20 text-brand-dark/70 font-semibold uppercase">
                      Unassigned
                    </span>
                  )}
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
                  className="h-full bg-brand-primary/85 rounded-full transition-all duration-300"
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

export default SectionBreakdown;
