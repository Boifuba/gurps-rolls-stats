// flameEffects.js - Fire visual effects with bouncing counters! 🔥
import { MOD_ID } from './constants.js';
import { registerEffect, getUserCustomActiveText } from './effectManager.js';

// Fire effect constants
const INTENSITY = 50; // Increase for more particles

// Fire Color Palette
const COLOR = {
  core:   "#ffffff",
  mid:    "#ff6600",
  edge:   "#ff3300",
  glow:   "#ff4500",
  flash:  "rgba(255, 100, 0, 0.7)",
  accent: "#ffaa00",
  ember:  "#ff4400"
};

/**
 * Adds fire counter to a message element
 * @param {HTMLElement} messageElement - The message DOM element
 * @param {string} fireEmojis - The fire emojis string to display
 */
export function addFireCounterToMessage(messageElement, fireEmojis) {
  if (!fireEmojis) return;
  const messageContent = messageElement.querySelector('.message-content');
  if (!messageContent) return;
  const counterContainer = document.createElement('div');
  counterContainer.className = 'grs-effect-counter-container';
  
  const fireCounter = document.createElement('span');
  fireCounter.className = 'grs-fire-counter';
  fireCounter.textContent = fireEmojis;
  
  counterContainer.classList.add('grs-bounce-effect');
  
  counterContainer.appendChild(fireCounter);
  messageContent.appendChild(counterContainer);
}

/**
 * Removes fire counter from a message element
 * @param {HTMLElement} messageElement - The message DOM element
 */
export function removeFireCounterFromMessage(messageElement) {
  const messageContent = messageElement.querySelector('.message-content');
  if (messageContent) {
    messageContent.querySelector('.grs-effect-counter-container')?.remove();
  }
}

/**
 * Applies fire particle visual effects to a message
 * @param {HTMLElement} messageElement - The message DOM element
 * @param {string} userName - The user's name
 */
export function applyFireVisualEffectsToMessage(messageElement, userName) {
  messageElement.classList.add('grs-on-fire-v10');
  
  const STYLE_ID = "grs-fire-v10-style";
  if (!document.head.querySelector(`#${STYLE_ID}`)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .grs-on-fire-v10 {
        position: relative;
        border: 2px solid ${COLOR.edge};
        overflow: hidden !important;
        box-shadow: 0 0 15px ${COLOR.flash};
        animation: grsFireBorderPulse 1.2s ease-in-out infinite;
        margin: 10px 0;
      }
      
      .grs-on-fire-v10::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 0;
        background: linear-gradient(135deg, 
          rgba(255, 50, 0, 0.5),   /* Red-Orange */
          rgba(255, 170, 0, 0.5),  /* Yellow-Gold */
          rgba(255, 80, 0, 0.55),  /* Orange */
          rgba(220, 20, 0, 0.6)    /* Dark Red */
        );
        background-size: 400% 400%;
        animation: grsBackgroundFlow 8s ease-in-out infinite;
        opacity: 0.7;
      }
      
      @keyframes grsBackgroundFlow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      .grs-ember {
        position: absolute;
        width: var(--size, 10px);
        height: var(--size, 10px);
        background: ${COLOR.core};
        border-radius: 50%;
        pointer-events: none;
        z-index: 10;
        opacity: 0;
        box-shadow: 0 0 6px 2px ${COLOR.core}, 
                    0 0 10px 5px ${COLOR.accent}, 
                    0 0 15px 8px ${COLOR.glow};
        filter: blur(1px);
      }

      .grs-on-fire-v10 .message-header,
      .grs-on-fire-v10 .message-content {
        position: relative; 
        z-index: 4;
        color: #fff; 
        text-shadow: 0 0 4px rgba(0,0,0,0.9);
      }
      
      .grs-effect-counter-container {
        margin: 10px 0;
        text-align: left;
      }

      .grs-bounce-effect {
        animation: grsContentBounce 2.5s ease-in-out infinite;
      }

      .grs-fire-counter {
        color: #fff;
        font-size: 1.5em;
        text-shadow: 0 0 8px ${COLOR.glow}, 0 0 4px rgba(0,0,0,1);
      }
      
      @keyframes grsContentBounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-8px); }
        60% { transform: translateY(-4px); }
      }
      
      @keyframes grsFireBorderPulse { 
        50% { 
          border-color: ${COLOR.mid}; 
          box-shadow: 0 0 28px ${COLOR.flash};
        } 
      }
    `;
    document.head.appendChild(style);
  }

  if (messageElement._grsFireCleanup) {
    messageElement._grsFireCleanup();
  }

  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.pointerEvents = "none";
  messageElement.appendChild(container);

  function createEmber() {
    const ember = document.createElement('div');
    ember.className = 'grs-ember';
    container.appendChild(ember);
    return ember;
  }

  function animateEmber(ember) {
    const rect = messageElement.getBoundingClientRect();
    const startX = Math.random() * rect.width;
    const startY = rect.height;
    const endY = -20;
    const duration = 1500 + Math.random() * 2000;
    const initialSize = 5 + Math.random() * (5 + INTENSITY * 0.1);
    
    ember.style.setProperty('--size', `${initialSize}px`);
    ember.style.left = `${startX}px`;
    ember.style.top = `${startY}px`;

    ember.animate([
      { transform: `translateY(0) translateX(0)`, opacity: 1 },
      { transform: `translateY(${(startY + endY) * -0.5}px) translateX(${(Math.random() - 0.5) * 40}px)`, opacity: 0.8, offset: 0.5 },
      { transform: `translateY(${(startY + endY) * -1}px) translateX(${(Math.random() - 0.5) * 80}px)`, opacity: 0, width: '1px', height: '1px' }
    ], { duration: duration, easing: 'ease-in-out' });

    setTimeout(() => ember.remove(), duration);
  }

  let active = true;
  
  function runEffects() {
    if (!active) return;
    const ember = createEmber();
    animateEmber(ember);
    const nextParticleTimeout = 100 / (INTENSITY / 10);
    setTimeout(runEffects, Math.random() * nextParticleTimeout);
  }
  
  messageElement._grsFireCleanup = () => {
    active = false;
    if (container) container.remove();
  };
  
  runEffects();
}

/**
 * Removes fire effects from a message element
 * @param {HTMLElement} messageElement - The message DOM element
 */
export function removeOnFireEffectsFromMessage(messageElement) {
  messageElement.classList.remove('grs-on-fire-v10');
  if (messageElement._grsFireCleanup) {
    messageElement._grsFireCleanup();
    delete messageElement._grsFireCleanup;
  }
}

/**
 * Gets the styled name for fire effect
 * @param {string} userName - The original user name
 * @param {string} userId - The user ID to get their custom text
 * @returns {Object} Object with displayName and styles
 */
export function getFireStyledName(userName, userId) {
  // Get user's personal custom text from the settings system
  const customText = getUserCustomActiveText(userId);
  const displayText = customText.replace(/X/g, userName);
  
  return {
    displayName: `🔥 ${displayText}`,
    styles: {
      fontWeight: 'bold',
      color: '#ff4500',
      textShadow: '0 0 4px #ff6600, 0 0 8px #ff3300'
    }
  };
}

/**
 * Clears all existing fire effects for cleanup
 */
export function clearFireEffects() {
  const style = document.getElementById('grs-fire-v10-style');
  if (style) style.remove();
  document.querySelectorAll('.grs-on-fire-v10').forEach(removeOnFireEffectsFromMessage);
}

// Register the 'fire' effect in the system
registerEffect('fire', {
  emoji: '🔥',
  activeText: 'ON FIRE',
  addCounterToMessage: addFireCounterToMessage,
  removeCounterFromMessage: removeFireCounterFromMessage,
  applyVisualEffectsToMessage: applyFireVisualEffectsToMessage,
  removeVisualEffectsFromMessage: removeOnFireEffectsFromMessage,
  getStyledName: getFireStyledName,
  clearEffects: clearFireEffects
});