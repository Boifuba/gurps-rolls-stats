// settingsDialog.js - Settings dialog UI for GURPS Roll Stats module configuration
import { MOD_ID } from './constants.js';

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
          <i class="fa-solid fa-users"></i> Player Access
        </h3>
        <div class="grs-checkbox-group">
          <div class="grs-checkbox-item">
            <input type="checkbox" id="grs-allow-players" />
            <label for="grs-allow-players">Allow players to view the module</label>
          </div>
        </div>
      </div>
      
      <div class="grs-settings-section grs-export-section">
        <h3 class="grs-settings-title">
          <i class="fa-solid fa-download"></i> Export
        </h3>
        <button id="grs-export-chart-btn" class="grs-export-btn" type="button">
          <i class="fa-solid fa-image"></i>
          Export Chart as PNG
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
        callback: (event, button, dialog) => {
          // TODO: Implement save logic
          ui.notifications?.info("Settings saved! (Logic not implemented yet)");
        }
      },
      { 
        action: "close", 
        label: "Cancel", 
        icon: "fa-solid fa-xmark", 
        default: true 
      }
    ],
    render: (event, dialog) => {
      const wc = dialog.element.querySelector(".window-content");
      if (wc) {
        wc.style.paddingTop = "40px";
        wc.style.overflowY = "auto";
        wc.style.maxHeight = "70vh";
      }
      
      // Attach event handlers (without logic for now)
      const exportBtn = wc.querySelector("#grs-export-chart-btn");
      if (exportBtn) {
        exportBtn.addEventListener("click", () => {
          // TODO: Implement export logic
          ui.notifications?.info("Export chart functionality not implemented yet");
        });
      }
      
      // TODO: Load current settings values into checkboxes
      // TODO: Add change event listeners for checkboxes
    }
  });
}