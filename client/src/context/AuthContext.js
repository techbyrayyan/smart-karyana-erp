'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authApi } from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('smart_khata_token');
      const storedUser = localStorage.getItem('smart_khata_user');

      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (e) {}
        }

        try {
          const res = await authApi.getProfile();
          if (res.success) {
            setProfile(res.profile);
            setUser(res.user);
            localStorage.setItem('smart_khata_user', JSON.stringify(res.user));
          }
        } catch (err) {
          console.warn('Session refresh error:', err);
        }
      } else {
        if (pathname && pathname.startsWith('/dashboard')) {
          router.push('/login');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [pathname, router]);

  const login = async (username, password) => {
    const res = await authApi.login(username, password);
    if (res.success && res.token) {
      localStorage.setItem('smart_khata_token', res.token);
      localStorage.setItem('smart_khata_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      setProfile(res.profile);
      router.push('/dashboard');
      return res;
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = () => {
    localStorage.removeItem('smart_khata_token');
    localStorage.removeItem('smart_khata_user');
    setToken(null);
    setUser(null);
    setProfile(null);
    router.push('/login');
  };

  const refreshProfile = async () => {
    try {
      const res = await authApi.getProfile();
      if (res.success) {
        setProfile(res.profile);
        setUser(res.user);
      }
    } catch (e) {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        loading,
        login,
        logout,
        refreshProfile,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
