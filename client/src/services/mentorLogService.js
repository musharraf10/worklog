import api, { isNetworkError } from './api';
import {
  getMentorLogQueue,
  enqueueMentorLogOp,
  dequeueMentorLogOp,
  notifySyncState,
  notifyMentorQueueChanged,
  getTotalPendingCount,
} from '../utils/storageUtils';

const MENTOR_LOGS_UPDATED_EVENT = 'mentorlog:logs_updated';

export const notifyMentorLogsUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MENTOR_LOGS_UPDATED_EVENT));
  }
};

export const subscribeToMentorLogsUpdated = (callback) => {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(MENTOR_LOGS_UPDATED_EVENT, handler);
  return () => window.removeEventListener(MENTOR_LOGS_UPDATED_EVENT, handler);
};

let isSyncing = false;

export const mentorLogService = {
  // Fetch eligible WorkLog mentoring sessions for a specific date
  async getEligibleWorkLogs(date) {
    try {
      const response = await api.get(
        `/mentor-logs/eligible-worklogs?date=${date}`,
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching eligible mentoring sessions:', error);
      throw error;
    }
  },

  // Get all mentor logs (merges server data with any pending offline operations in-memory)
  async getAllMentorLogs() {
    try {
      const response = await api.get('/mentor-logs');
      const serverLogs = response.data?.data || [];

      const queue = getMentorLogQueue();
      const localCreates = queue
        .filter((item) => item.type === 'CREATE_MENTOR_LOG')
        .map((item) => ({
          _id: item.id,
          workLog: item.payload?.workLogId,
          studentBatch: item.payload?.studentBatch,
          subject: item.payload?.subject,
          questions: item.payload?.questions || [],
          totalQuestions: (item.payload?.questions || []).length,
          solvedQuestions: (item.payload?.questions || []).filter(
            (q) => q.status === 'Solved',
          ).length,
          carryForwardQuestions: (item.payload?.questions || []).filter(
            (q) => q.status === 'Carry Forward',
          ).length,
          isLocal: true,
          createdAt: new Date(item.timestamp).toISOString(),
        }));

      const pendingDeletes = new Set(
        queue
          .filter((i) => i.type === 'DELETE_MENTOR_LOG')
          .map((i) => i.mentorLogId || i.id),
      );

      const merged = [
        ...localCreates,
        ...serverLogs.filter((l) => !pendingDeletes.has(l._id || l.id)),
      ];

      return {
        success: true,
        count: merged.length,
        data: merged,
        isFromCache: false,
      };
    } catch (error) {
      if (isNetworkError(error)) {
        const queue = getMentorLogQueue();
        const localCreates = queue
          .filter((item) => item.type === 'CREATE_MENTOR_LOG')
          .map((item) => ({
            _id: item.id,
            workLog: item.payload?.workLogId,
            studentBatch: item.payload?.studentBatch,
            subject: item.payload?.subject,
            questions: item.payload?.questions || [],
            totalQuestions: (item.payload?.questions || []).length,
            solvedQuestions: (item.payload?.questions || []).filter(
              (q) => q.status === 'Solved',
            ).length,
            carryForwardQuestions: (item.payload?.questions || []).filter(
              (q) => q.status === 'Carry Forward',
            ).length,
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

  // Get single mentor log
  async getMentorLogById(id) {
    try {
      const response = await api.get(`/mentor-logs/${id}`);
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) {
        const queue = getMentorLogQueue();
        const item = queue.find(
          (q) => q.id === id || q.mentorLogId === id,
        );
        if (item) {
          return {
            success: true,
            data: {
              _id: item.id,
              ...item.payload,
              isLocal: true,
            },
            isFromCache: true,
          };
        }
      }
      throw error;
    }
  },

  // Create new mentor log
  async createMentorLog(payload) {
    if (!navigator.onLine) {
      return this._saveCreateLocally(payload);
    }

    try {
      const response = await api.post('/mentor-logs', payload);
      const isSheetsSynced = response.data?.sheetsSynced;

      if (isSheetsSynced) {
        // Both backend and Sheets succeeded: do not store in queue
        notifySyncState('synced', 'Mentor log saved and synced');
      } else {
        // Backend recorded, sheets failed: queue for retry
        const createdId = response.data?.data?._id;
        if (createdId) {
          enqueueMentorLogOp({
            type: 'RETRY_SHEETS',
            id: createdId,
            mentorLogId: createdId,
            payload: null,
            backendSynced: true,
            sheetsPending: true,
          });
        }
        notifySyncState(
          'failed',
          'Saved to database, Google Sheets sync pending — will retry',
        );
      }

      notifyMentorLogsUpdated();
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) {
        return this._saveCreateLocally(payload);
      }
      throw error;
    }
  },

  _saveCreateLocally(payload) {
    const tempId = `local_mentor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const localQuestions = (payload.questions || []).map((q) => ({
      _id: `local_q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...q,
      googleSheetSyncStatus: 'pending',
    }));

    const localItem = {
      _id: tempId,
      workLog: payload.workLogId,
      studentBatch: payload.studentBatch,
      subject: payload.subject,
      questions: localQuestions,
      totalQuestions: localQuestions.length,
      solvedQuestions: localQuestions.filter((q) => q.status === 'Solved')
        .length,
      carryForwardQuestions: localQuestions.filter(
        (q) => q.status === 'Carry Forward',
      ).length,
      isLocal: true,
      createdAt: new Date().toISOString(),
    };

    enqueueMentorLogOp({
      type: 'CREATE_MENTOR_LOG',
      id: tempId,
      mentorLogId: tempId,
      payload: { ...payload, questions: localQuestions },
      backendSynced: false,
      sheetsPending: false,
    });

    notifySyncState('pending', 'Saved locally — syncing when online');
    notifyMentorLogsUpdated();

    return {
      success: true,
      isLocal: true,
      message: 'Saved locally — will sync automatically when online',
      data: localItem,
    };
  },

  // Add a question to an existing mentor log
  async addQuestion(mentorLogId, questionData) {
    const isTempId = String(mentorLogId).startsWith('local_');

    if (!navigator.onLine || isTempId) {
      const tempQId = `local_q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      enqueueMentorLogOp({
        type: 'ADD_QUESTION',
        id: tempQId,
        mentorLogId,
        questionId: tempQId,
        payload: questionData,
        backendSynced: false,
        sheetsPending: false,
      });

      notifySyncState('pending', 'Saved locally — syncing when online');
      notifyMentorLogsUpdated();

      return {
        success: true,
        isLocal: true,
        message: 'Question added locally — syncing when online',
      };
    }

    try {
      const response = await api.post(
        `/mentor-logs/${mentorLogId}/questions`,
        questionData,
      );
      const isSheetsSynced = response.data?.sheetsSynced;

      if (!isSheetsSynced) {
        enqueueMentorLogOp({
          type: 'RETRY_SHEETS',
          id: mentorLogId,
          mentorLogId,
          payload: null,
          backendSynced: true,
          sheetsPending: true,
        });
        notifySyncState(
          'failed',
          'Question saved to database, Google Sheets sync pending',
        );
      } else {
        notifySyncState('synced', 'Question saved and synced');
      }

      notifyMentorLogsUpdated();
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) {
        const tempQId = `local_q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        enqueueMentorLogOp({
          type: 'ADD_QUESTION',
          id: tempQId,
          mentorLogId,
          questionId: tempQId,
          payload: questionData,
          backendSynced: false,
          sheetsPending: false,
        });
        notifySyncState('pending', 'Saved locally — syncing when online');
        notifyMentorLogsUpdated();
        return {
          success: true,
          isLocal: true,
          message: 'Question added locally — syncing when online',
        };
      }
      throw error;
    }
  },

  // Update a question in-place
  async updateQuestion(mentorLogId, questionId, questionData) {
    const isTempId =
      String(mentorLogId).startsWith('local_') ||
      String(questionId).startsWith('local_');

    if (!navigator.onLine || isTempId) {
      enqueueMentorLogOp({
        type: 'UPDATE_QUESTION',
        id: questionId,
        mentorLogId,
        questionId,
        payload: questionData,
        backendSynced: false,
        sheetsPending: false,
      });

      notifySyncState('pending', 'Saved locally — syncing when online');
      notifyMentorLogsUpdated();

      return {
        success: true,
        isLocal: true,
        message: 'Question updated locally — syncing when online',
      };
    }

    try {
      const response = await api.put(
        `/mentor-logs/${mentorLogId}/questions/${questionId}`,
        questionData,
      );
      const isSheetsSynced = response.data?.sheetsSynced;

      if (!isSheetsSynced) {
        enqueueMentorLogOp({
          type: 'RETRY_SHEETS',
          id: mentorLogId,
          mentorLogId,
          questionId,
          payload: null,
          backendSynced: true,
          sheetsPending: true,
        });
        notifySyncState(
          'failed',
          'Updated in database, Google Sheets sync pending',
        );
      } else {
        dequeueMentorLogOp(questionId);
        notifySyncState('synced', 'Question updated and synced');
      }

      notifyMentorLogsUpdated();
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) {
        enqueueMentorLogOp({
          type: 'UPDATE_QUESTION',
          id: questionId,
          mentorLogId,
          questionId,
          payload: questionData,
          backendSynced: false,
          sheetsPending: false,
        });
        notifySyncState('pending', 'Saved locally — syncing when online');
        notifyMentorLogsUpdated();
        return {
          success: true,
          isLocal: true,
          message: 'Question updated locally — syncing when online',
        };
      }
      throw error;
    }
  },

  // Delete a question
  async deleteQuestion(mentorLogId, questionId) {
    const isTempId =
      String(mentorLogId).startsWith('local_') ||
      String(questionId).startsWith('local_');

    if (!navigator.onLine || isTempId) {
      if (String(questionId).startsWith('local_')) {
        dequeueMentorLogOp(questionId);
      } else {
        enqueueMentorLogOp({
          type: 'DELETE_QUESTION',
          id: questionId,
          mentorLogId,
          questionId,
          payload: null,
          backendSynced: false,
          sheetsPending: false,
        });
      }

      notifySyncState('pending', 'Saved locally — syncing when online');
      notifyMentorLogsUpdated();

      return {
        success: true,
        isLocal: true,
        message: 'Question removed locally — syncing when online',
      };
    }

    try {
      const response = await api.delete(
        `/mentor-logs/${mentorLogId}/questions/${questionId}`,
      );
      dequeueMentorLogOp(questionId);
      notifySyncState('synced', 'Question deleted');
      notifyMentorLogsUpdated();
      return response.data;
    } catch (error) {
      if (isNetworkError(error) || error.response?.status === 502) {
        enqueueMentorLogOp({
          type: 'DELETE_QUESTION',
          id: questionId,
          mentorLogId,
          questionId,
          payload: null,
          backendSynced: false,
          sheetsPending: false,
        });
        notifySyncState('pending', 'Saved locally — syncing when online');
        notifyMentorLogsUpdated();
        return {
          success: true,
          isLocal: true,
          message: 'Question removed locally — syncing when online',
        };
      }
      throw error;
    }
  },

  // Delete entire mentor log
  async deleteMentorLog(mentorLogId) {
    const isTempId = String(mentorLogId).startsWith('local_');

    if (!navigator.onLine || isTempId) {
      if (isTempId) {
        dequeueMentorLogOp(mentorLogId);
      } else {
        enqueueMentorLogOp({
          type: 'DELETE_MENTOR_LOG',
          id: mentorLogId,
          mentorLogId,
          payload: null,
          backendSynced: false,
          sheetsPending: false,
        });
      }

      notifySyncState('pending', 'Saved locally — syncing when online');
      notifyMentorLogsUpdated();

      return {
        success: true,
        isLocal: true,
        message: 'Mentor log removed locally — syncing when online',
      };
    }

    try {
      const response = await api.delete(`/mentor-logs/${mentorLogId}`);
      dequeueMentorLogOp(mentorLogId);
      notifySyncState('synced', 'Mentor log deleted');
      notifyMentorLogsUpdated();
      return response.data;
    } catch (error) {
      if (isNetworkError(error) || error.response?.status === 502) {
        enqueueMentorLogOp({
          type: 'DELETE_MENTOR_LOG',
          id: mentorLogId,
          mentorLogId,
          payload: null,
          backendSynced: false,
          sheetsPending: false,
        });
        notifySyncState('pending', 'Saved locally — syncing when online');
        notifyMentorLogsUpdated();
        return {
          success: true,
          isLocal: true,
          message: 'Mentor log removed locally — syncing when online',
        };
      }
      throw error;
    }
  },

  // Weekly summary report
  async getWeeklyMentoringSummary(weekStart) {
    try {
      const response = await api.get(
        `/mentor-logs/reports/weekly?weekStart=${weekStart}`,
      );
      return response.data;
    } catch (error) {
      console.error('Error loading weekly mentoring report:', error);
      throw error;
    }
  },

  // Monthly summary report
  async getMonthlyMentoringSummary(year, month) {
    try {
      const response = await api.get(
        `/mentor-logs/reports/monthly?year=${year}&month=${month}`,
      );
      return response.data;
    } catch (error) {
      console.error('Error loading monthly mentoring report:', error);
      throw error;
    }
  },

  // Sync offline queue
  async syncPendingMentorLogs() {
    if (isSyncing || !navigator.onLine) return { syncedCount: 0 };
    const queue = getMentorLogQueue();
    if (queue.length === 0) return { syncedCount: 0 };

    isSyncing = true;
    let syncedCount = 0;
    let hasErrors = false;

    for (const op of [...queue]) {
      try {
        if (op.backendSynced && op.sheetsPending) {
          const res = await api.post(
            `/mentor-logs/${op.mentorLogId || op.id}/retry-sheets-sync`,
          );
          if (res.data?.sheetsSynced) {
            dequeueMentorLogOp(op.id);
            syncedCount++;
          } else {
            hasErrors = true;
          }
        } else if (op.type === 'CREATE_MENTOR_LOG') {
          const res = await api.post('/mentor-logs', op.payload);
          const isSheetsSynced = res.data?.sheetsSynced;
          if (isSheetsSynced) {
            dequeueMentorLogOp(op.id);
            syncedCount++;
          } else {
            const createdId = res.data?.data?._id;
            dequeueMentorLogOp(op.id);
            if (createdId) {
              enqueueMentorLogOp({
                type: 'RETRY_SHEETS',
                id: createdId,
                mentorLogId: createdId,
                payload: null,
                backendSynced: true,
                sheetsPending: true,
              });
            }
            hasErrors = true;
          }
        } else if (op.type === 'ADD_QUESTION') {
          const res = await api.post(
            `/mentor-logs/${op.mentorLogId}/questions`,
            op.payload,
          );
          if (res.data?.sheetsSynced) {
            dequeueMentorLogOp(op.id);
            syncedCount++;
          } else {
            hasErrors = true;
          }
        } else if (op.type === 'UPDATE_QUESTION') {
          const res = await api.put(
            `/mentor-logs/${op.mentorLogId}/questions/${op.questionId}`,
            op.payload,
          );
          if (res.data?.sheetsSynced) {
            dequeueMentorLogOp(op.id);
            syncedCount++;
          } else {
            hasErrors = true;
          }
        } else if (op.type === 'DELETE_QUESTION') {
          await api.delete(
            `/mentor-logs/${op.mentorLogId}/questions/${op.questionId}`,
          );
          dequeueMentorLogOp(op.id);
          syncedCount++;
        } else if (op.type === 'DELETE_MENTOR_LOG') {
          await api.delete(`/mentor-logs/${op.mentorLogId || op.id}`);
          dequeueMentorLogOp(op.id);
          syncedCount++;
        }
      } catch (err) {
        if (isNetworkError(err)) {
          isSyncing = false;
          notifySyncState('failed', 'Sync paused — network offline');
          notifyMentorLogsUpdated();
          return { syncedCount, hasErrors: true };
        } else if (err.response?.status === 404) {
          dequeueMentorLogOp(op.id);
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

    notifyMentorQueueChanged();
    notifyMentorLogsUpdated();

    return { syncedCount, hasErrors };
  },
};

// Automatic retry when back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    mentorLogService.syncPendingMentorLogs();
  });
}

export default mentorLogService;
