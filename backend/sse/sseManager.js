// sse/sseManager.js

// This Map is the CORE of SSE management
// It lives in memory as long as the server is running
//
// Structure:
// Map {
//   "userId_1" => res (Express response object),
//   "userId_2" => res,
//   ...
// }
//
// When server restarts → Map is empty → clients reconnect automatically
// (EventSource auto-reconnects, so this is fine)

const clients = new Map();

/**
 * Register a new SSE client
 *
 * Called when a user opens /notifications/stream
 * We store their res object so we can write to it later
 *
 * @param {string|number} userId  - the logged in user's ID
 * @param {object}        res     - Express response object (the open HTTP connection)
 */
const addClient = (userId, res) => {
  // Convert to string for consistent Map keys
  // (userId might come as number from DB, string from URL param)
  clients.set(String(userId), res);
  console.log(`✅ SSE client connected   | userId: ${userId} | Total clients: ${clients.size}`);
};

/**
 * Remove an SSE client
 *
 * Called when user closes the tab, loses internet, or logs out
 * Important: if we don't remove it, we'll try to write to a dead connection
 *
 * @param {string|number} userId - the user to remove
 */
const removeClient = (userId) => {
  clients.delete(String(userId));
  console.log(`❌ SSE client disconnected | userId: ${userId} | Total clients: ${clients.size}`);
};

/**
 * Get a client's response object
 *
 * Used by notificationService to push an event to a specific user
 * Returns undefined if user is not connected (offline)
 *
 * @param   {string|number} userId
 * @returns {object|undefined}  Express res object or undefined
 */
const getClient = (userId) => {
  return clients.get(String(userId));
};

/**
 * Check if a user currently has an active SSE connection
 *
 * Used by notificationService to decide:
 * → true  = push SSE event now
 * → false = save to DB queue
 *
 * @param   {string|number} userId
 * @returns {boolean}
 */
const hasClient = (userId) => {
  return clients.has(String(userId));
};

export { addClient, removeClient, getClient, hasClient };
// ```

// ---

// ## How It Works Visually
// ```
// Server starts
//   → clients Map is empty {}

// User 1 (id: 42) opens app
//   → EventSource connects to /notifications/stream
//   → addClient(42, res) called
//   → Map { "42" => res }

// User 2 (id: 87) opens app
//   → addClient(87, res) called
//   → Map { "42" => res, "87" => res }

// Someone sends message to User 1
//   → hasClient(42) → true
//   → getClient(42) → res object
//   → write SSE event to res ✅

// Someone sends message to User 3 (offline)
//   → hasClient(3) → false
//   → save to DB queue instead ✅

// User 1 closes tab
//   → removeClient(42) called
//   → Map { "87" => res }