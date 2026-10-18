import { useState, useEffect, useCallback } from 'react';
import StatCard from '../../components/dashboard/StatCard';
import WorkSummary from '../../components/dashboard/WorkSummary';
import sharedPortalService from '../../services/sharedPortalService';
import RemarkList from '../../components/share/RemarkList';
import {
  getTodayDateString,
  getStartOfWeek,
  addDays,
  getYearAndMonth,
  formatDateForInput,
  formatDate,
} from '../../utils/dateUtils';
import { formatMinutes, formatDisplayTime } from '../../utils/timeUtils';
import Loader from '../../components/common/Loader';

export const SharedDashboard = ({
  token,
  onAddRemark,
  remarksByTarget = {},
  onNavigateTab,
}) => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    todayMinutes: 0,
    todayHoursStr: '0m',
    todayTasks: 0,
    weeklyMinutes: 0,
    weeklyHoursStr: '0m',
    monthlyMinutes: 0,
    monthlyHoursStr: '0m',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const todayStr = getTodayDateString();
    const weekStartStr = getStartOfWeek(todayStr);
    const weekEndStr = addDays(weekStartStr, 6);
    const { year, month } = getYearAndMonth();

    try {
      const logsRes = await sharedPortalService.getWorkLogs(token);
      const allLogs = logsRes.data || [];
      setLogs(allLogs);

      let todayM = 0;
      let todayT = 0;
      let weekM = 0;
      let monthM = 0;

      // 1. Fetch backend summary endpoints
      try {
        const [dailyData, weeklyData, monthlyData] = await Promise.allSettled([
          sharedPortalService.getDailySummary(token, todayStr),
          sharedPortalService.getWeeklySummary(token, weekStartStr),
          sharedPortalService.getMonthlySummary(token, year, month),
        ]);

        if (dailyData.status === 'fulfilled' && dailyData.value?.data) {
          todayM = dailyData.value.data.totalWorkedMinutes || 0;
          todayT = dailyData.value.data.totalTasks || 0;
        }

        if (weeklyData.status === 'fulfilled' && weeklyData.value?.data) {
          weekM = weeklyData.value.data.totalWorkedMinutes || 0;
        }

        if (monthlyData.status === 'fulfilled' && monthlyData.value?.data) {
          monthM = monthlyData.value.data.totalWorkedMinutes || 0;
        }
      } catch (sumErr) {
        console.warn('Summary API request warning:', sumErr);
      }

      // 2. Consistent fallback from actual work logs data if summaries returned 0 or failed
      if (allLogs.length > 0) {
        if (todayM === 0 && todayT === 0) {
          const todayLogs = allLogs.filter(
            (l) => formatDateForInput(l.date) === todayStr,
          );
          todayM = todayLogs.reduce((acc, l) => acc + (l.spentMinutes || 0), 0);
          todayT = todayLogs.length;
        }

        if (weekM === 0) {
          const weekLogs = allLogs.filter((l) => {
            const d = formatDateForInput(l.date);
            return d >= weekStartStr && d <= weekEndStr;
          });
          weekM = weekLogs.reduce((acc, l) => acc + (l.spentMinutes || 0), 0);
        }

        if (monthM === 0) {
          const monthLogs = allLogs.filter((l) => {
            const dateInput = formatDateForInput(l.date);
            if (!dateInput) return false;
            const [y, m] = dateInput.split('-').map(Number);
            return y === year && m === month;
          });
          monthM = monthLogs.reduce((acc, l) => acc + (l.spentMinutes || 0), 0);
        }
      }

      setStats({
        todayMinutes: todayM,
        todayHoursStr: formatMinutes(todayM),
        todayTasks: todayT,
        weeklyMinutes: weekM,
        weeklyHoursStr: formatMinutes(weekM),
        monthlyMinutes: monthM,
        monthlyHoursStr: formatMinutes(monthM),
      });
    } catch (err) {
      console.error('Error fetching shared dashboard data:', err);
      setError('Unable to load dashboard records. Please check the connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (isLoading && logs.length === 0) {
    return <Loader text="Loading dashboard data..." />;
  }

  const recentLogs = logs.slice(0, 6);

  return (
    <div className="space-y-8 text-left max-w-full overflow-hidden">
      {/* SECTION 1: OWNER'S WORK SUMMARY */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
              Section 1 • Owner Summary
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-brand-dark">
              Work Activity Overview
            </h2>
          </div>
          <span className="text-xs text-brand-dark/60 font-medium bg-brand-soft/60 px-3 py-1 rounded-full border border-brand-primary/20 self-start sm:self-auto">
            Timezone: Asia/Kolkata
          </span>
        </div>

        {/* 3 Summary Stat Cards (Desktop 3 cols, Tablet 2 cols, Mobile 1 col) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          <StatCard
            title="Today's Time"
            value={stats.todayHoursStr}
            subtitle={`${stats.todayTasks} ${stats.todayTasks === 1 ? 'task' : 'tasks'} logged today`}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="This Week"
            value={stats.weeklyHoursStr}
            subtitle="Monday to Sunday total"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
          <StatCard
            title="This Month"
            value={stats.monthlyHoursStr}
            subtitle="Current calendar month"
            className="sm:col-span-2 lg:col-span-1"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
        </div>

        {/* Daily Work Overview (guaranteed consistent totals, loading indicator, retry) */}
        <WorkSummary
          todayMinutes={stats.todayMinutes}
          weeklyMinutes={stats.weeklyMinutes}
          monthlyMinutes={stats.monthlyMinutes}
          todayTasks={stats.todayTasks}
          logs={logs}
          isLoading={isLoading}
          error={error}
          onRetry={fetchDashboardData}
        />
      </section>

      {/* SECTION 2: MANAGER REVIEW AREA */}
      <section className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-brand-primary/20 pt-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Section 2 • Manager Review
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-brand-dark">
              Manager Review Workspace
            </h2>
            <p className="text-xs sm:text-sm text-brand-dark/70 mt-0.5">
              Review recent submissions, add feedback remarks, or switch to the full spreadsheet table.
            </p>
          </div>

          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('managerview')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-dark text-brand-light text-xs sm:text-sm font-bold shadow-xs hover:bg-brand-dark/90 transition-all self-start sm:self-auto shrink-0"
            >
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 4h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Open Manager View
            </button>
          )}
        </div>

        {/* Recent Work Logs Strip with Remarks */}
        <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-4 sm:p-6 shadow-xs text-left">
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-brand-primary/20 flex-wrap gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-brand-dark">Recent Submissions</h3>
              <p className="text-xs text-brand-dark/70">
                Latest 6 tasks logged by the user
              </p>
            </div>
            <span className="text-xs font-semibold text-brand-dark/65 bg-brand-soft px-3 py-1 rounded-full border border-brand-primary/20">
              {logs.length} Total Logs
            </span>
          </div>

          {recentLogs.length === 0 ? (
            <div className="py-10 text-center text-sm text-brand-dark/60">
              No work logs recorded yet.
            </div>
          ) : (
            <div className="space-y-3.5">
              {recentLogs.map((log) => {
                const remarks = remarksByTarget[log._id] || [];

                return (
                  <div
                    key={log._id}
                    className="p-3.5 sm:p-4 rounded-xl border border-brand-primary/20 bg-brand-soft/20 hover:bg-brand-soft/35 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="font-bold text-sm sm:text-base text-brand-dark break-words">
                            {log.task}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-brand-soft border border-brand-primary/30 text-brand-dark shrink-0">
                            {log.category}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-light border border-brand-primary/20 text-brand-dark/80 shrink-0">
                            {log.activityType}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-brand-dark/70 font-medium">
                          <span>{formatDate(log.date, true)}</span>
                          <span>•</span>
                          <span>
                            {formatDisplayTime(log.timeFrom)} – {formatDisplayTime(log.timeTo)} ({formatMinutes(log.spentMinutes)})
                          </span>
                          {log.hallSection && (
                            <>
                              <span>•</span>
                              <span>{log.hallSection}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>Priority: {log.priority}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start shrink-0">
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-brand-soft text-brand-dark border border-brand-primary/25">
                          {log.status}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onAddRemark({
                              targetType: 'WorkLog',
                              targetId: log._id,
                              targetTitle: `${log.task} (${formatDate(log.date)})`,
                            })
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-dark text-brand-light text-xs font-bold hover:bg-brand-dark/90 transition-colors shadow-2xs cursor-pointer min-h-[34px]"
                          aria-label={`Add remark for ${log.task}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                          Add Remark
                        </button>
                      </div>
                    </div>

                    {log.remarks && (
                      <div className="mt-2.5 text-xs text-brand-dark/80 bg-brand-light/80 p-2.5 rounded-lg border border-brand-primary/10 break-words">
                        <span className="font-semibold text-brand-dark/95">User Note: </span>
                        {log.remarks}
                      </div>
                    )}

                    <RemarkList remarks={remarks} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SharedDashboard;
