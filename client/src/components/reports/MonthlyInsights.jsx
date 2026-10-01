import { useMemo } from 'react';
import { formatDate } from '../../utils/dateUtils';

export const MonthlyInsights = ({
  dailySummary = [],
  categorySummary = [],
  activitySummary = [],
  sectionSummary = [],
  prioritySummary = [],
}) => {
  const mostActiveDay = useMemo(() => {
    if (!dailySummary || dailySummary.length === 0) return null;
    return dailySummary.reduce(
      (peak, d) =>
        !peak || (d.workedMinutes || 0) > (peak.workedMinutes || 0) ? d : peak,
      null,
    );
  }, [dailySummary]);

  const topCategory = useMemo(() => {
    if (!categorySummary || categorySummary.length === 0) return null;
    return categorySummary.reduce(
      (top, c) =>
        !top || (c.workedMinutes || 0) > (top.workedMinutes || 0) ? c : top,
      null,
    );
  }, [categorySummary]);

  const topActivity = useMemo(() => {
    if (!activitySummary || activitySummary.length === 0) return null;
    return activitySummary.reduce(
      (top, a) =>
        !top || (a.workedMinutes || 0) > (top.workedMinutes || 0) ? a : top,
      null,
    );
  }, [activitySummary]);

  const topSection = useMemo(() => {
    if (!sectionSummary || sectionSummary.length === 0) return null;
    return sectionSummary.reduce(
      (top, s) =>
        !top || (s.workedMinutes || 0) > (top.workedMinutes || 0) ? s : top,
      null,
    );
  }, [sectionSummary]);

  const primaryPriority = useMemo(() => {
    if (!prioritySummary || prioritySummary.length === 0) return null;
    return prioritySummary.reduce(
      (top, p) =>
        !top || (p.workedMinutes || 0) > (top.workedMinutes || 0) ? p : top,
      null,
    );
  }, [prioritySummary]);

  const topSectionName = topSection?.hallSection?.trim() || (topSection ? 'Not Specified' : null);

  const insightItems = [
    {
      title: 'Most Active Day',
      primary: mostActiveDay ? formatDate(mostActiveDay.date, true) : '—',
      secondary: mostActiveDay
        ? `${mostActiveDay.workedHours} • ${mostActiveDay.totalTasks} ${
            mostActiveDay.totalTasks === 1 ? 'task' : 'tasks'
          }`
        : 'No entries logged',
    },
    {
      title: 'Top Category',
      primary: topCategory ? topCategory.category : '—',
      secondary: topCategory
        ? `${topCategory.workedHours} • ${topCategory.tasks} ${
            topCategory.tasks === 1 ? 'task' : 'tasks'
          }`
        : 'No entries logged',
    },
    {
      title: 'Top Activity',
      primary: topActivity ? topActivity.activityType : '—',
      secondary: topActivity
        ? `${topActivity.workedHours} • ${topActivity.tasks} ${
            topActivity.tasks === 1 ? 'task' : 'tasks'
          }`
        : 'No entries logged',
    },
    {
      title: 'Top Hall / Section',
      primary: topSectionName || '—',
      secondary: topSection
        ? `${topSection.workedHours} • ${topSection.tasks} ${
            topSection.tasks === 1 ? 'task' : 'tasks'
          }`
        : 'No entries logged',
    },
    {
      title: 'Primary Priority',
      primary: primaryPriority ? primaryPriority.priority : '—',
      secondary: primaryPriority
        ? `${primaryPriority.workedHours} • ${primaryPriority.tasks} ${
            primaryPriority.tasks === 1 ? 'task' : 'tasks'
          }`
        : 'No entries logged',
    },
  ];

  return (
    <section className="space-y-2 text-left">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-brand-dark/70">
          Monthly Highlights & Insights
        </h3>
        <span className="text-xs text-brand-dark/60 font-medium">Derived from logged entries</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {insightItems.map((item) => (
          <div
            key={item.title}
            className="bg-brand-light border border-brand-primary/25 rounded-2xl p-4 sm:p-4.5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-dark/65 block">
                {item.title}
              </span>
              <p
                className="text-base sm:text-lg font-extrabold text-brand-dark mt-1.5 truncate"
                title={item.primary}
              >
                {item.primary}
              </p>
            </div>
            <p className="text-xs text-brand-primary font-semibold mt-2.5 truncate">
              {item.secondary}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default MonthlyInsights;
