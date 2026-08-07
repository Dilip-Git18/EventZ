import crypto from 'crypto';
import redis from '../config/redis.js';

/**
 * Acquires a distributed lock on a given resource using Redis.
 * Uses a retry loop with randomized backoff (jitter) to handle contention.
 *
 * @param {string} resource - The unique identifier of the resource (e.g. 'lock:category:123')
 * @param {number} ttlMs - Time-to-live for the lock in milliseconds (e.g. 10000)
 * @param {number} maxRetries - Maximum number of retry attempts (default: 8)
 * @returns {Promise<string|null>} - Returns the unique lock token if acquired, or null if failed
 */
export const acquireLock = async (resource, ttlMs = 10000, maxRetries = 8) => {
  const token = crypto.randomUUID();
  let attempts = 0;

  while (attempts < maxRetries) {
    // NX = Only set if key does not exist
    // PX = Expiry time in milliseconds
    const result = await redis.set(resource, token, 'NX', 'PX', ttlMs);
    
    if (result === 'OK') {
      return token; // Lock acquired successfully
    }

    attempts++;
    
    if (attempts < maxRetries) {
      // Randomized delay between 30ms and 80ms to avoid stampede / alignment
      const delay = Math.floor(Math.random() * 50) + 30;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return null; // Failed to acquire lock
};

/**
 * Releases the distributed lock atomically using a Lua script.
 * Prevents a client from deleting another client's lock if the original lock expired.
 *
 * @param {string} resource - The resource identifier
 * @param {string} token - The unique token returned when acquiring the lock
 * @returns {Promise<boolean>} - Returns true if lock was successfully released, false otherwise
 */
export const releaseLock = async (resource, token) => {
  const luaScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  try {
    const result = await redis.eval(luaScript, 1, resource, token);
    return result === 1;
  } catch (error) {
    console.error(`Failed to release lock for ${resource}:`, error.message);
    return false;
  }
};
