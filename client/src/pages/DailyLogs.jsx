import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import WorkLogForm from '../components/worklogs/WorkLogForm';
import WorkLogTable from '../components/worklogs/WorkLogTable';
import WorkLogFilters from '../components/worklogs/WorkLogFilters';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import { subscribeToLogsUpdated } from '../utils/storageUtils';
import workLogService from '../services/workLogService';
import { formatDateForInput } from '../utils/dateUtils';
import { formatMinutes } from '../utils/timeUtils';
import { CATEGORIES } from '../constants/workLogConstants';

export const DailyLogs = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [activeDateKey, setActiveDateKey] = useState(null);

  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    date: '',
    category: '',
    status: '',
    priority: '',
  });

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all logs
  const loadLogs = useCallback(async () => {
    try {
      const response = await workLogService.getAllWorkLogs();
      setLogs(response.data || []);
    } catch (err) {
      console.error('Error loading work logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const fetchLogs = async () => {
      try {
        const response = await workLogService.getAllWorkLogs();
        if (!isCancelled) {
          setLogs(response.data || []);
        }
      } catch (err) {
        console.error('Error loading work logs:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchLogs();

    // Real-time reactivity: re-fetch logs when background sync or storage updates complete
    const unsubscribe = subscribeToLogsUpdated(() => {
      if (!isCancelled) {
        fetchLogs();
      }
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, []);

  // Inline Form Submission (NO modal!)
  const handleCreateWorkLog = async (formData) => {
    setIsSubmitting(true);
    try {
      const result = await workLogService.createWorkLog(formData);
      if (formData.date) {
        setActiveDateKey(formData.date);
      }
      if (result?.isLocal) {
        setFeedbackMessage({
          type: 'info',
          text: 'Saved locally — syncing when online',
        });
      } else {
        setFeedbackMessage({
          type: 'success',
          text: 'Saved',
        });
      }
      await loadLogs();
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Sync failed — will retry',
      });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  // In-Place Save (NO modal, NO page navigation!)
  const handleSaveEdit = async (id, updatedData) => {
    try {
      const result = await workLogService.updateWorkLog(id, updatedData);
      if (updatedData.date) {
        setActiveDateKey(updatedData.date);
      }
      if (result?.isLocal) {
        setFeedbackMessage({
          type: 'info',
          text: 'Saved locally — syncing when online',
        });
      } else {
        setFeedbackMessage({
          type: 'success',
          text: 'Saved',
        });
      }
      await loadLogs();
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Sync failed — will retry',
      });
    } finally {
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const handleDeleteClick = (log) => {
    setDeleteTarget(log);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setIsDeleting(true);
    try {
      // Optimistically remove from UI state and close modal immediately
      setLogs((prev) => prev.filter((l) => l._id !== target._id));
      setDeleteTarget(null);

      await workLogService.deleteWorkLog(target._id);
      await loadLogs();
      setFeedbackMessage({
        type: 'info',
        text: 'Deleted',
      });
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err) {
      console.error('Delete failed:', err);
      await loadLogs();
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Delete failed — please retry',
      });
      setTimeout(() => setFeedbackMessage(null), 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const taskMatch = log.task?.toLowerCase().includes(query);
        const remarksMatch = log.remarks?.toLowerCase().includes(query);
        const sectionMatch = log.hallSection?.toLowerCase().includes(query);
        if (!taskMatch && !remarksMatch && !sectionMatch) return false;
      }

      if (filters.date) {
        const logDateStr = formatDateForInput(log.date);
        if (logDateStr !== filters.date) return false;
      }

      if (filters.category && log.category !== filters.category) {
        return false;
      }

      if (filters.status && log.status !== filters.status) {
        return false;
      }

      if (filters.priority && log.priority !== filters.priority) {
        return false;
      }

      return true;
    });
  }, [logs, filters]);

  const totalFilteredMinutes = useMemo(() => {
    return filteredLogs.reduce((acc, log) => acc + (log.spentMinutes || 0), 0);
  }, [filteredLogs]);

  const categoryOptions = useMemo(() => {
    const customCats = logs
      .map((l) => l.category)
      .filter((c) => c && !CATEGORIES.includes(c));
    return [...CATEGORIES, ...Array.from(new Set(customCats))];
  }, [logs]);

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-brand-dark tracking-tight">Work Logs</h2>
          <p className="text-sm sm:text-base text-brand-dark/75 mt-1">
            Create entries using the inline form and manage them with in-place editing.
          </p>
        </div>
        <Link
          to="/manager-view"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-soft hover:bg-brand-primary/40 text-brand-dark text-sm sm:text-base font-semibold border border-brand-primary/40 transition-colors shadow-xs shrink-0 self-start sm:self-auto"
          title="Open spreadsheet Manager View"
        >
          <svg className="w-4 h-4 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 4h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Manager View
        </Link>
      </div>

      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border text-sm sm:text-base font-semibold flex items-center justify-between transition-all duration-200 ${
            feedbackMessage.type === 'error'
              ? 'bg-brand-soft border-brand-dark/30 text-brand-dark'
              : 'bg-brand-soft/60 border-brand-primary text-brand-dark'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-brand-dark shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-brand-dark/60 hover:text-brand-dark p-1 rounded-md"
          >
            ✕
          </button>
        </div>
      )}

      {/* Inline Form (No Modal!) */}
      <WorkLogForm onSubmit={handleCreateWorkLog} isLoading={isSubmitting} />

      {/* Filters */}
      <WorkLogFilters
        filters={filters}
        onChange={setFilters}
        categoryOptions={categoryOptions}
        onReset={() =>
          setFilters({
            search: '',
            date: '',
            category: '',
            status: '',
            priority: '',
          })
        }
      />

      {/* Metrics Row */}
      <div className="flex items-center justify-between px-1 text-sm sm:text-base text-brand-dark/80 font-medium">
        <span>
          Showing <strong className="text-brand-dark font-bold">{filteredLogs.length}</strong>{' '}
          {filteredLogs.length === 1 ? 'log' : 'logs'}
        </span>
        <span>
          Total Time:{' '}
          <strong className="text-brand-dark font-bold">
            {formatMinutes(totalFilteredMinutes)}
          </strong>
        </span>
      </div>

      {/* Work Logs List with In-Place Editing */}
      {isLoading ? (
        <Loader text="Loading work logs..." />
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          title="No work logs found"
          description="Try adjusting your search criteria or add a new work log above."
        />
      ) : (
        <WorkLogTable
          logs={filteredLogs}
          activeDateKey={activeDateKey}
          onSave={handleSaveEdit}
          onDelete={handleDeleteClick}
        />
      )}

      {/* Delete Confirmation Modal (Modal ONLY for confirmation) */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Work Log"
        message={`Are you sure you want to delete the work log "${deleteTarget?.task}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
};

export default DailyLogs;
