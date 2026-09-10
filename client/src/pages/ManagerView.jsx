import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import workLogService from '../services/workLogService';
import { subscribeToLogsUpdated } from '../utils/storageUtils';
import { formatDate } from '../utils/dateUtils';
import { formatMinutes, formatDisplayTime } from '../utils/timeUtils';

export const ManagerView = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    const fetchLogs = async () => {
      try {
        const response = await workLogService.getAllWorkLogs();
        if (!isCancelled) {
          setLogs(response.data || []);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching logs for Manager View:', err);
        if (!isCancelled) {
          setError('Failed to load work logs. Please try again.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchLogs();

    const unsubscribe = subscribeToLogsUpdated(() => {
      if (!isCancelled) {
        fetchLogs();
      }
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [retryTrigger]);

  const handleRetry = () => {
    setIsLoading(true);
    setRetryTrigger((prev) => prev + 1);
  };

  const handleClose = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/worklogs');
    }
  }, [navigate]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  // Sort logs chronologically (newest dates first, then by start time)
  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return (a.timeFrom || '').localeCompare(b.timeFrom || '');
    });
  }, [logs]);

  // Summary strip metrics
  const metrics = useMemo(() => {
    const totalTasks = logs.length;
    const totalMinutes = logs.reduce((acc, log) => acc + (log.spentMinutes || 0), 0);
    const completedCount = logs.filter((log) => log.status === 'Completed').length;
    const pendingCount = logs.filter((log) => log.status !== 'Completed').length;

    let dateRange = '—';
    if (logs.length > 0) {
      const validDates = logs
        .map((l) => (l.date ? new Date(l.date).getTime() : null))
        .filter((t) => t && !Number.isNaN(t));

      if (validDates.length > 0) {
        const minTime = Math.min(...validDates);
        const maxTime = Math.max(...validDates);
        const minDateStr = formatDate(new Date(minTime));
        const maxDateStr = formatDate(new Date(maxTime));
        dateRange = minDateStr === maxDateStr ? minDateStr : `${minDateStr} – ${maxDateStr}`;
      }
    }

    return {
      totalTasks,
      totalWorked: formatMinutes(totalMinutes),
      completedCount,
      pendingCount,
      dateRange,
    };
  }, [logs]);

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'Highest':
        return 'bg-brand-dark text-brand-light font-bold px-2 py-0.5 rounded text-xs';
      case 'High':
        return 'bg-brand-primary text-brand-dark font-bold px-2 py-0.5 rounded text-xs';
      case 'Medium':
        return 'bg-brand-soft border border-brand-primary/40 text-brand-dark font-semibold px-2 py-0.5 rounded text-xs';
      case 'Low':
        return 'bg-brand-light border border-brand-dark/25 text-brand-dark/80 px-2 py-0.5 rounded text-xs';
      case 'Adhoc':
        return 'bg-brand-primary/30 border border-brand-dark/30 text-brand-dark font-semibold italic px-2 py-0.5 rounded text-xs';
      default:
        return 'text-brand-dark/80 px-2 py-0.5 text-xs';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-brand-soft border border-brand-primary/40 text-brand-dark font-semibold px-2 py-0.5 rounded text-xs';
      case 'In Progress':
        return 'bg-brand-primary/30 border border-brand-dark/20 text-brand-dark font-semibold px-2 py-0.5 rounded text-xs';
      case 'Yet to Start':
        return 'bg-brand-light border border-brand-dark/25 text-brand-dark/85 font-medium px-2 py-0.5 rounded text-xs';
      case 'On Hold':
        return 'bg-brand-soft/60 border border-brand-dark/30 text-brand-dark/90 font-medium px-2 py-0.5 rounded text-xs';
      case 'Carry Forward':
        return 'bg-brand-primary/20 border border-brand-primary text-brand-dark font-semibold px-2 py-0.5 rounded text-xs';
      case 'Not Done':
        return 'bg-brand-dark text-brand-light font-bold px-2 py-0.5 rounded text-xs';
      default:
        return 'bg-brand-light border border-brand-dark/25 text-brand-dark/85 font-medium px-2 py-0.5 rounded text-xs';
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-brand-light text-brand-dark overflow-hidden select-text font-sans">
      {/* 1. Minimal Top Bar */}
      <header className="h-10 px-4 bg-brand-soft/40 border-b border-brand-dark/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {/* Classic spreadsheet icon */}
          <svg className="w-4 h-4 text-brand-dark/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 4h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs sm:text-sm font-bold tracking-tight text-brand-dark uppercase">
            Work Log
          </span>
          <span className="text-xs text-brand-dark/60 font-medium hidden sm:inline">
            — Spreadsheet View
          </span>
        </div>

        {/* ONLY ONE X (close) button at the top-right */}
        <button
          type="button"
          onClick={handleClose}
          className="p-1 rounded text-brand-dark/70 hover:text-brand-dark hover:bg-brand-soft transition-colors cursor-pointer"
          title="Close Manager View"
          aria-label="Close Manager View"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* 2. Compact Horizontal Summary Strip (no cards, no charts) */}
      <section className="px-4 py-2 bg-brand-light border-b border-brand-dark/20 text-xs sm:text-sm font-medium text-brand-dark/90 flex items-center justify-between flex-wrap gap-x-5 gap-y-1 shrink-0">
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <div>
            <span className="text-brand-dark/70">Total Tasks: </span>
            <span className="font-bold text-brand-dark">{metrics.totalTasks}</span>
          </div>
          <span className="text-brand-dark/30 hidden sm:inline">|</span>
          <div>
            <span className="text-brand-dark/70">Total Worked Time: </span>
            <span className="font-bold text-brand-dark">{metrics.totalWorked}</span>
          </div>
          <span className="text-brand-dark/30 hidden sm:inline">|</span>
          <div>
            <span className="text-brand-dark/70">Date Range: </span>
            <span className="font-bold text-brand-dark">{metrics.dateRange}</span>
          </div>
          <span className="text-brand-dark/30 hidden sm:inline">|</span>
          <div>
            <span className="text-brand-dark/70">Completed: </span>
            <span className="font-bold text-brand-dark">{metrics.completedCount}</span>
          </div>
          <span className="text-brand-dark/30 hidden sm:inline">|</span>
          <div>
            <span className="text-brand-dark/70">Pending / In Progress: </span>
            <span className="font-bold text-brand-dark">{metrics.pendingCount}</span>
          </div>
        </div>

        <div className="text-xs text-brand-dark/60 font-semibold tracking-wider uppercase">
          Read-Only
        </div>
      </section>

      {/* 3. Main Full-Screen Spreadsheet Table */}
      <main className="flex-1 overflow-auto bg-brand-light relative">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-sm font-semibold text-brand-dark/70">
            Loading work logs...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-brand-dark font-medium">
            <p className="mb-2">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="px-3 py-1.5 rounded bg-brand-soft hover:bg-brand-primary/50 text-xs font-semibold border border-brand-dark/20"
            >
              Retry
            </button>
          </div>
        ) : sortedLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-brand-dark/60">
            No work log entries found.
          </div>
        ) : (
          <table className="min-w-full border-collapse text-left text-sm text-brand-dark">
            <thead className="sticky top-0 z-10 bg-brand-soft/95 backdrop-blur-xs border-b-2 border-brand-dark/30 text-xs uppercase tracking-wider font-bold text-brand-dark select-none shadow-xs">
              <tr>
                <th className="w-12 text-center py-2.5 px-2 border-r border-brand-dark/20">#</th>
                <th className="py-2.5 px-3 border-r border-brand-dark/20 whitespace-nowrap">Date</th>
                <th className="py-2.5 px-3 border-r border-brand-dark/20 min-w-[220px]">Task</th>
                <th className="py-2.5 px-3 border-r border-brand-dark/20 whitespace-nowrap">Category</th>
                <th className="py-2.5 px-3 border-r border-brand-dark/20 whitespace-nowrap">Activity Type</th>
                <th className="py-2.5 px-3 border-r border-brand-dark/20 whitespace-nowrap text-center">Time From</th>
                <th className="py-2.5 px-3 border-r border-brand-dark/20 whitespace-nowrap text-center">Time To</th>
                <th className="py-2.5 px-3 border-r border-brand-dark/20 whitespace-nowrap text-center">Spent Time</th>
                <th className="py-2.5 px-3 border-r border-brand-dark/20 whitespace-nowrap">Hall / Section</th>
                <th className="py-2.5 px-3 border-r border-brand-dark/20 whitespace-nowrap text-center">Status</th>
                <th className="py-2.5 px-3 border-r border-brand-dark/20 whitespace-nowrap text-center">Priority</th>
                <th className="py-2.5 px-3 min-w-[200px]">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {sortedLogs.map((log, index) => (
                <tr
                  key={log._id || `${log.date}-${index}`}
                  className="even:bg-brand-light odd:bg-brand-soft/15 hover:bg-brand-primary/15 transition-colors border-b border-brand-dark/15 text-sm"
                >
                  <td className="text-center py-2 px-2 border-r border-brand-dark/15 text-xs font-mono text-brand-dark/60">
                    {index + 1}
                  </td>
                  <td className="py-2 px-3 border-r border-brand-dark/15 whitespace-nowrap font-medium text-brand-dark/90">
                    {formatDate(log.date)}
                  </td>
                  <td className="py-2 px-3 border-r border-brand-dark/15 font-semibold text-brand-dark">
                    {log.task || '—'}
                  </td>
                  <td className="py-2 px-3 border-r border-brand-dark/15 whitespace-nowrap text-brand-dark/85">
                    {log.category || '—'}
                  </td>
                  <td className="py-2 px-3 border-r border-brand-dark/15 whitespace-nowrap text-brand-dark/85">
                    {log.activityType || '—'}
                  </td>
                  <td className="py-2 px-3 border-r border-brand-dark/15 whitespace-nowrap text-center font-mono text-xs text-brand-dark/80">
                    {formatDisplayTime(log.timeFrom) || '—'}
                  </td>
                  <td className="py-2 px-3 border-r border-brand-dark/15 whitespace-nowrap text-center font-mono text-xs text-brand-dark/80">
                    {formatDisplayTime(log.timeTo) || '—'}
                  </td>
                  <td className="py-2 px-3 border-r border-brand-dark/15 whitespace-nowrap text-center font-semibold text-brand-dark">
                    {formatMinutes(log.spentMinutes)}
                  </td>
                  <td className="py-2 px-3 border-r border-brand-dark/15 whitespace-nowrap text-brand-dark/85">
                    {log.hallSection || '—'}
                  </td>
                  <td className="py-2 px-3 border-r border-brand-dark/15 whitespace-nowrap text-center">
                    <span className={getStatusBadgeClass(log.status)}>
                      {log.status || 'Completed'}
                    </span>
                  </td>
                  <td className="py-2 px-3 border-r border-brand-dark/15 whitespace-nowrap text-center">
                    <span className={getPriorityBadgeClass(log.priority)}>
                      {log.priority || 'Medium'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-brand-dark/80 text-sm">
                    {log.remarks || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
};

export default ManagerView;
