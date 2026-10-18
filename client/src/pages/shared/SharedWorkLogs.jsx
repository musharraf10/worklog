import { useState, useEffect, useMemo } from 'react';
import sharedPortalService from '../../services/sharedPortalService';
import WorkLogsCalendar from '../../components/worklogs/WorkLogsCalendar';
import RemarkList from '../../components/share/RemarkList';
import Loader from '../../components/common/Loader';
import {
  getTodayDateString,
  addDays,
  formatGroupDate,
  formatDateForInput,
  formatDate,
} from '../../utils/dateUtils';
import { formatMinutes, formatDisplayTime } from '../../utils/timeUtils';

export const SharedWorkLogs = ({ token, onAddRemark, remarksByTarget = {} }) => {
  const today = getTodayDateString();
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [month, setMonth] = useState(new Date(`${today}T00:00:00`));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    let isMounted = true;
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await sharedPortalService.getWorkLogs(token);
        if (isMounted) setLogs(res.data || []);
      } catch (err) {
        console.error('Error fetching shared work logs:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchLogs();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Selected Day logs with search & status filter
  const selectedDayLogs = useMemo(() => {
    return logs
      .filter((log) => {
        if (formatDateForInput(log.date) !== selectedDate) return false;
        if (statusFilter !== 'ALL' && log.status !== statusFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesTask = (log.task || '').toLowerCase().includes(q);
          const matchesCat = (log.category || '').toLowerCase().includes(q);
          const matchesHall = (log.hallSection || '').toLowerCase().includes(q);
          if (!matchesTask && !matchesCat && !matchesHall) return false;
        }
        return true;
      })
      .sort((a, b) => (a.timeFrom || '').localeCompare(b.timeFrom || ''));
  }, [logs, selectedDate, statusFilter, searchQuery]);

  const totalSelectedMinutes = selectedDayLogs.reduce(
    (sum, l) => sum + (l.spentMinutes || 0),
    0,
  );
  const completedCount = selectedDayLogs.filter(
    (l) => l.status === 'Completed',
  ).length;
  const inProgressCount = selectedDayLogs.filter(
    (l) => l.status === 'In Progress',
  ).length;
  const pendingCount = selectedDayLogs.filter(
    (l) =>
      ['Yet to Start', 'On Hold', 'Carry Forward', 'Not Done'].includes(l.status),
  ).length;

  // 21-day strip
  const dateStripDates = useMemo(() => {
    return Array.from({ length: 21 }, (_, index) => addDays(today, index - 10));
  }, [today]);

  if (loading) {
    return <Loader text="Loading work logs history..." />;
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-brand-light border border-brand-primary/20 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
            Complete History
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-brand-dark mt-0.5">
            Work Log Records
          </h2>
          <p className="text-sm text-brand-dark/70 mt-1">
            Browse daily logs, calendar records, and leave manager remarks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCalendarOpen(!calendarOpen)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-brand-primary/30 bg-brand-soft/40 hover:bg-brand-soft text-brand-dark text-sm font-semibold transition-colors"
          >
            <svg className="w-4 h-4 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {calendarOpen ? 'Close Calendar' : 'Calendar View'}
          </button>
        </div>
      </div>

      {/* Calendar View Toggle Drawer / Box */}
      {calendarOpen && (
        <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-4 sm:p-6 shadow-xs animate-in fade-in duration-200">
          <WorkLogsCalendar
            month={month}
            selectedDate={selectedDate}
            logs={logs}
            onMonthChange={setMonth}
            onSelectDate={(d) => {
              setSelectedDate(d);
              setMonth(new Date(`${d}T00:00:00`));
            }}
          />
        </div>
      )}

      {/* Date Strip */}
      <section className="rounded-2xl border border-brand-primary/25 bg-brand-light p-3 sm:p-4 shadow-xs">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.12em] text-brand-primary">
              Browse by date
            </p>
            <p className="text-xs text-brand-dark/70">Select any day to inspect its entries</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedDate(today);
              setMonth(new Date(`${today}T00:00:00`));
            }}
            className="rounded-lg bg-brand-dark px-3 py-1.5 text-xs font-semibold text-brand-light hover:bg-brand-dark/90"
          >
            Today
          </button>
        </div>

        <div className="date-strip flex gap-2 overflow-x-auto pb-2">
          {dateStripDates.map((date) => {
            const dateObj = new Date(`${date}T00:00:00`);
            const active = date === selectedDate;
            const hasEntries = logs.some((l) => formatDateForInput(l.date) === date);

            return (
              <button
                type="button"
                key={date}
                onClick={() => {
                  setSelectedDate(date);
                  setMonth(new Date(`${date}T00:00:00`));
                }}
                className={`min-w-[62px] rounded-xl border px-2 py-2 text-center transition ${
                  active
                    ? 'border-brand-dark bg-brand-dark text-brand-light shadow-sm'
                    : hasEntries
                    ? 'border-brand-primary/40 bg-brand-soft/50 text-brand-dark hover:bg-brand-soft'
                    : 'border-brand-primary/15 bg-brand-soft/20 text-brand-dark/60 hover:bg-brand-soft/40'
                }`}
              >
                <span className="block text-[11px] font-bold uppercase">
                  {dateObj.toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
                <span className="mt-0.5 block text-lg font-bold">
                  {dateObj.getDate()}
                </span>
                <span className="block text-[10px] opacity-75">
                  {date === today ? 'Today' : dateObj.toLocaleDateString(undefined, { month: 'short' })}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Selected Day Overview */}
      <section className="rounded-2xl border border-brand-primary/25 bg-brand-light p-4 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-brand-primary/20 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-dark/60">
              Selected Day Logs
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-brand-dark mt-0.5">
              {formatGroupDate(selectedDate)}
            </h3>
          </div>
          <p className="text-sm font-bold text-brand-dark">
            {selectedDayLogs.length} {selectedDayLogs.length === 1 ? 'task' : 'tasks'}
            <span className="mx-2 text-brand-dark/30">|</span>
            {formatMinutes(totalSelectedMinutes)}
          </p>
        </div>

        {/* 4 KPI metrics */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-xl border border-brand-primary/15 bg-brand-soft/30 p-3">
            <span className="text-xs font-semibold text-brand-dark/65">Total Time</span>
            <p className="text-lg font-extrabold text-brand-dark mt-0.5">{formatMinutes(totalSelectedMinutes)}</p>
          </div>
          <div className="rounded-xl border border-brand-primary/15 bg-brand-soft/30 p-3">
            <span className="text-xs font-semibold text-brand-dark/65">Completed</span>
            <p className="text-lg font-extrabold text-emerald-700 mt-0.5">{completedCount}</p>
          </div>
          <div className="rounded-xl border border-brand-primary/15 bg-brand-soft/30 p-3">
            <span className="text-xs font-semibold text-brand-dark/65">In Progress</span>
            <p className="text-lg font-extrabold text-amber-700 mt-0.5">{inProgressCount}</p>
          </div>
          <div className="rounded-xl border border-brand-primary/15 bg-brand-soft/30 p-3">
            <span className="text-xs font-semibold text-brand-dark/65">Pending / Other</span>
            <p className="text-lg font-extrabold text-brand-dark mt-0.5">{pendingCount}</p>
          </div>
        </div>

        {/* Day Filter & Search Strip */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks for this day..."
            className="flex-1 px-3 py-1.5 rounded-xl border border-brand-primary/30 bg-brand-soft/20 text-xs font-medium text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-brand-primary/30 bg-brand-soft/20 text-xs font-semibold text-brand-dark"
              aria-label="Filter status for day"
            >
              <option value="ALL">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="Yet to Start">Yet to Start</option>
              <option value="On Hold">On Hold</option>
              <option value="Carry Forward">Carry Forward</option>
              <option value="Not Done">Not Done</option>
            </select>
            {(searchQuery || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="px-2.5 py-1 rounded-lg border border-brand-primary/30 text-xs font-semibold hover:bg-brand-soft"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Selected day log list */}
        <div className="mt-6 space-y-4">
          {selectedDayLogs.length === 0 ? (
            <div className="py-12 text-center border-y border-brand-primary/15">
              <p className="text-sm font-bold text-brand-dark">No work logged for this day</p>
              <p className="text-xs text-brand-dark/60 mt-1">
                The user did not record any entries for {formatGroupDate(selectedDate)}.
              </p>
            </div>
          ) : (
            selectedDayLogs.map((log) => {
              const remarks = remarksByTarget[log._id] || [];

              return (
                <div
                  key={log._id}
                  className="p-4 rounded-xl border border-brand-primary/20 bg-brand-soft/20 hover:bg-brand-soft/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
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

                    <div className="flex items-center gap-2 shrink-0 self-start">
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
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default SharedWorkLogs;
