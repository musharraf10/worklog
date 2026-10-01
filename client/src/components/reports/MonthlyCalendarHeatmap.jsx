import { formatDate } from '../../utils/dateUtils';
import { formatMinutes } from '../../utils/timeUtils';

const getDateKey = (year, month, day) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export const MonthlyCalendarHeatmap = ({ year, month, dailyData = [] }) => {
  const dayDataMap = new Map((dailyData || []).map((day) => [day.date, day]));
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const maxMinutes = Math.max(
    ...(dailyData || []).map((day) => day.workedMinutes || 0),
    1,
  );

  // Pad days before start of month
  const startDayOfWeek = firstDay.getDay(); // 0 = Sun
  const cells = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const getIntensityClass = (minutes) => {
    if (!minutes || minutes === 0) {
      return 'bg-brand-soft/30 text-brand-dark/50 border border-brand-primary/10';
    }
    const ratio = minutes / maxMinutes;
    if (ratio < 0.25) {
      return 'bg-brand-primary/20 text-brand-dark border border-brand-primary/30 font-medium';
    }
    if (ratio < 0.5) {
      return 'bg-brand-primary/45 text-brand-dark border border-brand-primary/40 font-semibold';
    }
    if (ratio < 0.75) {
      return 'bg-brand-primary/75 text-white border border-brand-primary/60 font-bold';
    }
    return 'bg-brand-primary text-white border border-brand-primary font-extrabold shadow-xs';
  };

  return (
    <section className="rounded-2xl border border-brand-primary/25 bg-brand-light p-5 sm:p-6 shadow-xs text-left">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-brand-primary/20 pb-3.5 mb-5">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-brand-dark">Monthly Activity Heatmap</h3>
          <p className="mt-1 text-sm text-brand-dark/75">
            Workload intensity across each calendar day of the month
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-dark/75">
          <span>No Work</span>
          <i
            className="h-3.5 w-3.5 rounded bg-brand-soft/30 border border-brand-primary/15 inline-block"
            title="0m"
          />
          <i
            className="h-3.5 w-3.5 rounded bg-brand-primary/20 border border-brand-primary/30 inline-block"
            title="Low"
          />
          <i
            className="h-3.5 w-3.5 rounded bg-brand-primary/45 inline-block"
            title="Moderate"
          />
          <i
            className="h-3.5 w-3.5 rounded bg-brand-primary/75 inline-block"
            title="High"
          />
          <i
            className="h-3.5 w-3.5 rounded bg-brand-primary inline-block"
            title="Max"
          />
          <span>Intensive</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <span
            key={day}
            className="text-center text-[11px] sm:text-xs font-bold uppercase tracking-wider text-brand-dark/60 py-1"
          >
            {day}
          </span>
        ))}

        {cells.map((day, index) => {
          if (!day) {
            return (
              <div
                key={`empty-${index}`}
                className="aspect-square min-h-9 sm:min-h-12"
                aria-hidden="true"
              />
            );
          }

          const dateKey = getDateKey(year, month, day);
          const dayData = dayDataMap.get(dateKey);
          const minutes = dayData?.workedMinutes || 0;
          const tasks = dayData?.totalTasks || 0;
          const workedHours = dayData?.workedHours || formatMinutes(minutes);

          const tooltip =
            minutes > 0
              ? `${formatDate(dateKey, true)}\nTasks: ${tasks}\nWorked Hours: ${workedHours}`
              : `${formatDate(dateKey, true)}\nNo work logged`;

          return (
            <div
              key={dateKey}
              title={tooltip}
              className={`aspect-square min-h-9 sm:min-h-12 rounded-xl p-1.5 sm:p-2 flex flex-col justify-between transition-all duration-150 hover:ring-2 hover:ring-brand-primary/60 cursor-pointer ${getIntensityClass(
                minutes,
              )}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm leading-none font-bold">
                  {day}
                </span>
                {tasks > 0 && (
                  <span className="text-[10px] hidden sm:inline-block opacity-85 leading-none">
                    {tasks}t
                  </span>
                )}
              </div>
              <span className="hidden sm:block text-[11px] leading-tight truncate">
                {minutes > 0 ? workedHours : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default MonthlyCalendarHeatmap;
