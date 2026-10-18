const TOKEN_KEY = 'worklog_auth_token';
const USER_KEY = 'worklog_auth_user';
const WORKLOG_QUEUE_KEY = 'worklog_pending_queue';
const MENTOR_QUEUE_KEY = 'mentorlog_pending_queue';

// Purge any legacy full-database caches immediately on startup
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('worklog_cached_logs');
    localStorage.removeItem('mentorlog_cached_logs');
  } catch {
    // Ignore storage access errors
  }
}

/**
 * Safely parse JSON from localStorage
 */
const safeGetJson = (key, defaultValue = null) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return defaultValue;
  }
};

/**
 * Safely write JSON to localStorage
 */
const safeSetJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing ${key} to localStorage:`, err);
  }
};

/* ==========================================================================
   AUTHENTICATION STORAGE (Tokens & User profile, NEVER passwords)
   ========================================================================== */

export const getAuthToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch (err) {
    console.error('Error reading auth token:', err);
    return null;
  }
};

export const setAuthToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (err) {
    console.error('Error setting auth token:', err);
  }
};

export const clearAuthToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.error('Error clearing auth token:', err);
  }
};

export const getStoredUser = () => {
  return safeGetJson(USER_KEY, null);
};

export const setStoredUser = (user) => {
  if (!user) {
    localStorage.removeItem(USER_KEY);
    return;
  }
  // Sanitize strictly: NEVER store passwords, secrets, or raw credentials
  const safeProfile = {
    id: user.id || user._id,
    name: user.name,
    email: user.email,
    authProvider: user.authProvider || 'local',
    profilePicture: user.profilePicture || null,
  };
  safeSetJson(USER_KEY, safeProfile);
};

export const clearStoredUser = () => {
  try {
    localStorage.removeItem(USER_KEY);
  } catch (err) {
    console.error('Error clearing stored user:', err);
  }
};

/* ==========================================================================
   WORK LOG PENDING QUEUE (Temporary Retry Storage ONLY)
   ========================================================================== */

export const getWorkLogQueue = () => {
  return safeGetJson(WORKLOG_QUEUE_KEY, []);
};

export const setWorkLogQueue = (queue) => {
  safeSetJson(WORKLOG_QUEUE_KEY, queue);
  notifyQueueChanged();
};

export const enqueueWorkLogOp = ({
  type,
  id,
  payload,
  backendSynced = false,
  sheetsPending = false,
}) => {
  const queue = getWorkLogQueue();
  const existingIndex = queue.findIndex((item) => item.id === id);

  const newOp = {
    id: id || `local_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    type,
    payload,
    backendSynced,
    sheetsPending,
    timestamp: Date.now(),
    retryCount: 0,
  };

  if (existingIndex >= 0) {
    const existing = queue[existingIndex];
    // Intelligent consolidation:
    if (existing.type === 'CREATE') {
      if (type === 'UPDATE') {
        // Edit to an uncreated local item updates CREATE payload directly
        queue[existingIndex] = {
          ...existing,
          payload: { ...existing.payload, ...payload },
          timestamp: Date.now(),
        };
      } else if (type === 'DELETE') {
        // Deleting an item created offline cancels creation completely!
        queue.splice(existingIndex, 1);
      } else {
        queue[existingIndex] = { ...existing, ...newOp };
      }
    } else if (existing.type === 'UPDATE') {
      if (type === 'UPDATE') {
        // Merge multiple edits to the same item
        queue[existingIndex] = {
          ...existing,
          payload: { ...existing.payload, ...payload },
          backendSynced,
          sheetsPending,
          timestamp: Date.now(),
        };
      } else if (type === 'DELETE') {
        // Delete overrides pending update
        queue[existingIndex] = newOp;
      }
    } else {
      // Existing is DELETE
      queue[existingIndex] = newOp;
    }
  } else {
    queue.push(newOp);
  }

  setWorkLogQueue(queue);
  return newOp;
};

export const dequeueWorkLogOp = (operationId) => {
  const queue = getWorkLogQueue();
  const filtered = queue.filter((item) => item.id !== operationId);
  setWorkLogQueue(filtered);
};

export const clearWorkLogQueue = () => {
  setWorkLogQueue([]);
};

// Aliases for backwards compatibility
export const getPendingQueue = getWorkLogQueue;
export const setPendingQueue = setWorkLogQueue;
export const enqueuePendingOperation = enqueueWorkLogOp;
export const dequeuePendingOperation = dequeueWorkLogOp;
export const clearPendingQueue = clearWorkLogQueue;

/* ==========================================================================
   MENTOR LOG PENDING QUEUE (Temporary Retry Storage ONLY)
   ========================================================================== */

export const getMentorLogQueue = () => {
  return safeGetJson(MENTOR_QUEUE_KEY, []);
};

export const setMentorLogQueue = (queue) => {
  safeSetJson(MENTOR_QUEUE_KEY, queue);
  notifyMentorQueueChanged();
};

export const enqueueMentorLogOp = ({
  type,
  id,
  mentorLogId,
  questionId,
  payload,
  backendSynced = false,
  sheetsPending = false,
}) => {
  const queue = getMentorLogQueue();
  const existingIndex = queue.findIndex(
    (item) =>
      item.id === id ||
      (questionId && item.questionId === questionId && item.type === type),
  );

  const newOp = {
    id: id || `local_mentor_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    type,
    mentorLogId,
    questionId,
    payload,
    backendSynced,
    sheetsPending,
    timestamp: Date.now(),
    retryCount: 0,
  };

  if (existingIndex >= 0) {
    const existing = queue[existingIndex];
    if (existing.type === 'CREATE_MENTOR_LOG') {
      if (type === 'DELETE_MENTOR_LOG') {
        queue.splice(existingIndex, 1);
      } else {
        queue[existingIndex] = { ...existing, ...newOp };
      }
    } else if (
      existing.type === 'UPDATE_QUESTION' &&
      type === 'UPDATE_QUESTION'
    ) {
      queue[existingIndex] = {
        ...existing,
        payload: { ...existing.payload, ...payload },
        backendSynced,
        sheetsPending,
        timestamp: Date.now(),
      };
    } else if (type === 'DELETE_QUESTION') {
      if (existing.type === 'ADD_QUESTION') {
        queue.splice(existingIndex, 1);
      } else {
        queue[existingIndex] = newOp;
      }
    } else {
      queue[existingIndex] = { ...existing, ...newOp };
    }
  } else {
    queue.push(newOp);
  }

  setMentorLogQueue(queue);
  return newOp;
};

export const dequeueMentorLogOp = (operationId) => {
  const queue = getMentorLogQueue();
  const filtered = queue.filter((item) => item.id !== operationId);
  setMentorLogQueue(filtered);
};

export const clearMentorLogQueue = () => {
  setMentorLogQueue([]);
};

export const getTotalPendingCount = () => {
  return getWorkLogQueue().length + getMentorLogQueue().length;
};

/* ==========================================================================
   DEPRECATED FULL-DATABASE CACHING (Stubbed to prevent storing full DB)
   ========================================================================== */

export const getCachedLogs = () => [];
export const setCachedLogs = () => {};
export const upsertCachedLog = () => {};
export const removeCachedLog = () => {};

/* ==========================================================================
   SYNC EVENTS & REACTIVE LISTENERS
   ========================================================================== */

const QUEUE_EVENT = 'worklog:queue_changed';
const MENTOR_QUEUE_EVENT = 'mentorlog:queue_changed';
const SYNC_STATE_EVENT = 'worklog:sync_state_changed';
const LOGS_UPDATED_EVENT = 'worklog:logs_updated';

export const notifyQueueChanged = () => {
  if (typeof window !== 'undefined') {
    const queue = getWorkLogQueue();
    window.dispatchEvent(
      new CustomEvent(QUEUE_EVENT, { detail: { count: queue.length, queue } }),
    );
  }
};

export const notifyMentorQueueChanged = () => {
  if (typeof window !== 'undefined') {
    const queue = getMentorLogQueue();
    window.dispatchEvent(
      new CustomEvent(MENTOR_QUEUE_EVENT, {
        detail: { count: queue.length, queue },
      }),
    );
  }
};

export const notifySyncState = (state, message = '') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(SYNC_STATE_EVENT, { detail: { state, message } }),
    );
  }
};

export const notifyLogsUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LOGS_UPDATED_EVENT));
  }
};

export const subscribeToQueue = (callback) => {
  if (typeof window === 'undefined') return () => {};
  const handler = () => {
    callback({
      count: getTotalPendingCount(),
      workLogQueue: getWorkLogQueue(),
      mentorLogQueue: getMentorLogQueue(),
    });
  };
  window.addEventListener(QUEUE_EVENT, handler);
  window.addEventListener(MENTOR_QUEUE_EVENT, handler);
  handler();
  return () => {
    window.removeEventListener(QUEUE_EVENT, handler);
    window.removeEventListener(MENTOR_QUEUE_EVENT, handler);
  };
};

export const subscribeToSyncState = (callback) => {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => callback(e.detail);
  window.addEventListener(SYNC_STATE_EVENT, handler);
  return () => window.removeEventListener(SYNC_STATE_EVENT, handler);
};

const REMARKS_UPDATED_EVENT = 'worklog:remarks_updated';

export const notifyRemarksUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(REMARKS_UPDATED_EVENT));
  }
};

export const subscribeToRemarksUpdated = (callback) => {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(REMARKS_UPDATED_EVENT, handler);
  return () => window.removeEventListener(REMARKS_UPDATED_EVENT, handler);
};

export const subscribeToLogsUpdated = (callback) => {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(LOGS_UPDATED_EVENT, handler);
  return () => window.removeEventListener(LOGS_UPDATED_EVENT, handler);
};
