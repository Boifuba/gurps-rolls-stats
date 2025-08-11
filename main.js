// main.js - GURPS Roll Stats (v13) - Main module entry point
// Handles settings registration, UI integration, and roll logging

import { MOD_ID, SET_LOG, SET_ACTIVE, SET_USE_FIRE_ICONS, SET_USE_FIRE_ANIMATION, SET_FIRE_COUNTERS, SET_ONFIRE_USERS } from './constants.js';
import { showStatsDialog, showComparativeStatsDialog } from './statsDialog.js';
import { showSettingsDialog, exportChartAsPNG } from './settingsDialog.js';
import { isRollMessage, parseMessage } from './rollParser.js';
import { triggerOnFireAnimation } from './onFireEffects.js';

/* ---------------------- Helpers ---------------------- */

function injectControls(root) {
  try {
    const controlsRoot = root.querySelector?.("#chat-controls");
    if (!controlsRoot) return;

    const controlButtons = controlsRoot.querySelector(".control-buttons");
    if (!controlButtons) return;

    if (controlButtons.querySelector('[data-action="gurps-stats"]')) return;

    // Botão Stats
    const statsBtn = document.createElement("button");
    statsBtn.type = "button";
    statsBtn.className = "ui-control icon fa-solid fa-chart-simple";
    statsBtn.dataset.action = "gurps-stats";
    statsBtn.setAttribute("aria-label", "Open Statistics");
    statsBtn.setAttribute("title", "Open Statistics");
    statsBtn.setAttribute("data-tooltip", "Open Statistics");
    statsBtn.addEventListener("click", () => showStatsDialog());

    // Botão Toggle ON/OFF
    const isActive = game.settings.get(MOD_ID, SET_ACTIVE);
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = `ui-control icon fa-solid ${isActive ? "fa-record-vinyl" : "fa-pause"}`;
    toggleBtn.dataset.action = "gurps-logger-toggle";
    toggleBtn.setAttribute("aria-label", "Toggle Roll Logger");
    toggleBtn.setAttribute("title", isActive ? "Recording rolls - Click to pause" : "Recording paused - Click to resume");
    toggleBtn.setAttribute("data-tooltip", isActive ? "Recording rolls - Click to pause" : "Recording paused - Click to resume");

    toggleBtn.addEventListener("click", async () => {
      const next = !game.settings.get(MOD_ID, SET_ACTIVE);
      await game.settings.set(MOD_ID, SET_ACTIVE, next);

      toggleBtn.classList.remove("fa-record-vinyl", "fa-pause");
      toggleBtn.classList.add(next ? "fa-record-vinyl" : "fa-pause");
      const tip = next ? "Recording rolls - Click to pause" : "Recording paused - Click to resume";
      toggleBtn.setAttribute("title", tip);
      toggleBtn.setAttribute("data-tooltip", tip);

      ui.notifications?.info(`GURPS Roll Stats: ${next ? "ON" : "OFF"}`);
    });

    controlButtons.prepend(toggleBtn);
    controlButtons.prepend(statsBtn);
  } catch (err) {
    console.error(`${MOD_ID} injectControls error:`, err);
  }
}

/* ---------------------- User ID Utilities ---------------------- */

/**
 * Ensures we always get a clean string user ID
 * @param {string|User|Object} userId - User ID or User object
 * @returns {string} Clean string user ID
 */
function normalizeUserId(userId) {
  if (typeof userId === 'string') {
    return userId;
  }
  if (typeof userId === 'object' && userId !== null) {
    return userId.id || userId._id || String(userId);
  }
  return String(userId);
}

/**
 * Cleans up corrupted fire counter data with "[object Object]" keys
 */
async function cleanupCorruptedFireData() {
  const counters = game.settings.get(MOD_ID, SET_FIRE_COUNTERS) ?? {};
  const onFireUsers = game.settings.get(MOD_ID, SET_ONFIRE_USERS) ?? {};
  
  let countersChanged = false;
  let onFireChanged = false;
  
  // Check for corrupted keys in counters
  if (counters.hasOwnProperty('[object Object]')) {
    console.warn(`${MOD_ID}: Found corrupted fire counter data, cleaning up...`);
    delete counters['[object Object]'];
    countersChanged = true;
  }
  
  // Check for corrupted keys in onFire users
  if (onFireUsers.hasOwnProperty('[object Object]')) {
    console.warn(`${MOD_ID}: Found corrupted onFire user data, cleaning up...`);
    delete onFireUsers['[object Object]'];
    onFireChanged = true;
  }
  
  // Save cleaned data
  if (countersChanged) {
    await game.settings.set(MOD_ID, SET_FIRE_COUNTERS, counters);
  }
  if (onFireChanged) {
    await game.settings.set(MOD_ID, SET_ONFIRE_USERS, onFireUsers);
  }
  
  if (countersChanged || onFireChanged) {
    console.log(`${MOD_ID}: Corrupted fire data cleaned up successfully`);
    ui.notifications?.info("Fire system data cleaned up. Please recheck your fire status.");
  }
}

/* ---------------------- Fire System Helpers ---------------------- */

// GM-only functions that actually update the settings
async function handleUpdateFireCounterGM(userId, change) {
  userId = normalizeUserId(userId);
  console.log(`${MOD_ID}: [DEBUG] handleUpdateFireCounterGM - userId: ${userId}, change: ${change}`);
  
  const counters = game.settings.get(MOD_ID, SET_FIRE_COUNTERS) ?? {};
  const currentCount = counters[userId] ?? 0;
  const newCount = Math.max(0, Math.min(10, currentCount + change)); // Clamp entre 0 e 10
  
  console.log(`${MOD_ID}: [DEBUG] Fire counter update - currentCount: ${currentCount}, newCount: ${newCount}`);
  
  counters[userId] = newCount;
  await game.settings.set(MOD_ID, SET_FIRE_COUNTERS, counters);
  
  // Check if user reaches 10 fire icons (becomes "on fire")
  const onFireUsers = game.settings.get(MOD_ID, SET_ONFIRE_USERS) ?? {};
  const wasOnFire = onFireUsers[userId] ?? false;
  
  if (newCount === 10 && !wasOnFire) {
    console.log(`${MOD_ID}: [DEBUG] User ${userId} reached 10 fire icons, setting ON FIRE`);
    onFireUsers[userId] = true;
    await game.settings.set(MOD_ID, SET_ONFIRE_USERS, onFireUsers);
    
    // Trigger animation if enabled
    if (game.settings.get(MOD_ID, SET_USE_FIRE_ANIMATION)) {
      triggerOnFireAnimation(userId);
    }
    
    // Notify all clients about the "on fire" status
    const user = game.users.get(userId);
    ui.notifications?.info(`🔥 ${user?.name || 'Player'} is ON FIRE! 🔥`);
  } else if (newCount < 10 && wasOnFire) {
    console.log(`${MOD_ID}: [DEBUG] User ${userId} dropped below 10 fire icons, no longer ON FIRE`);
    // User dropped below 10, no longer on fire
    delete onFireUsers[userId];
    await game.settings.set(MOD_ID, SET_ONFIRE_USERS, onFireUsers);
  }
  
  return newCount;
}

async function handleCriticalSuccessGM(userId) {
  userId = normalizeUserId(userId);
  console.log(`${MOD_ID}: [DEBUG] handleCriticalSuccessGM - userId: ${userId}`);
  
  // Critical success: set to 10 (on fire)
  const counters = game.settings.get(MOD_ID, SET_FIRE_COUNTERS) ?? {};
  const onFireUsers = game.settings.get(MOD_ID, SET_ONFIRE_USERS) ?? {};
  
  counters[userId] = 10;
  onFireUsers[userId] = true;
  
  await game.settings.set(MOD_ID, SET_FIRE_COUNTERS, counters);
  await game.settings.set(MOD_ID, SET_ONFIRE_USERS, onFireUsers);
  
  console.log(`${MOD_ID}: [DEBUG] Critical success processed - user ${userId} is now ON FIRE`);
  
  // Trigger animation if enabled
  if (game.settings.get(MOD_ID, SET_USE_FIRE_ANIMATION)) {
    triggerOnFireAnimation(userId);
  }
  
  // Notify all clients about the "on fire" status
  const user = game.users.get(userId);
  ui.notifications?.info(`🔥 ${user?.name || 'Player'} is ON FIRE! 🔥`);
}

async function handleFireLossGM(userId, isFailure, isCriticalFailure) {
  userId = normalizeUserId(userId);
  console.log(`${MOD_ID}: [DEBUG] handleFireLossGM - userId: ${userId}, isFailure: ${isFailure}, isCriticalFailure: ${isCriticalFailure}`);
  
  const onFireUsers = game.settings.get(MOD_ID, SET_ONFIRE_USERS) ?? {};
  const isOnFire = onFireUsers[userId] ?? false;
  
  if (isCriticalFailure) {
    console.log(`${MOD_ID}: [DEBUG] Critical failure - clearing all fire for user ${userId}`);
    // Critical failure - zero all fire
    await clearUserFireGM(userId);
  } else if (isOnFire && isFailure) {
    console.log(`${MOD_ID}: [DEBUG] User ${userId} is on fire and failed - losing 5 fire icons`);
    // User is on fire and failed - lose 5 fire icons
    await handleUpdateFireCounterGM(userId, -5);
  } else if (isFailure) {
    console.log(`${MOD_ID}: [DEBUG] Regular failure for user ${userId} - losing 3 fire icons`);
    // Regular failure - lose 3 fire icons
    await handleUpdateFireCounterGM(userId, -3);
  }
}

async function clearUserFireGM(userId) {
  userId = normalizeUserId(userId);
  console.log(`${MOD_ID}: [DEBUG] clearUserFireGM - userId: ${userId}`);
  
  const counters = game.settings.get(MOD_ID, SET_FIRE_COUNTERS) ?? {};
  const onFireUsers = game.settings.get(MOD_ID, SET_ONFIRE_USERS) ?? {};
  
  counters[userId] = 0;
  delete onFireUsers[userId];
  
  await game.settings.set(MOD_ID, SET_FIRE_COUNTERS, counters);
  await game.settings.set(MOD_ID, SET_ONFIRE_USERS, onFireUsers);
  
  console.log(`${MOD_ID}: [DEBUG] Fire cleared for user ${userId}`);
}

async function updateRollLogGM(rollEntry) {
  const existingRolls =
    (foundry?.utils?.duplicate
      ? foundry.utils.duplicate(game.settings.get(MOD_ID, SET_LOG) ?? [])
      : structuredClone(game.settings.get(MOD_ID, SET_LOG) ?? []));
  existingRolls.push(rollEntry);
  await game.settings.set(MOD_ID, SET_LOG, existingRolls);
}

// Player-facing functions that either execute directly (if GM) or send socket requests
async function updateFireCounter(userId, change) {
  userId = normalizeUserId(userId);
  
  if (game.user.isGM) {
    return await handleUpdateFireCounterGM(userId, change);
  } else {
    // Send request to GM via socket
    game.socket.emit(`module.${MOD_ID}`, {
      action: "updateFireCounter",
      userId: userId,
      change: change
    });
    
    // Return current count for immediate feedback (may not be perfectly accurate)
    const counters = game.settings.get(MOD_ID, SET_FIRE_COUNTERS) ?? {};
    return Math.max(0, Math.min(10, (counters[userId] ?? 0) + change));
  }
}

async function handleCriticalSuccess(userId) {
  userId = normalizeUserId(userId);
  
  if (game.user.isGM) {
    await handleCriticalSuccessGM(userId);
  } else {
    // Send request to GM via socket
    game.socket.emit(`module.${MOD_ID}`, {
      action: "handleCriticalSuccess",
      userId: userId
    });
  }
}

async function handleFireLoss(userId, isFailure, isCriticalFailure) {
  userId = normalizeUserId(userId);
  
  if (game.user.isGM) {
    await handleFireLossGM(userId, isFailure, isCriticalFailure);
  } else {
    // Send request to GM via socket
    game.socket.emit(`module.${MOD_ID}`, {
      action: "handleFireLoss",
      userId: userId,
      isFailure: isFailure,
      isCriticalFailure: isCriticalFailure
    });
  }
}

async function clearUserFire(userId) {
  userId = normalizeUserId(userId);
  
  if (game.user.isGM) {
    await clearUserFireGM(userId);
  } else {
    // Send request to GM via socket
    game.socket.emit(`module.${MOD_ID}`, {
      action: "clearUserFire",
      userId: userId
    });
  }
}

/* ---------------------- Module Settings Registration ---------------------- */

Hooks.once("init", async () => {
  // Register socket listener for fire system updates (GM only)
  game.socket.on(`module.${MOD_ID}`, (data) => {
    if (!game.user.isGM) return; // Only GM processes these requests
    
    switch (data.action) {
      case "updateFireCounter":
        handleUpdateFireCounterGM(data.userId, data.change);
        break;
      case "handleCriticalSuccess":
        handleCriticalSuccessGM(data.userId);
        break;
      case "handleFireLoss":
        handleFireLossGM(data.userId, data.isFailure, data.isCriticalFailure);
        break;
      case "clearUserFire":
        clearUserFireGM(data.userId);
        break;
      case "updateRollLog":
        updateRollLogGM(data.rollEntry);
        break;
    }
  });

  // Roll log storage
  game.settings.register(MOD_ID, SET_LOG, {
    name: "Roll Log Data",
    scope: "world",
    config: false,
    type: Array,
    default: []
  });

  // Display Options
  game.settings.register(MOD_ID, "hide-gm-data", {
    name: "Hide GM Data",
    hint: "Don't show GM data in statistics",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(MOD_ID, "hide-chat-icons", {
    name: "Hide Chat Icons",
    hint: "Don't show icons in chat log",
    scope: "world", 
    config: true,
    type: Boolean,
    default: false
  });

  // Player Access
  game.settings.register(MOD_ID, "allow-players", {
    name: "Allow Players Access",
    hint: "Allow players to view the module",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Recorder ativo
  game.settings.register(MOD_ID, SET_ACTIVE, {
    name: "Logger active",
    scope: "world",
    config: false,
    type: Boolean,
    default: true
  });

  // Fire system settings
  game.settings.register(MOD_ID, SET_USE_FIRE_ICONS, {
    name: "Usar ícones on fire?",
    hint: "Exibe ícones de fogo para rolls críticos e especiais",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(MOD_ID, SET_USE_FIRE_ANIMATION, {
    name: "Usar animação onfire?",
    hint: "Ativa animações de fogo para rolls críticos e especiais",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // Fire system data storage
  game.settings.register(MOD_ID, SET_FIRE_COUNTERS, {
    name: "Fire Counters",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register(MOD_ID, SET_ONFIRE_USERS, {
    name: "OnFire Users",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  // (Opcional) ação rápida no menu para exportar PNG direto do painel de settings
  game.settings.registerMenu(MOD_ID, "export-png", {
    name: "Export PNG",
    label: "Export chart as PNG",
    hint: "Export current 3d6 distribution chart.",
    icon: "fa-solid fa-image",
    type: class extends FormApplication {
      async render() { await exportChartAsPNG(); this.close(); return this; }
    },
    restricted: false
  });

  // UI integration
  Hooks.on("renderChatLog", (_app, html) => {
    injectControls(html);
  });

  Hooks.on("renderChatInput", (app, elements) => {
    const root = elements?.root ?? app?.element ?? document;
    injectControls(root);
  });
});

/* ---------------------- Chat Commands ---------------------- */

Hooks.on("init", () => {
  Hooks.on("chatMessage", (chatLog, message) => {
    const rawMessage = String(message).trim();
    const command = rawMessage.toLowerCase();

    if (command === "/stats") {
      showStatsDialog();
      return false;
    }

    if (command === "/stats show") {
      showComparativeStatsDialog();
      return false;
    }

    if (command === "/stats reset") {
      game.settings.set(MOD_ID, SET_LOG, []).then(() => {
        ui.notifications?.info("Roll statistics cleared.");
        showStatsDialog();
      });
      return false;
    }

    if (command === "/stats settings") {
      showSettingsDialog();
      return false;
    }

    // Fire system commands
    if (command === "/fire reset") {
      if (game.user.isGM) {
        Promise.all([
          game.settings.set(MOD_ID, SET_FIRE_COUNTERS, {}),
          game.settings.set(MOD_ID, SET_ONFIRE_USERS, {})
        ]).then(() => {
          ui.notifications?.info("Fire counters reset for all users.");
        });
      } else {
        ui.notifications?.warn("Only GMs can reset fire counters.");
      }
      return false;
    }

    // Clean up corrupted fire data
    if (command === "/fire cleanup") {
      if (game.user.isGM) {
        cleanupCorruptedFireData();
      } else {
        ui.notifications?.warn("Only GMs can cleanup fire data.");
      }
      return false;
    }

    // Debug command to show all fire data
    if (command === "/fire debug") {
      if (game.user.isGM) {
        const counters = game.settings.get(MOD_ID, SET_FIRE_COUNTERS) ?? {};
        const onFireUsers = game.settings.get(MOD_ID, SET_ONFIRE_USERS) ?? {};
        
        console.log(`${MOD_ID}: [DEBUG] All fire counters:`, counters);
        console.log(`${MOD_ID}: [DEBUG] All onFire users:`, onFireUsers);
        
        const message = `Fire Debug:\nCounters: ${JSON.stringify(counters, null, 2)}\nOnFire: ${JSON.stringify(onFireUsers, null, 2)}`;
        ui.notifications?.info("Fire debug info logged to console.");
        
        // Also send to chat for easier reading
        ChatMessage.create({
          content: `<pre>${message}</pre>`,
          speaker: ChatMessage.getSpeaker()
        });
      } else {
        ui.notifications?.warn("Only GMs can access debug commands.");
      }
      return false;
    }

    // Fire system test commands
    if (command.startsWith("/fire add")) {
      if (game.user.isGM) {
        const parts = command.split(" ");
        const amount = parseInt(parts[2]) || 1;
        updateFireCounter(game.user.id, amount).then((newCount) => {
          ui.notifications?.info(`Added ${amount} fire icon(s). Current total: ${newCount}`);
        });
      } else {
        ui.notifications?.warn("Only GMs can add fire counters.");
      }
      return false;
    }

    if (command === "/fire test") {
      if (game.user.isGM) {
        handleCriticalSuccess(game.user.id).then(() => {
          ui.notifications?.info("Set current user to ON FIRE for testing!");
        });
      } else {
        ui.notifications?.warn("Only GMs can test fire effects.");
      }
      return false;
    }

    if (command === "/fire status") {
      const counters = game.settings.get(MOD_ID, SET_FIRE_COUNTERS) ?? {};
      const onFireUsers = game.settings.get(MOD_ID, SET_ONFIRE_USERS) ?? {};
      const myCount = counters[game.user.id] ?? 0;
      const amOnFire = onFireUsers[game.user.id] ?? false;
      
      console.log(`${MOD_ID}: [DEBUG] Fire status check - counters:`, counters);
      console.log(`${MOD_ID}: [DEBUG] Fire status check - onFireUsers:`, onFireUsers);
      console.log(`${MOD_ID}: [DEBUG] Fire status check - myCount: ${myCount}, amOnFire: ${amOnFire}`);
      
      ui.notifications?.info(`Your fire status: ${myCount} icons${amOnFire ? ' (ON FIRE!)' : ''}`);
      return false;
    }
    return true;
  });
});

/* ---------------------- Roll Logging with Fire System ---------------------- */

Hooks.on("ready", () => {
  // Clean up any corrupted fire data on startup
  if (game.user.isGM) {
    cleanupCorruptedFireData();
  }
  
  Hooks.on("createChatMessage", async (message) => {
    try {
      if (!game.settings.get(MOD_ID, SET_ACTIVE)) return;
      if (!isRollMessage(message)) return;

      const parsedEntry = parseMessage(message);
      if (!parsedEntry) return;

      // Store the roll data
      if (game.user.isGM) {
        await updateRollLogGM(parsedEntry);
      } else {
        // Send request to GM via socket
        game.socket.emit(`module.${MOD_ID}`, {
          action: "updateRollLog",
          rollEntry: parsedEntry
        });
      }

      // Handle fire system if enabled
      if (game.settings.get(MOD_ID, SET_USE_FIRE_ICONS)) {
        let userId = message.user ?? message.userId;
        userId = normalizeUserId(userId); // Normalize to string
        
        console.log(`${MOD_ID}: [DEBUG] Processing fire system for normalized userId: ${userId}`);
        
        const isSuccess = parsedEntry.success === true;
        const isFailure = parsedEntry.success === false;
        const isCriticalSuccess = /Critical\s+Success!/i.test(parsedEntry.text || "");
        const isCriticalFailure = /Critical\s+Failure!/i.test(parsedEntry.text || "");

        if (isCriticalSuccess) {
          console.log(`${MOD_ID}: [DEBUG] Critical success detected for user ${userId}`);
          // Critical success: go to 10 (on fire)
          await handleCriticalSuccess(userId);
        } else if (isSuccess) {
          console.log(`${MOD_ID}: [DEBUG] Regular success detected for user ${userId}`);
          // Regular success: +1 fire icon
          await updateFireCounter(userId, 1);
        } else if (isFailure) {
          console.log(`${MOD_ID}: [DEBUG] Failure detected for user ${userId} (critical: ${isCriticalFailure})`);
          // Handle failure (regular or critical)
          await handleFireLoss(userId, isFailure, isCriticalFailure);
        }
      }
    } catch (error) {
      console.error(`${MOD_ID} message parsing error:`, error);
    }
  });
});