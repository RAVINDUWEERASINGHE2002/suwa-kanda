import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('suwa_kanda_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('suwa_kanda_token') || null;
  });

  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState([]);

  // Fetch profiles on mount
  useEffect(() => {
    fetch('/api/auth/profiles')
      .then(r => r.json())
      .then(d => {
        if (d.success) setProfiles(d.data);
      })
      .catch(() => {});
  }, []);

  const loginWithPin = async (pin, username = null) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, username })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('suwa_kanda_user', JSON.stringify(data.user));
        localStorage.setItem('suwa_kanda_token', data.token);
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'වලංගු නොවන PIN අංකයකි' };
      }
    } catch (err) {
      return { success: false, error: 'සම්බන්ධතාවය අසාර්ථකයි (Network Error)' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('suwa_kanda_user');
    localStorage.removeItem('suwa_kanda_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === 'admin',
        loading,
        profiles,
        loginWithPin,
        logout,
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

export default AuthContext;
