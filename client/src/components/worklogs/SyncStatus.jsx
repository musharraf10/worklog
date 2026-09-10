import { useAuth } from '../../hooks/useAuth';

export const SyncStatus = ({ compact = false, showSyncButton = true }) => {
  const { syncStatus, pendingCount, triggerSync } = useAuth();

  const isSyncing = syncStatus === 'syncing';
  const isFailed = syncStatus === 'failed';
  const hasPending = pendingCount > 0 || syncStatus === 'pending';

  if (compact) {
    if (isSyncing) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-soft border border-brand-primary text-xs sm:text-sm font-semibold text-brand-dark">
          <svg
            className="animate-spin w-3.5 h-3.5 text-brand-dark"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <span>Syncing...</span>
        </div>
      );
    }

    if (isFailed) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-soft border border-brand-dark text-xs sm:text-sm font-semibold text-brand-dark">
          <span className="w-2 h-2 rounded-full bg-brand-dark" />
          <span>Sync Failed</span>
          {showSyncButton && (
            <button
              type="button"
              onClick={triggerSync}
              title="Retry sync"
              className="text-xs font-bold underline hover:opacity-80 ml-0.5 cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      );
    }

    if (hasPending) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-soft/70 border border-brand-primary/50 text-xs sm:text-sm font-semibold text-brand-dark">
          <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
          <span>Pending ({pendingCount})</span>
          {showSyncButton && (
            <button
              type="button"
              onClick={triggerSync}
              title="Sync now"
              className="text-xs font-bold underline hover:opacity-80 ml-0.5 cursor-pointer"
            >
              Sync
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-light border border-brand-dark/20 text-xs sm:text-sm font-semibold text-brand-dark/80">
        <span className="w-2 h-2 rounded-full bg-brand-primary" />
        <span>Synced</span>
      </div>
    );
  }

  // Banner variant
  if (isSyncing || isFailed || hasPending) {
    return (
      <div
        className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl text-sm sm:text-base text-brand-dark my-3 border ${
          isFailed
            ? 'bg-brand-soft border-brand-dark/40'
            : 'bg-brand-soft/70 border-brand-primary'
        }`}
      >
        <div className="flex items-center gap-3">
          {isSyncing ? (
            <svg
              className="animate-spin w-5 h-5 text-brand-dark shrink-0"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          ) : isFailed ? (
            <svg
              className="w-5 h-5 text-brand-dark shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-brand-dark shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
          <span className="font-medium">
            {isSyncing
              ? 'Synchronizing changes with server and Google Sheets...'
              : isFailed
                ? 'Google Sheets synchronization pending retry.'
                : `Saved locally (${pendingCount} pending) — syncing when online`}
          </span>
        </div>
        {showSyncButton && (
          <button
            type="button"
            onClick={triggerSync}
            disabled={isSyncing}
            className="px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg bg-brand-dark text-brand-light hover:bg-brand-dark/90 transition-opacity disabled:opacity-50 shrink-0 ml-3"
          >
            {isSyncing ? 'Syncing...' : isFailed ? 'Retry Now' : 'Sync Now'}
          </button>
        )}
      </div>
    );
  }

  return null;
};

export default SyncStatus;
