/**
 * Simple in-memory cache implementation
 */

// Cache storage
const cache = new Map();
const expiryTimes = new Map();

/**
 * Get a value from the cache
 * @param {string} key - The cache key
 * @returns {any} - The cached value or undefined if not found/expired
 */
function get(key) {
  // Check if key exists
  if (!cache.has(key)) {
    return undefined;
  }
  
  // Check if expired
  const expires = expiryTimes.get(key);
  if (expires && expires < Date.now()) {
    // Expired, remove from cache
    del(key);
    return undefined;
  }
  
  // Return value
  return cache.get(key);
}

/**
 * Set a value in the cache
 * @param {string} key - The cache key
 * @param {any} value - The value to cache
 * @param {number} [ttlMinutes=60] - Time to live in minutes
 */
function set(key, value, ttlMinutes = 60) {
  // Store value
  cache.set(key, value);
  
  // Set expiry time
  if (ttlMinutes > 0) {
    const expires = Date.now() + (ttlMinutes * 60 * 1000);
    expiryTimes.set(key, expires);
  }
}

/**
 * Delete a key from the cache
 * @param {string} key - The cache key to delete
 */
function del(key) {
  cache.delete(key);
  expiryTimes.delete(key);
}

/**
 * Clear all cache entries
 */
function clear() {
  cache.clear();
  expiryTimes.clear();
}

/**
 * Check if a key exists in the cache
 * @param {string} key - The cache key
 * @returns {boolean} - True if the key exists and is not expired
 */
function has(key) {
  if (!cache.has(key)) {
    return false;
  }
  
  // Check if expired
  const expires = expiryTimes.get(key);
  if (expires && expires < Date.now()) {
    del(key);
    return false;
  }
  
  return true;
}

module.exports = {
  get,
  set,
  del,
  clear,
  has
}; 