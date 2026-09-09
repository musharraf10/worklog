import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/dashboard/StatCard';
import WorkSummary from '../components/dashboard/WorkSummary';
import RecentWorkLogs from '../components/dashboard/RecentWorkLogs';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import workLogService from '../services/workLogService';
import reportService from '../services/reportService';
import { subscribeToLogsUpdated } from '../utils/storageUtils';
import {
  getTodayDateString,
  getStartOfWeek,
  getYearAndMonth,
  formatDateForInput,
} from '../utils/dateUtils';
import { formatMinutes } from '../utils/timeUtils';

export const Dashboard = () => {
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
        const logsRes = await workLogService.getAllWorkLogs();
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
            reportService.getDailySummary(todayStr),
            reportService.getWeeklySummary(weekStartStr),
            reportService.getMonthlySummary(year, month),
          ]);

          if (dailyData.status === 'fulfilled' && dailyData.value?.data) {
            todayM = dailyData.value.data.totalWorkedMinutes || 0;
            todayH = dailyData.value.data.totalWorkedHours || '0m';
            todayT = dailyData.value.data.totalTasks || 0;
          }

          if (weeklyData.status === 'fulfilled' && weeklyData.value?.data) {
            weekM = weeklyData.value.data.totalWorkedMinutes || 0;
            weekH = weeklyData.value.data.totalWorkedHours || '0m';
          }

          if (monthlyData.status === 'fulfilled' && monthlyData.value?.data) {
            monthM = monthlyData.value.data.totalWorkedMinutes || 0;
            monthH = monthlyData.value.data.totalWorkedHours || '0m';
          }
        } catch (reportErr) {
          console.warn('Report API error; falling back to local calculation:', reportErr);
        }

        if (todayM === 0 && todayT === 0 && allLogs.length > 0) {
          const todayLogs = allLogs.filter(
            (l) => formatDateForInput(l.date) === todayStr,
          );
          todayM = todayLogs.reduce((acc, l) => acc + (l.spentMinutes || 0), 0);
          todayT = todayLogs.length;
          todayH = formatMinutes(todayM);
        }

        if (weekM === 0 && allLogs.length > 0) {
          const weekStart = new Date(weekStartStr);
          const weekLogs = allLogs.filter((l) => {
            const d = new Date(formatDateForInput(l.date));
            return d >= weekStart;
          });
          weekM = weekLogs.reduce((acc, l) => acc + (l.spentMinutes || 0), 0);
          weekH = formatMinutes(weekM);
        }

        if (monthM === 0 && allLogs.length > 0) {
          const monthLogs = allLogs.filter((l) => {
            const dateInput = formatDateForInput(l.date);
            if (!dateInput) return false;
            const [y, m] = dateInput.split('-').map(Number);
            return y === year && m === month;
          });
          monthM = monthLogs.reduce((acc, l) => acc + (l.spentMinutes || 0), 0);
          monthH = formatMinutes(monthM);
        }

        setStats({
          todayMinutes: todayM,
          todayHoursStr: todayH,
          todayTasks: todayT,
          weeklyMinutes: weekM,
          weeklyHoursStr: weekH,
          monthlyMinutes: monthM,
          monthlyHoursStr: monthH,
        });
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDashboardData();

    const unsubscribe = subscribeToLogsUpdated(() => {
      if (isMounted) {
        fetchDashboardData();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  if (isLoading) {
    return <Loader size="lg" text="Loading dashboard metrics..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-light border border-brand-primary/25 rounded-2xl p-6 shadow-xs text-left">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-brand-dark tracking-tight">Dashboard</h2>
          <p className="text-sm sm:text-base text-brand-dark/75 mt-1.5">
            Track, review, and sync your work entries in one place.
          </p>
        </div>
        <Link to="/worklogs">
          <Button
            variant="primary"
            size="md"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Record Work Log
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Worked Time"
          value={stats.todayHoursStr}
          subtitle={`${stats.todayTasks} tasks logged today`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          title="Today's Task Count"
          value={stats.todayTasks}
          subtitle="Recorded activities"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />

        <StatCard
          title="Weekly Worked Time"
          value={stats.weeklyHoursStr}
          subtitle="From Monday to Sunday"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />

        <StatCard
          title="Monthly Worked Time"
          value={stats.monthlyHoursStr}
          subtitle="Current calendar month"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      <WorkSummary
        todayMinutes={stats.todayMinutes}
        weeklyMinutes={stats.weeklyMinutes}
        monthlyMinutes={stats.monthlyMinutes}
        todayTasks={stats.todayTasks}
      />

      <RecentWorkLogs logs={logs} />
    </div>
  );
};

export default Dashboard;
