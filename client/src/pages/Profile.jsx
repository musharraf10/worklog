import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  getCachedLogs,
  clearPendingQueue,
  subscribeToQueue,
} from '../utils/storageUtils';

export const Profile = () => {
  const { user, logout, triggerSync, syncStatus } = useAuth();
  const [pendingItems, setPendingItems] = useState([]);
  const [cachedCount, setCachedCount] = useState(0);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsub = subscribeToQueue(({ queue }) => {
      setPendingItems(queue || []);
      setCachedCount(getCachedLogs().length);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsub();
    };
  }, []);

  const handleClearQueue = () => {
    clearPendingQueue();
    setPendingItems([]);
    setShowClearConfirm(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-brand-dark tracking-tight">Account & Storage</h2>
        <p className="text-sm sm:text-base text-brand-dark/75 mt-1">
          View your profile details and monitor offline synchronization status.
        </p>
      </div>

      {/* User Information Card */}
      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 sm:p-7 shadow-xs">
        <h3 className="text-lg sm:text-xl font-bold text-brand-dark pb-3.5 border-b border-brand-primary/20 mb-5">
          Profile Information
        </h3>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {user?.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-brand-primary shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-brand-soft border-2 border-brand-primary text-brand-dark font-bold text-2xl flex items-center justify-center shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}

          <div className="space-y-1.5">
            <h4 className="text-xl sm:text-2xl font-bold text-brand-dark">{user?.name || 'User'}</h4>
            <p className="text-sm sm:text-base text-brand-dark/75">{user?.email || 'No email'}</p>
            <div className="pt-1.5">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-brand-soft border border-brand-primary/50 text-brand-dark">
                Auth: {user?.authProvider || 'local'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Offline Storage & Sync Card */}
      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3.5 border-b border-brand-primary/20">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-brand-dark">Offline Sync Manager</h3>
            <p className="text-sm text-brand-dark/75 mt-1">
              Work logs are safely stored locally when offline and synced automatically.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-bold ${
                isOnline
                  ? 'bg-brand-soft border border-brand-primary text-brand-dark'
                  : 'bg-brand-dark text-brand-light'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isOnline ? 'bg-brand-dark' : 'bg-brand-soft'
                }`}
              />
              {isOnline ? 'Online' : 'Offline Mode'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-brand-soft/30 border border-brand-primary/20">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-dark/70 block">
              Pending Sync Operations
            </span>
            <span className="text-3xl sm:text-4xl font-extrabold text-brand-dark mt-1.5 block">
              {pendingItems.length}
            </span>
            <span className="text-sm text-brand-dark/70 mt-1 block">
              Queued operations
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-brand-soft/30 border border-brand-primary/20">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-dark/70 block">
              Cached Work Logs
            </span>
            <span className="text-3xl sm:text-4xl font-extrabold text-brand-dark mt-1.5 block">
              {cachedCount}
            </span>
            <span className="text-sm text-brand-dark/70 mt-1 block">
              Available offline
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-brand-soft/30 border border-brand-primary/20">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-dark/70 block">
              Current Sync Status
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-brand-dark mt-1.5 block capitalize">
              {syncStatus}
            </span>
            <span className="text-sm text-brand-dark/70 mt-1 block">
              Auto-sync enabled
            </span>
          </div>
        </div>

        {/* Pending Operations List */}
        {pendingItems.length > 0 && (
          <div className="p-5 rounded-2xl bg-brand-soft/20 border border-brand-primary/20">
            <h5 className="text-sm font-bold uppercase tracking-wider text-brand-dark/80 mb-3">
              Queued Operations Details
            </h5>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {pendingItems.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex items-center justify-between text-sm p-3 rounded-xl bg-brand-light border border-brand-primary/20"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded bg-brand-dark text-brand-light text-xs font-bold uppercase">
                      {item.type}
                    </span>
                    <span className="font-bold text-brand-dark truncate max-w-xs sm:max-w-md">
                      {item.payload?.task || item.id}
                    </span>
                  </div>
                  <span className="text-xs text-brand-dark/70 font-medium">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-brand-primary/20 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={triggerSync}
              disabled={!isOnline || syncStatus === 'syncing'}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
            >
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </Button>

            {pendingItems.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setShowClearConfirm(true)}
              >
                Clear Queue
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={logout}
          >
            Sign Out
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearQueue}
        title="Clear Pending Queue"
        message="Are you sure you want to clear all pending offline operations? Any unsynced changes will be permanently discarded."
        confirmText="Clear Queue"
        cancelText="Cancel"
      />
    </div>
  );
};

export default Profile;
