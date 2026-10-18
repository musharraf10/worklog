import { useMemo } from 'react';
import { formatMinutes } from '../../utils/timeUtils';
import {
  getTodayDateString,
  getStartOfWeek,
  addDays,
  getYearAndMonth,
  formatDateForInput,
} from '../../utils/dateUtils';

export const WorkSummary = ({
  todayMinutes,
  weeklyMinutes,
  monthlyMinutes,
  todayTasks,
  logs = [],
  isLoading = false,
  error = null,
  onRetry = null,
}) => {
  // Compute fallback values from logs if explicit props are not passed
  const calculated = useMemo(() => {
    if (
      todayMinutes !== undefined &&
      weeklyMinutes !== undefined &&
      monthlyMinutes !== undefined &&
      todayTasks !== undefined
    ) {
      return {
        todayMinutes,
        weeklyMinutes,
        monthlyMinutes,
        todayTasks,
      };
    }

    if (!logs || logs.length === 0) {
      return {
        todayMinutes: todayMinutes ?? 0,
        weeklyMinutes: weeklyMinutes ?? 0,
        monthlyMinutes: monthlyMinutes ?? 0,
        todayTasks: todayTasks ?? 0,
      };
    }

    const todayStr = getTodayDateString();
    const weekStartStr = getStartOfWeek(todayStr);
    const weekEndStr = addDays(weekStartStr, 6);
    const { year, month } = getYearAndMonth();

    const todayLogs = logs.filter(
      (l) => formatDateForInput(l.date) === todayStr,
    );
    const calcTodayM = todayLogs.reduce((acc, l) => acc + (l.spentMinutes || 0), 0);
    const calcTodayT = todayLogs.length;

    const weekLogs = logs.filter((l) => {
      const d = formatDateForInput(l.date);
      return d >= weekStartStr && d <= weekEndStr;
    });
    const calcWeekM = weekLogs.reduce((acc, l) => acc + (l.spentMinutes || 0), 0);

    const monthLogs = logs.filter((l) => {
      const dateInput = formatDateForInput(l.date);
      if (!dateInput) return false;
      const [y, m] = dateInput.split('-').map(Number);
      return y === year && m === month;
    });
    const calcMonthM = monthLogs.reduce((acc, l) => acc + (l.spentMinutes || 0), 0);

    return {
      todayMinutes: todayMinutes ?? calcTodayM,
      weeklyMinutes: weeklyMinutes ?? calcWeekM,
      monthlyMinutes: monthlyMinutes ?? calcMonthM,
      todayTasks: todayTasks ?? calcTodayT,
    };
  }, [todayMinutes, weeklyMinutes, monthlyMinutes, todayTasks, logs]);

  const displayTodayM = calculated.todayMinutes;
  const displayWeekM = calculated.weeklyMinutes;
  const displayMonthM = calculated.monthlyMinutes;
  const displayTodayT = calculated.todayTasks;

  return (
    <div className="bg-gradient-to-br from-brand-soft/40 via-brand-light to-brand-primary/20 border border-brand-primary/30 rounded-2xl p-4 sm:p-7 text-left shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-brand-primary/20">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-bold text-brand-dark">Daily Work Overview</h3>
            {isLoading && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-soft text-brand-dark/70 border border-brand-primary/20 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-ping" />
                Updating...
              </span>
            )}
          </div>
          <p className="hidden sm:block text-sm text-brand-dark/75 mt-1">
            Snapshot of your activity, logged hours, and focus time
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isLoading ? (
            <span className="h-8 w-24 bg-brand-dark/20 animate-pulse rounded-full inline-block" />
          ) : (
            <span className="px-3 py-1.5 rounded-full bg-brand-dark text-brand-light text-sm font-bold shadow-xs">
              {displayTodayT} {displayTodayT === 1 ? 'task' : 'tasks'} today
            </span>
          )}
        </div>
      </div>

      {error ? (
        <div className="pt-4 pb-2">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs sm:text-sm text-amber-900 flex items-center justify-between gap-3 flex-wrap">
            <span>{error}</span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-3 py-1 rounded-lg bg-brand-dark text-brand-light text-xs font-bold hover:bg-brand-dark/90 transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 sm:pt-5">
          {/* Today Card */}
          <div className="p-3 sm:p-4 rounded-xl bg-brand-light/80 border border-brand-primary/25 shadow-xs transition-all">
            <span className="text-[10px] sm:text-sm font-bold uppercase tracking-wider text-brand-dark/70 block">
              Today
            </span>
            {isLoading ? (
              <div className="h-7 sm:h-9 w-16 sm:w-24 bg-brand-soft/80 animate-pulse rounded-lg mt-1.5" />
            ) : (
              <span className="text-base sm:text-3xl font-extrabold text-brand-dark mt-1.5 block">
                {formatMinutes(displayTodayM)}
              </span>
            )}
          </div>

          {/* This Week Card */}
          <div className="p-3 sm:p-4 rounded-xl bg-brand-light/80 border border-brand-primary/25 shadow-xs transition-all">
            <span className="text-[10px] sm:text-sm font-bold uppercase tracking-wider text-brand-dark/70 block">
              This Week
            </span>
            {isLoading ? (
              <div className="h-7 sm:h-9 w-16 sm:w-24 bg-brand-soft/80 animate-pulse rounded-lg mt-1.5" />
            ) : (
              <span className="text-base sm:text-3xl font-extrabold text-brand-dark mt-1.5 block">
                {formatMinutes(displayWeekM)}
              </span>
            )}
          </div>

          {/* This Month Card */}
          <div className="p-3 sm:p-4 rounded-xl bg-brand-light/80 border border-brand-primary/25 shadow-xs transition-all">
            <span className="text-[10px] sm:text-sm font-bold uppercase tracking-wider text-brand-dark/70 block">
              This Month
            </span>
            {isLoading ? (
              <div className="h-7 sm:h-9 w-16 sm:w-24 bg-brand-soft/80 animate-pulse rounded-lg mt-1.5" />
            ) : (
              <span className="text-base sm:text-3xl font-extrabold text-brand-dark mt-1.5 block">
                {formatMinutes(displayMonthM)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkSummary;
