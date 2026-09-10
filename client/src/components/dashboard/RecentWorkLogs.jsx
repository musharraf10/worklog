import { Link } from 'react-router-dom';
import { formatDate } from '../../utils/dateUtils';
import { formatMinutes } from '../../utils/timeUtils';

export const RecentWorkLogs = ({ logs = [], isLoading = false }) => {
  const recentList = logs.slice(0, 5);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-brand-soft border border-brand-primary/40 text-brand-dark font-semibold';
      case 'In Progress':
        return 'bg-brand-primary/40 border border-brand-dark/20 text-brand-dark font-semibold';
      case 'Yet to Start':
        return 'bg-brand-light border border-brand-dark/25 text-brand-dark/80 font-medium';
      case 'On Hold':
        return 'bg-brand-soft/60 border border-brand-dark/30 text-brand-dark/90 font-medium';
      case 'Carry Forward':
        return 'bg-brand-primary/20 border border-brand-primary text-brand-dark font-semibold';
      case 'Not Done':
        return 'bg-brand-dark text-brand-light font-bold';
      default:
        return 'bg-brand-light border border-brand-dark/20 text-brand-dark/80';
    }
  };

  return (
    <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 shadow-xs text-left">
      <div className="flex items-center justify-between pb-4 border-b border-brand-primary/20 mb-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-brand-dark">Recent Work Logs</h3>
          <p className="text-sm text-brand-dark/70 mt-1">Latest recorded activities</p>
        </div>
        <Link
          to="/worklogs"
          className="text-sm font-bold text-brand-dark hover:underline flex items-center gap-1"
        >
          View all
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-brand-dark/60">Loading recent logs...</div>
      ) : recentList.length === 0 ? (
        <div className="py-8 text-center text-sm text-brand-dark/70">
          No work logs recorded yet.{' '}
          <Link to="/worklogs" className="underline font-bold text-brand-dark">
            Add your first log
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-brand-primary/15">
          {recentList.map((log) => (
            <div
              key={log._id}
              className="py-3.5 flex items-center justify-between gap-3 hover:bg-brand-soft/20 px-2 rounded-lg transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-bold text-brand-dark truncate">
                    {log.task}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-semibold shrink-0 ${getStatusBadge(
                      log.status,
                    )}`}
                  >
                    {log.status || 'Completed'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-sm text-brand-dark/75">
                  <span>{formatDate(log.date)}</span>
                  <span>•</span>
                  <span>{log.category}</span>
                  {log.hallSection && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-brand-dark/85">{log.hallSection}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-base font-bold text-brand-dark block">
                  {formatMinutes(log.spentMinutes)}
                </span>
                <span className="text-sm text-brand-dark/70 block">
                  {log.timeFrom} - {log.timeTo}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentWorkLogs;
