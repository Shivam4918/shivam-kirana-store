import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = sessionStorage.getItem('user');
    const token = sessionStorage.getItem('access_token');
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

  // Sync logout event across tabs & handle pagehide
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'logout-event') {
        sessionStorage.clear();
        setUser(null);
        window.location.href = '/login';
      }
    };
    
    const handlePageHide = () => {
      // Reliable tab-close or browser-close detection: if we are logged in, trigger sendBeacon logout
      const token = sessionStorage.getItem('access_token');
      if (token) {
        const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/auth/logout/`;
        navigator.sendBeacon(url);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('pagehide', handlePageHide);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  const login = async (emailOrUsername, password) => {
    try {
      const res = await api.post('/auth/login/', {
        username: emailOrUsername,
        password: password,
      });
      
      const { access, refresh, user: userData } = res.data;
      
      sessionStorage.setItem('access_token', access);
      sessionStorage.setItem('refresh_token', refresh);
      sessionStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      return { success: true };
    } catch (err) {
      console.error(err);
      return { 
        success: false, 
        error: err.response?.data?.detail || 'Invalid username/email or password.' 
      };
    }
  };

  const register = async (username, email, phoneNumber, password, confirmPassword) => {
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
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout/');
    } catch (err) {
      console.error('Server logout failed:', err);
    }
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('user');
    setUser(null);
    
    // Trigger storage event for other open tabs
    localStorage.setItem('logout-event', Date.now().toString());
    localStorage.removeItem('logout-event');
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    setUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
