// unluckyEffects.js - Unlucky visual effects for GURPS Roll Stats
import { MOD_ID } from './constants.js';
import { registerEffect, getUserCustomActiveText } from './effectManager.js';

// Constants for the unlucky effect
const INTENSITY = 10; // Controls the intensity of some visual effects

// Saturated and dark color palette for the "unlucky" theme
const COLOR = {
  core:   "#38003c", // Deep, dark purple
  mid:    "#6a006a", // A slightly lighter, saturated purple
  edge:   "#ff0055", // A sharp, contrasting magenta/red
  glow:   "rgba(255, 0, 85, 0.6)", // Glow effect with the edge color
  flash:  "rgba(56, 0, 60, 0.3)", // A flash effect with the core color
  accent: "#ff4d4d"  // A reddish accent color
};

/**
 * Adds an unlucky counter to a message element.
 * @param {HTMLElement} messageElement - The message DOM element.
 * @param {string} unluckyEmojis - The emojis to display.
 */
export function addUnluckyCounterToMessage(messageElement, unluckyEmojis) {
  if (!unluckyEmojis) return;

  const messageContent = messageElement.querySelector('.message-content');
  if (!messageContent) return;

  // Avoid duplicating the counter
  messageContent.querySelector('.grs-effect-counter-container')?.remove();

  const counterContainer = document.createElement('div');
  counterContainer.className = 'grs-effect-counter-container';

  const unluckyCounter = document.createElement('span');
  unluckyCounter.className = 'grs-unlucky-counter';
  unluckyCounter.textContent = unluckyEmojis;

  counterContainer.appendChild(unluckyCounter);
  messageContent.appendChild(counterContainer);
}

/**
 * Removes the unlucky counter from a message element.
 * @param {HTMLElement} messageElement - The message DOM element.
 */
export function removeUnluckyCounterFromMessage(messageElement) {
  const messageContent = messageElement.querySelector('.message-content');
  if (messageContent) {
    messageContent.querySelector('.grs-effect-counter-container')?.remove();
  }
}

/**
 * Applies unlucky visual effects to a message element.
 * @param {HTMLElement} messageElement - The message DOM element.
 * @param {string} userName - The user's name.
 */
export function applyUnluckyVisualEffectsToMessage(messageElement, userName) {
  messageElement.classList.add('grs-on-unlucky-v10');

  const STYLE_ID = "grs-unlucky-v10-style";
  if (!document.head.querySelector(`#${STYLE_ID}`)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .grs-on-unlucky-v10 {
        position: relative;
        border: 1px solid ${COLOR.edge};
        overflow: visible !important;
        isolation: isolate;
        animation: grsUnluckyBorderPulse 8s ease-in-out infinite;
      }
      .grs-on-unlucky-v10::before {
        content: "";
        position: absolute;
        inset: 0;
        background: ${COLOR.flash};
        opacity: 0;
        pointer-events: none;
        z-index: 0;
        transition: opacity 300ms ease-out;
      }
      .grs-on-unlucky-v10.grs-glitch::before {
        opacity: 0.4;
        transition: opacity 150ms ease-in;
      }
      .grs-on-unlucky-v10 .message-header,
      .grs-on-unlucky-v10 .message-content {
        position: relative;
        z-index: 4;
        text-shadow: none !important;
        animation: grsTextGlitch 5s ease-in-out infinite alternate;
      }
      .grs-unlucky-icon {
        display: inline-block;
        margin-right: .3rem;
        font-size: 1.1rem;
        vertical-align: -0.15em;
        color: ${COLOR.mid};
        text-shadow: 0 0 3px ${COLOR.core}, 0 0 9px ${COLOR.edge}, 0 0 16px ${COLOR.glow};
        animation: grsIconFlicker 4s ease-in-out infinite alternate;
      }
      .grs-effect-counter-container {
        text-align: left;
        opacity: 0.7;
        margin: 10px 0;
        width: 100%;
        box-sizing: border-box;
        animation: grsShake 0.7s ease-in-out infinite;
      }
      .grs-unlucky-counter {
        color: ${COLOR.mid};
        font-size: 1.5em;
        text-shadow: 0 0 6px ${COLOR.glow};
      }
      @keyframes grsUnluckyBorderPulse {
        50% {
          border-color: ${COLOR.mid};
          box-shadow: 0 0 25px ${COLOR.flash};
        }
      }
      @keyframes grsIconFlicker {
        from { opacity: 0.8; }
        to { opacity: 1; }
      }
      @keyframes grsShake {
        0%, 100% { transform: translate(0, 0) rotate(0); }
        25% { transform: translate(-2px, 1px) rotate(-0.5deg); }
        50% { transform: translate(2px, -1px) rotate(0.5deg); }
        75% { transform: translate(-1px, 2px) rotate(-0.5deg); }
      }
      @keyframes grsTextGlitch {
        0%, 100% { transform: translate(0, 0); }
        25% { transform: translate(1px, -1px); }
        50% { transform: translate(-1px, 1px); }
        75% { transform: translate(1px, 1px); }
      }
    `;
    document.head.appendChild(style);
  }

  if (messageElement._grsUnluckyCleanup) {
    messageElement._grsUnluckyCleanup();
    delete messageElement._grsUnluckyCleanup;
  }

  let active = true;
  let glitchTO = null;

  function runEffects() {
    if (!active) return;

    if (Math.random() < (0.02 + INTENSITY * 0.006)) {
      messageElement.classList.add("grs-glitch");
      clearTimeout(glitchTO);
      glitchTO = setTimeout(() => messageElement.classList.remove("grs-glitch"), 150);
    }
    setTimeout(runEffects, 50 + Math.random() * 70);
  }

  messageElement._grsUnluckyCleanup = () => {
    active = false;
    clearTimeout(glitchTO);
  };

  runEffects();
}

/**
 * Removes unlucky effects from a message element.
 * @param {HTMLElement} messageElement - The message DOM element.
 */
export function removeOnUnluckyEffectsFromMessage(messageElement) {
  messageElement.classList.remove('grs-on-unlucky-v10', 'grs-glitch');

  if (messageElement._grsUnluckyCleanup) {
    messageElement._grsUnluckyCleanup();
    delete messageElement._grsUnluckyCleanup;
  }
}

/**
 * Gets the styled name for the unlucky effect.
 * @param {string} userName - The original user name.
 * @param {string} userId - The user ID to get their custom text.
 * @returns {Object} Object with displayName and styles.
 */
export function getUnluckyStyledName(userName, userId) {
  const customText = getUserCustomActiveText(userId);
  const displayText = customText.replace(/X/g, userName);

  return {
    displayName: `☠️ ${displayText}`,
    styles: {
      fontWeight: 'bold',
      color: '#6a006a',
      textShadow: '0 0 4px #38003c, 0 0 8px #ff0055'
    }
  };
}

/**
 * Clears any existing unlucky effects for cleanup.
 */
export function clearUnluckyEffects() {
  const style = document.getElementById('grs-unlucky-v10-style');
  if (style) style.remove();

  document.querySelectorAll('.grs-on-unlucky-v10').forEach(messageElement => {
    removeOnUnluckyEffectsFromMessage(messageElement);
  });
}

// Register the unlucky effect in the system
registerEffect('unlucky', {
  emoji: '☠️',
  activeText: 'UNLUCKY',
  addCounterToMessage: addUnluckyCounterToMessage,
  removeCounterFromMessage: removeUnluckyCounterFromMessage,
  applyVisualEffectsToMessage: applyUnluckyVisualEffectsToMessage,
  removeVisualEffectsFromMessage: removeOnUnluckyEffectsFromMessage,
  getStyledName: getUnluckyStyledName,
  clearEffects: clearUnluckyEffects
});
