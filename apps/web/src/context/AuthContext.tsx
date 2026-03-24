// MODIFIED FILE — changes: Admin-only auth; non-admin roles receive ACCESS_DENIED error instead of redirect
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginService, logout as logoutService } from '../services';
import type { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        // Only restore session for admins
        if (parsedUser.role?.toLowerCase() === 'admin') {
          setToken(storedToken);
          setUser(parsedUser);
        } else {
          // Clear any stale non-admin session
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await loginService(email, password);

      if (result.success && result.data) {
        const userRole = result.data.user.role?.toLowerCase();

        // This panel is admin-only — reject all other roles immediately
        if (userRole !== 'admin') {
          throw new Error('ACCESS_DENIED');
        }

        setUser(result.data.user);
        setToken(result.data.token);
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        if (result.data.refreshToken) {
          localStorage.setItem('refreshToken', result.data.refreshToken);
        }
        navigate('/admin/dashboard');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    logoutService();
    setUser(null);
    setToken(null);
    navigate('/login');
  };

  const loginWithToken = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    navigate('/admin/dashboard');
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    loginWithToken,
    logout,
    isAuthenticated: !!user && !!token,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};