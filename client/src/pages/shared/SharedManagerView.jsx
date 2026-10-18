import { useState, useEffect, useMemo, useCallback } from 'react';
import sharedPortalService from '../../services/sharedPortalService';
import Loader from '../../components/common/Loader';
import RemarkList from '../../components/share/RemarkList';
import {
  CATEGORIES,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  QUESTION_STATUSES,
} from '../../constants/workLogConstants';
import {
  formatDate,
  formatDateForInput,
  getTodayDateString,
  getStartOfWeek,
  addDays,
  getYearAndMonth,
  MONTH_NAMES,
} from '../../utils/dateUtils';
import { formatMinutes, formatDisplayTime } from '../../utils/timeUtils';
import { useDebounce } from '../../hooks/useDebounce';

export const SharedManagerView = ({
  token,
  onAddRemark,
  remarksByTarget = {},
}) => {
  // Navigation inside Manager View
  const [managerTab, setManagerTab] = useState('worklogs'); // 'worklogs' | 'mentorlogs' | 'reports' | 'remarks'

  // Work Logs State
  const [logs, setLogs] = useState([]);
  const [workLogPagination, setWorkLogPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [workLogSummary, setWorkLogSummary] = useState({ totalTasks: 0, totalWorkedMinutes: 0, completedCount: 0, inProgressCount: 0, pendingCount: 0 });
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState(null);

  // Mentor Logs State
  const [mentorLogs, setMentorLogs] = useState([]);
  const [isMentorLoading, setIsMentorLoading] = useState(false);
  const [mentorError, setMentorError] = useState(null);

  // Remarks State
  const [allRemarks, setAllRemarks] = useState([]);
  const [isRemarksLoading, setIsRemarksLoading] = useState(false);

  // Reports State
  const [reportPeriod, setReportPeriod] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const todayStr = getTodayDateString();
  const [dailyDate, setDailyDate] = useState(todayStr);
  const [weeklyStart, setWeeklyStart] = useState(() => getStartOfWeek(todayStr));
  const { year: currentYear, month: currentMonth } = getYearAndMonth();
  const [monthlyYear, setMonthlyYear] = useState(currentYear);
  const [monthlyMonth, setMonthlyMonth] = useState(currentMonth);
  const [reportData, setReportData] = useState(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);

  // Work Logs Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterPreset, setDateFilterPreset] = useState('ALL'); // 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'
  const [customDate, setCustomDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Pagination for Work Logs Table
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Mobile Table View Mode toggle: 'cards' or 'table'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // Mentor Logs Filters
  const [mentorSearch, setMentorSearch] = useState('');
  const [mentorStatusFilter, setMentorStatusFilter] = useState('ALL');

  // 1. Fetch Work Logs
  const fetchWorkLogs = useCallback(async () => {
    setIsLogsLoading(true);
    setLogsError(null);
    try {
      const today = getTodayDateString();
      const weekStart = getStartOfWeek(today);
      const weekEnd = addDays(weekStart, 6);
      const { year, month } = getYearAndMonth();
      const params = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch.trim(),
        category: categoryFilter,
        status: statusFilter,
        priority: priorityFilter,
      };
      if (dateFilterPreset === 'TODAY') params.date = today;
      if (dateFilterPreset === 'CUSTOM' && customDate) params.date = customDate;
      if (dateFilterPreset === 'WEEK') Object.assign(params, { startDate: weekStart, endDate: weekEnd });
      if (dateFilterPreset === 'MONTH') Object.assign(params, {
        startDate: `${year}-${String(month).padStart(2, '0')}-01`,
        endDate: `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`,
      });
      const res = await sharedPortalService.getWorkLogs(token, params);
      setLogs(res.data || []);
      setWorkLogPagination(res.pagination || { page: currentPage, limit: pageSize, total: res.count || 0, totalPages: 1 });
      setWorkLogSummary(res.summary || { totalTasks: res.count || 0, totalWorkedMinutes: 0, completedCount: 0, inProgressCount: 0, pendingCount: 0 });
    } catch (err) {
      console.error('Manager View fetch logs error:', err);
      setLogsError('Failed to load work logs. Please try again.');
    } finally {
      setIsLogsLoading(false);
    }
  }, [token, currentPage, pageSize, debouncedSearch, dateFilterPreset, customDate, categoryFilter, statusFilter, priorityFilter]);

  // 2. Fetch Mentor Logs
  const fetchMentorLogs = useCallback(async () => {
    setIsMentorLoading(true);
    setMentorError(null);
    try {
      const res = await sharedPortalService.getMentorLogs(token);
      setMentorLogs(res.data || []);
    } catch (err) {
      console.error('Manager View fetch mentor logs error:', err);
      setMentorError('Failed to load mentor logs.');
    } finally {
      setIsMentorLoading(false);
    }
  }, [token]);

  // 3. Fetch All Remarks
  const fetchAllRemarks = useCallback(async () => {
    setIsRemarksLoading(true);
    try {
      const res = await sharedPortalService.getRemarks(token);
      setAllRemarks(res.data || []);
    } catch (err) {
      console.warn('Error fetching remarks for Manager View:', err);
    } finally {
      setIsRemarksLoading(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    fetchWorkLogs();
  }, [fetchWorkLogs]);

  // Lazy load sub-tabs
  useEffect(() => {
    if (managerTab === 'mentorlogs' && mentorLogs.length === 0 && !isMentorLoading) {
      fetchMentorLogs();
    }
    if (managerTab === 'remarks') {
      fetchAllRemarks();
    }
  }, [managerTab, mentorLogs.length, isMentorLoading, fetchMentorLogs, fetchAllRemarks]);

  // Fetch Report Data when Report tab or controls change
  useEffect(() => {
    if (managerTab !== 'reports') return;

    let isMounted = true;
    const fetchReport = async () => {
      setIsReportLoading(true);
      setReportError(null);
      try {
        let res;
        if (reportPeriod === 'daily') {
          res = await sharedPortalService.getDailySummary(token, dailyDate);
        } else if (reportPeriod === 'weekly') {
          res = await sharedPortalService.getWeeklySummary(token, weeklyStart);
        } else {
          res = await sharedPortalService.getMonthlySummary(
            token,
            monthlyYear,
            monthlyMonth,
          );
        }
        if (isMounted) setReportData(res.data || null);
      } catch (err) {
        if (isMounted) {
          setReportError(err.response?.data?.message || 'Failed to fetch summary report.');
        }
      } finally {
        if (isMounted) setIsReportLoading(false);
      }
    };

    fetchReport();

    return () => {
      isMounted = false;
    };
  }, [managerTab, reportPeriod, dailyDate, weeklyStart, monthlyYear, monthlyMonth, token]);

  const filteredLogs = logs;
  const sortedFilteredLogs = logs;

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    dateFilterPreset,
    customDate,
    categoryFilter,
    statusFilter,
    priorityFilter,
    debouncedSearch,
    pageSize,
  ]);

  // Pagination calculation
  const totalItems = workLogPagination.total;
  const totalPages = workLogPagination.totalPages || 1;
  const paginatedLogs = logs;

  // Metrics for filtered work logs
  const metrics = useMemo(() => {
    return {
      totalTasks: workLogSummary.totalTasks,
      totalWorkedStr: formatMinutes(workLogSummary.totalWorkedMinutes),
      completedCount: workLogSummary.completedCount,
      inProgressCount: workLogSummary.inProgressCount,
      pendingCount: workLogSummary.pendingCount,
    };
  }, [workLogSummary]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setDateFilterPreset('ALL');
    setCustomDate('');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    dateFilterPreset !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL';

  // Badge helpers
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-600/15 border border-emerald-600/40 text-emerald-900 font-bold';
      case 'In Progress':
        return 'bg-amber-500/15 border border-amber-500/40 text-amber-900 font-bold';
      case 'Yet to Start':
        return 'bg-brand-soft border border-brand-primary/25 text-brand-dark/80 font-medium';
      case 'On Hold':
        return 'bg-brand-soft/70 border border-brand-dark/25 text-brand-dark/85 font-semibold';
      case 'Carry Forward':
        return 'bg-amber-600/20 border border-amber-600/40 text-amber-900 font-bold';
      case 'Not Done':
        return 'bg-rose-600/15 border border-rose-600/40 text-rose-900 font-bold';
      default:
        return 'bg-brand-soft border border-brand-primary/20 text-brand-dark';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Highest':
        return 'bg-brand-dark text-brand-light font-extrabold';
      case 'High':
        return 'bg-brand-primary text-brand-light font-bold';
      case 'Medium':
        return 'bg-brand-soft border border-brand-primary/30 text-brand-dark font-semibold';
      case 'Low':
        return 'bg-brand-light border border-brand-primary/20 text-brand-dark/70';
      case 'Adhoc':
        return 'bg-brand-primary/20 border border-brand-primary/30 text-brand-dark font-medium italic';
      default:
        return 'text-brand-dark/80';
    }
  };

  return (
    <div className="space-y-6 text-left max-w-full overflow-hidden font-sans">
      {/* 1. Header & Navigation Sub-Tabs */}
      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-primary/20 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
                Manager View • Read-Only Review
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-dark mt-1">
              Manager Review Workstation
            </h2>
            <p className="text-xs sm:text-sm text-brand-dark/70 mt-0.5">
              Explore work logs, mentoring outcomes, reports, and manager remarks.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-brand-soft text-brand-dark border border-brand-primary/25">
              Secure Share Token Access
            </span>
          </div>
        </div>

        {/* Sub-Tabs: Work Logs Table | Mentor Logs | Reports | Remarks */}
        <div className="pt-3.5 flex items-center justify-between gap-3 flex-wrap">
          <nav className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
            {[
              { id: 'worklogs', label: 'Work Logs Table', count: logs.length },
              { id: 'mentorlogs', label: 'Mentor Logs & Outcomes', count: mentorLogs.length || undefined },
              { id: 'reports', label: 'Reports Summary' },
              { id: 'remarks', label: 'Manager Remarks', count: allRemarks.length || undefined },
            ].map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setManagerTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center gap-1.5 min-h-[38px] ${
                  managerTab === tab.id
                    ? 'bg-brand-dark text-brand-light shadow-xs'
                    : 'bg-brand-soft/40 text-brand-dark/75 hover:bg-brand-soft hover:text-brand-dark'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                      managerTab === tab.id
                        ? 'bg-brand-light/20 text-brand-light'
                        : 'bg-brand-light text-brand-dark/70'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Toggle between Table and Cards for small screens */}
          {managerTab === 'worklogs' && (
            <div className="hidden sm:flex items-center gap-1 p-0.5 rounded-lg bg-brand-soft/50 border border-brand-primary/20 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  viewMode === 'table' ? 'bg-brand-dark text-brand-light' : 'text-brand-dark/70'
                }`}
              >
                Table View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  viewMode === 'cards' ? 'bg-brand-dark text-brand-light' : 'text-brand-dark/70'
                }`}
              >
                Card View
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          TAB 1: WORK LOGS TABLE & FILTERS
         ========================================================================= */}
      {managerTab === 'worklogs' && (
        <div className="space-y-4">
          {/* Summary KPI Strip */}
          <section className="bg-brand-light border border-brand-primary/20 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center sm:text-left">
              <div className="p-2 sm:p-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-dark/60 block">
                  Total Filtered Tasks
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-brand-dark mt-0.5 block">
                  {metrics.totalTasks}
                </span>
              </div>
              <div className="p-2 sm:p-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-dark/60 block">
                  Total Time
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-brand-dark mt-0.5 block">
                  {metrics.totalWorkedStr}
                </span>
              </div>
              <div className="p-2 sm:p-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Completed
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-emerald-800 mt-0.5 block">
                  {metrics.completedCount}
                </span>
              </div>
              <div className="p-2 sm:p-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
                  In Progress
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-amber-800 mt-0.5 block">
                  {metrics.inProgressCount}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1 p-2 sm:p-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-dark/60 block">
                  Pending / Other
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-brand-dark mt-0.5 block">
                  {metrics.pendingCount}
                </span>
              </div>
            </div>
          </section>

          {/* Filters & Search Toolbar */}
          <section className="bg-brand-light border border-brand-primary/20 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[240px]">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-dark/50">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search task, category, activity, hall, or notes..."
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-brand-primary/30 bg-brand-soft/20 text-brand-dark text-sm placeholder-brand-dark/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-dark/50 hover:text-brand-dark"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Date Presets */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                {[
                  { id: 'ALL', label: 'All Dates' },
                  { id: 'TODAY', label: 'Today' },
                  { id: 'WEEK', label: 'This Week' },
                  { id: 'MONTH', label: 'This Month' },
                  { id: 'CUSTOM', label: 'Custom' },
                ].map((preset) => (
                  <button
                    type="button"
                    key={preset.id}
                    onClick={() => {
                      setDateFilterPreset(preset.id);
                      if (preset.id !== 'CUSTOM') setCustomDate('');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                      dateFilterPreset === preset.id
                        ? 'bg-brand-primary text-brand-light shadow-2xs'
                        : 'bg-brand-soft/50 text-brand-dark/75 hover:bg-brand-soft'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Second row of filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {/* Custom Date Input (if CUSTOM selected) */}
              {dateFilterPreset === 'CUSTOM' && (
                <div className="col-span-2 sm:col-span-1">
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-brand-primary/30 bg-brand-soft/20 text-brand-dark text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                  />
                </div>
              )}

              {/* Category Dropdown */}
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-primary/30 bg-brand-soft/20 text-brand-dark text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                  aria-label="Filter by category"
                >
                  <option value="ALL">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Dropdown */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-primary/30 bg-brand-soft/20 text-brand-dark text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                  aria-label="Filter by status"
                >
                  <option value="ALL">All Statuses</option>
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Dropdown */}
              <div>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-primary/30 bg-brand-soft/20 text-brand-dark text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                  aria-label="Filter by priority"
                >
                  <option value="ALL">All Priorities</option>
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset button */}
              {hasActiveFilters && (
                <div className="col-span-2 sm:col-span-1 flex items-center">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="w-full px-3 py-2 rounded-xl border border-brand-dark/25 text-brand-dark hover:bg-brand-soft/60 text-xs font-bold transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Work Logs Table Container */}
          <section className="bg-brand-light border border-brand-primary/25 rounded-2xl shadow-xs overflow-hidden">
            {isLogsLoading ? (
              <div className="py-20 flex justify-center">
                <Loader text="Loading work logs table..." />
              </div>
            ) : logsError ? (
              <div className="py-16 text-center px-4 space-y-3">
                <p className="text-sm font-semibold text-rose-800">{logsError}</p>
                <button
                  type="button"
                  onClick={fetchWorkLogs}
                  className="px-4 py-2 rounded-xl bg-brand-dark text-brand-light text-xs font-bold hover:bg-brand-dark/90"
                >
                  Retry Loading
                </button>
              </div>
            ) : paginatedLogs.length === 0 ? (
              <div className="py-20 text-center px-4 space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-brand-soft flex items-center justify-center text-brand-dark/60">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h4 className="text-base font-bold text-brand-dark">No work logs match your filters</h4>
                <p className="text-xs text-brand-dark/60 max-w-sm mx-auto">
                  Try clearing or adjusting search queries, dates, or status filters.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mt-2 px-3.5 py-1.5 rounded-lg bg-brand-soft border border-brand-primary/30 text-brand-dark text-xs font-bold hover:bg-brand-soft/80"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : viewMode === 'table' ? (
              /* Desktop / Tablet Spreadsheet Table */
              <div className="overflow-x-auto max-w-full">
                <table className="w-full border-collapse text-left text-xs sm:text-sm text-brand-dark min-w-[950px]">
                  <thead className="sticky top-0 z-10 bg-brand-soft/95 backdrop-blur-xs border-b border-brand-primary/25 text-[11px] uppercase tracking-wider font-extrabold text-brand-dark select-none shadow-2xs">
                    <tr>
                      <th className="w-10 text-center py-3 px-2 border-r border-brand-primary/20">#</th>
                      <th className="py-3 px-3 border-r border-brand-primary/20 whitespace-nowrap">Date</th>
                      <th className="py-3 px-3 border-r border-brand-primary/20 min-w-[200px]">Task</th>
                      <th className="py-3 px-3 border-r border-brand-primary/20 whitespace-nowrap">Category</th>
                      <th className="py-3 px-3 border-r border-brand-primary/20 whitespace-nowrap">Activity Type</th>
                      <th className="py-3 px-2.5 border-r border-brand-primary/20 whitespace-nowrap text-center">Time</th>
                      <th className="py-3 px-2.5 border-r border-brand-primary/20 whitespace-nowrap text-center">Duration</th>
                      <th className="py-3 px-3 border-r border-brand-primary/20 whitespace-nowrap">Hall/Section</th>
                      <th className="py-3 px-2.5 border-r border-brand-primary/20 whitespace-nowrap text-center">Status</th>
                      <th className="py-3 px-2.5 border-r border-brand-primary/20 whitespace-nowrap text-center">Priority</th>
                      <th className="py-3 px-3 border-r border-brand-primary/20 min-w-[160px]">Remarks & Feedback</th>
                      <th className="py-3 px-3 whitespace-nowrap text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-primary/15">
                    {paginatedLogs.map((log, idx) => {
                      const absoluteIndex =
                        pageSize > 0 ? (currentPage - 1) * pageSize + idx + 1 : idx + 1;
                      const logRemarks = remarksByTarget[log._id] || [];

                      return (
                        <tr
                          key={log._id || `${log.date}-${idx}`}
                          className="hover:bg-brand-soft/30 transition-colors odd:bg-brand-light even:bg-brand-soft/10"
                        >
                          <td className="text-center py-2.5 px-2 border-r border-brand-primary/15 font-mono text-xs text-brand-dark/60">
                            {absoluteIndex}
                          </td>
                          <td className="py-2.5 px-3 border-r border-brand-primary/15 whitespace-nowrap font-medium text-brand-dark/90">
                            {formatDate(log.date)}
                          </td>
                          <td className="py-2.5 px-3 border-r border-brand-primary/15 font-bold text-brand-dark break-words">
                            {log.task}
                          </td>
                          <td className="py-2.5 px-3 border-r border-brand-primary/15 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-brand-soft border border-brand-primary/30 text-brand-dark">
                              {log.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 border-r border-brand-primary/15 whitespace-nowrap text-brand-dark/80 text-xs">
                            {log.activityType}
                          </td>
                          <td className="py-2.5 px-2.5 border-r border-brand-primary/15 whitespace-nowrap text-center font-mono text-xs text-brand-dark/80">
                            {formatDisplayTime(log.timeFrom)} – {formatDisplayTime(log.timeTo)}
                          </td>
                          <td className="py-2.5 px-2.5 border-r border-brand-primary/15 whitespace-nowrap text-center font-bold text-brand-dark">
                            {formatMinutes(log.spentMinutes)}
                          </td>
                          <td className="py-2.5 px-3 border-r border-brand-primary/15 whitespace-nowrap text-brand-dark/80 text-xs">
                            {log.hallSection || '—'}
                          </td>
                          <td className="py-2.5 px-2.5 border-r border-brand-primary/15 whitespace-nowrap text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] ${getStatusBadge(log.status)}`}>
                              {log.status || 'Completed'}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 border-r border-brand-primary/15 whitespace-nowrap text-center">
                            <span className={`px-2 py-0.5 rounded text-[11px] ${getPriorityBadge(log.priority)}`}>
                              {log.priority || 'Medium'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 border-r border-brand-primary/15 text-xs text-brand-dark/80 space-y-1">
                            {log.remarks && (
                              <div className="text-brand-dark/90 bg-brand-soft/40 p-1.5 rounded border border-brand-primary/10 break-words">
                                <span className="font-semibold text-brand-dark">User: </span>
                                {log.remarks}
                              </div>
                            )}
                            <RemarkList remarks={logRemarks} />
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-center">
                            <button
                              type="button"
                              onClick={() =>
                                onAddRemark({
                                  targetType: 'WorkLog',
                                  targetId: log._id,
                                  targetTitle: `${log.task} (${formatDate(log.date)})`,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-dark text-brand-light text-xs font-bold hover:bg-brand-dark/90 transition-colors shadow-2xs cursor-pointer min-h-[30px]"
                            >
                              <svg className="w-3 h-3 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                              </svg>
                              Remark
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Mobile / Responsive Cards View */
              <div className="p-4 space-y-3">
                {paginatedLogs.map((log) => {
                  const logRemarks = remarksByTarget[log._id] || [];
                  return (
                    <div
                      key={log._id}
                      className="p-4 rounded-xl border border-brand-primary/20 bg-brand-soft/20 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-soft border border-brand-primary/30 text-brand-dark">
                              {log.category}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-light border border-brand-primary/20 text-brand-dark/70">
                              {log.activityType}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${getStatusBadge(log.status)}`}>
                              {log.status}
                            </span>
                          </div>
                          <h4 className="font-bold text-base text-brand-dark break-words">{log.task}</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onAddRemark({
                              targetType: 'WorkLog',
                              targetId: log._id,
                              targetTitle: `${log.task} (${formatDate(log.date)})`,
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-brand-dark text-brand-light text-xs font-bold shrink-0 min-h-[32px]"
                        >
                          + Remark
                        </button>
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

                      {log.remarks && (
                        <div className="text-xs text-brand-dark/85 bg-brand-light/80 p-2 rounded-lg border border-brand-primary/10 break-words">
                          <span className="font-semibold text-brand-dark">Note: </span>
                          {log.remarks}
                        </div>
                      )}

                      <RemarkList remarks={logRemarks} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Toolbar */}
            {sortedFilteredLogs.length > 0 && (
              <div className="px-4 py-3 bg-brand-soft/30 border-t border-brand-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-brand-dark/80">
                <div className="flex items-center gap-3">
                  <span>
                    Showing {pageSize > 0 ? (currentPage - 1) * pageSize + 1 : 1} to{' '}
                    {pageSize > 0 ? Math.min(currentPage * pageSize, totalItems) : totalItems} of{' '}
                    <strong>{totalItems}</strong> entries
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-brand-dark/60">Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="px-2 py-1 rounded-lg border border-brand-primary/30 bg-brand-light text-xs font-semibold"
                      aria-label="Items per page"
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={0}>All</option>
                    </select>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1 self-start sm:self-auto">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-lg border border-brand-primary/25 bg-brand-light font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-soft"
                    >
                      Previous
                    </button>
                    <span className="px-2 font-semibold">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1.5 rounded-lg border border-brand-primary/25 bg-brand-light font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-soft"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* =========================================================================
          TAB 2: MENTOR LOGS & MENTORING OUTCOMES
         ========================================================================= */}
      {managerTab === 'mentorlogs' && (
        <div className="space-y-4">
          {/* Header & Controls */}
          <section className="bg-brand-light border border-brand-primary/20 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-brand-dark">Mentoring Outcomes Review</h3>
                <p className="text-xs text-brand-dark/70">
                  Review student questions, doubt resolutions, and mark manager feedback.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-brand-dark/70">Outcome:</span>
                <select
                  value={mentorStatusFilter}
                  onChange={(e) => setMentorStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-brand-primary/30 bg-brand-soft/20 text-xs font-semibold"
                  aria-label="Filter by mentor status"
                >
                  <option value="ALL">All Outcomes</option>
                  {QUESTION_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Input */}
            <input
              type="text"
              value={mentorSearch}
              onChange={(e) => setMentorSearch(e.target.value)}
              placeholder="Search question, resolution, batch, or subject..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/30 bg-brand-soft/20 text-brand-dark text-sm placeholder-brand-dark/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 font-medium"
            />
          </section>

          {/* Sessions & Questions List */}
          {isMentorLoading ? (
            <div className="py-20 flex justify-center">
              <Loader text="Loading mentoring sessions..." />
            </div>
          ) : mentorError ? (
            <div className="py-12 text-center text-sm text-rose-800 font-semibold bg-brand-light border border-brand-primary/20 rounded-2xl p-6">
              {mentorError}
              <div className="mt-2">
                <button
                  type="button"
                  onClick={fetchMentorLogs}
                  className="px-3 py-1.5 rounded-lg bg-brand-dark text-brand-light text-xs font-bold"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : mentorLogs.length === 0 ? (
            <div className="py-16 text-center bg-brand-light border border-brand-primary/20 rounded-2xl p-6">
              <h4 className="text-base font-bold text-brand-dark">No mentoring logs available</h4>
              <p className="text-xs text-brand-dark/60 mt-1">The user has not recorded any mentor logs yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mentorLogs.map((session) => {
                const sessionDate = session.workLog?.date ? formatDate(session.workLog.date) : '—';
                const questions = (session.questions || []).filter((q) => {
                  if (mentorStatusFilter !== 'ALL' && q.status !== mentorStatusFilter) return false;
                  if (mentorSearch.trim()) {
                    const qSearch = mentorSearch.toLowerCase().trim();
                    const matchesQ = (q.question || '').toLowerCase().includes(qSearch);
                    const matchesRes = (q.resolution || '').toLowerCase().includes(qSearch);
                    const matchesCat = (q.category || '').toLowerCase().includes(qSearch);
                    const matchesSubj = (session.subject || '').toLowerCase().includes(qSearch);
                    const matchesBatch = (session.studentBatch || '').toLowerCase().includes(qSearch);
                    return matchesQ || matchesRes || matchesCat || matchesSubj || matchesBatch;
                  }
                  return true;
                });

                if (questions.length === 0 && (mentorSearch || mentorStatusFilter !== 'ALL')) {
                  return null;
                }

                return (
                  <div
                    key={session._id}
                    className="bg-brand-light border border-brand-primary/25 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
                  >
                    {/* Session Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-brand-primary/20">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-base text-brand-dark">
                            {session.subject || 'Mentoring Session'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-brand-soft border border-brand-primary/30 text-brand-dark">
                            {session.studentBatch || 'General'}
                          </span>
                        </div>
                        <p className="text-xs text-brand-dark/70 font-medium mt-0.5">
                          Date: {sessionDate} • Tasks: {session.workLog?.task || 'Session'} • {questions.length} questions
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onAddRemark({
                            targetType: 'MentorLog',
                            targetId: session._id,
                            targetTitle: `Mentor Session: ${session.subject} (${session.studentBatch})`,
                          })
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-dark text-brand-light text-xs font-bold hover:bg-brand-dark/90 transition-colors self-start sm:self-auto min-h-[32px]"
                      >
                        + Session Remark
                      </button>
                    </div>

                    {/* Questions Table / List */}
                    <div className="space-y-2.5 pt-1">
                      {questions.map((q, qIdx) => {
                        const questionRemarks = remarksByTarget[q._id] || [];

                        return (
                          <div
                            key={q._id || qIdx}
                            className="p-3.5 rounded-xl border border-brand-primary/15 bg-brand-soft/20 text-xs space-y-1.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      q.status === 'Solved'
                                        ? 'bg-emerald-600/15 text-emerald-900 border border-emerald-600/30'
                                        : 'bg-amber-600/15 text-amber-900 border border-amber-600/30'
                                    }`}
                                  >
                                    {q.status}
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-light border border-brand-primary/20 text-brand-dark/70">
                                    {q.category || 'General'}
                                  </span>
                                </div>
                                <p className="font-bold text-sm text-brand-dark break-words">{q.question}</p>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  onAddRemark({
                                    targetType: 'MentorLog',
                                    targetId: q._id || session._id,
                                    targetTitle: `Question: ${q.question.slice(0, 30)}...`,
                                  })
                                }
                                className="px-2.5 py-1 rounded-md bg-brand-soft border border-brand-primary/30 text-brand-dark font-bold text-[11px] hover:bg-brand-primary hover:text-brand-light transition-colors min-h-[28px]"
                              >
                                Remark
                              </button>
                            </div>

                            {q.resolution && (
                              <div className="bg-brand-light/80 p-2 rounded-lg border border-brand-primary/10 break-words">
                                <span className="font-semibold text-emerald-900">Resolution: </span>
                                <span className="text-brand-dark/90">{q.resolution}</span>
                              </div>
                            )}

                            {q.remarks && (
                              <div className="bg-brand-light/50 p-1.5 rounded text-[11px] text-brand-dark/75">
                                <span className="font-medium text-brand-dark">Note: </span>
                                {q.remarks}
                              </div>
                            )}

                            <RemarkList remarks={questionRemarks} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: REPORTS SUMMARY
         ========================================================================= */}
      {managerTab === 'reports' && (
        <div className="space-y-4">
          <section className="bg-brand-light border border-brand-primary/20 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-brand-dark">Shared Reports Review</h3>
                <p className="text-xs text-brand-dark/70">
                  Inspect daily, weekly, and monthly aggregated records and breakdowns.
                </p>
              </div>

              {/* Period Switcher */}
              <div className="inline-flex items-center p-1 bg-brand-soft/60 rounded-xl border border-brand-primary/30 self-start sm:self-auto">
                {['daily', 'weekly', 'monthly'].map((period) => (
                  <button
                    type="button"
                    key={period}
                    onClick={() => setReportPeriod(period)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all min-h-[30px] ${
                      reportPeriod === period
                        ? 'bg-brand-primary text-brand-light shadow-2xs'
                        : 'text-brand-dark/70 hover:text-brand-dark'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {/* Date / Navigator controls based on period */}
            <div className="pt-1 flex items-center gap-3 flex-wrap text-xs font-semibold">
              {reportPeriod === 'daily' && (
                <div className="flex items-center gap-2">
                  <span className="text-brand-dark/70">Select Date:</span>
                  <input
                    type="date"
                    value={dailyDate}
                    onChange={(e) => setDailyDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-brand-primary/30 bg-brand-light text-brand-dark"
                  />
                  <button
                    type="button"
                    onClick={() => setDailyDate(todayStr)}
                    className="px-2.5 py-1.5 rounded-lg bg-brand-dark text-brand-light text-xs font-bold"
                  >
                    Today
                  </button>
                </div>
              )}

              {reportPeriod === 'weekly' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWeeklyStart((prev) => addDays(prev, -7))}
                    className="px-2.5 py-1 rounded-lg border border-brand-primary/30 hover:bg-brand-soft"
                  >
                    ← Prev Week
                  </button>
                  <span className="font-bold text-brand-dark">
                    {formatDate(weeklyStart)} – {formatDate(addDays(weeklyStart, 6))}
                  </span>
                  <button
                    type="button"
                    onClick={() => setWeeklyStart((prev) => addDays(prev, 7))}
                    className="px-2.5 py-1 rounded-lg border border-brand-primary/30 hover:bg-brand-soft"
                  >
                    Next Week →
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeeklyStart(getStartOfWeek(todayStr))}
                    className="px-2.5 py-1 rounded-lg bg-brand-dark text-brand-light text-xs font-bold"
                  >
                    Current Week
                  </button>
                </div>
              )}

              {reportPeriod === 'monthly' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (monthlyMonth === 1) {
                        setMonthlyMonth(12);
                        setMonthlyYear((y) => y - 1);
                      } else {
                        setMonthlyMonth((m) => m - 1);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg border border-brand-primary/30 hover:bg-brand-soft"
                  >
                    ← Prev Month
                  </button>
                  <span className="font-bold text-brand-dark">
                    {MONTH_NAMES[monthlyMonth - 1]} {monthlyYear}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (monthlyMonth === 12) {
                        setMonthlyMonth(1);
                        setMonthlyYear((y) => y + 1);
                      } else {
                        setMonthlyMonth((m) => m + 1);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg border border-brand-primary/30 hover:bg-brand-soft"
                  >
                    Next Month →
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Report Content */}
          {isReportLoading ? (
            <div className="py-20 flex justify-center">
              <Loader text="Generating summary report..." />
            </div>
          ) : reportError ? (
            <div className="py-12 text-center text-sm text-rose-800 font-semibold bg-brand-light border border-brand-primary/20 rounded-2xl p-6">
              {reportError}
            </div>
          ) : !reportData ? (
            <div className="py-16 text-center text-sm text-brand-dark/60 bg-brand-light border border-brand-primary/20 rounded-2xl p-6">
              No report data available for this range.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-brand-light border border-brand-primary/20 rounded-2xl p-4 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-dark/60 block">
                    Total Tasks
                  </span>
                  <span className="text-2xl font-extrabold text-brand-dark mt-1 block">
                    {reportData.totalTasks || 0}
                  </span>
                </div>
                <div className="bg-brand-light border border-brand-primary/20 rounded-2xl p-4 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-dark/60 block">
                    Total Worked Hours
                  </span>
                  <span className="text-2xl font-extrabold text-brand-dark mt-1 block">
                    {reportData.totalWorkedHours || formatMinutes(reportData.totalWorkedMinutes || 0)}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1 bg-brand-light border border-brand-primary/20 rounded-2xl p-4 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-dark/60 block">
                    Logged Categories
                  </span>
                  <span className="text-2xl font-extrabold text-brand-dark mt-1 block">
                    {reportData.categorySummary?.length || 0}
                  </span>
                </div>
              </div>

              {/* Category Breakdown Table */}
              {reportData.categorySummary && reportData.categorySummary.length > 0 && (
                <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-4 sm:p-5 shadow-xs">
                  <h4 className="font-bold text-base text-brand-dark mb-3">Category Breakdown</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead className="border-b border-brand-primary/20 text-brand-dark/70 font-bold uppercase text-[11px]">
                        <tr>
                          <th className="py-2 text-left">Category</th>
                          <th className="py-2 text-center">Tasks</th>
                          <th className="py-2 text-right">Time Spent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-primary/10">
                        {reportData.categorySummary.map((item) => (
                          <tr key={item.category} className="hover:bg-brand-soft/20">
                            <td className="py-2 font-semibold text-brand-dark">{item.category}</td>
                            <td className="py-2 text-center">{item.tasks}</td>
                            <td className="py-2 text-right font-bold text-brand-dark">
                              {item.workedHours || formatMinutes(item.workedMinutes)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: MANAGER REMARKS LOG
         ========================================================================= */}
      {managerTab === 'remarks' && (
        <div className="space-y-4">
          <section className="bg-brand-light border border-brand-primary/20 rounded-2xl p-4 sm:p-5 shadow-xs">
            <h3 className="text-lg font-bold text-brand-dark">Manager Remarks Log</h3>
            <p className="text-xs text-brand-dark/70 mt-0.5">
              History of all feedback, notes, and reviews submitted through this portal.
            </p>
          </section>

          {isRemarksLoading ? (
            <div className="py-20 flex justify-center">
              <Loader text="Loading remarks history..." />
            </div>
          ) : allRemarks.length === 0 ? (
            <div className="py-16 text-center bg-brand-light border border-brand-primary/20 rounded-2xl p-6">
              <h4 className="text-base font-bold text-brand-dark">No remarks submitted yet</h4>
              <p className="text-xs text-brand-dark/60 mt-1">
                Use the &quot;Add Remark&quot; button on any work log or mentor log to submit manager feedback.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allRemarks.map((r) => (
                <div
                  key={r._id}
                  className="bg-brand-light border border-brand-primary/25 rounded-2xl p-4 sm:p-5 shadow-xs text-left space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-brand-primary/15">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-brand-dark">{r.authorName || 'Manager'}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-soft border border-brand-primary/30 text-brand-dark">
                        {r.targetType}
                      </span>
                    </div>
                    <span className="text-[11px] text-brand-dark/60 font-medium">
                      {new Date(r.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>

                  <p className="text-sm text-brand-dark/90 font-medium break-words whitespace-pre-wrap">
                    {r.remark}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SharedManagerView;
