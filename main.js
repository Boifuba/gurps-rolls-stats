// main.js - GURPS Roll Stats (v13) - Main module entry point
// Handles settings registration, UI integration, and roll logging

import { MOD_ID, SET_LOG, SET_ACTIVE, SET_USE_EFFECT_ICONS, SET_USE_EFFECT_ANIMATION, SET_EFFECT_COUNTERS, SET_EFFECT_ACTIVE_USERS, SET_EFFECT_THEME, SET_PLAYER_SHOW_COUNTERS, SET_PLAYER_SHOW_ANIMATIONS } from './constants.js';
import { SET_PLAYER_SHOW_CHAT_CONTROLS, SET_PLAYER_PAUSE_ROLLS, SET_PLAYER_HIDE_EFFECT_EMOJIS, SET_FULL_BAR_MAX_POINTS, SET_GLOBAL_ACTIVE_TEXT_FALLBACK, SET_PLAYER_UI_CUSTOM_TEXT, USER_CUSTOM_ACTIVE_TEXT_FLAG_KEY, SET_DAMAGE_LOG, SET_FATIGUE_LOG } from './constants.js';
import { showStatsDialog, showComparativeStatsDialog } from './statsDialog.js';
import { showSettingsDialog, exportChartAsPNG } from './settingsDialog.js';
import { isRollMessage, parseMessage } from './rollParser.js';
import * as effectManager from './effectManager.js';
import * as attributesTracking from './attributesTracking.js';

// Module-level socket instance
let gurpsRollStatsSocket = null;

/* ---------------------- Helpers ---------------------- */

function injectControls(root) {
  try {
    // Check if user wants to show chat controls (applies to both GM and players)
    if (!game.settings.get(MOD_ID, SET_PLAYER_SHOW_CHAT_CONTROLS)) {
      return;
    }

    // Try multiple selectors to find the chat controls area
    let controlsRoot = root.querySelector?.("#chat-controls");
    
    // Fallback: try to find it in the document if not found in root
    if (!controlsRoot) {
      controlsRoot = document.querySelector("#chat-controls");
    }
    
    // Another fallback: try to find the chat form area
    if (!controlsRoot) {
      controlsRoot = root.querySelector?.("#chat-form");
      if (!controlsRoot) {
        controlsRoot = document.querySelector("#chat-form");
      }
    }
    
    if (!controlsRoot) return;

    // Try to find control-buttons, or create it if it doesn't exist
    let controlButtons = controlsRoot.querySelector(".control-buttons");
    
    if (!controlButtons) {
      // Try alternative selectors
      controlButtons = controlsRoot.querySelector(".flexrow");
      if (!controlButtons) {
        controlButtons = controlsRoot.querySelector("button")?.parentElement;
      }
      
      // If still not found, create the control buttons container
      if (!controlButtons) {
        controlButtons = document.createElement("div");
        controlButtons.className = "control-buttons flexrow";
        controlsRoot.appendChild(controlButtons);
      }
    }

    if (controlButtons.querySelector('[data-action="gurps-stats"]')) return;

    // Stats Button
    const statsBtn = document.createElement("button");
    statsBtn.type = "button";
    statsBtn.className = "ui-control icon fa-solid fa-chart-simple";
    statsBtn.dataset.action = "gurps-stats";
    statsBtn.setAttribute("aria-label", "Open Statistics");
    statsBtn.setAttribute("title", "Open Statistics");
    statsBtn.setAttribute("data-tooltip", "Open Statistics");
    statsBtn.addEventListener("click", () => showStatsDialog());

    // Toggle ON/OFF Button - Different behavior for GM vs Players
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.dataset.action = "gurps-logger-toggle";
    
    let isRecording, titleText, tooltipText;
    
    if (game.user.isGM) {
      // GM controls global recording
      isRecording = game.settings.get(MOD_ID, SET_ACTIVE);
      titleText = isRecording ? "Global recording ON - Click to pause all" : "Global recording OFF - Click to resume all";
      tooltipText = titleText;
    } else {
      // Players control their own recording (only if global is active)
      const globalActive = game.settings.get(MOD_ID, SET_ACTIVE);
      const playerPaused = game.settings.get(MOD_ID, SET_PLAYER_PAUSE_ROLLS);
      isRecording = globalActive && !playerPaused;
      
      if (!globalActive) {
        titleText = "Recording disabled by GM";
        tooltipText = titleText;
      } else {
        titleText = playerPaused ? "Your rolls paused - Click to resume" : "Recording your rolls - Click to pause";
        tooltipText = titleText;
      }
    }
    
    toggleBtn.className = `ui-control icon fa-solid ${isRecording ? "fa-record-vinyl" : "fa-pause"}`;
    toggleBtn.setAttribute("aria-label", "Toggle Roll Logger");
    toggleBtn.setAttribute("title", titleText);
    toggleBtn.setAttribute("data-tooltip", tooltipText);

    toggleBtn.addEventListener("click", async () => {
      if (game.user.isGM) {
        // GM toggles global recording
        const next = !game.settings.get(MOD_ID, SET_ACTIVE);
        await game.settings.set(MOD_ID, SET_ACTIVE, next);
        
        toggleBtn.classList.remove("fa-record-vinyl", "fa-pause");
        toggleBtn.classList.add(next ? "fa-record-vinyl" : "fa-pause");
        const tip = next ? "Global recording ON - Click to pause all" : "Global recording OFF - Click to resume all";
        toggleBtn.setAttribute("title", tip);
        toggleBtn.setAttribute("data-tooltip", tip);
        
        ui.notifications?.info(`GURPS Roll Stats (Global): ${next ? "ON" : "OFF"}`);
      } else {
        // Player toggles their own recording
        const globalActive = game.settings.get(MOD_ID, SET_ACTIVE);
        if (!globalActive) {
          ui.notifications?.warn("Recording is disabled by GM");
          return;
        }
        
        const currentPlayerPaused = game.settings.get(MOD_ID, SET_PLAYER_PAUSE_ROLLS);
        const nextPlayerPaused = !currentPlayerPaused;
        await game.settings.set(MOD_ID, SET_PLAYER_PAUSE_ROLLS, nextPlayerPaused);
        
        const isNowRecording = !nextPlayerPaused;
        toggleBtn.classList.remove("fa-record-vinyl", "fa-pause");
        toggleBtn.classList.add(isNowRecording ? "fa-record-vinyl" : "fa-pause");
        const tip = nextPlayerPaused ? "Your rolls paused - Click to resume" : "Recording your rolls - Click to pause";
        toggleBtn.setAttribute("title", tip);
        toggleBtn.setAttribute("data-tooltip", tip);
        
        ui.notifications?.info(`Your Roll Recording: ${isNowRecording ? "ON" : "OFF"}`);
      }
    });

    controlButtons.prepend(toggleBtn);
    controlButtons.prepend(statsBtn);
  } catch (err) {
    console.error(`${MOD_ID} injectControls error:`, err);
  }

}

async function updateRollLogGM(rollEntry) {
  const existingRolls =
    (foundry?.utils?.duplicate
      ? foundry.utils.duplicate(game.settings.get(MOD_ID, SET_LOG) ?? [])
      : structuredClone(game.settings.get(MOD_ID, SET_LOG) ?? []));
  existingRolls.push(rollEntry);
  await game.settings.set(MOD_ID, SET_LOG, existingRolls);
}

/* ---------------------- Module Settings Registration ---------------------- */

Hooks.once("init", async () => {
  // Register socketlib handlers
  Hooks.once("socketlib.ready", () => {
    // Register socket handlers for effect system and get the socket instance
    const socketlibModule = game.modules.get('socketlib');
    if (socketlibModule) {
      gurpsRollStatsSocket = socketlibModule.registerModule(MOD_ID, {
        // GM-only handlers for data updates
        updateEffectCounter: effectManager.handleUpdateEffectCounterGM,
        handleCriticalSuccess: effectManager.handleCriticalSuccessGM,
        handleEffectLoss: effectManager.handleEffectLossGM,
        clearUserEffect: effectManager.clearUserEffectGM,
        updateRollLog: updateRollLogGM,
        updateDamageLog: attributesTracking.updateDamageLogGM,
        updateFatigueLog: attributesTracking.updateFatigueLogGM,
        
        // Client handler for visual effects (executed on all clients)
        triggerVisualEffectForClient: (userId, effectName) => {
          // Only show notification, don't re-apply effects to old messages
          const user = game.users.get(userId);
          const effect = effectManager.getEffect(effectName);
          if (user && effect) {
            // Only show notification, don't re-apply effects to old messages
            const user = game.users.get(userId);
            const effect = effectManager.getEffect(effectName);
            if (user && effect) {
              ui.notifications?.info(`${effect.emoji} ${user.name} is ${effect.activeText}! ${effect.emoji}`, { permanent: false });
            }
          }
        },
        
        // Broadcast setting changes to all clients
        broadcastEffectUpdate: (userId, effectName) => {
          // Settings updates no longer re-apply effects to old messages
        }
      });
      
      // Provide the socket instance to effectManager and attributesTracking
      effectManager.setSocketLibInstance(gurpsRollStatsSocket);
      attributesTracking.setSocketLibInstance(gurpsRollStatsSocket);
    } else {
      console.error(`${MOD_ID}: SocketLib module not found!`);
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

  // Damage tracking storage
  game.settings.register(MOD_ID, SET_DAMAGE_LOG, {
    name: "Damage Log Data",
    scope: "world",
    config: false,
    type: Array,
    default: []
  });

  // Fatigue tracking storage
  game.settings.register(MOD_ID, SET_FATIGUE_LOG, {
    name: "Fatigue Log Data",
    scope: "world",
    config: false,
    type: Array,
    default: []
  });

  // Register all settings
  registerSettings();

  // Export PNG menu
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

/* ---------------------- Settings Registration Helper ---------------------- */

function registerSettings() {
  // ==================== GM CONFIGURATION ====================
  
  // Display Options
  game.settings.register(MOD_ID, "hide-gm-data", {
    name: "Hide GM Data",
    hint: "Don't show GM data in statistics",
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

  // Global Recording Control
  game.settings.register(MOD_ID, SET_ACTIVE, {
    name: "Global Recording Active",
    hint: "Enable/disable roll recording globally (GM control)",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Effect System - Global Controls
  game.settings.register(MOD_ID, SET_USE_EFFECT_ICONS, {
    name: "Enable Counter (GM)",
    hint: "Enable the counter system globally (GM setting)",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MOD_ID, SET_USE_EFFECT_ANIMATION, {
    name: "Enable Animation Effects (GM)",
    hint: "Enable visual animations globally (GM setting)",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Effect Theme Selection
  game.settings.register(MOD_ID, SET_EFFECT_THEME, {
    name: "Effect Theme",
    hint: "Choose between fire or electric effects for the 'on fire' system",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "fire": "Fire 🔥",
      "electric": "Electric ⚡"
    },
    default: "fire"
  });

  // Full Bar System Configuration
  game.settings.register(MOD_ID, SET_FULL_BAR_MAX_POINTS, {
    name: "Full Bar Maximum Points",
    hint: "Maximum points for the full bar system (counters show proportionally from 0-10)",
    scope: "world",
    config: true,
    type: Number,
    default: 30,
    range: {
      min: 10,
      max: 100,
      step: 1
    }
  });

  // Custom Active Text - WORLD SCOPE so everyone sees the change
  game.settings.register(MOD_ID, SET_GLOBAL_ACTIVE_TEXT_FALLBACK, {
    name: "Global Active Text (GM Fallback)",
    hint: "Default active text for all players who haven't set their own (use 'X' as placeholder for name). Example: 'X IS AWESOME' becomes 'PlayerName IS AWESOME'",
    scope: "world",
    config: true,
    type: String,
    default: "X IS ON FIRE",
    onChange: () => {
      // Text changes only affect new messages, not existing ones
    }
  });
  
  // ==================== USER CONFIGURATION ====================
  
  // Player's Personal Custom Active Text
  game.settings.register(MOD_ID, SET_PLAYER_UI_CUSTOM_TEXT, {
    name: "My Personal Active Text",
    hint: "Your personal active text that everyone will see when you're active (use 'X' as placeholder for your name). Leave empty to use GM's default. Example: 'X IS AWESOME' becomes 'YourName IS AWESOME'",
    scope: "client",
    config: true,
    type: String,
    default: "",
    onChange: async (newValue) => {
      try {
        // Store the custom text in the user's flag so all clients can see it
        await game.user.setFlag(MOD_ID, USER_CUSTOM_ACTIVE_TEXT_FLAG_KEY, newValue);
        
        // Text changes only affect new messages, not existing ones
      } catch (e) {
        console.error(`${MOD_ID}: Error setting user flag for custom text:`, e);
        ui.notifications?.error("Failed to save custom active text");
      }
    }
  });
  
  game.settings.register(MOD_ID, SET_PLAYER_SHOW_COUNTERS, {
    name: "Show Counters",
    hint: "Show counter icons on chat messages (personal setting)",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MOD_ID, SET_PLAYER_SHOW_ANIMATIONS, {
    name: "Show Animation Effects",
    hint: "Show visual animation effects (personal setting)",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MOD_ID, SET_PLAYER_SHOW_CHAT_CONTROLS, {
    name: "Show Chat Controls",
    hint: "Show statistics and recording buttons in chat (personal setting)",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MOD_ID, SET_PLAYER_HIDE_EFFECT_EMOJIS, {
    name: "Hide Effect Emojis",
    hint: "Hide effect emojis on chat messages (personal setting) - counting continues in background",
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });

  // ==================== INTERNAL DATA STORAGE ====================
  
  // Player Pause Control (internal, controlled via chat button)
  game.settings.register(MOD_ID, SET_PLAYER_PAUSE_ROLLS, {
    name: "Pause My Rolls",
    hint: "Pause recording of your own rolls (controlled via chat button)",
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });

  // Effect system data storage (internal)
  game.settings.register(MOD_ID, SET_EFFECT_COUNTERS, {
    name: "Effect Counters Data",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register(MOD_ID, SET_EFFECT_ACTIVE_USERS, {
    name: "Active Effect Users Data",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });
}

/* ---------------------- Chat Commands ---------------------- */

Hooks.on("init", () => {
  Hooks.on("chatMessage", (chatLog, message) => {
    const rawMessage = String(message).trim();
    const command = rawMessage.toLowerCase();

    if (command === "/stats") {
      showStatsDialog();
      return false;
    }

    if (command === "/stats reset") {
      effectManager.completeModuleReset();
      return false;
    }

    if (command === "/stats settings") {
      showSettingsDialog();
      return false;
    }

    // NEW COMMAND: Complete module reset
    if (command === "/stats fullreset" || command === "/stats resetall") {
      effectManager.completeModuleReset();
      return false;
    }

    // REMOVED: Custom text command - now handled by settings
  });
});

/* ---------------------- Roll Logging with Effect System ---------------------- */

Hooks.on("ready", () => {
  // Clean up any corrupted effect data on startup
  if (game.user.isGM) {
    effectManager.cleanupCorruptedEffectData();
  }
  Hooks.on("createChatMessage", async (message) => {
    try {
      // Check global recording state
      const globalActive = game.settings.get(MOD_ID, SET_ACTIVE);
      if (!globalActive) {
        return;
      }
      
      // Check individual player recording state (only for non-GM users)
      const playerPaused = game.settings.get(MOD_ID, SET_PLAYER_PAUSE_ROLLS);
      if (!game.user.isGM && playerPaused) {
        return;
      }
      
      // Check if this is a roll message
      const isRoll = isRollMessage(message);
      if (!isRoll) {
        return;
      }

      // Parse the message
      const parsedEntry = parseMessage(message);
      if (!parsedEntry) {
        return;
      }

      // Skip effect processing for blind rolls (but still log the roll data)
      const isBlindRoll = message.blind === true;

      // Store the roll data
      if (game.user.isGM) {
        await updateRollLogGM(parsedEntry);
      } else {
        // Send request to GM via socketlib
        if (gurpsRollStatsSocket && gurpsRollStatsSocket.executeAsGM) {
          gurpsRollStatsSocket.executeAsGM('updateRollLog', parsedEntry);
        } else {
          console.warn(`${MOD_ID}: SocketLib not available for updateRollLog`);
        }
      }

      // Handle effect system if enabled (skip for blind rolls)
      const globalIconsEnabled = game.settings.get(MOD_ID, SET_USE_EFFECT_ICONS);
      const playerShowCounters = game.settings.get(MOD_ID, SET_PLAYER_SHOW_COUNTERS);
      
      if (globalIconsEnabled && playerShowCounters && !isBlindRoll) {
        let userId = message.user ?? message.userId;
        userId = effectManager.normalizeUserId(userId); // Normalize to string
        const isSuccess = parsedEntry.success === true;
        const isFailure = parsedEntry.success === false;
        const isCriticalSuccess = parsedEntry.isCritSuccess;
        const isCriticalFailure = parsedEntry.isCritFailure;


        // Get current effect theme
        const currentEffectTheme = game.settings.get(MOD_ID, SET_EFFECT_THEME) || 'fire';
        
        // CRITICAL FIX: Get message element immediately for critical success
        let messageElement = null;
        if (isCriticalSuccess) {
          // Wait a bit for the message to be rendered in DOM
          setTimeout(() => {
            messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
            if (messageElement) {
              // Apply roll outcome with immediate message element for critical success
              effectManager.applyRollOutcomeToEffect(userId, currentEffectTheme, isSuccess, isFailure, isCriticalSuccess, isCriticalFailure, messageElement);
            } else {
              // Fallback without message element
              effectManager.applyRollOutcomeToEffect(userId, currentEffectTheme, isSuccess, isFailure, isCriticalSuccess, isCriticalFailure);
            }
          }, 50);
        } else {
          // For non-critical success rolls, use normal processing
          await effectManager.applyRollOutcomeToEffect(userId, currentEffectTheme, isSuccess, isFailure, isCriticalSuccess, isCriticalFailure);
        }
        
        // Apply effects to the current message for all roll types
        if (!isCriticalSuccess) {
          setTimeout(() => {
            const messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
            if (messageElement) {
              effectManager.applyEffectToSpecificMessage(messageElement, userId, currentEffectTheme);
            } else {
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error(`${MOD_ID} message parsing error:`, error);
    }
  });

  // Handle new messages being rendered in chat - NOW WITH STYLED NAMES
  Hooks.on("renderChatMessage", (message, html) => {
    try {
      // Change user name in chat when effect is active
      let userId = message.message?.user ?? message.message?.userId ?? message.user ?? message.userId;
      if (!userId) return;
      
      userId = effectManager.normalizeUserId(userId);
      
      // Update the sender name with styled name
      effectManager.updateMessageSenderName(html[0], userId);
      
    } catch (error) {
      console.error(`${MOD_ID} renderChatMessage error:`, error);
    }
  });

  // Monitor setting changes to apply/remove effects
  Hooks.on("updateSetting", (setting) => {
    // Only handle our module's settings
    if (setting.key.startsWith(`${MOD_ID}.`)) {
    effectManager.handleSettingChange(setting);
    }
  });

});