import { useState, useEffect, useCallback } from 'react';
import shareLinkService from '../../services/shareLinkService';
import { notifyRemarksUpdated, subscribeToRemarksUpdated } from '../../utils/storageUtils';
import { TIMEZONE } from '../../utils/dateUtils';
import Button from '../common/Button';

/**
 * Format timestamp into readable date & time for Asia/Kolkata
 */
const formatRemarkTimestamp = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return String(dateInput);

  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: TIMEZONE,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
};

export const ManagerRemarksSection = () => {
  const [remarks, setRemarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD' | 'READ'
  const [page, setPage] = useState(1);
  const [totalPages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingId, setMarkingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchRemarks = useCallback(async (targetPage = page, activeFilter = filter) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: targetPage,
        limit: 5,
      };

      if (activeFilter === 'UNREAD') {
        params.isRead = 'false';
      } else if (activeFilter === 'READ') {
        params.isRead = 'true';
      }

      const res = await shareLinkService.getMyRemarks(params);
      if (res && res.success) {
        setRemarks(res.data || []);
        setTotal(res.total || 0);
        setUnreadCount(res.unreadCount || 0);
        setPages(res.totalPages || 1);
        setPage(res.page || 1);
      } else {
        throw new Error(res?.message || 'Failed to fetch remarks');
      }
    } catch (err) {
      console.error('Error loading manager remarks:', err);
      setError(err?.response?.data?.message || err.message || 'Unable to load manager remarks');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchRemarks(page, filter);
  }, [page, filter, fetchRemarks]);

  // Subscribe to remarks-updated events (e.g. if header or other component updates count)
  useEffect(() => {
    const unsubscribe = subscribeToRemarksUpdated(() => {
      fetchRemarks(page, filter);
    });
    return () => unsubscribe();
  }, [page, filter, fetchRemarks]);

  const handleFilterChange = (newFilter) => {
    if (newFilter === filter) return;
    setFilter(newFilter);
    setPage(1);
  };

  const handleMarkAsRead = async (id) => {
    try {
      setMarkingId(id);
      await shareLinkService.markRemarkAsRead(id);
      
      // Update local item
      setRemarks((prev) =>
        prev.map((r) =>
          r._id === id ? { ...r, isRead: true, readAt: new Date().toISOString() } : r
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      
      // If we are on the UNREAD tab, re-fetch to keep pagination coherent
      if (filter === 'UNREAD') {
        fetchRemarks(page, filter);
      }
      
      notifyRemarksUpdated();
    } catch (err) {
      console.error('Failed to mark remark as read:', err);
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    try {
      setMarkingAll(true);
      await shareLinkService.markAllRemarksAsRead();
      
      setRemarks((prev) =>
        prev.map((r) => ({ ...r, isRead: true, readAt: r.readAt || new Date().toISOString() }))
      );
      setUnreadCount(0);
      
      if (filter === 'UNREAD') {
        fetchRemarks(1, filter);
      }
      
      notifyRemarksUpdated();
    } catch (err) {
      console.error('Failed to mark all remarks as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <section
      id="manager-remarks"
      className="bg-brand-light border border-brand-primary/25 rounded-2xl p-4 sm:p-6 shadow-xs text-left scroll-mt-20 transition-all"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-brand-primary/20">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg sm:text-xl font-bold text-brand-dark">Manager Remarks</h3>
            {unreadCount > 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                {unreadCount} unread
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-soft/60 text-brand-dark/80">
                All caught up
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-brand-dark/70 mt-1">
            Feedback and comments submitted by managers via shared portal links
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markingAll}
              icon={
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              }
              className="text-xs"
            >
              {markingAll ? 'Marking...' : 'Mark all read'}
            </Button>
          )}

          <button
            type="button"
            onClick={() => fetchRemarks(page, filter)}
            className="p-1.5 rounded-lg border border-brand-primary/30 text-brand-dark/70 hover:text-brand-dark hover:bg-brand-soft/40 transition-colors"
            title="Refresh remarks"
            aria-label="Refresh remarks"
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.038 8.038 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 pt-3 pb-2 overflow-x-auto text-xs sm:text-sm">
        <button
          type="button"
          onClick={() => handleFilterChange('ALL')}
          className={`px-3 py-1 rounded-lg font-semibold transition-colors shrink-0 ${
            filter === 'ALL'
              ? 'bg-brand-primary text-brand-dark shadow-xs'
              : 'text-brand-dark/70 hover:bg-brand-soft/50'
          }`}
        >
          All Remarks {total > 0 && filter === 'ALL' ? `(${total})` : ''}
        </button>

        <button
          type="button"
          onClick={() => handleFilterChange('UNREAD')}
          className={`px-3 py-1 rounded-lg font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
            filter === 'UNREAD'
              ? 'bg-brand-primary text-brand-dark shadow-xs'
              : 'text-brand-dark/70 hover:bg-brand-soft/50'
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                filter === 'UNREAD' ? 'bg-brand-dark text-brand-light' : 'bg-brand-primary text-brand-dark'
              }`}
            >
              {unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleFilterChange('READ')}
          className={`px-3 py-1 rounded-lg font-semibold transition-colors shrink-0 ${
            filter === 'READ'
              ? 'bg-brand-primary text-brand-dark shadow-xs'
              : 'text-brand-dark/70 hover:bg-brand-soft/50'
          }`}
        >
          Read
        </button>
      </div>

      {/* Content */}
      <div className="mt-3">
        {loading && remarks.length === 0 ? (
          <div className="py-10 text-center text-sm text-brand-dark/60 flex flex-col items-center justify-center gap-2">
            <svg className="w-6 h-6 animate-spin text-brand-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading manager remarks...</span>
          </div>
        ) : error ? (
          <div className="py-6 px-4 bg-red-50 border border-red-200 rounded-xl text-center">
            <p className="text-sm font-medium text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => fetchRemarks(page, filter)}
              className="mt-2 text-xs font-bold text-red-800 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        ) : remarks.length === 0 ? (
          <div className="py-10 px-4 text-center border border-dashed border-brand-primary/30 rounded-xl bg-brand-soft/10">
            <div className="w-10 h-10 mx-auto rounded-full bg-brand-soft/60 flex items-center justify-center text-brand-dark mb-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-brand-dark">
              {filter === 'UNREAD' ? 'No unread remarks' : 'No manager remarks yet'}
            </h4>
            <p className="text-xs text-brand-dark/70 mt-1 max-w-md mx-auto">
              {filter === 'UNREAD'
                ? "You have reviewed all manager remarks. New comments left via your shared links will appear here."
                : 'When a manager adds feedback through your shared portal link, it will appear here permanently, even if the share link later expires or is revoked.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {remarks.map((remark) => {
              const isUnread = !remark.isRead;
              return (
                <div
                  key={remark._id}
                  className={`relative p-3.5 sm:p-4 rounded-xl border transition-all ${
                    isUnread
                      ? 'bg-amber-50/40 border-amber-300 shadow-xs ring-1 ring-amber-200/50'
                      : 'bg-brand-light/70 border-brand-primary/20 hover:border-brand-primary/40'
                  }`}
                >
                  {/* Top line: Manager info & Timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-brand-primary/30 text-brand-dark font-bold text-xs flex items-center justify-center shrink-0">
                        {remark.managerName ? remark.managerName.charAt(0).toUpperCase() : 'M'}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-brand-dark truncate block">
                          {remark.managerName || 'Manager'}
                        </span>
                        {remark.shareLinkLabel && (
                          <span className="text-[11px] text-brand-dark/60 block truncate">
                            via {remark.shareLinkLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] sm:text-xs text-brand-dark/65">
                        {formatRemarkTimestamp(remark.createdAt)}
                      </span>
                      {isUnread ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          Unread
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-brand-dark/60 font-medium">
                          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Read
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Target item context (Work Log or Mentor Log) */}
                  <div className="mt-1 mb-2.5 flex items-center gap-2 flex-wrap text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[11px] uppercase tracking-wider ${
                        remark.targetType === 'WorkLog'
                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                          : 'bg-purple-100 text-purple-900 border border-purple-200'
                      }`}
                    >
                      {remark.targetType === 'WorkLog' ? 'Work Log' : 'Mentor Log'}
                    </span>
                    <span className="font-semibold text-brand-dark truncate max-w-xs sm:max-w-md">
                      {remark.targetTitle || `${remark.targetType} Record`}
                    </span>
                  </div>

                  {/* The Remark message */}
                  <div className="text-xs sm:text-sm text-brand-dark/90 bg-brand-light/90 border border-brand-primary/15 rounded-lg p-2.5 sm:p-3 whitespace-pre-wrap break-words leading-relaxed font-normal">
                    {remark.remark}
                  </div>

                  {/* Action row */}
                  {isUnread && (
                    <div className="mt-2.5 flex justify-end">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => handleMarkAsRead(remark._id)}
                        disabled={markingId === remark._id}
                        icon={
                          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        }
                      >
                        {markingId === remark._id ? 'Marking...' : 'Mark as read'}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="mt-4 pt-3 border-t border-brand-primary/20 flex items-center justify-between gap-2 text-xs sm:text-sm">
          <span className="text-brand-dark/70">
            Page <span className="font-bold text-brand-dark">{page}</span> of{' '}
            <span className="font-bold text-brand-dark">{totalPages}</span> ({total} remarks)
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="xs"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};

export default ManagerRemarksSection;
