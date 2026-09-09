const TOKEN_KEY = 'worklog_auth_token';
const USER_KEY = 'worklog_auth_user';
const PENDING_QUEUE_KEY = 'worklog_pending_queue';
const CACHED_LOGS_KEY = 'worklog_cached_logs';

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
   PENDING SYNC QUEUE (Offline Operations)
   Each item: { id: string, type: 'CREATE' | 'UPDATE' | 'DELETE', payload: object, timestamp: number }
   ========================================================================== */

export const getPendingQueue = () => {
  return safeGetJson(PENDING_QUEUE_KEY, []);
};

export const setPendingQueue = (queue) => {
  safeSetJson(PENDING_QUEUE_KEY, queue);
  notifyQueueChanged();
};

export const enqueuePendingOperation = ({ type, id, payload }) => {
  const queue = getPendingQueue();
  const existingIndex = queue.findIndex(
    (item) => item.id === id && item.type === type,
  );

  const operation = {
    id: id || `local_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    type,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
  };

  if (existingIndex >= 0) {
    queue[existingIndex] = {
      ...queue[existingIndex],
      ...operation,
      retryCount: queue[existingIndex].retryCount || 0,
    };
  } else {
    queue.push(operation);
  }

  setPendingQueue(queue);
  return operation;
};

export const dequeuePendingOperation = (operationId) => {
  const queue = getPendingQueue();
  const filtered = queue.filter((item) => item.id !== operationId);
  setPendingQueue(filtered);
};

export const clearPendingQueue = () => {
  setPendingQueue([]);
};

/* ==========================================================================
   CACHED WORK LOGS (For Offline Viewing & Optimistic UI)
   ========================================================================== */

export const getCachedLogs = () => {
  return safeGetJson(CACHED_LOGS_KEY, []);
};

export const setCachedLogs = (logs) => {
  safeSetJson(CACHED_LOGS_KEY, logs);
};

export const upsertCachedLog = (log) => {
  const logs = getCachedLogs();
  const logId = log._id || log.id;
  const index = logs.findIndex((item) => (item._id || item.id) === logId);

  if (index >= 0) {
    logs[index] = { ...logs[index], ...log };
  } else {
    logs.unshift(log);
  }

  setCachedLogs(logs);
};

export const removeCachedLog = (logId) => {
  const logs = getCachedLogs();
  const filtered = logs.filter((item) => (item._id || item.id) !== logId);
  setCachedLogs(filtered);
};

/* ==========================================================================
   SYNC EVENTS & REACTIVE LISTENERS
   ========================================================================== */

const QUEUE_EVENT = 'worklog:queue_changed';
const SYNC_STATE_EVENT = 'worklog:sync_state_changed';
const LOGS_UPDATED_EVENT = 'worklog:logs_updated';

export const notifyQueueChanged = () => {
  if (typeof window !== 'undefined') {
    const queue = getPendingQueue();
    window.dispatchEvent(
      new CustomEvent(QUEUE_EVENT, { detail: { count: queue.length, queue } }),
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
  const handler = (e) => callback(e.detail);
  window.addEventListener(QUEUE_EVENT, handler);
  callback({ count: getPendingQueue().length, queue: getPendingQueue() });
  return () => window.removeEventListener(QUEUE_EVENT, handler);
};

export const subscribeToSyncState = (callback) => {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => callback(e.detail);
  window.addEventListener(SYNC_STATE_EVENT, handler);
  return () => window.removeEventListener(SYNC_STATE_EVENT, handler);
};

export const subscribeToLogsUpdated = (callback) => {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(LOGS_UPDATED_EVENT, handler);
  return () => window.removeEventListener(LOGS_UPDATED_EVENT, handler);
};
