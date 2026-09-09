export const SummaryCard = ({ totalTasks = 0, totalWorkedHours = '0m', activeDays = 0 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 shadow-xs text-left">
        <span className="text-sm font-bold uppercase tracking-wide text-brand-dark/75 block">
          Total Worked Time
        </span>
        <h3 className="text-3xl sm:text-4xl font-extrabold text-brand-dark mt-2.5">
          {totalWorkedHours || '0m'}
        </h3>
        <p className="text-sm text-brand-dark/70 mt-1.5 font-medium">Logged in selected period</p>
      </div>

      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 shadow-xs text-left">
        <span className="text-sm font-bold uppercase tracking-wide text-brand-dark/75 block">
          Total Tasks Completed
        </span>
        <h3 className="text-3xl sm:text-4xl font-extrabold text-brand-dark mt-2.5">
          {totalTasks}
        </h3>
        <p className="text-sm text-brand-dark/70 mt-1.5 font-medium">Recorded activities</p>
      </div>

      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 shadow-xs text-left">
        <span className="text-sm font-bold uppercase tracking-wide text-brand-dark/75 block">
          Active Days
        </span>
        <h3 className="text-3xl sm:text-4xl font-extrabold text-brand-dark mt-2.5">
          {activeDays}
        </h3>
        <p className="text-sm text-brand-dark/70 mt-1.5 font-medium">Days with logged hours</p>
      </div>
    </div>
  );
};

export default SummaryCard;
