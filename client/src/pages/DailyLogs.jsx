import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import WorkLogForm from '../components/worklogs/WorkLogForm';
import WorkLogsCalendar from '../components/worklogs/WorkLogsCalendar';
import WorkLogGroup from '../components/worklogs/WorkLogGroup';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { subscribeToLogsUpdated } from '../utils/storageUtils';
import workLogService from '../services/workLogService';
import { addDays, formatDateForInput, formatGroupDate, getTodayDateString } from '../utils/dateUtils';
import { formatDisplayTime, formatMinutes } from '../utils/timeUtils';
import { useAuth } from '../hooks/useAuth';

const DaySummary = React.memo(({
  selectedDate,
  selectedLogs,
  total,
  completed,
  active,
  pending,
  isFetchingDate,
  dateError,
  onRetry,
  onAddLog,
  onSave,
  onDelete,
}) => (
  <section className="rounded-2xl border border-brand-primary/25 bg-brand-light p-4 shadow-xs sm:p-6 text-left">
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-brand-primary/20 pb-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.12em] text-brand-dark/60">Selected day</p>
        <div className="flex items-center gap-3">
          <h2 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-brand-dark sm:text-[1.65rem]">
            {formatGroupDate(selectedDate)}
          </h2>
          {isFetchingDate && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-soft text-brand-dark/80">
              <svg className="w-3 h-3 animate-spin text-brand-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Updating...
            </span>
          )}
        </div>
        <p className="mt-1 text-sm font-medium text-brand-dark/65">
          {new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long' })}
        </p>
      </div>
      <p className="text-sm font-bold text-brand-dark">
        {selectedLogs.length} {selectedLogs.length === 1 ? 'task' : 'tasks'}{' '}
        <span className="mx-2 text-brand-dark/30">|</span> {formatMinutes(total)}
      </p>
    </div>

    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[
        ['Total time', formatMinutes(total)],
        ['Completed', completed],
        ['In progress', active],
        ['Pending', pending],
      ].map(([label, value]) => (
        <div key={label} className="rounded-xl border border-brand-primary/15 bg-brand-soft/25 p-3">
          <p className="text-xs font-semibold text-brand-dark/60">{label}</p>
          <p className="mt-1 text-xl font-bold text-brand-dark">{value}</p>
        </div>
      ))}
    </div>

    <div className="mt-6">
      <h3 className="mb-3 text-lg font-bold text-brand-dark">Work entries</h3>
      {isFetchingDate && selectedLogs.length === 0 ? (
        <div className="py-12 text-center text-sm text-brand-dark/70 flex flex-col items-center justify-center gap-2.5">
          <svg className="w-6 h-6 animate-spin text-brand-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="font-medium">Loading entries for {formatGroupDate(selectedDate)}...</span>
        </div>
      ) : dateError ? (
        <div className="py-8 px-4 text-center bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-medium text-red-700">{dateError}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-800 text-white text-xs font-bold hover:bg-red-900 transition-colors"
          >
            Retry loading
          </button>
        </div>
      ) : selectedLogs.length ? (
        <div className={isFetchingDate ? 'opacity-60 pointer-events-none transition-opacity' : ''}>
          <WorkLogGroup
            group={{
              dateKey: selectedDate,
              formattedDate: formatGroupDate(selectedDate),
              isToday: selectedDate === getTodayDateString(),
              isYesterday: false,
              totalMinutes: total,
              totalHoursStr: formatMinutes(total),
              taskCount: selectedLogs.length,
              tasks: selectedLogs,
            }}
            isExpanded
            onSave={onSave}
            onDelete={onDelete}
          />
        </div>
      ) : (
        <div className="border-y border-brand-primary/15 py-14 text-center">
          <h3 className="font-bold text-brand-dark">No work logged for this day</h3>
          <p className="mt-2 text-sm text-brand-dark/70">
            You haven’t recorded any work for {formatGroupDate(selectedDate)} yet.
          </p>
          <button
            onClick={onAddLog}
            className="mt-5 rounded-lg bg-brand-dark px-4 py-2 text-sm font-bold text-brand-light"
          >
            + Add work log
          </button>
        </div>
      )}
    </div>
  </section>
));

DaySummary.displayName = 'DaySummary';

const TodayTimeline = React.memo(({ logs }) => (
  <section className="rounded-2xl border border-brand-primary/25 bg-brand-light p-4 shadow-xs sm:p-5 text-left">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.12em] text-brand-primary">Today at a glance</p>
        <h2 className="mt-1 text-lg font-bold text-brand-dark">Today’s task timeline</h2>
      </div>
      <span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-bold text-brand-dark">
        {logs.length} {logs.length === 1 ? 'task' : 'tasks'}
      </span>
    </div>
    {logs.length ? (
      <div className="relative mt-5 space-y-4 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-brand-primary/25">
        {logs.map((log) => (
          <div key={log._id} className="relative flex gap-3">
            <span className="relative z-10 mt-1 h-[27px] w-[27px] shrink-0 rounded-full border-[5px] border-brand-light bg-brand-primary" />
            <div className="min-w-0 flex-1 rounded-xl bg-brand-soft/25 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-brand-dark">{log.task}</p>
                <span className="text-xs font-bold text-brand-dark/70">
                  {formatDisplayTime(log.timeFrom)} – {formatDisplayTime(log.timeTo)}
                </span>
              </div>
              <p className="mt-1 text-sm text-brand-dark/65">
                {log.category} · {log.activityType} · {formatMinutes(log.spentMinutes)}
              </p>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="mt-5 rounded-xl border border-dashed border-brand-primary/25 py-8 text-center text-sm text-brand-dark/65">
        No tasks logged today yet. Your new entries will appear here.
      </div>
    )}
  </section>
));

TodayTimeline.displayName = 'TodayTimeline';

const DateStrip = React.memo(({ selectedDate, onSelectDate, onOpenCalendar, onToday }) => {
  const today = getTodayDateString();
  const dates = useMemo(() => Array.from({ length: 21 }, (_, index) => addDays(today, index - 10)), [today]);

  return (
    <section className="rounded-2xl border border-brand-primary/25 bg-brand-light p-3 shadow-xs sm:p-4 text-left">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.12em] text-brand-primary">Browse dates</p>
          <p className="mt-0.5 text-sm text-brand-dark/70">Scroll to select a day</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onToday}
            className="rounded-lg bg-brand-dark px-3 py-2 text-sm font-semibold text-brand-light hover:bg-brand-dark/90"
          >
            Today
          </button>
          <button
            type="button"
            onClick={onOpenCalendar}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-dark/20 bg-brand-soft/40 px-3 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-soft"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Calendar</span>
          </button>
        </div>
      </div>
      <div className="date-strip flex gap-2 overflow-x-auto pb-2">
        {dates.map((date) => {
          const dateObj = new Date(`${date}T00:00:00`);
          const active = date === selectedDate;
          return (
            <button
              type="button"
              key={date}
              onClick={() => onSelectDate(date)}
              aria-pressed={active}
              className={`min-w-[62px] rounded-xl border px-2 py-2 text-center transition ${
                active
                  ? 'border-brand-dark bg-brand-dark text-brand-light shadow-sm'
                  : 'border-brand-primary/20 bg-brand-soft/20 text-brand-dark hover:bg-brand-soft/60'
              }`}
            >
              <span className="block text-[11px] font-bold uppercase">
                {dateObj.toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
              <span className="mt-0.5 block text-lg font-bold">{dateObj.getDate()}</span>
              <span className="block text-[10px] opacity-70">
                {date === today ? 'Today' : dateObj.toLocaleDateString(undefined, { month: 'short' })}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
});

DateStrip.displayName = 'DateStrip';

const FloatingCalendar = React.memo(({ month, selectedDate, logs, onMonthChange, onSelectDate, onClose }) => {
  const [position, setPosition] = useState({ x: 24, y: 88 });
  const drag = useRef(null);

  useEffect(() => {
    const move = (event) => {
      if (!drag.current) return;
      setPosition({
        x: Math.max(8, event.clientX - drag.current.x),
        y: Math.max(8, event.clientY - drag.current.y),
      });
    };
    const end = () => {
      drag.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
    };
  }, []);

  return (
    <aside
      className="floating-calendar fixed z-50 min-h-[320px] min-w-[280px] max-w-[calc(100vw-1rem)] overflow-auto rounded-2xl border border-brand-primary/35 bg-brand-light p-3 shadow-2xl sm:p-4 text-left"
      style={{ left: position.x, top: position.y, width: 'min(380px, calc(100vw - 1rem))' }}
      role="dialog"
      aria-label="Floating calendar"
    >
      <div
        className="mb-2 flex cursor-move items-center justify-between gap-3 rounded-lg bg-brand-soft/45 px-2 py-1.5 touch-none"
        onPointerDown={(event) => {
          if (event.target.closest('button')) return;
          drag.current = { x: event.clientX - position.x, y: event.clientY - position.y };
        }}
      >
        <span className="text-xs font-bold uppercase tracking-[.12em] text-brand-dark/70">Drag calendar</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide calendar"
          className="rounded-md p-1 text-brand-dark/70 hover:bg-brand-light hover:text-brand-dark"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <WorkLogsCalendar
        month={month}
        selectedDate={selectedDate}
        logs={logs}
        onMonthChange={onMonthChange}
        onSelectDate={onSelectDate}
      />
    </aside>
  );
});

FloatingCalendar.displayName = 'FloatingCalendar';

export default function DailyLogs() {
  const today = getTodayDateString();
  const [logs, setLogs] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [calendarLogs, setCalendarLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [month, setMonth] = useState(new Date(`${today}T00:00:00`));
  const [view, setView] = useState('form');
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Stable loading states: initialLoading for mount only, isFetchingDate for seamless date transitions
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetchingDate, setIsFetchingDate] = useState(false);
  const [initialError, setInitialError] = useState('');
  const [dateError, setDateError] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [notice, setNotice] = useState('');
  const { syncStatus, pendingCount } = useAuth();

  // In-flight request cancellation & date cache to prevent duplicate / slow race condition overwrites
  const abortControllerRef = useRef(null);
  const dateCacheRef = useRef(new Map());

  const fetchDateLogs = useCallback(async (date, options = {}) => {
    // Preserve pagination & fetch only date's logs from backend
    const response = await workLogService.getWorkLogs({ date, page: 1, limit: 100 }, options);
    return response.data || [];
  }, []);

  // Effect to load logs when selectedDate changes (without unmounting or re-rendering page layout)
  useEffect(() => {
    // Check if we have cached data for instantaneous transition
    if (dateCacheRef.current.has(selectedDate)) {
      setLogs(dateCacheRef.current.get(selectedDate));
      setDateError('');
    }

    // Cancel any previous in-flight date request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsFetchingDate(true);
    setDateError('');

    fetchDateLogs(selectedDate, { signal: controller.signal })
      .then((dayLogs) => {
        setLogs(dayLogs);
        dateCacheRef.current.set(selectedDate, dayLogs);
        if (selectedDate === today) {
          setTodayLogs(dayLogs);
          dateCacheRef.current.set(today, dayLogs);
        }
        setInitialError('');
      })
      .catch((err) => {
        // Ignore aborted requests: they were canceled intentionally by newer selection
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
          return;
        }
        const errorMsg = err.response?.data?.message || err.message || 'Unable to load work logs for this date.';
        if (initialLoading) {
          setInitialError(errorMsg);
        } else {
          setDateError(errorMsg);
        }
      })
      .finally(() => {
        // Only set fetching false if this controller is still the active one
        if (abortControllerRef.current === controller) {
          setIsFetchingDate(false);
          setInitialLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [fetchDateLogs, selectedDate, today, initialLoading]);

  // Ensure today's timeline logs are populated if user stays on form view
  useEffect(() => {
    if (view !== 'form' || selectedDate === today) return undefined;
    let active = true;
    fetchDateLogs(today)
      .then((dayLogs) => {
        if (active) {
          setTodayLogs(dayLogs);
          dateCacheRef.current.set(today, dayLogs);
        }
      })
      .catch((err) => console.warn('Unable to refresh today timeline:', err));
    return () => {
      active = false;
    };
  }, [fetchDateLogs, selectedDate, today, view]);

  // Calendar month logs fetch
  useEffect(() => {
    if (!calendarOpen) return undefined;
    let active = true;
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const gridStart = new Date(year, monthIndex, 1 - new Date(year, monthIndex, 1).getDay());
    const startDate = formatDateForInput(gridStart);
    const endDate = formatDateForInput(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + 41));

    workLogService
      .getWorkLogs({ startDate, endDate, page: 1, limit: 100 })
      .then((response) => {
        if (active) setCalendarLogs(response.data || []);
      })
      .catch((err) => console.warn('Unable to load calendar dates:', err));

    return () => {
      active = false;
    };
  }, [calendarOpen, month]);

  // Subscribe to background sync/updates
  useEffect(() => {
    const unsubscribe = subscribeToLogsUpdated(() => {
      dateCacheRef.current.clear(); // Invalidate cache on sync/mutations
      fetchDateLogs(selectedDate)
        .then((dayLogs) => {
          setLogs(dayLogs);
          dateCacheRef.current.set(selectedDate, dayLogs);
          if (selectedDate === today) setTodayLogs(dayLogs);
        })
        .catch((err) => setDateError(err.response?.data?.message || 'Unable to refresh work logs.'));

      if (view === 'form' && selectedDate !== today) {
        fetchDateLogs(today).then((dayLogs) => {
          setTodayLogs(dayLogs);
          dateCacheRef.current.set(today, dayLogs);
        }).catch(() => {});
      }

      if (calendarOpen) {
        const year = month.getFullYear();
        const monthIndex = month.getMonth();
        const gridStart = new Date(year, monthIndex, 1 - new Date(year, monthIndex, 1).getDay());
        const startDate = formatDateForInput(gridStart);
        const endDate = formatDateForInput(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + 41));
        workLogService
          .getWorkLogs({ startDate, endDate, page: 1, limit: 100 })
          .then((response) => setCalendarLogs(response.data || []))
          .catch(() => {});
      }
    });

    return () => unsubscribe();
  }, [fetchDateLogs, selectedDate, today, view, calendarOpen, month]);

  // Derived summaries for selected date
  const selectedLogs = useMemo(
    () => [...logs].sort((a, b) => (a.timeFrom || '').localeCompare(b.timeFrom || '')),
    [logs],
  );

  const total = useMemo(
    () => selectedLogs.reduce((sum, log) => sum + (log.spentMinutes || 0), 0),
    [selectedLogs],
  );
  const completed = useMemo(
    () => selectedLogs.filter((log) => log.status === 'Completed').length,
    [selectedLogs],
  );
  const active = useMemo(
    () => selectedLogs.filter((log) => log.status === 'In Progress').length,
    [selectedLogs],
  );
  const pending = useMemo(
    () => selectedLogs.filter((log) => ['Yet to Start', 'On Hold', 'Carry Forward', 'Not Done'].includes(log.status)).length,
    [selectedLogs],
  );

  // Optimized stable handlers for Date selection without re-creating callbacks
  const handleSelectDate = useCallback((date) => {
    setSelectedDate((prevDate) => {
      if (prevDate === date) return prevDate;
      return date;
    });
    setMonth(new Date(`${date}T00:00:00`));
  }, []);

  const handleToday = useCallback(() => {
    setSelectedDate(today);
    setMonth(new Date(`${today}T00:00:00`));
  }, [today]);

  const handleOpenCalendar = useCallback(() => {
    setCalendarOpen(true);
  }, []);

  const handleRetryDateFetch = useCallback(() => {
    setDateError('');
    setIsFetchingDate(true);
    fetchDateLogs(selectedDate)
      .then((dayLogs) => {
        setLogs(dayLogs);
        dateCacheRef.current.set(selectedDate, dayLogs);
      })
      .catch((err) => {
        setDateError(err.response?.data?.message || err.message || 'Unable to load work logs.');
      })
      .finally(() => {
        setIsFetchingDate(false);
      });
  }, [fetchDateLogs, selectedDate]);

  // CRUD actions
  const create = async (data) => {
    setSaving(true);
    try {
      const result = await workLogService.createWorkLog(data);
      dateCacheRef.current.clear();
      setSelectedDate(data.date);
      setMonth(new Date(`${data.date}T00:00:00`));
      setNotice(result?.isLocal ? 'Saved locally — syncing when online' : 'Work log saved');
    } catch (err) {
      setNotice(err.response?.data?.message || 'Unable to save work log');
    } finally {
      setSaving(false);
    }
  };

  const update = async (id, data) => {
    try {
      await workLogService.updateWorkLog(id, data);
      dateCacheRef.current.clear();
      setNotice('Work log updated');
    } catch (err) {
      setNotice(err.response?.data?.message || 'Unable to update work log');
      throw err;
    }
  };

  const remove = async () => {
    try {
      await workLogService.deleteWorkLog(deleting._id);
      dateCacheRef.current.clear();
      setNotice('Work log deleted');
      setDeleting(null);
    } catch (err) {
      setNotice(err.response?.data?.message || 'Unable to delete work log');
    }
  };

  const statusText =
    syncStatus === 'failed'
      ? 'Sync failed'
      : syncStatus === 'pending'
        ? 'Pending'
        : syncStatus === 'syncing'
          ? 'Syncing'
          : 'Synced';

  // Initial full-page load error state (only on initial mount)
  if (initialLoading && logs.length === 0 && !initialError) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-44 rounded bg-brand-soft" />
        <div className="mt-7 h-[500px] rounded-2xl bg-brand-soft/40" />
      </div>
    );
  }

  if (initialError && logs.length === 0) {
    return (
      <section className="py-16 text-center" role="alert">
        <h1 className="text-xl font-bold text-brand-dark">Unable to load work logs</h1>
        <p className="mt-2 text-brand-dark/70">{initialError}</p>
        <button
          onClick={() => {
            setInitialLoading(true);
            setInitialError('');
            fetchDateLogs(selectedDate)
              .then((dayLogs) => {
                setLogs(dayLogs);
                setInitialLoading(false);
              })
              .catch((err) => {
                setInitialError(err.response?.data?.message || 'Unable to load work logs.');
                setInitialLoading(false);
              });
          }}
          className="mt-5 rounded-lg bg-brand-dark px-4 py-2 text-sm font-bold text-brand-light"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-brand-primary/20 bg-brand-light p-4 shadow-xs sm:p-6 text-left">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-primary">Daily workspace</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl">
            {view === 'form' ? 'Log your work' : 'Your work logs'}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-brand-dark/70 sm:text-base">
            {view === 'form'
              ? 'Add a focused record first. Your calendar and previous entries stay one tap away.'
              : 'Browse any day, review its entries, and return to the form when you are ready.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setView(view === 'form' ? 'logs' : 'form')}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-dark/20 bg-brand-soft/40 px-3 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-soft"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 4h7" />
            </svg>
            {view === 'form' ? 'Show logs' : 'Add work log'}
          </button>
          <span className="rounded-full bg-brand-soft px-3 py-2 text-sm font-semibold text-brand-dark">
            <i
              className={`mr-2 inline-block h-2 w-2 rounded-full ${
                syncStatus === 'failed'
                  ? 'bg-red-500'
                  : syncStatus === 'pending'
                    ? 'bg-amber-500'
                    : 'bg-emerald-600'
              }`}
            />
            {statusText}
            {pendingCount ? ` · ${pendingCount}` : ''}
          </span>
        </div>
      </header>

      <div className="worklog-flip-stage" aria-live="polite">
        <div key={view} className="worklog-flip-panel">
          {view === 'form' ? (
            <div className="mx-auto grid max-w-7xl items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
              <WorkLogForm initialDate={selectedDate} onSubmit={create} isLoading={saving} />
              <TodayTimeline logs={todayLogs} />
            </div>
          ) : (
            <div className="space-y-5">
              <DateStrip
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                onToday={handleToday}
                onOpenCalendar={handleOpenCalendar}
              />
              <DaySummary
                selectedDate={selectedDate}
                selectedLogs={selectedLogs}
                total={total}
                completed={completed}
                active={active}
                pending={pending}
                isFetchingDate={isFetchingDate}
                dateError={dateError}
                onRetry={handleRetryDateFetch}
                onAddLog={() => setView('form')}
                onSave={update}
                onDelete={setDeleting}
              />
            </div>
          )}
        </div>
      </div>

      {calendarOpen && (
        <FloatingCalendar
          month={month}
          selectedDate={selectedDate}
          logs={calendarLogs}
          onMonthChange={setMonth}
          onSelectDate={handleSelectDate}
          onClose={() => setCalendarOpen(false)}
        />
      )}

      {notice && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-40 max-w-[calc(100vw-2.5rem)] rounded-lg bg-brand-dark px-4 py-3 text-sm font-semibold text-brand-light shadow-lg"
        >
          {notice}
          <button className="ml-4" onClick={() => setNotice('')} aria-label="Dismiss notification">
            ×
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Delete this work log?"
        message="This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
