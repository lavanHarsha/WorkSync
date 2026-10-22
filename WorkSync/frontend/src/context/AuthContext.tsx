import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  register: (name: string, email: string, password: string, confirmPassword?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('worksync_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      let storedToken = localStorage.getItem('worksync_token');

      // If no token in localStorage, attempt silent session restore via httpOnly refresh cookie
      if (!storedToken) {
        try {
          const refreshRes = await api.refresh();
          if (refreshRes.success && refreshRes.token) {
            localStorage.setItem('worksync_token', refreshRes.token);
            setToken(refreshRes.token);
            storedToken = refreshRes.token;
          }
        } catch {
          // No active session cookie
          setUser(null);
          setToken(null);
          setLoading(false);
          return;
        }
      }

      if (storedToken) {
        const data = await api.getMe();
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          await logout();
        }
      }
    } catch (err) {
      console.warn('Auth token invalid or expired:', err);
      // Attempt silent refresh before logging out
      try {
        const refreshRes = await api.refresh();
        if (refreshRes.success && refreshRes.token) {
          localStorage.setItem('worksync_token', refreshRes.token);
          setToken(refreshRes.token);
          const data = await api.getMe();
          if (data.success && data.user) {
            setUser(data.user);
            return;
          }
        }
      } catch {
        // Refresh also failed
      }
      await logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.login({ email, password });
    if (data.success && data.token) {
      localStorage.setItem('worksync_token', data.token);
      setToken(data.token);
      setUser(data.user);
    }
  };

  const demoLogin = async () => {
    const data = await api.demoLogin();
    if (data.success && data.token) {
      localStorage.setItem('worksync_token', data.token);
      setToken(data.token);
      setUser(data.user);
    }
  };

  const register = async (name: string, email: string, password: string, confirmPassword?: string) => {
    const data = await api.register({ name, email, password, confirmPassword });
    if (data.success && data.token) {
      localStorage.setItem('worksync_token', data.token);
      setToken(data.token);
      setUser(data.user);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors on logout so local state is always cleared
    } finally {
      localStorage.removeItem('worksync_token');
      setToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        demoLogin,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
