import { useState, useEffect, useCallback, useRef } from 'react';
import impactService from '../../services/impactService';
import EventFormInline from './EventFormInline';
import EventCard from './EventCard';
import RecentEventsTimeline from './RecentEventsTimeline';

const EVENT_TYPES = [
  'All Types',
  'Workshop',
  'Hackathon',
  'Seminar',
  'Bootcamp',
  'Webinar',
  'Mentorship Program',
  'Competition',
  'Training Session',
  'Other',
];

export const EventsSection = ({
  view = 'list',
  onToggleView,
  selectedIds = [],
  onToggleSelect,
  onSelectAll,
  onNotice,
}) => {
  const milestonesRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [search, setSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('All Types');
  const [syncStatusFilter, setSyncStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchEvents = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit: 20,
      };
      if (search.trim()) params.search = search.trim();
      if (eventTypeFilter !== 'All Types') params.eventType = eventTypeFilter;
      if (syncStatusFilter !== 'all') params.syncStatus = syncStatusFilter;

      const res = await impactService.getEvents(params);
      setEvents(res.data || []);
      setPagination(res.pagination || {});
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  }, [search, eventTypeFilter, syncStatusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEvents(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchEvents]);

  const handleCreate = async (payload) => {
    setIsSaving(true);
    try {
      await impactService.createEvent(payload);
      if (onNotice) onNotice('Event / Initiative recorded successfully');
      await fetchEvents(1);
      if (onToggleView) onToggleView('list');
      return true;
    } catch (err) {
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (id, updatedData) => {
    await impactService.updateEvent(id, updatedData);
    if (onNotice) onNotice('Event updated successfully');
    await fetchEvents(pagination.page);
  };

  const handleDelete = async (id) => {
    await impactService.deleteEvent(id);
    if (onNotice) onNotice('Event deleted');
    await fetchEvents(pagination.page);
  };

  const handleRetrySync = async (id) => {
    try {
      await impactService.retryEventSync(id);
      if (onNotice) onNotice('Synchronization triggered');
      await fetchEvents(pagination.page);
    } catch (err) {
      if (onNotice) onNotice(err.response?.data?.message || 'Sync failed');
    }
  };

  const allPageIds = events.map((e) => e._id);
  const isAllPageSelected =
    allPageIds.length > 0 && allPageIds.every((id) => selectedIds.includes(id));

  return (
    <div className="worklog-flip-stage" aria-live="polite">
      <div key={view} className="worklog-flip-panel">
        {view === 'form' ? (
          /* Full-width form with the recent milestones timeline below it */
          <div className="w-full min-w-0 space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => milestonesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="inline-flex items-center gap-2 rounded-lg border border-brand-primary/30 bg-brand-soft/40 px-3 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-soft"
              >
                Recent milestones
                <span aria-hidden="true">↓</span>
              </button>
            </div>
            <EventFormInline
              onSubmit={handleCreate}
              isLoading={isSaving}
              onCancel={onToggleView ? () => onToggleView('list') : undefined}
            />
            <div ref={milestonesRef} className="scroll-mt-20">
              <RecentEventsTimeline events={events} />
            </div>
          </div>
        ) : (
          /* List View */
          <div className="space-y-4 text-left">
            {/* Filter and Search Bar (matching DaySummary/DateStrip container) */}
            <div className="rounded-2xl border border-brand-primary/25 bg-brand-light p-4 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-brand-dark">
                    Recorded events & initiatives
                  </h2>
                  <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand-dark">
                    {pagination.total || 0}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {onSelectAll && events.length > 0 && (
                    <label className="flex items-center gap-2 text-xs font-semibold text-brand-dark cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAllPageSelected}
                        onChange={() => onSelectAll(allPageIds, !isAllPageSelected)}
                        className="w-4 h-4 text-brand-primary rounded accent-brand-primary"
                      />
                      <span>Select all on page</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-brand-primary/15">
                <div className="sm:col-span-2 relative">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title, role, contributions, outcomes..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-brand-dark/20 bg-brand-light text-xs sm:text-sm font-medium text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                  <svg className="w-4 h-4 text-brand-dark/50 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <div>
                  <select
                    value={eventTypeFilter}
                    onChange={(e) => setEventTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-brand-dark/20 bg-brand-light text-xs sm:text-sm font-medium text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={syncStatusFilter}
                    onChange={(e) => setSyncStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-brand-dark/20 bg-brand-light text-xs sm:text-sm font-medium text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  >
                    <option value="all">All Sync Statuses</option>
                    <option value="synced">Synced to Sheets</option>
                    <option value="pending">Sync Pending</option>
                    <option value="failed">Sync Failed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* List or Empty State */}
            {isLoading ? (
              <div className="rounded-2xl border border-brand-primary/25 bg-brand-light p-12 text-center text-sm font-semibold text-brand-dark/70">
                <div className="w-8 h-8 mx-auto mb-2 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                Loading events & initiatives...
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-brand-dark/30 bg-brand-soft p-4 text-sm font-semibold text-brand-dark text-center">
                {error}
              </div>
            ) : events.length === 0 ? (
              <div className="rounded-2xl border border-brand-primary/25 bg-brand-light py-14 text-center">
                <h3 className="font-bold text-brand-dark text-base">No events or initiatives found</h3>
                <p className="mt-2 text-sm text-brand-dark/70 max-w-sm mx-auto">
                  You haven&apos;t recorded any events or initiatives matching your filter yet.
                </p>
                {onToggleView && (
                  <button
                    type="button"
                    onClick={() => onToggleView('form')}
                    className="mt-5 rounded-lg bg-brand-dark px-4 py-2 text-sm font-bold text-brand-light hover:bg-brand-dark/90"
                  >
                    + Add event
                  </button>
                )}
              </div>
            ) : (
              <div>
                {events.map((event) => (
                  <EventCard
                    key={event._id}
                    event={event}
                    onSave={handleUpdate}
                    onDelete={handleDelete}
                    onRetrySync={handleRetrySync}
                    isSelected={selectedIds.includes(event._id)}
                    onToggleSelect={onToggleSelect}
                  />
                ))}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="rounded-2xl border border-brand-primary/25 bg-brand-light p-3.5 flex items-center justify-between text-xs font-semibold text-brand-dark">
                    <span>
                      Page {pagination.page} of {pagination.totalPages} ({pagination.total} Total)
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!pagination.hasPrev}
                        onClick={() => fetchEvents(pagination.page - 1)}
                        className="px-3 py-1.5 rounded-lg border border-brand-dark/25 hover:bg-brand-soft disabled:opacity-40 transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={!pagination.hasNext}
                        onClick={() => fetchEvents(pagination.page + 1)}
                        className="px-3 py-1.5 rounded-lg border border-brand-dark/25 hover:bg-brand-soft disabled:opacity-40 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsSection;
