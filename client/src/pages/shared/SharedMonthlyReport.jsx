import { useState, useEffect } from 'react';
import SummaryCard from '../../components/reports/SummaryCard';
import MonthlyInsights from '../../components/reports/MonthlyInsights';
import MonthlyCalendarHeatmap from '../../components/reports/MonthlyCalendarHeatmap';
import DailyWorkedTimeChart from '../../components/reports/DailyWorkedTimeChart';
import CategoryBreakdown from '../../components/reports/CategoryBreakdown';
import ActivityBreakdown from '../../components/reports/ActivityBreakdown';
import SectionBreakdown from '../../components/reports/SectionBreakdown';
import PriorityBreakdown from '../../components/reports/PriorityBreakdown';
import StatusBreakdown from '../../components/reports/StatusBreakdown';
import TimeSummary from '../../components/reports/TimeSummary';
import MentorReportContent from '../../components/reports/MentorReportContent';
import Loader from '../../components/common/Loader';
import sharedPortalService from '../../services/sharedPortalService';
import { getYearAndMonth, MONTH_NAMES } from '../../utils/dateUtils';

export const SharedMonthlyReport = ({ token }) => {
  const [reportMode, setReportMode] = useState('worklog');
  const initial = getYearAndMonth();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [reportData, setReportData] = useState(null);
  const [mentorReportData, setMentorReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchMonthly = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (reportMode === 'mentorlog') {
          const res = await sharedPortalService.getMonthlyMentoringSummary(
            token,
            year,
            month,
          );
          if (isMounted) setMentorReportData(res.data || null);
        } else {
          const res = await sharedPortalService.getMonthlySummary(
            token,
            year,
            month,
          );
          if (isMounted) setReportData(res.data || null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message || 'Failed to load monthly report',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchMonthly();
    return () => {
      isMounted = false;
    };
  }, [token, year, month, reportMode]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Segmented Control */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex items-center p-1 bg-brand-soft/60 rounded-xl border border-brand-primary/40 shadow-xs">
          <button
            type="button"
            onClick={() => setReportMode('worklog')}
            className={`px-4 py-2 rounded-lg text-sm sm:text-base font-bold transition-all ${
              reportMode === 'worklog'
                ? 'bg-brand-primary text-brand-dark shadow-xs'
                : 'text-brand-dark/70 hover:text-brand-dark'
            }`}
          >
            Work Log Report
          </button>
          <button
            type="button"
            onClick={() => setReportMode('mentorlog')}
            className={`px-4 py-2 rounded-lg text-sm sm:text-base font-bold transition-all ${
              reportMode === 'mentorlog'
                ? 'bg-brand-primary text-brand-dark shadow-xs'
                : 'text-brand-dark/70 hover:text-brand-dark'
            }`}
          >
            Mentor Log Report
          </button>
        </div>
      </div>

      {/* Month Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-light border border-brand-primary/25 rounded-2xl p-6 shadow-xs">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-brand-dark tracking-tight">
            {reportMode === 'mentorlog'
              ? 'Monthly Mentoring Report'
              : 'Monthly Summary Report'}
          </h2>
          <p className="text-sm sm:text-base text-brand-dark/75 mt-1 font-medium">
            {MONTH_NAMES[month - 1]} {year}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="px-3.5 py-2 rounded-lg border border-brand-dark/25 text-sm font-semibold text-brand-dark hover:bg-brand-soft/40 transition-colors"
          >
            ← Prev
          </button>

          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3.5 py-2 rounded-lg border border-brand-dark/25 text-sm font-semibold bg-brand-light text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
          >
            {MONTH_NAMES.map((mName, idx) => (
              <option key={mName} value={idx + 1}>
                {mName}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            min="2020"
            max="2035"
            className="w-24 px-3 py-2 rounded-lg border border-brand-dark/25 text-sm font-semibold bg-brand-light text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />

          <button
            type="button"
            onClick={handleNextMonth}
            className="px-3.5 py-2 rounded-lg border border-brand-dark/25 text-sm font-semibold text-brand-dark hover:bg-brand-soft/40 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {isLoading ? (
        <Loader text="Generating monthly report..." />
      ) : error ? (
        <div className="p-4 rounded-xl bg-brand-soft border border-brand-dark/30 text-xs sm:text-sm font-semibold text-brand-dark">
          {error}
        </div>
      ) : reportMode === 'mentorlog' ? (
        mentorReportData ? (
          <MentorReportContent
            reportData={mentorReportData}
            title={`Monthly Mentoring Report (${MONTH_NAMES[month - 1]} ${year})`}
          />
        ) : null
      ) : reportData ? (
        <div className="space-y-6">
          {/* 1. Monthly Overview KPIs */}
          <SummaryCard
            totalTasks={reportData.totalTasks || 0}
            totalWorkedHours={reportData.totalWorkedHours || '0m'}
            activeDays={reportData.dailySummary?.length || 0}
            totalWorkedMinutes={reportData.totalWorkedMinutes || 0}
          />

          {/* 2. Monthly Highlights & Insights */}
          <MonthlyInsights
            dailySummary={reportData.dailySummary || []}
            categorySummary={reportData.categorySummary || []}
            activitySummary={reportData.activitySummary || []}
            sectionSummary={reportData.sectionSummary || []}
            prioritySummary={reportData.prioritySummary || []}
          />

          {/* 3. Monthly Activity Heatmap */}
          <MonthlyCalendarHeatmap
            year={year}
            month={month}
            dailyData={reportData.dailySummary || []}
          />

          {/* 4. Daily Worked Time Bar Chart */}
          <DailyWorkedTimeChart
            year={year}
            month={month}
            dailyData={reportData.dailySummary || []}
          />

          {/* 5. 2-Column: Category Breakdown & Activity Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryBreakdown
              categories={reportData.categorySummary || []}
              totalWorkedMinutes={reportData.totalWorkedMinutes || 0}
            />
            <ActivityBreakdown
              activities={reportData.activitySummary || []}
              totalWorkedMinutes={reportData.totalWorkedMinutes || 0}
            />
          </div>

          {/* 6. 2-Column: Hall / Section Breakdown & Priority Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionBreakdown
              sections={reportData.sectionSummary || []}
              totalWorkedMinutes={reportData.totalWorkedMinutes || 0}
            />
            <PriorityBreakdown
              priorities={reportData.prioritySummary || []}
              totalWorkedMinutes={reportData.totalWorkedMinutes || 0}
            />
          </div>

          {/* 7. 2-Column: Status Breakdown & Daily Time Breakdown list */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StatusBreakdown
              statuses={reportData.statusSummary || []}
              totalTasks={reportData.totalTasks || 0}
              totalWorkedMinutes={reportData.totalWorkedMinutes || 0}
            />
            <TimeSummary dailyData={reportData.dailySummary || []} />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SharedMonthlyReport;
