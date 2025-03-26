import { get } from 'svelte/store';
import { token, logout, isTokenValidating, tokenValidated } from './auth';

// Request queue for pending API calls
let requestQueue = [];
let isProcessingQueue = false;

// Process the request queue when token is validated
tokenValidated.subscribe(validated => {
  if (validated && requestQueue.length > 0) {
    console.log(`Token validated, processing ${requestQueue.length} queued requests`);
    processRequestQueue();
  }
});

/**
 * Process queued requests once token is validated
 */
async function processRequestQueue() {
  if (isProcessingQueue) return;
  
  isProcessingQueue = true;
  console.log(`Processing ${requestQueue.length} queued API requests`);
  
  // Create a copy to avoid issues with queue changing during processing
  const currentQueue = [...requestQueue];
  requestQueue = [];
  
  // Using Promise.all to process all requests in parallel for better performance
  try {
    const results = await Promise.allSettled(
      currentQueue.map(async request => {
        try {
          const result = await apiRequest(request.endpoint, request.options, false);
          return { request, result, success: true };
        } catch (error) {
          return { request, error, success: false };
        }
      })
    );
    
    // Resolve or reject each queued promise with its result
    results.forEach(outcome => {
      if (outcome.value.success) {
        outcome.value.request.resolve(outcome.value.result);
      } else {
        outcome.value.request.reject(outcome.value.error);
      }
    });
    
    console.log(`Completed processing ${currentQueue.length} queued requests`);
  } catch (err) {
    console.error("Error processing request queue:", err);
  } finally {
    isProcessingQueue = false;
    
    // If more requests came in while processing, handle those too
    if (requestQueue.length > 0) {
      setTimeout(() => processRequestQueue(), 0);
    }
  }
}

/**
 * Centralized API request handler with automatic token management
 * @param {string} endpoint - API endpoint to call
 * @param {Object} options - Fetch options like method, body, etc.
 * @param {boolean} allowQueue - Whether to queue requests during token validation
 * @returns {Promise<Object>} - Response data
 */
export async function apiRequest(endpoint, options = {}, allowQueue = true) {
  // Get validation state
  const isValidating = get(isTokenValidating);
  
  // If we're validating the token and this request can be queued, add to queue
  if (isValidating && allowQueue && !endpoint.includes('/api/auth/')) {
    console.log(`Queuing API request during token validation: ${endpoint}`);
    return new Promise((resolve, reject) => {
      requestQueue.push({ endpoint, options, resolve, reject });
    });
  }

  // Ensure we always have a headers object
  if (!options.headers) {
    options.headers = {};
  }

  // Get current token from the store
  const currentToken = get(token);
  
  // Add authorization header if token exists
  if (currentToken) {
    options.headers['Authorization'] = `Bearer ${currentToken}`;
  }

  // Set content type to JSON for non-GET requests if not specified and body is an object
  if (options.body && typeof options.body === 'object' && !options.headers['Content-Type']) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  try {
    // Ensure endpoint has leading slash
    const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const response = await fetch(url, options);

    // Handle common error status codes - but don't logout if we're validating token
    if (response.status === 401) {
      console.warn('Unauthorized API request:', endpoint);
      
      // Don't logout if we're in the process of validating the token
      if (!isValidating) {
        console.log('Not in validation process, dispatching unauthorized event');
        // Dispatch a global unauthorized event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('unauthorized', { 
            detail: { 
              endpoint, 
              message: 'Authentication required' 
            } 
          }));
        }
        
        // Log the user out
        logout();
        throw new Error('Authentication required. Please log in again.');
      } else {
        console.log('In validation process, returning error without logout');
        throw new Error('Authentication error during validation');
      }
    }

    // Parse response
    const data = await response.json();
    
    // Handle API errors
    if (!data.success && data.message) {
      console.error(`API error: ${endpoint}`, data.message);
      throw new Error(data.message);
    }
    
    return data;
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    throw error;
  }
}

// Common API methods
export const api = {
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),
  post: (endpoint, data) => apiRequest(endpoint, { method: 'POST', body: data }),
  put: (endpoint, data) => apiRequest(endpoint, { method: 'PUT', body: data }),
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),
}; 