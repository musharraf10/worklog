import { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './authContextDef';
import authService from '../services/authService';
import workLogService from '../services/workLogService';
import {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
  subscribeToQueue,
  subscribeToSyncState,
} from '../utils/storageUtils';

export { AuthContext };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getStoredUser());
  const [token, setToken] = useState(() => getAuthToken());
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('synced');
  const [syncMessage, setSyncMessage] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  // Manual or automatic sync runner
  const triggerSync = useCallback(async () => {
    if (token && navigator.onLine) {
      try {
        await workLogService.syncPendingWorkLogs();
      } catch (err) {
        console.error('Auto sync failed:', err);
      }
    }
  }, [token]);

  // Subscribe to offline queue changes and sync state updates
  useEffect(() => {
    const unsubQueue = subscribeToQueue(({ count }) => {
      setPendingCount(count);
      if (count === 0 && syncStatus === 'pending') {
        setSyncStatus('synced');
        setSyncMessage('All changes synced');
      }
    });

    const unsubSync = subscribeToSyncState(({ state, message }) => {
      setSyncStatus(state);
      if (message) setSyncMessage(message);
    });

    return () => {
      unsubQueue();
      unsubSync();
    };
  }, [syncStatus]);

  // Listen for online events and window focus to retry pending sync operations
  useEffect(() => {
    const handleOnline = () => {
      console.log('Online detected. Triggering sync...');
      triggerSync();
    };

    window.addEventListener('online', handleOnline);

    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      clearAuthToken();
      clearStoredUser();
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [triggerSync]);

  // On mount, verify existing token and load user profile
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const storedToken = getAuthToken();
      if (!storedToken) {
        if (isMounted) {
          setUser(null);
          setToken(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await authService.getMe();
        if (isMounted && response?.data?.user) {
          const profile = response.data.user;
          setUser(profile);
          setStoredUser(profile);
          triggerSync();
        }
      } catch (error) {
        console.warn('Initial session validation failed or offline:', error.message);
        if (!navigator.onLine && getStoredUser()) {
          setUser(getStoredUser());
        } else if (error.response?.status === 401) {
          clearAuthToken();
          clearStoredUser();
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [triggerSync]);

  const login = async (email, password) => {
    const response = await authService.login(email, password);
    const { token: newToken, user: newUser } = response.data;

    setAuthToken(newToken);
    setStoredUser(newUser);
    setToken(newToken);
    setUser(newUser);

    setTimeout(() => {
      triggerSync();
    }, 100);

    return response;
  };

  const register = async (name, email, password) => {
    const response = await authService.register(name, email, password);
    const { token: newToken, user: newUser } = response.data;

    setAuthToken(newToken);
    setStoredUser(newUser);
    setToken(newToken);
    setUser(newUser);

    setTimeout(() => {
      triggerSync();
    }, 100);

    return response;
  };

  const googleLogin = async (credential) => {
    const response = await authService.googleLogin(credential);
    const { token: newToken, user: newUser } = response.data;

    setAuthToken(newToken);
    setStoredUser(newUser);
    setToken(newToken);
    setUser(newUser);

    setTimeout(() => {
      triggerSync();
    }, 100);

    return response;
  };

  const logout = () => {
    clearAuthToken();
    clearStoredUser();
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    syncStatus,
    syncMessage,
    pendingCount,
    login,
    register,
    googleLogin,
    logout,
    triggerSync,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
