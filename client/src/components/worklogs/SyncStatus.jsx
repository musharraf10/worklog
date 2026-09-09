import { useAuth } from '../../hooks/useAuth';

export const SyncStatus = ({ compact = false, showSyncButton = true }) => {
  const { syncStatus, pendingCount, triggerSync } = useAuth();

  const isSyncing = syncStatus === 'syncing';
  const hasPending = pendingCount > 0;

  if (compact) {
    if (hasPending || isSyncing) {
      return (
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-brand-soft border border-brand-primary text-sm font-semibold text-brand-dark">
          {isSyncing ? (
            <svg
              className="animate-spin w-4 h-4 text-brand-dark"
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
          ) : (
            <span className="w-2 h-2 rounded-full bg-brand-dark animate-pulse" />
          )}
          <span>
            {isSyncing ? 'Syncing...' : 'Saved locally — syncing when online'}
          </span>
          {showSyncButton && !isSyncing && (
            <button
              type="button"
              onClick={triggerSync}
              title="Sync now"
              className="text-sm font-bold underline hover:opacity-80 ml-1"
            >
              Sync
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-light border border-brand-dark/20 text-sm font-semibold text-brand-dark/80">
        <span className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
        <span>Synced</span>
      </div>
    );
  }

  // Banner variant
  if (hasPending || isSyncing) {
    return (
      <div className="w-full flex items-center justify-between p-4 rounded-xl bg-brand-soft/70 border border-brand-primary text-sm sm:text-base text-brand-dark my-3">
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
              ? 'Syncing...'
              : 'Saved locally — syncing when online'}
          </span>
        </div>
        {showSyncButton && (
          <button
            type="button"
            onClick={triggerSync}
            disabled={isSyncing}
            className="px-4 py-2 text-sm font-bold rounded-lg bg-brand-dark text-brand-light hover:bg-brand-dark/90 transition-opacity disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>
    );
  }

  return null;
};

export default SyncStatus;
