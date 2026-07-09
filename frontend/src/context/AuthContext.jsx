import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');
    if (storedUser && token) {
      try {
        return JSON.parse(storedUser);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading] = useState(false);

  // Sync logout event across tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'logout-event') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setUser(null);
        window.location.href = '/login';
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = useCallback(async (emailOrUsername, password) => {
    try {
      const res = await api.post('/auth/login/', {
        username: emailOrUsername,
        password: password,
      });
      
      const { access, refresh, user: userData } = res.data;
      
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      return { success: true };
    } catch (err) {
      console.error(err);
      return { 
        success: false, 
        error: err.response?.data?.detail || 'Invalid username/email or password.' 
      };
    }
  }, []);

  const register = useCallback(async (username, email, phoneNumber, password, confirmPassword) => {
    try {
      const res = await api.post('/auth/register/', {
        username,
        email,
        phone_number: phoneNumber,
        password,
        confirm_password: confirmPassword
      });
      return { success: true, data: res.data };
    } catch (err) {
      console.error(err);
      return { 
        success: false, 
        error: err.response?.data || { detail: 'Registration failed.' } 
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout/');
    } catch (err) {
      console.error('Server logout failed:', err);
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
    
    // Trigger storage event for other open tabs
    localStorage.setItem('logout-event', Date.now().toString());
    localStorage.removeItem('logout-event');
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    setUser
  }), [user, loading, login, register, logout]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

