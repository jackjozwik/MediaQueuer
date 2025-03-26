// lib/auth.js
import { writable } from 'svelte/store';

// Create stores for authentication
export const user = writable(null);
export const token = writable(null);
export const isAuthenticated = writable(false);
export const authInitialized = writable(false);
export const isTokenValidating = writable(false);
export const tokenValidated = writable(false);

const MAX_RETRIES = 3;

// Initialize from localStorage (called in layout)
export function initAuth() {
  console.log("Initializing auth from localStorage");
  
  // Reset validation state
  isTokenValidating.set(false);
  tokenValidated.set(false);
  
  // Mark auth as initialized immediately to prevent redirect loops
  authInitialized.set(true);
  
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
        
        // Update stores immediately to prevent flashing of login screen
        token.set(storedToken);
        user.set(userData);
        isAuthenticated.set(true);
        
        console.log("Auth restored from localStorage");
        
        // Check token validity by making an API call
        // Add a slight delay to ensure the token is set in the store
        setTimeout(() => {
          validateTokenWithRetry(storedToken);
        }, 300);
        
      } catch (e) {
        console.error("Error restoring auth state:", e);
        // Clean up invalid state
        logout();
      }
    }
  }
}

// Validate token with backend with retries
async function validateTokenWithRetry(authToken, attempt = 0) {
  if (attempt >= MAX_RETRIES) {
    console.error(`Token validation failed after ${MAX_RETRIES} attempts`);
    logout();
    return;
  }
  
  isTokenValidating.set(true);
  
  try {
    await validateToken(authToken);
    console.log("Token validation successful");
    tokenValidated.set(true);
    isTokenValidating.set(false);
  } catch (err) {
    console.warn(`Token validation attempt ${attempt + 1} failed:`, err);
    
    // Wait longer between retries
    const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
    
    // Retry after delay
    setTimeout(() => {
      validateTokenWithRetry(authToken, attempt + 1);
    }, delay);
  }
}

// Validate token with backend
async function validateToken(authToken) {
  try {
    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Invalid token (status: ${response.status})`);
    }
    
    // Update user data from the response to ensure it's fresh
    const userData = await response.json();
    if (userData.data && userData.data.user) {
      user.set(userData.data.user);
      localStorage.setItem('user', JSON.stringify(userData.data.user));
    }
    
    return userData;
  } catch (error) {
    console.error('Token validation error:', error);
    throw error;
  }
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
    
    // Reset validation state
    isTokenValidating.set(false);
    tokenValidated.set(false);
    
    // Set auth data in stores
    user.set(data.data.user);
    token.set(data.data.token);
    isAuthenticated.set(true);
    
    // Store in localStorage
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    
    // Mark token as validated since we just got it
    tokenValidated.set(true);
    
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
  tokenValidated.set(false);
  isTokenValidating.set(false);
  
  // Clear localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  console.log("Logged out");
}