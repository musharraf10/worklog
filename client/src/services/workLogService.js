import api, { isNetworkError } from './api';
import {
  getWorkLogQueue,
  enqueueWorkLogOp,
  dequeueWorkLogOp,
  notifySyncState,
  notifyQueueChanged,
  notifyLogsUpdated,
  getTotalPendingCount,
} from '../utils/storageUtils';
import { calculateSpentMinutes } from '../utils/timeUtils';
import { formatDateForInput } from '../utils/dateUtils';

let isSyncing = false;

export const workLogService = {
  /** Fetch a bounded, optionally date-filtered work-log page and merge offline changes. */
  async getWorkLogs(params = {}) {
    const matches = (log) => {
      const logDate = formatDateForInput(log.date);
      if (params.date && logDate !== params.date) return false;
      if (params.startDate && logDate < params.startDate) return false;
      if (params.endDate && logDate > params.endDate) return false;
      if (params.status && params.status !== 'ALL' && log.status !== params.status) return false;
      if (params.category && params.category !== 'ALL' && log.category !== params.category) return false;
      if (params.priority && params.priority !== 'ALL' && log.priority !== params.priority) return false;
      if (params.search?.trim()) {
        const query = params.search.trim().toLowerCase();
        if (!['task', 'category', 'activityType', 'hallSection', 'remarks'].some((field) => (log[field] || '').toLowerCase().includes(query))) return false;
      }
      return true;
    };
    const toLocalLog = (item) => ({
      _id: item.id,
      ...item.payload,
      spentMinutes: calculateSpentMinutes(item.payload.timeFrom, item.payload.timeTo),
      googleSheetSyncStatus: item.sheetsPending ? 'failed' : 'pending',
      isLocal: true,
      createdAt: new Date(item.timestamp).toISOString(),
    });
    try {
      const response = await api.get('/worklogs', { params });
      const payload = response.data;
      const queue = getWorkLogQueue();
      const deletes = new Set(queue.filter((item) => item.type === 'DELETE').map((item) => item.id));
      const updates = new Map(queue.filter((item) => item.type === 'UPDATE').map((item) => [item.id, item]));
      const localCreates = queue.filter((item) => item.type === 'CREATE').map(toLocalLog).filter(matches);
      const serverLogs = (payload.data || []).filter((log) => !deletes.has(log._id)).map((log) => {
        const operation = updates.get(log._id);
        if (!operation) return log;
        const update = operation.payload || {};
        return {
          ...log,
          ...update,
          spentMinutes: calculateSpentMinutes(update.timeFrom || log.timeFrom, update.timeTo || log.timeTo),
          googleSheetSyncStatus: operation.sheetsPending ? 'failed' : log.googleSheetSyncStatus || 'pending',
          isLocal: true,
        };
      }).filter(matches);
      const data = [...localCreates, ...serverLogs].sort((a, b) => new Date(b.date) - new Date(a.date) || (a.timeFrom || '').localeCompare(b.timeFrom || ''));
      const pagination = payload.pagination || { page: 1, limit: data.length, total: data.length, totalPages: 1 };
      pagination.total += localCreates.length;
      pagination.totalPages = Math.ceil(pagination.total / pagination.limit);
      return { ...payload, data, count: data.length, pagination, isFromCache: false };
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      const localCreates = getWorkLogQueue().filter((item) => item.type === 'CREATE').map(toLocalLog).filter(matches);
      const limit = Math.min(100, Number(params.limit) || 25);
      const page = Math.max(1, Number(params.page) || 1);
      const start = (page - 1) * limit;
      const data = localCreates.slice(start, start + limit);
      return { success: true, count: data.length, data, pagination: { page, limit, total: localCreates.length, totalPages: Math.ceil(localCreates.length / limit) }, isFromCache: true };
    }
  },

  /**
   * Fetch all work logs for the logged-in user.
   * Merges server data with any pending offline operations in-memory.
   * Does NOT dump the entire database into localStorage.
   */
  async getAllWorkLogs() {
    try {
      const response = await api.get('/worklogs');
      const serverLogs = response.data?.data || [];

      const pendingQueue = getWorkLogQueue();
      const localCreates = pendingQueue
        .filter((item) => item.type === 'CREATE')
        .map((item) => ({
          _id: item.id,
          ...item.payload,
          spentMinutes: calculateSpentMinutes(
            item.payload.timeFrom,
            item.payload.timeTo,
          ),
          googleSheetSyncStatus: item.sheetsPending ? 'failed' : 'pending',
          isLocal: true,
          createdAt: new Date(item.timestamp).toISOString(),
        }));

      const pendingDeletes = new Set(
        pendingQueue.filter((i) => i.type === 'DELETE').map((i) => i.id),
      );

      const pendingUpdatesMap = new Map(
        pendingQueue
          .filter((i) => i.type === 'UPDATE')
          .map((i) => [i.id, i]),
      );

      const merged = [
        ...localCreates,
        ...serverLogs
          .filter((log) => !pendingDeletes.has(log._id))
          .map((log) => {
            if (pendingUpdatesMap.has(log._id)) {
              const updOp = pendingUpdatesMap.get(log._id);
              const upd = updOp.payload || {};
              return {
                ...log,
                ...upd,
                spentMinutes: calculateSpentMinutes(
                  upd.timeFrom || log.timeFrom,
                  upd.timeTo || log.timeTo,
                ),
                googleSheetSyncStatus: updOp.sheetsPending
                  ? 'failed'
                  : log.googleSheetSyncStatus || 'pending',
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
        const pendingQueue = getWorkLogQueue();
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

        return {
          success: true,
          count: localCreates.length,
          data: localCreates,
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
        const pendingQueue = getWorkLogQueue();
        const pendingItem = pendingQueue.find((item) => item.id === id);
        if (pendingItem) {
          return {
            success: true,
            data: {
              _id: pendingItem.id,
              ...pendingItem.payload,
              spentMinutes: calculateSpentMinutes(
                pendingItem.payload.timeFrom,
                pendingItem.payload.timeTo,
              ),
              isLocal: true,
            },
            isFromCache: true,
          };
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
      const isSheetsSynced = response.data?.sheetsSynced;

      if (isSheetsSynced) {
        // Both backend and Sheets confirmed successful:
        // Do NOT store in localStorage; remove any matching local queue entry
        dequeueWorkLogOp(response.data?.data?._id);
        notifySyncState('synced', 'Saved and synced');
      } else {
        // Backend succeeded but Google Sheets failed/pending:
        // Store only for retry in localStorage
        const createdId = response.data?.data?._id;
        if (createdId) {
          enqueueWorkLogOp({
            type: 'UPDATE',
            id: createdId,
            payload: workLogData,
            backendSynced: true,
            sheetsPending: true,
          });
        }
        notifySyncState(
          'failed',
          'Saved to database, Google Sheets sync pending — will retry',
        );
      }

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

    enqueueWorkLogOp({
      type: 'CREATE',
      id: tempId,
      payload: workLogData,
      backendSynced: false,
      sheetsPending: false,
    });

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
      const isSheetsSynced = response.data?.sheetsSynced;

      if (isSheetsSynced) {
        // Confirmed successful on both backend and Sheets:
        dequeueWorkLogOp(id);
        notifySyncState('synced', 'Saved and synced');
      } else {
        // Backend succeeded but Google Sheets failed:
        enqueueWorkLogOp({
          type: 'UPDATE',
          id,
          payload: workLogData,
          backendSynced: true,
          sheetsPending: true,
        });
        notifySyncState(
          'failed',
          'Saved to database, Google Sheets sync pending — will retry',
        );
      }

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
      enqueueWorkLogOp({
        type: 'CREATE',
        id,
        payload: workLogData,
        backendSynced: false,
        sheetsPending: false,
      });
    } else {
      enqueueWorkLogOp({
        type: 'UPDATE',
        id,
        payload: workLogData,
        backendSynced: false,
        sheetsPending: false,
      });
    }

    const localUpdated = {
      _id: id,
      ...workLogData,
      spentMinutes,
      isLocal: true,
      updatedAt: new Date().toISOString(),
    };

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
      // Only dequeue if delete succeeded
      dequeueWorkLogOp(id);
      notifySyncState('synced', 'Deleted');
      notifyLogsUpdated();
      return response.data;
    } catch (error) {
      if (isNetworkError(error) || error.response?.status === 502) {
        return this._saveDeleteLocally(id, isTempId);
      }
      throw error;
    }
  },

  _saveDeleteLocally(id, isTempId) {
    if (isTempId) {
      dequeueWorkLogOp(id);
    } else {
      enqueueWorkLogOp({
        type: 'DELETE',
        id,
        payload: null,
        backendSynced: false,
        sheetsPending: false,
      });
    }

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
   * Only dequeues when BOTH backend and Sheets confirm success.
   */
  async syncPendingWorkLogs() {
    if (isSyncing || !navigator.onLine) return { syncedCount: 0 };

    const queue = getWorkLogQueue();
    if (queue.length === 0) {
      if (getTotalPendingCount() === 0) {
        notifySyncState('synced', 'Synced');
      }
      return { syncedCount: 0 };
    }

    isSyncing = true;
    notifySyncState('syncing', 'Syncing...');

    let syncedCount = 0;
    let hasErrors = false;

    for (const op of [...queue]) {
      try {
        if (op.backendSynced && op.sheetsPending) {
          // Backend already recorded, retry Google Sheets sync
          const response = await api.post(
            `/worklogs/${op.id}/retry-sheets-sync`,
          );
          if (response.data?.sheetsSynced) {
            dequeueWorkLogOp(op.id);
            syncedCount++;
          } else {
            hasErrors = true;
          }
        } else if (op.type === 'CREATE') {
          const response = await api.post('/worklogs', op.payload);
          const isSheetsSynced = response.data?.sheetsSynced;
          if (isSheetsSynced) {
            dequeueWorkLogOp(op.id);
            syncedCount++;
          } else {
            // Backend succeeded, sheets failed: preserve in queue with new ID
            const newId = response.data?.data?._id;
            dequeueWorkLogOp(op.id);
            if (newId) {
              enqueueWorkLogOp({
                type: 'UPDATE',
                id: newId,
                payload: op.payload,
                backendSynced: true,
                sheetsPending: true,
              });
            }
            hasErrors = true;
          }
        } else if (op.type === 'UPDATE') {
          const response = await api.put(`/worklogs/${op.id}`, op.payload);
          const isSheetsSynced = response.data?.sheetsSynced;
          if (isSheetsSynced) {
            dequeueWorkLogOp(op.id);
            syncedCount++;
          } else {
            enqueueWorkLogOp({
              type: 'UPDATE',
              id: op.id,
              payload: op.payload,
              backendSynced: true,
              sheetsPending: true,
            });
            hasErrors = true;
          }
        } else if (op.type === 'DELETE') {
          await api.delete(`/worklogs/${op.id}`);
          dequeueWorkLogOp(op.id);
          syncedCount++;
        }
      } catch (err) {
        if (isNetworkError(err)) {
          isSyncing = false;
          notifySyncState('failed', 'Sync paused — network offline');
          notifyLogsUpdated();
          return { syncedCount, hasErrors: true };
        } else if (err.response?.status === 404) {
          // If record no longer exists on server, remove from queue
          dequeueWorkLogOp(op.id);
        } else {
          hasErrors = true;
        }
      }
    }

    isSyncing = false;
    const remaining = getTotalPendingCount();

    if (remaining === 0) {
      notifySyncState('synced', 'Synced');
    } else if (hasErrors) {
      notifySyncState(
        'failed',
        'Google Sheets sync pending retry — will retry automatically',
      );
    } else {
      notifySyncState('pending', `${remaining} pending sync`);
    }

    notifyQueueChanged();
    notifyLogsUpdated();

    return { syncedCount, hasErrors };
  },
};

// Automatic retry when back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    workLogService.syncPendingWorkLogs();
  });
}

export default workLogService;
