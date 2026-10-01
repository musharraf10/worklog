import { formatMinutes } from '../../utils/timeUtils';

export const SummaryCard = ({
  totalTasks = 0,
  totalWorkedHours = '0m',
  activeDays = 0,
  totalWorkedMinutes = 0,
}) => {
  const avgMinutes = activeDays > 0 ? Math.round(totalWorkedMinutes / activeDays) : 0;
  const avgHoursFormatted = formatMinutes(avgMinutes);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
        <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-brand-dark/75 block">
          Total Worked Time
        </span>
        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-brand-dark mt-2.5">
          {totalWorkedHours || '0m'}
        </h3>
        <p className="text-xs sm:text-sm text-brand-dark/70 mt-1.5 font-medium">Logged in selected period</p>
      </div>

      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
        <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-brand-dark/75 block">
          Total Tasks
        </span>
        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-brand-dark mt-2.5">
          {totalTasks}
        </h3>
        <p className="text-xs sm:text-sm text-brand-dark/70 mt-1.5 font-medium">Recorded activities</p>
      </div>

      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
        <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-brand-dark/75 block">
          Active Working Days
        </span>
        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-brand-dark mt-2.5">
          {activeDays}
        </h3>
        <p className="text-xs sm:text-sm text-brand-dark/70 mt-1.5 font-medium">Days with logged hours</p>
      </div>

      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
        <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-brand-dark/75 block">
          Avg / Active Day
        </span>
        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-brand-dark mt-2.5">
          {avgHoursFormatted}
        </h3>
        <p className="text-xs sm:text-sm text-brand-dark/70 mt-1.5 font-medium">Average per active day</p>
      </div>
    </div>
  );
};

export default SummaryCard;
