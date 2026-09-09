import api, { isNetworkError } from './api';
import {
  getCachedLogs,
  setCachedLogs,
  upsertCachedLog,
  removeCachedLog,
  getPendingQueue,
  enqueuePendingOperation,
  dequeuePendingOperation,
  notifySyncState,
  notifyQueueChanged,
  notifyLogsUpdated,
} from '../utils/storageUtils';
import { calculateSpentMinutes } from '../utils/timeUtils';

let isSyncing = false;

export const workLogService = {
  /**
   * Fetch all work logs for the logged-in user.
   * Merges server data with any pending offline operations.
   */
  async getAllWorkLogs() {
    try {
      const response = await api.get('/worklogs');
      const serverLogs = response.data?.data || [];

      // Save to cache
      setCachedLogs(serverLogs);

      const pendingQueue = getPendingQueue();
      const localCreates = pendingQueue
        .filter((item) => item.type === 'CREATE')
        .map((item) => ({
          _id: item.id,
          ...item.payload,
          spentMinutes: calculateSpentMinutes(
            item.payload.timeFrom,
            item.payload.timeTo,
          ),
          googleSheetSyncStatus: 'pending',
          isLocal: true,
          createdAt: new Date(item.timestamp).toISOString(),
        }));

      const pendingDeletes = new Set(
        pendingQueue.filter((i) => i.type === 'DELETE').map((i) => i.id),
      );

      const pendingUpdatesMap = new Map(
        pendingQueue
          .filter((i) => i.type === 'UPDATE')
          .map((i) => [i.id, i.payload]),
      );

      const merged = [
        ...localCreates,
        ...serverLogs
          .filter((log) => !pendingDeletes.has(log._id))
          .map((log) => {
            if (pendingUpdatesMap.has(log._id)) {
              const upd = pendingUpdatesMap.get(log._id);
              return {
                ...log,
                ...upd,
                spentMinutes: calculateSpentMinutes(
                  upd.timeFrom || log.timeFrom,
                  upd.timeTo || log.timeTo,
                ),
                isLocal: true,
              };
            }
            return log;
          }),
      ];

      return {
        success: true,
        count: merged.length,
        data: merged,
        isFromCache: false,
      };
    } catch (error) {
      if (isNetworkError(error)) {
        const cached = getCachedLogs();
        const pendingQueue = getPendingQueue();
        const localCreates = pendingQueue
          .filter((item) => item.type === 'CREATE')
          .map((item) => ({
            _id: item.id,
            ...item.payload,
            spentMinutes: calculateSpentMinutes(
              item.payload.timeFrom,
              item.payload.timeTo,
            ),
            googleSheetSyncStatus: 'pending',
            isLocal: true,
            createdAt: new Date(item.timestamp).toISOString(),
          }));

        const pendingDeletes = new Set(
          pendingQueue.filter((i) => i.type === 'DELETE').map((i) => i.id),
        );

        const merged = [
          ...localCreates,
          ...cached.filter((l) => !pendingDeletes.has(l._id || l.id)),
        ];

        return {
          success: true,
          count: merged.length,
          data: merged,
          isFromCache: true,
        };
      }
      throw error;
    }
  },

  /**
   * Get single work log by ID
   */
  async getWorkLogById(id) {
    try {
      const response = await api.get(`/worklogs/${id}`);
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) {
        const cached = getCachedLogs().find((l) => (l._id || l.id) === id);
        if (cached) {
          return { success: true, data: cached, isFromCache: true };
        }
      }
      throw error;
    }
  },

  /**
   * Create a new work log.
   */
  async createWorkLog(workLogData) {
    const spentMinutes = calculateSpentMinutes(
      workLogData.timeFrom,
      workLogData.timeTo,
    );

    if (!navigator.onLine) {
      return this._saveCreateLocally(workLogData, spentMinutes);
    }

    try {
      const response = await api.post('/worklogs', workLogData);
      const created = response.data?.data;
      if (created) {
        upsertCachedLog(created);
      }
      notifySyncState('synced', 'Saved');
      notifyLogsUpdated();
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) {
        return this._saveCreateLocally(workLogData, spentMinutes);
      }
      throw error;
    }
  },

  _saveCreateLocally(workLogData, spentMinutes) {
    const tempId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const localItem = {
      _id: tempId,
      ...workLogData,
      spentMinutes,
      googleSheetSyncStatus: 'pending',
      isLocal: true,
      createdAt: new Date().toISOString(),
    };

    enqueuePendingOperation({
      type: 'CREATE',
      id: tempId,
      payload: workLogData,
    });

    upsertCachedLog(localItem);
    notifySyncState('pending', 'Saved locally — syncing when online');
    notifyLogsUpdated();

    return {
      success: true,
      isLocal: true,
      message: 'Saved locally — syncing when online',
      data: localItem,
    };
  },

  /**
   * Update work log in-place.
   */
  async updateWorkLog(id, workLogData) {
    const isTempId = String(id).startsWith('local_');
    const spentMinutes = calculateSpentMinutes(
      workLogData.timeFrom,
      workLogData.timeTo,
    );

    if (!navigator.onLine || isTempId) {
      return this._saveUpdateLocally(id, workLogData, spentMinutes, isTempId);
    }

    try {
      const response = await api.put(`/worklogs/${id}`, workLogData);
      const updated = response.data?.data;
      if (updated) {
        upsertCachedLog(updated);
      }
      notifySyncState('synced', 'Saved');
      notifyLogsUpdated();
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) {
        return this._saveUpdateLocally(id, workLogData, spentMinutes, isTempId);
      }
      throw error;
    }
  },

  _saveUpdateLocally(id, workLogData, spentMinutes, isTempId) {
    if (isTempId) {
      enqueuePendingOperation({
        type: 'CREATE',
        id,
        payload: workLogData,
      });
    } else {
      enqueuePendingOperation({
        type: 'UPDATE',
        id,
        payload: workLogData,
      });
    }

    const localUpdated = {
      _id: id,
      ...workLogData,
      spentMinutes,
      isLocal: true,
      updatedAt: new Date().toISOString(),
    };

    upsertCachedLog(localUpdated);
    notifySyncState('pending', 'Saved locally — syncing when online');
    notifyLogsUpdated();

    return {
      success: true,
      isLocal: true,
      message: 'Saved locally — syncing when online',
      data: localUpdated,
    };
  },

  /**
   * Delete work log.
   */
  async deleteWorkLog(id) {
    const isTempId = String(id).startsWith('local_');

    if (!navigator.onLine || isTempId) {
      return this._saveDeleteLocally(id, isTempId);
    }

    try {
      const response = await api.delete(`/worklogs/${id}`);
      removeCachedLog(id);
      notifySyncState('synced', 'Saved');
      notifyLogsUpdated();
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) {
        return this._saveDeleteLocally(id, isTempId);
      }
      throw error;
    }
  },

  _saveDeleteLocally(id, isTempId) {
    if (isTempId) {
      dequeuePendingOperation(id);
    } else {
      enqueuePendingOperation({
        type: 'DELETE',
        id,
        payload: null,
      });
    }

    removeCachedLog(id);
    notifySyncState('pending', 'Saved locally — syncing when online');
    notifyLogsUpdated();

    return {
      success: true,
      isLocal: true,
      message: 'Saved locally — syncing when online',
    };
  },

  /**
   * Synchronize pending operations with the backend when online.
   */
  async syncPendingWorkLogs() {
    if (isSyncing || !navigator.onLine) return { syncedCount: 0 };

    const queue = getPendingQueue();
    if (queue.length === 0) {
      notifySyncState('synced', 'Synced');
      return { syncedCount: 0 };
    }

    isSyncing = true;
    notifySyncState('syncing', 'Syncing...');

    let syncedCount = 0;

    for (const op of [...queue]) {
      try {
        if (op.type === 'CREATE') {
          const response = await api.post('/worklogs', op.payload);
          const created = response.data?.data;
          if (created) {
            removeCachedLog(op.id);
            upsertCachedLog(created);
          }
          dequeuePendingOperation(op.id);
          syncedCount++;
        } else if (op.type === 'UPDATE') {
          const response = await api.put(`/worklogs/${op.id}`, op.payload);
          const updated = response.data?.data;
          if (updated) {
            upsertCachedLog(updated);
          }
          dequeuePendingOperation(op.id);
          syncedCount++;
        } else if (op.type === 'DELETE') {
          await api.delete(`/worklogs/${op.id}`);
          removeCachedLog(op.id);
          dequeuePendingOperation(op.id);
          syncedCount++;
        }
      } catch (err) {
        if (isNetworkError(err)) {
          notifySyncState('failed', 'Sync failed — will retry');
          isSyncing = false;
          notifyLogsUpdated();
          return { syncedCount, hasErrors: true };
        } else {
          dequeuePendingOperation(op.id);
        }
      }
    }

    isSyncing = false;
    const remaining = getPendingQueue().length;
    if (remaining === 0) {
      notifySyncState('synced', 'Synced');
    } else {
      notifySyncState('pending', `${remaining} pending sync`);
    }
    notifyQueueChanged();
    notifyLogsUpdated();

    return { syncedCount, hasErrors: false };
  },
};

export default workLogService;
