import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import apiClient, { setAuthToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/auth/me');
      if (res.data?.token) {
        setAuthToken(res.data.token);
      }
      setUser(res.data?.user || null);
    } catch {
      setAuthToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = async (credentials) => {
    const res = await apiClient.post('/auth/login', credentials);
    setAuthToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (payload) => {
    const res = await apiClient.post('/auth/register', payload);
    setAuthToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const updateProfile = async (payload) => {
    const res = await apiClient.put('/auth/me', payload);
    if (res.data?.token) {
      setAuthToken(res.data.token);
    }
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ігноруємо мережеву помилку при виході
    }
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, updateProfile, logout, restoreSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth має використовуватися всередині AuthProvider');
  }
  return ctx;
}
