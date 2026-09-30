import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAdminProfile, adminLogout as apiAdminLogout } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ewaree_admin_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdmin = async () => {
      if (token) {
        try {
          const profile = await getAdminProfile();
          setAdmin(profile.user || profile);
        } catch (err) {
          console.error('Failed to verify session token:', err);
          logout();
        }
      }
      setLoading(false);
    };

    fetchAdmin();
  }, [token]);

  const login = (authToken, adminUser) => {
    localStorage.setItem('ewaree_admin_token', authToken);
    setToken(authToken);
    setAdmin(adminUser);
  };

  const logout = async () => {
    if (token) {
      await apiAdminLogout();
    }
    localStorage.removeItem('ewaree_admin_token');
    setToken(null);
    setAdmin(null);
  };

  const updateAdminData = (updatedUser) => {
    setAdmin((prev) => ({ ...prev, ...updatedUser }));
  };

  return (
    <AuthContext.Provider value={{ admin, token, isAuthenticated: !!token, loading, login, logout, updateAdminData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
