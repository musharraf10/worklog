import { useState, useEffect } from 'react';
import StatCard from '../../components/dashboard/StatCard';
import WorkSummary from '../../components/dashboard/WorkSummary';
import sharedPortalService from '../../services/sharedPortalService';
import RemarkList from '../../components/share/RemarkList';
import {
  getTodayDateString,
  getStartOfWeek,
  getYearAndMonth,
  formatDate,
} from '../../utils/dateUtils';
import { formatMinutes, formatDisplayTime } from '../../utils/timeUtils';
import Loader from '../../components/common/Loader';

export const SharedDashboard = ({ token, onAddRemark, remarksByTarget = {} }) => {
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

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      const todayStr = getTodayDateString();
      const weekStartStr = getStartOfWeek(todayStr);
      const { year, month } = getYearAndMonth();

      try {
        const logsRes = await sharedPortalService.getWorkLogs(token);
        const allLogs = logsRes.data || [];

        if (!isMounted) return;
        setLogs(allLogs);

        let todayM = 0;
        let todayT = 0;
        let todayH = '0m';
        let weekM = 0;
        let weekH = '0m';
        let monthM = 0;
        let monthH = '0m';

        try {
          const [dailyData, weeklyData, monthlyData] = await Promise.allSettled([
            sharedPortalService.getDailySummary(token, todayStr),
            sharedPortalService.getWeeklySummary(token, weekStartStr),
            sharedPortalService.getMonthlySummary(token, year, month),
          ]);

          if (dailyData.status === 'fulfilled' && dailyData.value.data) {
            todayM = dailyData.value.data.totalWorkedMinutes || 0;
            todayH = dailyData.value.data.totalWorkedHours || formatMinutes(todayM);
            todayT = dailyData.value.data.totalTasks || 0;
          }

          if (weeklyData.status === 'fulfilled' && weeklyData.value.data) {
            weekM = weeklyData.value.data.totalWorkedMinutes || 0;
            weekH = weeklyData.value.data.totalWorkedHours || formatMinutes(weekM);
          }

          if (monthlyData.status === 'fulfilled' && monthlyData.value.data) {
            monthM = monthlyData.value.data.totalWorkedMinutes || 0;
            monthH = monthlyData.value.data.totalWorkedHours || formatMinutes(monthM);
          }
        } catch (sumErr) {
          console.warn('Could not fetch all summaries for shared dashboard:', sumErr);
        }

        if (isMounted) {
          setStats({
            todayMinutes: todayM,
            todayHoursStr: todayH,
            todayTasks: todayT,
            weeklyMinutes: weekM,
            weeklyHoursStr: weekH,
            monthlyMinutes: monthM,
            monthlyHoursStr: monthH,
          });
        }
      } catch (err) {
        console.error('Error fetching shared dashboard data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, [token]);

  if (isLoading) {
    return <Loader text="Loading dashboard data..." />;
  }

  const recentLogs = logs.slice(0, 6);

  return (
    <div className="space-y-6 text-left">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Today's Time"
          value={stats.todayHoursStr}
          subtitle={`${stats.todayTasks} tasks logged today`}
        />
        <StatCard
          title="This Week"
          value={stats.weeklyHoursStr}
          subtitle="Total logged this week"
        />
        <StatCard
          title="This Month"
          value={stats.monthlyHoursStr}
          subtitle="Total logged this month"
        />
      </div>

      {/* Summary Chart Breakdown */}
      <WorkSummary logs={logs} />

      {/* Recent Work Logs with Remarks support */}
      <section className="bg-brand-light border border-brand-primary/25 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
        <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-brand-primary/20">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-brand-dark">Recent Activities</h3>
            <p className="text-xs sm:text-sm text-brand-dark/70 mt-0.5">
              Latest tasks logged by the user
            </p>
          </div>
          <span className="text-xs font-semibold text-brand-dark/65 bg-brand-soft px-3 py-1 rounded-full border border-brand-primary/20">
            {logs.length} Total Logs
          </span>
        </div>

        {recentLogs.length === 0 ? (
          <p className="py-8 text-center text-sm text-brand-dark/60">No work logs recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {recentLogs.map((log) => {
              const remarks = remarksByTarget[log._id] || [];

              return (
                <div
                  key={log._id}
                  className="p-4 rounded-xl border border-brand-primary/20 bg-brand-soft/20 hover:bg-brand-soft/40 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-base text-brand-dark">{log.task}</span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-brand-soft border border-brand-primary/30 text-brand-dark">
                          {log.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-light border border-brand-primary/20 text-brand-dark/80">
                          {log.activityType}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-dark/70 font-medium">
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
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-dark text-brand-light text-xs font-bold hover:bg-brand-dark/90 transition-colors shadow-2xs"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Remark
                      </button>
                    </div>
                  </div>

                  {log.remarks && (
                    <div className="mt-2.5 text-xs text-brand-dark/75 bg-brand-light/70 p-2.5 rounded-lg border border-brand-primary/10">
                      <span className="font-semibold text-brand-dark/90">User Note: </span>
                      {log.remarks}
                    </div>
                  )}

                  <RemarkList remarks={remarks} />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default SharedDashboard;
