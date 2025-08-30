// effectManager.js - Centralized generic effect management for GURPS Roll Stats
import { MOD_ID, SET_LOG, SET_ACTIVE, SET_USE_EFFECT_ANIMATION, SET_USE_EFFECT_ICONS, SET_EFFECT_COUNTERS, SET_EFFECT_ACTIVE_USERS, SET_EFFECT_THEME, SET_PLAYER_SHOW_COUNTERS, SET_PLAYER_SHOW_ANIMATIONS, SET_PLAYER_HIDE_EFFECT_EMOJIS, SET_FULL_BAR_MAX_POINTS, SET_GLOBAL_ACTIVE_TEXT_FALLBACK, USER_CUSTOM_ACTIVE_TEXT_FLAG_KEY, SET_PLAYER_PAUSE_ROLLS } from './constants.js';

// Module-level socket instance
let _socket = null;

/**
 * Sets the socketlib instance for this module
 * @param {Object} socketInstance - The initialized socketlib instance
 */
export function setSocketLibInstance(socketInstance) {
  _socket = socketInstance;
}

// Effect Registry - stores all available effects
const effectRegistry = new Map();

/**
 * Registers a new effect in the system
 * @param {string} effectName - Effect name (e.g. 'fire', 'electric')
 * @param {Object} effectConfig - Effect configuration
 */
export function registerEffect(effectName, effectConfig) {
  effectRegistry.set(effectName, effectConfig);
}

/**
 * Gets a registered effect
 * @param {string} effectName - Effect name
 * @returns {Object|null} Effect configuration or null if not found
 */
export function getEffect(effectName) {
  return effectRegistry.get(effectName) || null;
}

/**
 * Lists all registered effects
 * @returns {Array} Array with registered effect names
 */
export function listAvailableEffects() {
  return Array.from(effectRegistry.keys());
}

/**
 * Ensures we always get a clean string user ID
 * @param {string|User|Object} userId - User ID or User object
 * @returns {string} Clean string user ID
 */
export function normalizeUserId(userId) {
  if (typeof userId === 'string') {
    return userId;
  }
  if (typeof userId === 'object' && userId !== null) {
    return userId.id || userId._id || String(userId);
  }
  return String(userId);
}

/**
 * Gets user's custom active text from their user flag, with GM's global setting as fallback
 * @param {string} userId - User ID
 * @returns {string} Current custom text for the user
 */
export function getUserCustomActiveText(userId) {
  userId = normalizeUserId(userId);
  
  // First, try to get the user's personal custom text from their user flag
  try {
    const user = game.users.get(userId);
    if (user) {
      const userCustomText = user.getFlag(MOD_ID, USER_CUSTOM_ACTIVE_TEXT_FLAG_KEY);
      if (userCustomText && userCustomText.trim() !== "") {
        return userCustomText;
      }
    }
  } catch (e) {
    console.warn(`${MOD_ID}: Error getting user flag custom text for user ${userId}:`, e);
  }
  
  // Fallback to GM's global setting
  try {
    return game.settings.get(MOD_ID, SET_GLOBAL_ACTIVE_TEXT_FALLBACK) || "X IS ON FIRE";
  } catch (e) {
    console.warn(`${MOD_ID}: Error getting global fallback custom text:`, e);
    return "X IS ON FIRE";
  }
}

/**
 * Converts fullBar points to number of icons (0-10) - FIXED to ensure max 10
 * @param {number} points - User's current points
 * @returns {number} Number of icons to show (0-10)
 */
export function pointsToCounterIcons(points) {
  const maxPoints = game.settings.get(MOD_ID, SET_FULL_BAR_MAX_POINTS) || 30;
  const pointsPerIcon = maxPoints / 10;
  const icons = Math.floor(points / pointsPerIcon);
  // CRITICAL FIX: Always ensure we never exceed 10 icons
  return Math.min(10, Math.max(0, icons));
}

/**
 * Converts number of icons to fullBar points
 * @param {number} icons - Number of icons (0-10)
 * @returns {number} Corresponding points
 */
export function counterIconsToPoints(icons) {
  const maxPoints = game.settings.get(MOD_ID, SET_FULL_BAR_MAX_POINTS) || 30;
  const pointsPerIcon = maxPoints / 10;
  // Ensure icons are within valid range
  const validIcons = Math.min(10, Math.max(0, icons));
  return Math.floor(validIcons * pointsPerIcon);
}

/**
 * Gets effect emojis for a user based on their counter - FIXED emoji limit
 * @param {string} userId - The user ID
 * @param {string} effectName - Effect name
 * @returns {string} String with effect emojis
 */
export function getEffectEmojis(userId, effectName) {
  userId = normalizeUserId(userId);
  
  const effect = getEffect(effectName);
  if (!effect) {
    return '';
  }
  
  const counters = game.settings.get(MOD_ID, SET_EFFECT_COUNTERS) ?? {};
  const points = counters[userId] ?? 0;
  const iconCount = pointsToCounterIcons(points);
  
  const activeUsers = game.settings.get(MOD_ID, SET_EFFECT_ACTIVE_USERS) ?? {};
  const isActive = activeUsers[userId] ?? false;
  
  if (iconCount === 0) return '';
  
  const emoji = effect.emoji;
  // CRITICAL FIX: Double-check to ensure we never show more than 10 emojis
  const displayCount = Math.min(10, Math.max(0, iconCount));
  
  // Only return emojis, no text
  return emoji.repeat(displayCount);
}

/**
 * Gets current effect emojis based on selected theme
 * @param {string} userId - The user ID
 * @returns {string} String with effect emojis
 */
export function getCurrentEffectEmojis(userId) {
  const currentTheme = game.settings.get(MOD_ID, SET_EFFECT_THEME) || 'fire';
  return getEffectEmojis(userId, currentTheme);
}

/**
 * Gets the styled name for a user when effect is active
 * @param {string} userId - The user ID
 * @param {string} effectName - Effect name
 * @returns {Object|null} Object with {displayName, styles} or null if not active
 */
export function getEffectStyledName(userId, effectName) {
  userId = normalizeUserId(userId);
  
  const effect = getEffect(effectName);
  if (!effect || !effect.getStyledName) {
    return null;
  }
  
  const activeUsers = game.settings.get(MOD_ID, SET_EFFECT_ACTIVE_USERS) ?? {};
  const isActive = activeUsers[userId] ?? false;
  
  if (!isActive) {
    return null;
  }
  
  const user = game.users.get(userId);
  if (!user) {
    return null;
  }
  
  return effect.getStyledName(user.name, userId);
}

/**
 * Gets the current effect styled name based on selected theme
 * @param {string} userId - The user ID
 * @returns {Object|null} Object with {displayName, styles} or null if not active
 */
export function getCurrentEffectStyledName(userId) {
  const currentTheme = game.settings.get(MOD_ID, SET_EFFECT_THEME) || 'fire';
  return getEffectStyledName(userId, currentTheme);
}

/**
 * Re-applies effects to all existing messages (called after refresh)
 */
export function reapplyEffectsToExistingMessages() {
  console.log(`${MOD_ID}: Re-applying effects to existing messages...`);
  
  // Check if effects are enabled
  const globalIconsEnabled = game.settings.get(MOD_ID, SET_USE_EFFECT_ICONS);
  const playerShowCounters = game.settings.get(MOD_ID, SET_PLAYER_SHOW_COUNTERS);
  
  if (!globalIconsEnabled || !playerShowCounters) {
    console.log(`${MOD_ID}: Effects disabled, skipping re-apply`);
    return;
  }
  
  const currentEffectTheme = game.settings.get(MOD_ID, SET_EFFECT_THEME) || 'fire';
  
  // Get all chat messages
  const chatMessages = document.querySelectorAll('[data-message-id]');
  
  chatMessages.forEach(messageElement => {
    try {
      const messageId = messageElement.getAttribute('data-message-id');
      const message = game.messages.get(messageId);
      
      if (!message) return;
      
      let userId = message.user ?? message.userId;
      if (!userId) return;
      
      userId = normalizeUserId(userId);
      
      // Apply effects to this message
      applyEffectToSpecificMessage(messageElement, userId, currentEffectTheme);
      
      // Also update the sender name with styled name
      updateMessageSenderName(messageElement, userId);
      
    } catch (error) {
      console.error(`${MOD_ID}: Error re-applying effects to message:`, error);
    }
  });
  
  console.log(`${MOD_ID}: Finished re-applying effects to ${chatMessages.length} messages`);
}

/**
 * Updates message sender name with styled name if effect is active
 * @param {HTMLElement} messageElement - Message DOM element
 * @param {string} userId - User ID
 */
export function updateMessageSenderName(messageElement, userId) {
  userId = normalizeUserId(userId);
  
  // Get styled name from current effect
  const styledNameInfo = getCurrentEffectStyledName(userId);
  
  // Find the sender name element in the message
  const senderElement = messageElement.querySelector('.message-sender');
  if (!senderElement) return;
  
  if (styledNameInfo) {
    // Apply styled name when effect is active
    senderElement.textContent = styledNameInfo.displayName;
    
    // Apply styles if provided
    if (styledNameInfo.styles) {
      Object.entries(styledNameInfo.styles).forEach(([prop, value]) => {
        senderElement.style[prop] = value;
      });
    }
  } else {
    // Restore original user name when effect is not active
    const user = game.users.get(userId);
    if (user) {
      senderElement.textContent = user.name;
      // Clear any custom styles
      senderElement.removeAttribute('style');
    }
  }
}

/**
 * Cleans up corrupted effect data with "[object Object]" keys
 * Also migrates old format (object with effect names) to new format (single number)
 */
export async function cleanupCorruptedEffectData() {
  const counters = game.settings.get(MOD_ID, SET_EFFECT_COUNTERS) ?? {};
  const activeUsers = game.settings.get(MOD_ID, SET_EFFECT_ACTIVE_USERS) ?? {};
  
  let countersChanged = false;
  let activeUsersChanged = false;
  
  // Check for corrupted keys in counters
  if (counters.hasOwnProperty('[object Object]')) {
    delete counters['[object Object]'];
    countersChanged = true;
  }
  
  // Check for corrupted keys in active users
  if (activeUsers.hasOwnProperty('[object Object]')) {
    delete activeUsers['[object Object]'];
    activeUsersChanged = true;
  }
  
  // Migrate old format to new format
  Object.keys(counters).forEach(userId => {
    const userCounter = counters[userId];
    // If it's an object (old format), convert to single number (points)
    if (typeof userCounter === 'object' && userCounter !== null) {
      // Get the highest counter value from all effects and convert to points
      const maxCount = Math.max(0, ...Object.values(userCounter).filter(v => typeof v === 'number'));
      counters[userId] = counterIconsToPoints(maxCount);
      countersChanged = true;
    }
    // If it's a small number (0-10), it might be old icon count format, convert to points
    else if (typeof userCounter === 'number' && userCounter <= 10) {
      // Only convert if it seems to be in old format (small numbers)
      const maxPoints = game.settings.get(MOD_ID, SET_FULL_BAR_MAX_POINTS) || 30;
      if (maxPoints > 10 && userCounter > 0) {
        counters[userId] = counterIconsToPoints(userCounter);
        countersChanged = true;
      }
    }
    // CRITICAL FIX: Ensure points are always within valid range
    else if (typeof userCounter === 'number') {
      const maxPoints = game.settings.get(MOD_ID, SET_FULL_BAR_MAX_POINTS) || 30;
      if (userCounter < 0 || userCounter > maxPoints) {
        counters[userId] = Math.max(0, Math.min(maxPoints, userCounter));
        countersChanged = true;
      }
    }
  });
  
  // Clean up any invalid point values
  Object.keys(counters).forEach(userId => {
    const points = counters[userId];
    const maxPoints = game.settings.get(MOD_ID, SET_FULL_BAR_MAX_POINTS) || 30;
    if (typeof points === 'number' && (points < 0 || points > maxPoints)) {
      counters[userId] = Math.max(0, Math.min(maxPoints, points));
      countersChanged = true;
    }
  });
  
  // Migrate old active users format
  Object.keys(activeUsers).forEach(userId => {
    const userActiveEffects = activeUsers[userId];
    // If it's an object (old format), convert to single boolean
    if (typeof userActiveEffects === 'object' && userActiveEffects !== null) {
      // If any effect was active, set user as active
      const wasActive = Object.values(userActiveEffects).some(v => v === true);
      activeUsers[userId] = wasActive;
      activeUsersChanged = true;
    }
  });
  
  // Save cleaned data
  if (countersChanged) {
    await game.settings.set(MOD_ID, SET_EFFECT_COUNTERS, counters);
  }
  if (activeUsersChanged) {
    await game.settings.set(MOD_ID, SET_EFFECT_ACTIVE_USERS, activeUsers);
  }
  
  if (countersChanged || activeUsersChanged) {
    ui.notifications?.info("Effect system data cleaned up. Please recheck your effect status.");
  }
}

/**
 * COMPLETE MODULE RESET - Clears all module data and settings
 * WARNING: This will completely reset the module to default state
 */
export async function completeModuleReset() {
  if (!game.user.isGM) {
    ui.notifications?.error("Only GM can perform complete module reset");
    return;
  }
  
  const confirmReset = await Dialog.confirm({
    title: "Complete Module Reset",
    content: `<p><strong>WARNING:</strong> This will completely reset the GURPS Roll Stats module to its default state.</p>
              <p>This will clear:</p>
              <ul>
                <li>All roll statistics and logs</li>
                <li>All effect counters and active users</li>
                <li>All custom active text settings</li>
                <li>All player preferences (each user will need to reconfigure)</li>
              </ul>
              <p><strong>This action cannot be undone!</strong></p>
              <p>Are you sure you want to proceed?</p>`,
    yes: () => true,
    no: () => false,
    defaultYes: false
  });
  
  if (!confirmReset) {
    return;
  }
  
  try {
    console.log(`${MOD_ID}: Starting complete module reset...`);
    
    // Clear all world-scope settings
    await game.settings.set(MOD_ID, "log", []);
    await game.settings.set(MOD_ID, SET_EFFECT_COUNTERS, {});
    await game.settings.set(MOD_ID, SET_EFFECT_ACTIVE_USERS, {});
    
    // Reset world settings to defaults
    await game.settings.set(MOD_ID, SET_ACTIVE, true);
    await game.settings.set(MOD_ID, SET_USE_EFFECT_ICONS, true);
    await game.settings.set(MOD_ID, SET_USE_EFFECT_ANIMATION, true);
    await game.settings.set(MOD_ID, SET_EFFECT_THEME, "fire");
    await game.settings.set(MOD_ID, SET_FULL_BAR_MAX_POINTS, 30);
    await game.settings.set(MOD_ID, SET_GLOBAL_ACTIVE_TEXT_FALLBACK, "X IS ON FIRE");
    await game.settings.set(MOD_ID, "hide-gm-data", false);
    await game.settings.set(MOD_ID, "allow-players", true);
    
    // Clear user flags for all users
    for (const user of game.users) {
      try {
        await user.unsetFlag(MOD_ID, USER_CUSTOM_ACTIVE_TEXT_FLAG_KEY);
      } catch (e) {
        console.warn(`${MOD_ID}: Could not clear user flag for user ${user.id}:`, e);
      }
    }
    
    // Clear all visual effects
    clearAllEffects();
    
    // Refresh all chat messages to remove any lingering effects
    setTimeout(() => {
      reapplyEffectsToExistingMessages();
    }, 500);
    
    ui.notifications?.info("GURPS Roll Stats module has been completely reset to default state. All users should refresh their browsers to reset client settings.");
    console.log(`${MOD_ID}: Complete module reset finished`);
    
  } catch (error) {
    console.error(`${MOD_ID}: Error during complete module reset:`, error);
    ui.notifications?.error("Error occurred during module reset. Check console for details.");
  }
}

/* ---------------------- GM-only functions that actually update the settings ---------------------- */

/**
 * Updates a specific effect counter for a user (GM only) - FIXED for immediate sync
 * @param {string} userId - User ID
 * @param {string} currentTheme - Currently selected effect theme (e.g. 'fire', 'electric'), used for visual and notification purposes
 * @param {number} change - Change in points (+/-)
 */
export async function handleUpdateEffectCounterGM(userId, currentTheme, change) {
  userId = normalizeUserId(userId);
  
  const effect = getEffect(currentTheme);
  if (!effect) {
    return 0;
  }
  
  // IMPORTANT: Points are UNIQUE per user, not separated by theme
  // currentTheme is used only for visual and notification purposes
  const counters = game.settings.get(MOD_ID, SET_EFFECT_COUNTERS) ?? {};
  const maxPoints = game.settings.get(MOD_ID, SET_FULL_BAR_MAX_POINTS) || 30;
  const currentPoints = counters[userId] ?? 0;
  const newPoints = Math.max(0, Math.min(maxPoints, currentPoints + change));
  
  // Update points
  counters[userId] = newPoints;
  await game.settings.set(MOD_ID, SET_EFFECT_COUNTERS, counters);
  const newIconCount = pointsToCounterIcons(newPoints);
  
  // Check if user reaches 10 icons (becomes "active")
  const activeUsers = game.settings.get(MOD_ID, SET_EFFECT_ACTIVE_USERS) ?? {};
  const wasActive = activeUsers[userId] ?? false;
  
  if (newIconCount === 10 && !wasActive) {
    activeUsers[userId] = true;
    await game.settings.set(MOD_ID, SET_EFFECT_ACTIVE_USERS, activeUsers);
    
    // Trigger animation if enabled
    if (game.settings.get(MOD_ID, SET_USE_EFFECT_ANIMATION)) {
      triggerEffectAnimation(userId, currentTheme);
    }
    
    // Notify all clients
    const user = game.users.get(userId);
    ui.notifications?.info(`${effect.emoji} ${user?.name || 'Player'} is ${effect.activeText}! ${effect.emoji}`);
  } else if (newIconCount < 10 && wasActive) {
    // User dropped below 10, no longer active
    delete activeUsers[userId];
    await game.settings.set(MOD_ID, SET_EFFECT_ACTIVE_USERS, activeUsers);
  }
  
  // Broadcast the update to all clients immediately
  if (_socket && _socket.executeForEveryone) {
    _socket.executeForEveryone('broadcastEffectUpdate', userId, currentTheme);
  }
  
  console.log(`${MOD_ID}: [FULLBAR] User ${userId}: ${currentPoints} -> ${newPoints} points (${pointsToCounterIcons(currentPoints)} -> ${newIconCount} icons)`);
  
  return newIconCount;
}

/**
 * Handles critical success for a specific effect (GM only) - FIXED for immediate sync
 * @param {string} userId - User ID
 * @param {string} currentTheme - Currently selected effect theme (e.g. 'fire', 'electric'), used for visual and notification purposes
 */
export async function handleCriticalSuccessGM(userId, currentTheme) {
  userId = normalizeUserId(userId);
  
  const effect = getEffect(currentTheme);
  if (!effect) {
    return;
  }
  
  // IMPORTANT: Points are UNIQUE per user, not separated by theme
  // Critical success: set points to maximum (active)
  const counters = game.settings.get(MOD_ID, SET_EFFECT_COUNTERS) ?? {};
  const activeUsers = game.settings.get(MOD_ID, SET_EFFECT_ACTIVE_USERS) ?? {};
  const maxPoints = game.settings.get(MOD_ID, SET_FULL_BAR_MAX_POINTS) || 30;
  
  counters[userId] = maxPoints;
  activeUsers[userId] = true;
  
  await game.settings.set(MOD_ID, SET_EFFECT_COUNTERS, counters);
  await game.settings.set(MOD_ID, SET_EFFECT_ACTIVE_USERS, activeUsers);
  
  // Trigger animation if enabled
  if (game.settings.get(MOD_ID, SET_USE_EFFECT_ANIMATION)) {
    triggerEffectAnimation(userId, currentTheme);
  }
  
  // Notify all clients
  const user = game.users.get(userId);
  ui.notifications?.info(`${effect.emoji} ${user?.name || 'Player'} is ${effect.activeText}! ${effect.emoji}`);
  
  // Broadcast the update to all clients immediately
  if (_socket && _socket.executeForEveryone) {
    _socket.executeForEveryone('broadcastEffectUpdate', userId, currentTheme);
  }
  
  console.log(`${MOD_ID}: [CRITICAL SUCCESS] User ${userId} set to maximum points (${maxPoints}) and activated`);
}

/**
 * Handles effect loss (GM only)
 * @param {string} userId - User ID
 * @param {string} currentTheme - Currently selected effect theme (e.g. 'fire', 'electric'), used for visual and notification purposes
 * @param {boolean} isFailure - If it was a failure
 * @param {boolean} isCriticalFailure - If it was a critical failure
 */
export async function handleEffectLossGM(userId, currentTheme, isFailure, isCriticalFailure) {
  userId = normalizeUserId(userId);
  
  if (isCriticalFailure) {
    // Critical failure - reset counter and remove active effect
    await clearUserEffectGM(userId, currentTheme);
  } else if (isFailure) {
    // Regular failure - check if active to determine point penalty
    const activeUsers = game.settings.get(MOD_ID, SET_EFFECT_ACTIVE_USERS) ?? {};
    const isActive = activeUsers[userId] ?? false;
    const maxPoints = game.settings.get(MOD_ID, SET_FULL_BAR_MAX_POINTS) || 30;
    const pointsPerIcon = maxPoints / 10;
    
    if (isActive) {
      // If active (10 icons) and fails, lose 7 icons in points
      const pointsToLose = Math.floor(7 * pointsPerIcon);
      await handleUpdateEffectCounterGM(userId, currentTheme, -pointsToLose);
    } else {
      // If not active and fails, lose 1 icon in points
      const pointsToLose = Math.floor(1 * pointsPerIcon);
      await handleUpdateEffectCounterGM(userId, currentTheme, -pointsToLose);
    }
  }
}

/**
 * Clears a specific effect for a user (GM only)
 * @param {string} userId - User ID
 * @param {string} currentTheme - Currently selected effect theme (e.g. 'fire', 'electric'), used for visual and notification purposes
 */
export async function clearUserEffectGM(userId, currentTheme) {
  userId = normalizeUserId(userId);
  
  // IMPORTANT: Points are UNIQUE per user, not separated by theme
  // Clear unique points and unique active status
  const counters = game.settings.get(MOD_ID, SET_EFFECT_COUNTERS) ?? {};
  const activeUsers = game.settings.get(MOD_ID, SET_EFFECT_ACTIVE_USERS) ?? {};
  
  delete counters[userId];
  delete activeUsers[userId];
  
  await game.settings.set(MOD_ID, SET_EFFECT_COUNTERS, counters);
  await game.settings.set(MOD_ID, SET_EFFECT_ACTIVE_USERS, activeUsers);
}

/* ---------------------- Player-facing functions ---------------------- */

/**
 * Applies roll outcome to user's effects - ENHANCED for immediate effect on critical success
 * @param {string} userId - User ID
 * @param {string} effectName - Effect name (e.g. 'fire', 'electric')
 * @param {boolean} isSuccess - If it was success
 * @param {boolean} isFailure - If it was failure
 * @param {boolean} isCriticalSuccess - If it was critical success
 * @param {boolean} isCriticalFailure - If it was critical failure
 * @param {HTMLElement} messageElement - The message element to apply immediate effects to
 */
export async function applyRollOutcomeToEffect(userId, effectName, isSuccess, isFailure, isCriticalSuccess, isCriticalFailure, messageElement = null) {
  userId = normalizeUserId(userId);
  
  const effect = getEffect(effectName);
  if (!effect) {
    return;
  }
  
  const maxPoints = game.settings.get(MOD_ID, SET_FULL_BAR_MAX_POINTS) || 30;
  const pointsPerIcon = maxPoints / 10;
  
  if (isCriticalSuccess) {
    // Critical success: go to 10 and activate effect
    await handleCriticalSuccess(userId, effectName);
    
    // CRITICAL FIX: Immediately apply effects to the current message if provided
    if (messageElement) {
      console.log(`${MOD_ID}: [CRITICAL SUCCESS] Immediately applying effects to message for user ${userId}`);
      setTimeout(() => {
        applyEffectToSpecificMessage(messageElement, userId, effectName);
        updateMessageSenderName(messageElement, userId);
      }, 50); // Reduced timeout for faster response
    }
  } else if (isCriticalFailure) {
    // Critical failure: reset counter and remove effect
    await handleEffectLoss(userId, effectName, false, true);
  } else if (isSuccess) {
    // Regular success: +1 point (3 successes = 1 icon)
    const pointsToAdd = 1;
    await updateEffectCounter(userId, effectName, pointsToAdd);
  } else if (isFailure) {
    // Regular failure: -1 or -7 icons in points depending on if active
    await handleEffectLoss(userId, effectName, true, false);
  }
}

/**
 * Updates effect counter (public function)
 * @param {string} userId - User ID
 * @param {string} currentTheme - Currently selected effect theme (e.g. 'fire', 'electric'), used for visual and notification purposes
 * @param {number} change - Change in points
 */
export async function updateEffectCounter(userId, currentTheme, change) {
  userId = normalizeUserId(userId);
  
  if (game.user.isGM) {
    return await handleUpdateEffectCounterGM(userId, currentTheme, change);
  } else {
    // Send request to GM via socketlib
    if (_socket && _socket.executeAsGM) {
      _socket.executeAsGM('updateEffectCounter', userId, currentTheme, change);
    }
    
    // Return current icon count for immediate feedback
    const counters = game.settings.get(MOD_ID, SET_EFFECT_COUNTERS) ?? {};
    const currentPoints = counters[userId] ?? 0;
    const maxPoints = game.settings.get(MOD_ID, SET_FULL_BAR_MAX_POINTS) || 30;
    const newPoints = Math.max(0, Math.min(maxPoints, currentPoints + change));
    return pointsToCounterIcons(newPoints);
  }
}

/**
 * Handles critical success (public function)
 * @param {string} userId - User ID
 * @param {string} currentTheme - Currently selected effect theme (e.g. 'fire', 'electric'), used for visual and notification purposes
 */
export async function handleCriticalSuccess(userId, currentTheme) {
  userId = normalizeUserId(userId);
  
  if (game.user.isGM) {
    await handleCriticalSuccessGM(userId, currentTheme);
  } else {
    if (_socket && _socket.executeAsGM) {
      _socket.executeAsGM('handleCriticalSuccess', userId, currentTheme);
    }
  }
}

/**
 * Handles effect loss (public function)
 * @param {string} userId - User ID
 * @param {string} currentTheme - Currently selected effect theme (e.g. 'fire', 'electric'), used for visual and notification purposes
 * @param {boolean} isFailure - If it was failure
 * @param {boolean} isCriticalFailure - If it was critical failure
 */
export async function handleEffectLoss(userId, currentTheme, isFailure, isCriticalFailure) {
  userId = normalizeUserId(userId);
  
  if (game.user.isGM) {
    await handleEffectLossGM(userId, currentTheme, isFailure, isCriticalFailure);
  } else {
    if (_socket && _socket.executeAsGM) {
      _socket.executeAsGM('handleEffectLoss', userId, currentTheme, isFailure, isCriticalFailure);
    }
  }
}

/**
 * Clears user effect (public function)
 * @param {string} userId - User ID
 * @param {string} currentTheme - Currently selected effect theme (e.g. 'fire', 'electric'), used for visual and notification purposes
 */
export async function clearUserEffect(userId, currentTheme) {
  userId = normalizeUserId(userId);
  
  if (game.user.isGM) {
    await clearUserEffectGM(userId, currentTheme);
  } else {
    if (_socket && _socket.executeAsGM) {
      _socket.executeAsGM('clearUserEffect', userId, currentTheme);
    }
  }
}

/* ---------------------- Effect Animation and Visual Management ---------------------- */

/**
 * Triggers animation for a specific effect
 * @param {string} userId - User ID
 * @param {string} currentTheme - Currently selected effect theme (e.g. 'fire', 'electric'), used for visual purposes
 */
export function triggerEffectAnimation(userId, currentTheme) {
  // Check both global and player settings for animations
  const globalAnimationEnabled = game.settings.get(MOD_ID, SET_USE_EFFECT_ANIMATION);
  const playerShowAnimations = game.settings.get(MOD_ID, SET_PLAYER_SHOW_ANIMATIONS);
  
  if (!globalAnimationEnabled || !playerShowAnimations) {
    return;
  }
  
  userId = normalizeUserId(userId);
  const user = game.users.get(userId);
  const effect = getEffect(currentTheme);
  
  if (!user || !effect) {
    return;
  }

  // Use socketlib to trigger visual effects on all clients
  if (_socket && _socket.executeForEveryone) {
    _socket.executeForEveryone('triggerVisualEffectForClient', userId, currentTheme);
  } else {
    applyEffectToUserMessages(userId, currentTheme);
  }
  
  ui.notifications?.info(`${effect.emoji} ${user.name} is ${effect.activeText}! ${effect.emoji}`, { permanent: false });
}

/**
 * Applies visual effects to a specific message
 * @param {HTMLElement} messageElement - Message DOM element
 * @param {string} userId - User ID
 * @param {string} effectName - Effect name
 */
export function applyEffectToSpecificMessage(messageElement, userId, effectName) {
  userId = normalizeUserId(userId);
  const user = game.users.get(userId);
  const effect = getEffect(effectName);
  
  if (!messageElement || !user || !effect) {
    return;
  }

  const effectEmojis = getEffectEmojis(userId, effectName);
  
  // Check both GM global settings AND player individual settings
  const globalIconsEnabled = game.settings.get(MOD_ID, SET_USE_EFFECT_ICONS);
  const globalAnimationEnabled = game.settings.get(MOD_ID, SET_USE_EFFECT_ANIMATION);
  const playerShowCounters = game.settings.get(MOD_ID, SET_PLAYER_SHOW_COUNTERS);
  const playerShowAnimations = game.settings.get(MOD_ID, SET_PLAYER_SHOW_ANIMATIONS);
  const playerHideEmojis = game.settings.get(MOD_ID, SET_PLAYER_HIDE_EFFECT_EMOJIS);
  
  // Final settings: GM must enable globally AND player must enable individually
  const useIcons = globalIconsEnabled && playerShowCounters && !playerHideEmojis;
  const useAnimation = globalAnimationEnabled && playerShowAnimations;
  
  const activeUsers = game.settings.get(MOD_ID, SET_EFFECT_ACTIVE_USERS) ?? {};
  const isActive = activeUsers[userId] ?? false;

  // Only apply effects if icons are enabled
  if (!useIcons) {
    // Remove any existing counters if icons are disabled
    effect.removeCounterFromMessage(messageElement);
    return;
  }

  const messageId = messageElement.getAttribute('data-message-id');
  
  // Handle emoji counter
  if (effectEmojis) {
    effect.addCounterToMessage(messageElement, effectEmojis);
  } else {
    effect.removeCounterFromMessage(messageElement);
  }
  
  // Handle visual effects only when user is active AND animation is enabled
  if (useAnimation && isActive && !messageElement.classList.contains(`grs-on-${effectName}-v10`)) {
    effect.applyVisualEffectsToMessage(messageElement, user.name);
  }
}

/**
 * Applies visual effects to all user messages (kept for compatibility with socketlib)
 * @param {string} userId - User ID
 * @param {string} effectName - Effect name
 */
export function applyEffectToUserMessages(userId, effectName) {
  userId = normalizeUserId(userId);
  const user = game.users.get(userId);
  const effect = getEffect(effectName);
  
  if (!user || !effect) {
    return;
  }

  const effectEmojis = getEffectEmojis(userId, effectName);
  
  // Check both GM global settings AND player individual settings
  const globalIconsEnabled = game.settings.get(MOD_ID, SET_USE_EFFECT_ICONS);
  const globalAnimationEnabled = game.settings.get(MOD_ID, SET_USE_EFFECT_ANIMATION);
  const playerShowCounters = game.settings.get(MOD_ID, SET_PLAYER_SHOW_COUNTERS);
  const playerShowAnimations = game.settings.get(MOD_ID, SET_PLAYER_SHOW_ANIMATIONS);
  const playerHideEmojis = game.settings.get(MOD_ID, SET_PLAYER_HIDE_EFFECT_EMOJIS);
  
  // Final settings: GM must enable globally AND player must enable individually
  const useIcons = globalIconsEnabled && playerShowCounters && !playerHideEmojis;
  const useAnimation = globalAnimationEnabled && playerShowAnimations;
  
  const activeUsers = game.settings.get(MOD_ID, SET_EFFECT_ACTIVE_USERS) ?? {};
  const isActive = activeUsers[userId] ?? false;

  // Only apply effects if icons are enabled
  if (!useIcons) {
    return;
  }

  const chatMessages = game.messages.filter(msg => {
    const msgUserId = normalizeUserId(msg.user ?? msg.userId);
    return msgUserId === userId;
  });

  chatMessages.forEach(message => {
    const messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
    if (messageElement) {
      applyEffectToSpecificMessage(messageElement, userId, effectName);
    }
  });
}

/* ---------------------- Settings Change Handler ---------------------- */

/**
 * Handles setting changes
 * @param {Object} setting - The setting that changed
 */
export function handleSettingChange(setting) {
  // Settings changes only affect new messages, not existing ones
  console.log(`${MOD_ID}: Setting changed: ${setting.key} - affects new messages only`);
}

/* ---------------------- Cleanup Functions ---------------------- */

/**
 * Clears all visual effects
 */
export function clearAllEffects() {
  const availableEffects = listAvailableEffects();
  availableEffects.forEach(effectName => {
    const effect = getEffect(effectName);
    if (effect && effect.clearEffects) {
      effect.clearEffects();
    }
  });
}