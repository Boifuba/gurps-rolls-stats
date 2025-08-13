// settingsDialog.js - Settings dialog UI for GURPS Roll Stats module configuration
import { MOD_ID, SET_LOG, SET_USE_EFFECT_ICONS, SET_USE_EFFECT_ANIMATION } from './constants.js';
import { exportChartAsPNG as exportChart } from './chartUtils.js';

/**
 * Renders the settings dialog HTML content
 * @returns {string} HTML content for the settings dialog
 */
function renderSettingsDialog() {
  return `
    <style>
      .grs-settings-container {
        padding: 1rem;
        max-width: 500px;
        display: grid;
        gap: 1.5rem;
      }
      
      .grs-settings-section {
        border: 1px solid var(--color-border, #ccc);
        border-radius: 6px;
        padding: 1rem;
        background: var(--color-bg-option, #f8f9fa);
      }
      
      .grs-settings-title {
        margin: 0 0 1rem 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--color-text-highlight, #4aa);
        border-bottom: 1px solid var(--color-border, #ccc);
        padding-bottom: 0.5rem;
      }
      
      .grs-checkbox-group {
        display: grid;
        gap: 0.75rem;
      }
      
      .grs-checkbox-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .grs-checkbox-item input[type="checkbox"] {
        width: 16px;
        height: 16px;
        margin: 0;
      }
      
      .grs-checkbox-item label {
        margin: 0;
        cursor: pointer;
        user-select: none;
      }
      
      .grs-export-section {
        text-align: center;
      }
      
      .grs-export-btn {
        padding: 0.75rem 1.5rem;
        border: 1px solid var(--color-border, #888);
        border-radius: 6px;
        cursor: pointer;
        background: var(--color-control-bg, #f5f5f5);
        font-size: 1rem;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.2s ease;
      }
      
      .grs-export-btn:hover {
        background: var(--color-control-bg-hover, #eee);
        transform: translateY(-1px);
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      }
      
      .grs-export-btn:active {
        transform: translateY(0);
      }
    </style>
    
    <div class="grs-settings-container">
      <div class="grs-settings-section">
        <h3 class="grs-settings-title">
          <i class="fa-solid fa-eye-slash"></i> Display Options
        </h3>
        <div class="grs-checkbox-group">
          <div class="grs-checkbox-item">
            <input type="checkbox" id="grs-hide-gm-data" />
            <label for="grs-hide-gm-data">Don't show GM data in statistics</label>
          </div>
          <div class="grs-checkbox-item">
            <input type="checkbox" id="grs-hide-chat-icons" />
            <label for="grs-hide-chat-icons">Don't show icons in chat log</label>
          </div>
        </div>
      </div>
      
      <div class="grs-settings-section">
        <h3 class="grs-settings-title">
          <i class="fa-solid fa-fire"></i> On Fire System
        </h3>
        <div class="grs-checkbox-group">
          <div class="grs-checkbox-item">
            <input type="checkbox" id="grs-use-fire-icons" />
            <label for="grs-use-fire-icons">Show fire icons in chat (🔥)</label>
          </div>
          <div class="grs-checkbox-item">
            <input type="checkbox" id="grs-use-fire-animation" />
            <label for="grs-use-fire-animation">Enable "On Fire" animations</label>
          </div>
        </div>
      </div>
      
      <div class="grs-settings-section">
        <h3 class="grs-settings-title">
          <i class="fa-solid fa-users"></i> Player Access
        </h3>
        <div class="grs-checkbox-group">
          <div class="grs-checkbox-item">
            <input type="checkbox" id="grs-allow-players" />
            <label for="grs-allow-players">Allow players to view the module</label>
          </div>
        </div>
      </div>

      <div class="grs-export-section">
        <button id="grs-export-png" class="grs-export-btn" type="button">
          <i class="fa-solid fa-image"></i>
          Export PNG
        </button>
      </div>
    </div>
  `;
}

/**
 * Shows the settings dialog
 */
export async function showSettingsDialog() {
  await foundry.applications.api.DialogV2.wait({
    window: { 
      title: "GURPS Roll Stats - Settings",
      resizable: true,
      height: "auto",
      maxHeight: "80vh"
    },
    content: renderSettingsDialog(),
    buttons: [
      { 
        action: "save", 
        label: "Save Settings", 
        icon: "fa-solid fa-save",
        callback: async (event, button, dialog) => {
          // salva as configs
          try {
            const root = dialog.element;
            const hideGM = root.querySelector("#grs-hide-gm-data")?.checked ?? false;
            const hideIcons = root.querySelector("#grs-hide-chat-icons")?.checked ?? false;
            const allowPlayers = root.querySelector("#grs-allow-players")?.checked ?? true;
            const useEffectIcons = root.querySelector("#grs-use-fire-icons")?.checked ?? false;
            const useEffectAnimation = root.querySelector("#grs-use-fire-animation")?.checked ?? false;

            await game.settings.set(MOD_ID, "hide-gm-data", hideGM);
            await game.settings.set(MOD_ID, "hide-chat-icons", hideIcons);
            await game.settings.set(MOD_ID, "allow-players", allowPlayers);
            await game.settings.set(MOD_ID, SET_USE_EFFECT_ICONS, useEffectIcons);
            await game.settings.set(MOD_ID, SET_USE_EFFECT_ANIMATION, useEffectAnimation);

            ui.notifications?.info("Settings saved!");
          } catch (e) {
            console.error(e);
            ui.notifications?.error("Failed to save settings.");
          }
        }
      },
      { 
        action: "close", 
        label: "Cancel", 
        icon: "fa-solid fa-xmark"
      }
    ],
    render: (event, dialog) => {
      const wc = dialog.element.querySelector(".window-content");
      if (wc) wc.style.paddingTop = "40px";

      // carrega valores atuais
      dialog.element.querySelector("#grs-hide-gm-data").checked = !!game.settings.get(MOD_ID, "hide-gm-data");
      dialog.element.querySelector("#grs-hide-chat-icons").checked = !!game.settings.get(MOD_ID, "hide-chat-icons");
      dialog.element.querySelector("#grs-allow-players").checked = !!game.settings.get(MOD_ID, "allow-players");
      dialog.element.querySelector("#grs-use-fire-icons").checked = !!game.settings.get(MOD_ID, SET_USE_EFFECT_ICONS);
      dialog.element.querySelector("#grs-use-fire-animation").checked = !!game.settings.get(MOD_ID, SET_USE_EFFECT_ANIMATION);

      // liga botão de export
      const btn = dialog.element.querySelector("#grs-export-png");
      if (btn) btn.addEventListener("click", exportChartAsPNG);
    }
  });
}

/**
 * Exports the chart as PNG by creating a temporary hidden container
 */
export async function exportChartAsPNG() {
  // Export chart for all players
  await exportChart("", "gurps-3d6-distribution-all-players.png");
}

/**
 * Exports roll data as CSV
 */
function exportDataAsCSV() {
  try {
    const currentRolls = game.settings.get(MOD_ID, SET_LOG) ?? [];
    
    if (currentRolls.length === 0) {
      ui.notifications?.warn("No roll data available to export.");
      return;
    }
    
    // Create CSV header
    const headers = ['Timestamp', 'User', 'Actor', 'Formula', 'Total', 'Dice', 'Success', 'Margin', 'Flavor'];
    
    // Create CSV rows
    const rows = currentRolls.map(roll => [
      roll.timestamp || '',
      roll.user || '',
      roll.actor || '',
      roll.formula || '',
      roll.total || '',
      Array.isArray(roll.dice) ? roll.dice.join(',') : '',
      roll.success !== null ? roll.success : '',
      roll.margin !== null ? roll.margin : '',
      (roll.flavor || '').replace(/"/g, '""') // Escape quotes
    ]);
    
    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gurps-roll-data.csv';
    a.click();
    URL.revokeObjectURL(url);
    
    ui.notifications?.info("CSV data exported successfully!");
    
  } catch (error) {
    console.error("CSV export error:", error);
    ui.notifications?.error("Failed to export CSV data. Please try again.");
  }
}

/**
 * Exports roll data as JSON
 */
function exportDataAsJSON() {
  try {
    const currentRolls = game.settings.get(MOD_ID, SET_LOG) ?? [];
    
    if (currentRolls.length === 0) {
      ui.notifications?.warn("No roll data available to export.");
      return;
    }
    
    // Create JSON with metadata
    const exportData = {
      exportDate: new Date().toISOString(),
      totalRolls: currentRolls.length,
      rolls: currentRolls
    };
    
    // Create and download file
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gurps-roll-data.json';
    a.click();
    URL.revokeObjectURL(url);
    
    ui.notifications?.info("JSON data exported successfully!");
    
  } catch (error) {
    console.error("JSON export error:", error);
    ui.notifications?.error("Failed to export JSON data. Please try again.");
  }
}