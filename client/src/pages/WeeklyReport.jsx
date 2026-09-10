import { useState, useEffect } from 'react';
import SummaryCard from '../components/reports/SummaryCard';
import TimeSummary from '../components/reports/TimeSummary';
import CategoryBreakdown from '../components/reports/CategoryBreakdown';
import ActivityBreakdown from '../components/reports/ActivityBreakdown';
import MentorWeeklyReport from '../components/reports/MentorWeeklyReport';
import Loader from '../components/common/Loader';
import reportService from '../services/reportService';
import {
  getTodayDateString,
  getStartOfWeek,
  addDays,
  formatDate,
} from '../utils/dateUtils';

export const WeeklyReport = () => {
  const [reportMode, setReportMode] = useState('worklog');
  const [weekStart, setWeekStart] = useState(() =>
    getStartOfWeek(getTodayDateString()),
  );
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const weekEnd = addDays(weekStart, 6);

  useEffect(() => {
    let isMounted = true;

    const fetchWeeklyReport = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await reportService.getWeeklySummary(weekStart);
        if (isMounted) {
          setReportData(response.data || null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message || 'Failed to load weekly report',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchWeeklyReport();

    return () => {
      isMounted = false;
    };
  }, [weekStart]);

  const handlePrevWeek = () => {
    setWeekStart((prev) => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setWeekStart((prev) => addDays(prev, 7));
  };

  const handleCurrentWeek = () => {
    setWeekStart(getStartOfWeek(getTodayDateString()));
  };

  return (
    <div className="space-y-6 text-left">
      {/* Segmented Control [ Work Log Report ] [ Mentor Log Report ] */}
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-light border border-brand-primary/25 rounded-2xl p-6 shadow-xs">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-brand-dark tracking-tight">
            {reportMode === 'mentorlog' ? 'Weekly Mentoring Report' : 'Weekly Summary Report'}
          </h2>
          <p className="text-sm sm:text-base text-brand-dark/75 mt-1 font-medium">
            {formatDate(weekStart)} – {formatDate(weekEnd)}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="px-3.5 py-2 rounded-lg border border-brand-dark/25 text-sm font-semibold text-brand-dark hover:bg-brand-soft/40 transition-colors"
          >
            ← Prev Week
          </button>
          <button
            type="button"
            onClick={handleCurrentWeek}
            className="px-4 py-2 rounded-lg bg-brand-soft text-sm font-bold text-brand-dark hover:bg-brand-primary/50 transition-colors"
          >
            Current Week
          </button>
          <button
            type="button"
            onClick={handleNextWeek}
            className="px-3.5 py-2 rounded-lg border border-brand-dark/25 text-sm font-semibold text-brand-dark hover:bg-brand-soft/40 transition-colors"
          >
            Next Week →
          </button>
        </div>
      </div>

      {reportMode === 'mentorlog' ? (
        <MentorWeeklyReport weekStart={weekStart} />
      ) : (
        <>
          {isLoading ? (
            <Loader text="Generating weekly report..." />
          ) : error ? (
            <div className="p-4 rounded-xl bg-brand-soft border border-brand-dark/30 text-sm sm:text-base font-semibold text-brand-dark">
              {error}
            </div>
          ) : reportData ? (
            <div className="space-y-6">
              <SummaryCard
                totalTasks={reportData.totalTasks || 0}
                totalWorkedHours={reportData.totalWorkedHours || '0m'}
                activeDays={reportData.dailySummary?.length || 0}
              />

              <TimeSummary dailyData={reportData.dailySummary || []} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CategoryBreakdown
                  categories={reportData.categorySummary || []}
                  totalWorkedMinutes={reportData.totalWorkedMinutes || 0}
                />
                <ActivityBreakdown
                  activities={reportData.activitySummary || []}
                  totalWorkedMinutes={reportData.totalWorkedMinutes || 0}
                />
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default WeeklyReport;
