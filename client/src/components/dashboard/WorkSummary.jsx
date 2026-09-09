import { formatMinutes } from '../../utils/timeUtils';

export const WorkSummary = ({ todayMinutes = 0, weeklyMinutes = 0, monthlyMinutes = 0, todayTasks = 0 }) => {
  return (
    <div className="bg-gradient-to-br from-brand-soft/40 via-brand-light to-brand-primary/20 border border-brand-primary/30 rounded-2xl p-6 sm:p-7 text-left shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-primary/20">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-brand-dark">Daily Work Overview</h3>
          <p className="text-sm text-brand-dark/75 mt-1">
            Snapshot of your activity, logged hours, and focus time
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3.5 py-1.5 rounded-full bg-brand-dark text-brand-light text-sm font-bold shadow-xs">
            {todayTasks} {todayTasks === 1 ? 'task' : 'tasks'} today
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
        <div className="p-4 rounded-xl bg-brand-light/80 border border-brand-primary/25 shadow-xs">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-brand-dark/70 block">
            Today
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-brand-dark mt-1.5 block">
            {formatMinutes(todayMinutes)}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-brand-light/80 border border-brand-primary/25 shadow-xs">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-brand-dark/70 block">
            This Week
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-brand-dark mt-1.5 block">
            {formatMinutes(weeklyMinutes)}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-brand-light/80 border border-brand-primary/25 shadow-xs">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-brand-dark/70 block">
            This Month
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-brand-dark mt-1.5 block">
            {formatMinutes(monthlyMinutes)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default WorkSummary;
