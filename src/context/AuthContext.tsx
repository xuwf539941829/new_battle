import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../api';
import socketService from '../socket';

export const AuthContext = createContext<{
  isAuthenticated: boolean;
  loading: boolean;
  login: () => void;
  logout: () => void;
}>({
  isAuthenticated: false,
  loading: true,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const user = await apiService.getMe();
        setIsAuthenticated(true);
        socketService.connect(user.id);
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      console.warn("Auth check failed, user needs to login", e);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = () => {
    setIsAuthenticated(true);
    if (apiService.currentUser) {
      socketService.connect(apiService.currentUser.id);
    }
  };

  const logout = async () => {
    socketService.disconnect();
    await apiService.logout();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
