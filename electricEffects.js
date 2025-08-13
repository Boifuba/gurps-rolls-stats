// electricEffects.js - Electric visual effects for GURPS Roll Stats
import { MOD_ID } from './constants.js';
import { registerEffect, getUserCustomActiveText } from './effectManager.js';

// Constants for the electric effect
const INTENSITY = 15;

// Saturated Blue Color Palette
const COLOR = {
  core:   "#ffffff",
  mid:    "#00e6ff",
  edge:   "#0099ff",
  glow:   "#0066ff",
  flash:  "rgba(0, 162, 255, 0.4)",
  accent: "#e020ff"
};

/**
 * Adds electric counter to a message element
 * @param {HTMLElement} messageElement - The message DOM element
 * @param {string} electricEmojis - The electric emojis string to display
 */
export function addElectricCounterToMessage(messageElement, electricEmojis) {
  if (!electricEmojis) return;
  
  const messageContent = messageElement.querySelector('.message-content');
  if (!messageContent) return;
  
  // Remove existing counter to avoid duplicates
  messageContent.querySelector('.grs-effect-counter-container')?.remove();
  
  const counterContainer = document.createElement('div');
  counterContainer.className = 'grs-effect-counter-container';
  
  const electricCounter = document.createElement('span');
  electricCounter.className = 'grs-electric-counter';
  electricCounter.textContent = electricEmojis;
  
  counterContainer.appendChild(electricCounter);
  messageContent.appendChild(counterContainer);
}

/**
 * Removes electric counter from a message element
 * @param {HTMLElement} messageElement - The message DOM element
 */
export function removeElectricCounterFromMessage(messageElement) {
  const messageContent = messageElement.querySelector('.message-content');
  if (messageContent) {
    messageContent.querySelector('.grs-effect-counter-container')?.remove();
  }
}

/**
 * Adds electric visual effects to a message element
 * @param {HTMLElement} messageElement - The message DOM element
 * @param {string} userName - The user's name
 */
export function applyElectricVisualEffectsToMessage(messageElement, userName) {
  messageElement.classList.add('grs-on-electric-v10');
  
  const STYLE_ID = "grs-electric-v10-style";
  if (!document.head.querySelector(`#${STYLE_ID}`)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .grs-on-electric-v10 {
        position: relative;
        border: px solid ${COLOR.edge};
        overflow: visible !important;
        isolation: isolate;
        animation: grsElcBorderPulse 9.8s ease-in-out infinite;
      }
      .grs-border-leaks {
        position: absolute;
        top: -20px; left: -20px; right: -20px; bottom: -20px;
        pointer-events: none;
        z-index: 5;
      }
      .grs-leak-arc {
        position: absolute; width: 1px; height: 60px;
        background: linear-gradient(to bottom, transparent 0%, ${COLOR.edge} 60%, ${COLOR.core} 90%, transparent 100%);
      }
      .grs-on-electric-v10::before {
        content: ""; position: absolute; inset: 0;
        background: ${COLOR.flash}; opacity: 0;
        pointer-events: none; z-index: 0;
        transition: opacity 200ms ease-out;
      }
      .grs-on-electric-v10.grs-surge::before { opacity: 0.3; transition: opacity 100ms ease-in; }
      .grs-electric-svg {
        position: absolute; inset: 0; z-index: 2;
        pointer-events: none; mix-blend-mode: screen; filter: saturate(1.3);
      }
      .grs-bolt path {
        fill: none; stroke: ${COLOR.core}; stroke-width: var(--w, 2.5); stroke-linecap: round; opacity: 0;
        filter: drop-shadow(0 0 6px ${COLOR.mid}) drop-shadow(0 0 14px ${COLOR.edge}) drop-shadow(0 0 28px ${COLOR.glow});
      }
      .grs-bolt.primary path {
        filter: drop-shadow(0 0 4px ${COLOR.core}) drop-shadow(0 0 10px ${COLOR.accent}) drop-shadow(0 0 20px ${COLOR.edge}) drop-shadow(0 0 35px ${COLOR.glow});
      }
      .grs-on-electric-v10 .message-header,
      .grs-on-electric-v10 .message-content {
        position: relative;
        z-index: 4;
        text-shadow: none !important;
        animation: none !important;
      }
      .grs-zap-icon {
        display: inline-block; margin-right:.3rem; font-size:1.1rem; vertical-align: -0.15em; color: ${COLOR.mid};
        text-shadow: 0 0 2px ${COLOR.core}, 0 0 8px ${COLOR.edge}, 0 0 15px ${COLOR.glow};
        animation: grsZapFlicker 3s ease-in-out infinite alternate;
      }
      .grs-effect-counter-container {
        text-align: left;
        opacity: 0.8;
        margin: 10px 0;
        width: 100%; /* Full width */
        box-sizing: border-box; /* Include padding and border in the element's total width and height */
        animation: grsTremor 0.8s ease-in-out infinite;
      }
      .grs-electric-counter {
        color: ${COLOR.mid};
        font-size: 1.5em;
        text-shadow: 0 0 5px ${COLOR.glow};
      }
      @keyframes grsElcBorderPulse { 50% { border-color: ${COLOR.mid}; box-shadow: 0 0 28px ${COLOR.flash}; } }
      @keyframes grsZapFlicker { from { opacity: 0.9; } to { opacity: 1; } }
      @keyframes grsArcFade { 0%, 100% { opacity: 0; transform: var(--transform); } 20%, 70% { opacity: 1; } }
      @keyframes grsTremor { 
        0%, 100% { transform: translate(0, 0); }
        10% { transform: translate(-1px, -1px); }
        20% { transform: translate(1px, 1px); }
        30% { transform: translate(-1px, 1px); }
        40% { transform: translate(1px, -1px); }
        50% { transform: translate(-1px, -1px); }
        60% { transform: translate(1px, 1px); }
        70% { transform: translate(-1px, 1px); }
        80% { transform: translate(1px, -1px); }
        90% { transform: translate(-1px, -1px); }
      }
    `;
    document.head.appendChild(style);
  }

  messageElement.querySelector('.grs-electric-svg')?.remove();
  messageElement.querySelector('.grs-border-leaks')?.remove();
  if (messageElement._grsElectricCleanup) {
    messageElement._grsElectricCleanup();
    delete messageElement._grsElectricCleanup;
  }

  const rect = messageElement.getBoundingClientRect();
  const innerW = rect.width || 420;
  const innerH = rect.height || 100;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("grs-electric-svg");
  svg.setAttribute("viewBox", `0 0 ${innerW} ${innerH}`);
  messageElement.appendChild(svg);

  const leaksContainer = document.createElement("div");
  leaksContainer.className = "grs-border-leaks";
  messageElement.appendChild(leaksContainer);

  function getRandomBorderPoint() {
    const side = Math.floor(Math.random() * 4);
    switch (side) {
      case 0: // Top
        return { x: Math.random() * innerW, y: 0 };
      case 1: // Right
        return { x: innerW, y: Math.random() * innerH };
      case 2: // Bottom
        return { x: Math.random() * innerW, y: innerH };
      case 3: // Left
        return { x: 0, y: Math.random() * innerH };
    }
  }

  function createBolt(config) {
    const { segments, amp, branches, thickness } = config;
    // Lightning can now start and end at any border point
    let startCorner = getRandomBorderPoint();
    let endCorner = getRandomBorderPoint();
    
    // Ensure start and end are not too close to each other
    const distance = Math.sqrt(Math.pow(endCorner.x - startCorner.x, 2) + Math.pow(endCorner.y - startCorner.y, 2));
    if (distance < Math.min(innerW, innerH) * 0.3) {
      endCorner = getRandomBorderPoint();
    }
    
    const pts = []; 
    const dx = endCorner.x - startCorner.x; 
    const dy = endCorner.y - startCorner.y;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments; 
      const currentX = startCorner.x + dx * t; 
      const currentY = startCorner.y + dy * t;
      const normal = { x: -dy, y: dx }; 
      const normalLength = Math.sqrt(normal.x * normal.x + normal.y * normal.y) || 1;
      const normalizedNormal = { x: normal.x / normalLength, y: normal.y / normalLength };
      const jitter = (Math.random() * 2 - 1) * amp * Math.sin(Math.PI * t);
      pts.push({ x: currentX + normalizedNormal.x * jitter, y: currentY + normalizedNormal.y * jitter });
    }
    
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add("grs-bolt", "primary");
    const mainPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    mainPath.setAttribute("d", `M${pts[0].x},${pts[0].y}` + pts.slice(1).map(p => ` L${p.x},${p.y}`).join(''));
    mainPath.style.setProperty("--w", String(thickness)); 
    g.appendChild(mainPath);
    
    for (let b = 0; b < branches; b++) {
      const startIdx = 2 + Math.floor(Math.random() * (pts.length - 5)); 
      const branchPts = [pts[startIdx]];
      const branchLen = 4 + Math.floor(Math.random() * 5);
      for (let i = 1; i <= branchLen; i++) {
        const parentPt = pts[startIdx + i]; 
        if (!parentPt) break;
        branchPts.push({ x: parentPt.x + (Math.random() * 2 - 1) * amp * 0.6, y: parentPt.y + (Math.random() * 2 - 1) * amp * 0.6 });
      }
      const br = document.createElementNS("http://www.w3.org/2000/svg", "path");
      br.setAttribute("d", `M${branchPts[0].x},${branchPts[0].y}` + branchPts.slice(1).map(p => ` L${p.x},${p.y}`).join(''));
      br.style.setProperty("--w", String(Math.max(1.2, thickness * 0.6))); 
      g.appendChild(br);
    } 
    return g;
  }

  function animateBolt(boltEl) {
    const paths = boltEl.querySelectorAll("path"); 
    const duration = 350 + Math.random() * 250;
    paths.forEach(p => { 
      const totalLen = p.getTotalLength?.() || (innerW*1.5); 
      p.animate([ 
        { opacity: 0, strokeDasharray: `${totalLen} ${totalLen}`, strokeDashoffset: totalLen }, 
        { opacity: 1, offset: 0.1 }, 
        { opacity: 1, offset: 0.7 }, 
        { opacity: 0, strokeDasharray: `${totalLen} ${totalLen}`, strokeDashoffset: -totalLen } 
      ], { duration, easing: "ease-in-out" }); 
    });
    setTimeout(() => boltEl.remove(), duration);
  }

  function spawnBorderArc() {
    const arc = document.createElement("div"); 
    arc.className = "grs-leak-arc";
    const side = Math.floor(Math.random() * 4); 
    let x, y, rot;
    switch (side) {
      case 0: x = Math.random() * innerW; y = 0; rot = 180; break;
      case 1: x = innerW; y = Math.random() * innerH; rot = -90; break;
      case 2: x = Math.random() * innerW; y = innerH; rot = 0; break;
      case 3: x = 0; y = Math.random() * innerH; rot = 90; break;
    }
    const scale = 0.5 + Math.random() * 0.8; 
    const duration = 200 + Math.random() * 300;
    arc.style.setProperty('--transform', `translate(-50%, 0) rotate(${rot}deg) scale(${scale})`);
    arc.style.top = `${y}px`; 
    arc.style.left = `${x}px`;
    arc.style.animation = `grsArcFade ${duration}ms ease-out forwards`;
    leaksContainer.appendChild(arc); 
    setTimeout(() => arc.remove(), duration);
  }

  let active = true; 
  let surgeTO = null;
  
  function runEffects() {
    if (!active) return;
    if (Math.random() < 0.6) { 
      spawnBorderArc(); 
    }
    // Reduced frequency and intensity of background flicker
    if (Math.random() < (0.015 + INTENSITY * 0.005)) {
      messageElement.classList.add("grs-surge");
      clearTimeout(surgeTO);
      // Blue effect lasts 3 times longer (400ms * 3 = 1200ms)
      surgeTO = setTimeout(() => messageElement.classList.remove("grs-surge"), 1200);
      const bolt = createBolt({ 
        segments: 30, 
        amp: 10 + INTENSITY * 1.5, 
        branches: Math.floor(2 + INTENSITY / 2), 
        thickness: 2.5 + INTENSITY * 0.1 
      });
      svg.appendChild(bolt);
      animateBolt(bolt);
    }
    setTimeout(runEffects, 40 + Math.random() * 60);
  }
  
  messageElement._grsElectricCleanup = () => {
    active = false;
    clearTimeout(surgeTO);
  };
  
  runEffects();
}

/**
 * Removes electric effects from a message element
 * @param {HTMLElement} messageElement - The message DOM element
 */
export function removeOnElectricEffectsFromMessage(messageElement) {
  messageElement.classList.remove('grs-on-electric-v10', 'grs-surge');
  
  if (messageElement._grsElectricCleanup) {
    messageElement._grsElectricCleanup();
    delete messageElement._grsElectricCleanup;
  }
  
  messageElement.querySelector('.grs-electric-svg')?.remove();
  messageElement.querySelector('.grs-border-leaks')?.remove();
}

/**
 * Gets the styled name for electric effect
 * @param {string} userName - The original user name
 * @param {string} userId - The user ID to get their custom text
 * @returns {Object} Object with displayName and styles
 */
export function getElectricStyledName(userName, userId) {
  // Get user's personal custom text from the settings system
  const customText = getUserCustomActiveText(userId);
  const displayText = customText.replace(/X/g, userName);
  
  return {
    displayName: `⚡ ${displayText}`,
    styles: {
      fontWeight: 'bold',
      color: '#00e6ff',
      textShadow: '0 0 4px #0099ff, 0 0 8px #0066ff'
    }
  };
}

/**
 * Clears any existing electric effects for cleanup
 */
export function clearElectricEffects() {
  const style = document.getElementById('grs-electric-v10-style');
  if (style) style.remove();
  
  document.querySelectorAll('.grs-on-electric-v10').forEach(messageElement => {
    removeOnElectricEffectsFromMessage(messageElement);
  });
}

// Register the electric effect in the system
registerEffect('electric', {
  emoji: '⚡',
  activeText: 'ELECTRIFIED',
  addCounterToMessage: addElectricCounterToMessage,
  removeCounterFromMessage: removeElectricCounterFromMessage,
  applyVisualEffectsToMessage: applyElectricVisualEffectsToMessage,
  removeVisualEffectsFromMessage: removeOnElectricEffectsFromMessage,
  getStyledName: getElectricStyledName,
  clearEffects: clearElectricEffects
});