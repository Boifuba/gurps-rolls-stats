// main.js - GURPS Roll Stats (v13) - Main module entry point
// Handles settings registration, UI integration, and roll logging

import { MOD_ID, SET_LOG, SET_ACTIVE } from './constants.js';
import { showStatsDialog, showComparativeStatsDialog } from './statsDialog.js';
import { showSettingsDialog } from './settingsDialog.js';
import { isRollMessage, parseMessage } from './rollParser.js';

/* ---------------------- Helpers ---------------------- */

function injectControls(root) {
  try {
    // root é um HTMLElement (v13)
    const controlsRoot = root.querySelector?.("#chat-controls");
    if (!controlsRoot) return;

    const controlButtons = controlsRoot.querySelector(".control-buttons");
    if (!controlButtons) return;

    // evita duplicar
    if (controlButtons.querySelector('[data-action="gurps-stats"]')) return;

    // ----- Botão Stats -----
    const statsBtn = document.createElement("button");
    statsBtn.type = "button";
    statsBtn.className = "ui-control icon fa-solid fa-chart-simple";
    statsBtn.dataset.action = "gurps-stats";
    statsBtn.setAttribute("aria-label", "Open Statistics");
    statsBtn.setAttribute("title", "Open Statistics");
    statsBtn.setAttribute("data-tooltip", "Open Statistics");
    statsBtn.addEventListener("click", () => showStatsDialog());

    // ----- Botão Toggle ON/OFF -----
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

    // coloca antes dos nativos (muda para append() se quiser depois)
    controlButtons.prepend(toggleBtn);
    controlButtons.prepend(statsBtn);
  } catch (err) {
    console.error(`${MOD_ID} injectControls error:`, err);
  }
}

/* ---------------------- Module Settings Registration ---------------------- */

Hooks.once("init", async () => {
  // Roll log storage (world, hidden)
  game.settings.register(MOD_ID, SET_LOG, {
    name: "Roll Log Data",
    scope: "world",
    config: false,
    type: Array,
    default: []
  });

  // Active toggle (world, visible)
  game.settings.register(MOD_ID, SET_ACTIVE, {
    name: "Logger Active",
    hint: "Enable or disable roll statistics logging",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
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

  // Export Settings
  game.settings.register(MOD_ID, "export-format", {
    name: "Export Format",
    hint: "Choose the default export format for charts",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "png": "PNG Image",
      "csv": "CSV Data",
      "json": "JSON Data"
    },
    default: "png"
  });

  game.settings.register(MOD_ID, "chart-theme", {
    name: "Chart Theme",
    hint: "Choose the chart color theme",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "foundry": "Foundry Colors",
      "classic": "Classic Blue",
      "dark": "Dark Theme",
      "colorful": "Colorful"
    },
    default: "foundry"
  });

  // Chat commands
  Hooks.on("chatMessage", (chatLog, message) => {
    const rawMessage = String(message).trim();
    const command = rawMessage.toLowerCase();

    if (command === "/stats") {
      showStatsDialog();
      return false; // não mostra no chat
    }

    if (command === "/stats show") {
      showComparativeStatsDialog();
      return false; // não mostra no chat
    }

    if (command === "/stats reset") {
      game.settings.set(MOD_ID, SET_LOG, []).then(() => {
        ui.notifications?.info("Roll statistics cleared.");
        showStatsDialog();
      });
      return false; // não mostra no chat
    }

    if (command === "/stats settings") {
      showSettingsDialog();
      return false; // não mostra no chat
    }

    return true;
  });

  /* -------- UI integration (registra CEDO no v13) -------- */

  // v13: html é HTMLElement
  Hooks.on("renderChatLog", (_app, html /* HTMLElement */) => {
    injectControls(html);
  });

  // O chat às vezes move/repinta os controles — garante reinjeção
  Hooks.on("renderChatInput", (app, elements /* {root?: HTMLElement} */) => {
    const root = elements?.root ?? app?.element ?? document;
    injectControls(root);
  });
});

/* ---------------------- Roll Logging ---------------------- */

Hooks.on("ready", () => {
  Hooks.on("createChatMessage", async (message) => {
    try {
      // Ativo?
      if (!game.settings.get(MOD_ID, SET_ACTIVE)) return;

      // É mensagem de rolagem válida?
      if (!isRollMessage(message)) return;

      // Parse
      const parsedEntry = parseMessage(message);
      if (!parsedEntry) return;

      // Push no storage
      const existingRolls =
        (foundry?.utils?.duplicate
          ? foundry.utils.duplicate(game.settings.get(MOD_ID, SET_LOG) ?? [])
          : structuredClone(game.settings.get(MOD_ID, SET_LOG) ?? []));
      existingRolls.push(parsedEntry);

      await game.settings.set(MOD_ID, SET_LOG, existingRolls);
    } catch (error) {
      console.error(`${MOD_ID} message parsing error:`, error);
    }
  });
});