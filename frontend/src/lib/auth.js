// lib/auth.js
import { writable } from 'svelte/store';

// Create stores for authentication
export const user = writable(null);
export const token = writable(null);
export const isAuthenticated = writable(false);

// Initialize from localStorage (called in layout)
export function initAuth() {
  console.log("Initializing auth from localStorage");
  
  if (typeof window !== 'undefined') {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    console.log("Found stored auth:", { 
      hasToken: !!storedToken, 
      hasUser: !!storedUser 
    });
    
    if (storedToken && storedUser) {
      try {
        // Parse user data
        const userData = JSON.parse(storedUser);
        
        // Update stores
        token.set(storedToken);
        user.set(userData);
        isAuthenticated.set(true);
        
        console.log("Auth restored successfully");
        
        // Check token validity by making an API call
        validateToken(storedToken).catch(err => {
          console.warn("Token validation failed, logging out:", err);
          logout();
        });
      } catch (e) {
        console.error("Error restoring auth state:", e);
        // Clean up invalid state
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }
}

// Validate token with backend
async function validateToken(token) {
  const response = await fetch('/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Invalid token');
  }
  
  return response.json();
}

// Login function
export async function login(username, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return { success: false, message: data.message || 'Login failed' };
    }
    
    // Set auth data in stores
    user.set(data.data.user);
    token.set(data.data.token);
    isAuthenticated.set(true);
    
    // Store in localStorage
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    
    console.log("Login successful");
    
    return { success: true, data: data.data };
  } catch (err) {
    console.error('Login error:', err);
    return { success: false, message: 'Server error. Please try again.' };
  }
}

// Logout function
export function logout() {
  user.set(null);
  token.set(null);
  isAuthenticated.set(false);
  
  // Clear localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  console.log("Logged out");
}