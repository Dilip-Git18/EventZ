import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const API_BASE_URL = 'http://localhost:5001/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Helper to trigger toast notifications
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Base API fetch wrapper that automatically handles cookies and errors
  const apiFetch = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Set headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const config = {
      ...options,
      headers,
      credentials: 'include' // Crucial: Send and receive HTTP-only cookies
    };

    try {
      const response = await fetch(url, config);
      
      // If unauthorized, clear user state
      if (response.status === 401 && endpoint !== '/auth/me') {
        setUser(null);
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (err) {
      console.error(`API Fetch Error [${endpoint}]:`, err.message);
      throw err;
    }
  };

  // Check if user is logged in on load
  const loadUser = async () => {
    try {
      const data = await apiFetch('/auth/me');
      if (data.success) {
        setUser(data.user);
      }
    } catch (err) {
      // Ignore unauthorized error on loadUser (means user is not logged in)
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  // Register
  const registerUser = async (name, email, password, role) => {
    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role })
      });
      if (data.success) {
        setUser(data.user);
        showToast('Registration successful! Welcome.', 'success');
        return true;
      }
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  };

  // Login
  const loginUser = async (email, password) => {
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (data.success) {
        setUser(data.user);
        showToast(`Welcome back, ${data.user.name}!`, 'success');
        return true;
      }
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  };

  // Logout
  const logoutUser = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
      setUser(null);
      showToast('Logged out successfully.', 'success');
    } catch (err) {
      setUser(null);
      showToast('Session ended.', 'success');
    }
  };

  // Update Profile
  const updateProfile = async (name, email, password) => {
    try {
      const bodyData = { name, email };
      if (password) bodyData.password = password;

      const data = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(bodyData)
      });
      if (data.success) {
        setUser(data.user);
        showToast('Profile updated successfully!', 'success');
        return true;
      }
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        toast,
        showToast,
        apiFetch,
        register: registerUser,
        login: loginUser,
        logout: logoutUser,
        updateProfile,
        loadUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export { API_BASE_URL };
