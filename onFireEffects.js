// onFireEffects.js - On Fire animation effects for GURPS Roll Stats
import { MOD_ID, SET_USE_FIRE_ANIMATION, SET_USE_FIRE_ICONS, SET_FIRE_COUNTERS, SET_ONFIRE_USERS } from './constants.js';

// Constants for the elaborate fire effect
const SPARKS = 12;              // quantidade de faíscas
const SPARK_MAX_X = 220;        // área horizontal p/ faíscas (px)
const SPARK_MAX_H = 140;        // altura máxima de subida (px)

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
 * Gets fire emojis for a user based on their fire counter
 * @param {string} userId - The user ID
 * @returns {string} Fire emojis string
 */
export function getFireEmojis(userId) {
  if (!game.settings.get(MOD_ID, SET_USE_FIRE_ICONS)) return '';
  
  userId = normalizeUserId(userId);
  console.log(`${MOD_ID}: [DEBUG] getFireEmojis - normalized userId: ${userId}`);
  
  const counters = game.settings.get(MOD_ID, SET_FIRE_COUNTERS) ?? {};
  const count = counters[userId] ?? 0;
  const onFireUsers = game.settings.get(MOD_ID, SET_ONFIRE_USERS) ?? {};
  const isOnFire = onFireUsers[userId] ?? false;
  
  console.log(`${MOD_ID}: [DEBUG] getFireEmojis - userId: ${userId}, count: ${count}, isOnFire: ${isOnFire}`);
  
  if (count === 0) return '';
  
  const emoji = '🔥';
  const displayCount = Math.min(count, 10); // Ensure we never display more than 10
  
  return emoji.repeat(displayCount) + (isOnFire ? ' (ON FIRE!)' : '');
}

/**
 * Triggers the "on fire" animation effect for a user
 * @param {string} userId - The user ID to trigger the effect for
 */
export function triggerOnFireAnimation(userId) {
  if (!game.settings.get(MOD_ID, SET_USE_FIRE_ANIMATION)) return;
  
  userId = normalizeUserId(userId);
  console.log(`${MOD_ID}: [DEBUG] triggerOnFireAnimation - normalized userId: ${userId}`);
  
  const user = game.users.get(userId);
  if (!user) {
    console.warn(`${MOD_ID}: Could not find user with ID ${userId} for animation trigger`);
    return;
  }

  // Apply effects to existing chat messages from this user
  applyOnFireEffectsToUserMessages(userId);

  // Get the user's controlled tokens
  const tokens = canvas?.tokens?.controlled || [];
  const userTokens = tokens.filter(token => token.actor?.ownership?.[userId] >= 3);
  
  if (userTokens.length === 0) {
    // No controlled tokens, show screen effect
    showScreenFireEffect(user.name);
  } else {
    // Apply effect to all controlled tokens
    userTokens.forEach(token => showTokenFireEffect(token));
  }
  
  // Show notification
  ui.notifications?.info(`🔥 ${user.name} is ON FIRE! 🔥`, { permanent: false });
}

/**
 * Applies "on fire" visual effects to all chat messages from a user
 * @param {string} userId - The user ID
 */
export function applyOnFireEffectsToUserMessages(userId) {
  userId = normalizeUserId(userId);
  console.log(`${MOD_ID}: [DEBUG] applyOnFireEffectsToUserMessages - normalized userId: ${userId}`);
  
  const user = game.users.get(userId);
  if (!user) {
    console.warn(`${MOD_ID}: Could not find user with ID ${userId} for message effects`);
    return;
  }

  // Check if user is on fire
  const onFireUsers = game.settings.get(MOD_ID, SET_ONFIRE_USERS) ?? {};
  const isOnFire = onFireUsers[userId] ?? false;
  
  console.log(`${MOD_ID}: [DEBUG] User ${userId} (${user.name}) isOnFire: ${isOnFire}`);
  
  if (!isOnFire) {
    // User is not on fire, remove effects
    console.log(`${MOD_ID}: [DEBUG] User not on fire, removing effects`);
    removeOnFireEffectsFromUserMessages(userId);
    return;
  }

  // Get ALL chat messages from this user
  const chatMessages = Array.from(game.messages.entries())
    .filter(([id, msg]) => {
      const msgUserId = normalizeUserId(msg.user ?? msg.userId);
      return msgUserId === userId;
    });

  console.log(`${MOD_ID}: [DEBUG] Found ${chatMessages.length} messages from user ${userId}`);

  // Apply visual effects to messages
  chatMessages.forEach(([id, message]) => {
    const messageElement = document.querySelector(`[data-message-id="${id}"]`);
    if (messageElement && !messageElement.classList.contains('grs-on-fire')) {
      console.log(`${MOD_ID}: [DEBUG] Applying fire effects to message ${id}`);
      addOnFireEffectsToMessage(messageElement, user.name);
    }
  });
}

/**
 * Adds "on fire" visual effects to a message element
 * @param {HTMLElement} messageElement - The message DOM element
 * @param {string} userName - The user's name
 */
function addOnFireEffectsToMessage(messageElement, userName) {
  console.log(`${MOD_ID}: [DEBUG] addOnFireEffectsToMessage called for user: ${userName}`, messageElement);
  
  console.log(`${MOD_ID}: Adding on-fire effects to message for ${userName}`, messageElement);
  
  // Add class to prevent duplicate application
  messageElement.classList.add('grs-on-fire');
  
  // Add CSS for visual effects (only once)
  if (!document.head.querySelector(`#${MOD_ID}-on-fire-style-advanced`)) {
    console.log(`${MOD_ID}: [DEBUG] Creating and injecting CSS styles for on-fire effects`);
    const style = document.createElement('style');
    style.id = `${MOD_ID}-on-fire-style-advanced`;
    style.textContent = `
      .grs-on-fire {
        position: relative;
        border-left: 4px solid #ff4500;
        overflow: hidden;
        isolation: isolate; /* garante blending sem vazar */
        animation: grsBorderPulse 1.25s ease-in-out infinite;
      }

      /* Camada base: gradiente quente com leve fluxo (mantém textura com multiply) */
      .grs-on-fire::after {
        content: "";
        position: absolute;
        inset: 0;
        background:
          linear-gradient(90deg, #ff4500 0%, #ff8c00 35%, #ffb84d 60%, transparent 100%);
        mix-blend-mode: multiply;
        pointer-events: none;
        z-index: 0;
        background-size: 180% 100%;
        animation: grsFireFlow 1.6s ease-in-out infinite;
      }

      /* Línguas de fogo e brilho (screen) */
      .grs-on-fire::before {
        content: "";
        position: absolute;
        inset: -6px -4px -6px -6px; /* um pouco além para o blur não cortar */
        pointer-events: none;
        z-index: 1;
        background:
          radial-gradient(60% 180% at 0% 100%, rgba(255,130,0,.35) 0%, rgba(255,200,80,.2) 45%, transparent 60%),
          radial-gradient(70% 140% at 12% 100%, rgba(255,210,0,.25) 0%, transparent 60%),
          radial-gradient(50% 120% at 4% 100%, rgba(255,100,0,.25) 0%, transparent 55%);
        mix-blend-mode: screen;
        filter: blur(2px) saturate(1.05);
        animation: grsLick 1.05s ease-in-out infinite alternate;
        mask-image: linear-gradient(90deg, #000 0%, #000 65%, transparent 100%);
        -webkit-mask-image: linear-gradient(90deg, #000 0%, #000 65%, transparent 100%);
      }

      /* Shimmer/ondulação de calor (sutil) */
      .grs-heat {
        position: absolute;
        inset: 0;
        z-index: 2;
        pointer-events: none;
        opacity: .36;
        mix-blend-mode: soft-light;
        background: repeating-linear-gradient(
          0deg,
          rgba(255,255,255,.08) 0 2px,
          transparent 2px 4px
        );
        filter: blur(0.6px);
        mask-image: linear-gradient(90deg, #000 0%, #000 55%, transparent 95%);
        -webkit-mask-image: linear-gradient(90deg, #000 0%, #000 55%, transparent 95%);
        animation: grsHeat 0.55s linear infinite alternate;
      }

      /* Faíscas */
      .grs-sparks {
        position: absolute;
        left: 0; right: 0; top: 0; bottom: 0;
        z-index: 3;
        pointer-events: none;
        overflow: visible;
      }
      .grs-sparks .spark {
        position: absolute;
        bottom: 6px;
        left: 6px;
        width: 2px; height: 2px;
        border-radius: 50%;
        background: #fff7cc;
        box-shadow:
          0 0 6px 2px rgba(255,200,80,.55),
          0 0 12px 4px rgba(255,120,0,.35);
        transform: translateX(var(--x, 0)) translateY(0) scale(var(--s, 1));
        opacity: .95;
        animation:
          grsRise var(--t, 2.2s) linear infinite,
          grsFlicker 0.6s ease-in-out infinite alternate;
        mix-blend-mode: screen;
      }

      /* Ícone 🔥 antes do nome (mais vivo) */
      .grs-on-fire .grs-fire-icon {
        display: inline-block;
        margin-right: .25rem;
        font-size: 1.15rem;
        line-height: 1;
        filter: drop-shadow(0 0 2px rgba(255,140,0,.75)) drop-shadow(0 0 6px rgba(255,90,0,.35));
        animation:
          grsFireFlame .8s ease-in-out infinite alternate,
          grsHue 3.2s linear infinite;
        vertical-align: text-bottom;
      }

      /* Garante texto acima das camadas */
      .grs-on-fire .message-header,
      .grs-on-fire .message-content {
        position: relative;
        z-index: 4;
      }

      /* Animações */
      @keyframes grsFireFlow {
        0% { background-position: 0% 0; }
        50% { background-position: 30% 0; }
        100% { background-position: 0% 0; }
      }
      @keyframes grsLick {
        0% { transform: translateY(0) scaleY(1); opacity: .95; }
        100% { transform: translateY(-2px) scaleY(1.03); opacity: 1; }
      }
      @keyframes grsHeat {
        0% { transform: translateY(0); }
        100% { transform: translateY(-1px); }
      }
      @keyframes grsRise {
        0%   { transform: translateX(var(--x, 0)) translateY(0)      scale(var(--s, 1)); opacity: .95; }
        80%  { opacity: .85; }
        100% { transform: translateX(calc(var(--x, 0) + var(--dx, 12px))) translateY(calc(-1 * var(--h, 120px))) scale(calc(var(--s, 1) * .9)); opacity: 0; }
      }
      @keyframes grsFlicker {
        0%   { filter: brightness(1) blur(0px); }
        100% { filter: brightness(1.35) blur(0.3px); }
      }
      @keyframes grsFireFlame {
        0%   { transform: translateY(0) rotate(0deg)   scale(1);    opacity: .95; }
        100% { transform: translateY(-1px) rotate(-4deg) scale(1.07); opacity: 1; }
      }
      @keyframes grsHue {
        0%   { filter: hue-rotate(0deg); }
        50%  { filter: hue-rotate(-10deg); }
        100% { filter: hue-rotate(0deg); }
      }
      @keyframes grsBorderPulse {
        0%   { border-color: #ff4500; box-shadow: inset 0 0 0 0 rgba(255,69,0,0); }
        50%  { border-color: #ff8c00; box-shadow: inset 0 0 24px rgba(255,69,0,.22); }
        100% { border-color: #ff4500; box-shadow: inset 0 0 0 0 rgba(255,69,0,0); }
      }
    `;
    document.head.appendChild(style);
    console.log(`${MOD_ID}: [DEBUG] CSS styles injected successfully`);
  } else {
    console.log(`${MOD_ID}: [DEBUG] CSS styles already exist, skipping injection`);
  }

  // Always remove existing elements to avoid duplication
  console.log(`${MOD_ID}: [DEBUG] Removing existing fire effect elements to avoid duplication`);
  messageElement.querySelector('.grs-heat')?.remove();
  messageElement.querySelector('.grs-sparks')?.remove();
  messageElement.querySelector('.grs-fire-icon')?.remove();

  // Add shimmer/heat effect
  console.log(`${MOD_ID}: [DEBUG] Creating heat effect element`);
  const heat = document.createElement('div');
  heat.className = 'grs-heat';
  heat.setAttribute('aria-hidden', 'true');
  messageElement.appendChild(heat);
  console.log(`${MOD_ID}: [DEBUG] Heat effect element added to message`);

  // Add sparks effect
  console.log(`${MOD_ID}: [DEBUG] Creating sparks effect container`);
  const sparksWrap = document.createElement('div');
  sparksWrap.className = 'grs-sparks';
  sparksWrap.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < SPARKS; i++) {
    const sp = document.createElement('i');
    sp.className = 'spark';
    // Random values for each spark via CSS vars
    const t = (1.8 + Math.random() * 1.6).toFixed(2) + 's';
    const x = Math.round(Math.random() * SPARK_MAX_X) + 'px';
    const dx = (6 + Math.random() * 22) * (Math.random() < 0.5 ? -1 : 1) + 'px';
    const s = (0.8 + Math.random() * 0.9).toFixed(2);
    const h = Math.round(60 + Math.random() * SPARK_MAX_H) + 'px';
    sp.style.setProperty('--t', t);
    sp.style.setProperty('--x', x);
    sp.style.setProperty('--dx', dx);
    sp.style.setProperty('--s', s);
    sp.style.setProperty('--h', h);
    sp.style.animationDelay = (Math.random() * 0.9).toFixed(2) + 's';
    sparksWrap.appendChild(sp);
  }
  messageElement.appendChild(sparksWrap);
  console.log(`${MOD_ID}: [DEBUG] Sparks effect container with ${SPARKS} sparks added to message`);

  // Add 🔥 icon before the sender name
  console.log(`${MOD_ID}: [DEBUG] Looking for message header to add fire icon`);
  const header = messageElement.querySelector('.message-header');
  if (header) {
    console.log(`${MOD_ID}: [DEBUG] Message header found, looking for sender element`);
    const senderEl = header.querySelector('.message-sender, .sender, h4.message-sender, h4.sender') || header.firstElementChild;
    if (senderEl) {
      console.log(`${MOD_ID}: [DEBUG] Sender element found, adding fire icon`, senderEl);
      const fire = document.createElement('span');
      fire.className = 'grs-fire-icon';
      fire.setAttribute('aria-hidden', 'true');
      fire.textContent = '🔥';
      senderEl.insertBefore(fire, senderEl.firstChild);
      console.log(`${MOD_ID}: [DEBUG] Fire icon successfully added before sender name`);
    } else {
      console.log(`${MOD_ID}: [DEBUG] WARNING: Sender element not found in header`, header);
    }
  } else {
    console.log(`${MOD_ID}: [DEBUG] WARNING: Message header not found in message element`, messageElement);
  }

  // Add informative tooltip
  console.log(`${MOD_ID}: [DEBUG] Adding tooltip to message element`);
  messageElement.setAttribute('title', `🔥 ${userName} is ON FIRE! 🔥`);
  console.log(`${MOD_ID}: [DEBUG] addOnFireEffectsToMessage completed for user: ${userName}`);
}

/**
 * Removes "on fire" effects from a message element
 * @param {HTMLElement} messageElement - The message DOM element
 */
function removeOnFireEffectsFromMessage(messageElement) {
  messageElement.classList.remove('grs-on-fire');
  messageElement.removeAttribute('title');
  
  // Remove effect elements
  messageElement.querySelector('.grs-heat')?.remove();
  messageElement.querySelector('.grs-sparks')?.remove();
  messageElement.querySelector('.grs-fire-icon')?.remove();
}

/**
 * Removes "on fire" effects from all messages of a user
 * @param {string} userId - The user ID
 */
export function removeOnFireEffectsFromUserMessages(userId) {
  userId = normalizeUserId(userId);
  console.log(`${MOD_ID}: [DEBUG] removeOnFireEffectsFromUserMessages - normalized userId: ${userId}`);
  
  const chatMessages = Array.from(game.messages.entries())
    .filter(([id, msg]) => {
      const msgUserId = normalizeUserId(msg.user ?? msg.userId);
      return msgUserId === userId;
    });

  console.log(`${MOD_ID}: [DEBUG] Removing fire effects from ${chatMessages.length} messages of user ${userId}`);

  chatMessages.forEach(([id, message]) => {
    const messageElement = document.querySelector(`[data-message-id="${id}"]`);
    if (messageElement) {
      removeOnFireEffectsFromMessage(messageElement);
    }
  });
}

/**
 * Shows a screen-wide fire effect
 * @param {string} userName - Name of the user for the effect
 */
function showScreenFireEffect(userName) {
  console.log(`${MOD_ID}: showScreenFireEffect called for ${userName}`);
  
  // Don't show if already showing
  if (document.getElementById('gurps-fire-overlay')) {
    console.log(`${MOD_ID}: Fire overlay already exists, skipping`);
    return;
  }
  
  // Create fire effect overlay
  const fireOverlay = document.createElement('div');
  fireOverlay.id = 'gurps-fire-overlay';
  fireOverlay.innerHTML = `
    <div class="fire-container">
      <div class="fire-text">🔥 ${userName} IS ON FIRE! 🔥</div>
      <div class="fire-particles"></div>
    </div>
  `;
  
  // Add styles
  const style = document.createElement('style');
  style.id = 'gurps-fire-overlay-style';
  style.textContent = `
    #gurps-fire-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: radial-gradient(circle, rgba(255,69,0,0.3) 0%, rgba(255,140,0,0.1) 50%, transparent 100%);
      pointer-events: none;
      z-index: 10000;
      animation: gurpsScreenFireFlicker 3s ease-in-out;
    }
    
    .fire-container {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .fire-text {
      font-size: 4rem;
      font-weight: bold;
      color: #ff4500;
      text-shadow: 0 0 20px #ff6500, 0 0 40px #ff8500;
      animation: gurpsScreenFireTextPulse 1s infinite alternate;
      text-align: center;
      z-index: 10001;
    }
    
    .fire-particles {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: 
        radial-gradient(circle at 20% 80%, #ff4500 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, #ff6500 0%, transparent 50%),
        radial-gradient(circle at 40% 40%, #ff8500 0%, transparent 50%);
      animation: gurpsScreenFireParticles 2s infinite ease-in-out;
    }
    
    @keyframes gurpsScreenFireFlicker {
      0% { opacity: 0; transform: scale(0.8); }
      25% { opacity: 0.8; transform: scale(1.1); }
      50% { opacity: 0.6; transform: scale(0.9); }
      75% { opacity: 0.9; transform: scale(1.05); }
      100% { opacity: 0; transform: scale(0.8); }
    }
    
    @keyframes gurpsScreenFireTextPulse {
      0% { transform: scale(1); }
      100% { transform: scale(1.1); }
    }
    
    @keyframes gurpsScreenFireParticles {
      0% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
      50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
      100% { transform: translateY(-40px) rotate(360deg); opacity: 0.3; }
    }
    
    @media (max-width: 768px) {
      .fire-text {
        font-size: 2.5rem;
      }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(fireOverlay);
  
  console.log(`${MOD_ID}: Fire overlay created and added to DOM`);
  
  // Remove effect after 3 seconds
  setTimeout(() => {
    console.log(`${MOD_ID}: Removing fire overlay`);
    fireOverlay?.remove();
    style?.remove();
  }, 3000);
}

/**
 * Shows fire effect around a token
 * @param {Token} token - The token to apply the effect to
 */
function showTokenFireEffect(token) {
  if (!canvas || !token) return;
  
  try {
    // Create PIXI fire effect container
    const fireContainer = new PIXI.Container();
    fireContainer.name = "gurps-fire-effect";
    
    // Create fire particles
    for (let i = 0; i < 12; i++) {
      const fire = createFireParticle();
      const angle = (i / 12) * Math.PI * 2;
      const radius = token.w * 0.6;
      
      fire.x = Math.cos(angle) * radius;
      fire.y = Math.sin(angle) * radius;
      fire.anchor.set(0.5);
      
      fireContainer.addChild(fire);
      
      // Animate the particle
      animateFireParticle(fire, angle, radius);
    }
    
    // Position fire effect at token center
    fireContainer.x = token.center.x;
    fireContainer.y = token.center.y;
    
    // Add to canvas
    canvas.stage.addChild(fireContainer);
    
    // Remove effect after 3 seconds
    setTimeout(() => {
      if (fireContainer.parent) {
        fireContainer.parent.removeChild(fireContainer);
      }
    }, 3000);
    
  } catch (error) {
    console.error("Error creating token fire effect:", error);
    // Fallback to screen effect
    showScreenFireEffect(token.actor?.name || "Unknown");
  }
}

/**
 * Creates a fire particle sprite
 * @returns {PIXI.Graphics} Fire particle
 */
function createFireParticle() {
  const fire = new PIXI.Graphics();
  
  // Create fire shape
  fire.beginFill(0xff4500, 0.8);
  fire.drawCircle(0, 0, 8);
  fire.endFill();
  
  // Add inner glow
  fire.beginFill(0xffffff, 0.6);
  fire.drawCircle(0, 0, 4);
  fire.endFill();
  
  return fire;
}

/**
 * Animates a fire particle
 * @param {PIXI.Graphics} particle - The particle to animate
 * @param {number} angle - Base angle for the particle
 * @param {number} radius - Base radius from center
 */
function animateFireParticle(particle, angle, radius) {
  const startTime = Date.now();
  const duration = 3000;
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = elapsed / duration;
    
    if (progress >= 1) return;
    
    // Flickering animation
    const flicker = Math.sin(elapsed * 0.01) * 0.3 + 0.7;
    particle.alpha = flicker;
    
    // Floating animation
    const float = Math.sin(elapsed * 0.005) * 10;
    particle.x = Math.cos(angle) * radius;
    particle.y = Math.sin(angle) * radius + float;
    
    // Scale animation
    const scale = 0.8 + Math.sin(elapsed * 0.008) * 0.4;
    particle.scale.set(scale);
    
    requestAnimationFrame(animate);
  }
  
  animate();
}

/**
 * Clears any existing fire effects for cleanup
 */
export function clearFireEffects() {
  // Remove screen overlay
  const overlay = document.getElementById('gurps-fire-overlay');
  if (overlay) overlay.remove();
  
  const overlayStyle = document.getElementById('gurps-fire-overlay-style');
  if (overlayStyle) overlayStyle.remove();
  
  // Remove canvas effects
  if (canvas?.stage) {
    const fireEffects = canvas.stage.children.filter(child => 
      child.name === "gurps-fire-effect"
    );
    fireEffects.forEach(effect => {
      if (effect.parent) {
        effect.parent.removeChild(effect);
      }
    });
  }
}

// Monitor setting changes to apply/remove effects
Hooks.on("updateSetting", (setting) => {
  if (setting.key === `${MOD_ID}.${SET_ONFIRE_USERS}`) {
    const onFireUsers = setting.value || {};
    
    // Apply effects to users who are now on fire
    Object.keys(onFireUsers).forEach(userId => {
      if (onFireUsers[userId]) {
        applyOnFireEffectsToUserMessages(userId);
      }
    });
    
    // Remove effects from users who are no longer on fire  
    const allUsers = game.users.map(u => u.id);
    allUsers.forEach(userId => {
      if (!onFireUsers[userId]) {
        removeOnFireEffectsFromUserMessages(userId);
      }
    });
  }
});

// Apply effects when new messages are created
Hooks.on("renderChatMessage", (message, html, data) => {
  console.log(`${MOD_ID}: [DEBUG] renderChatMessage hook triggered`, message);
  
  // Handle different ways Foundry passes message data
  const messageDoc = message.document || message;
  let userId = messageDoc?.user ?? messageDoc?.userId ?? message?.user ?? message?.userId;
  
  // Normalize userId to string
  userId = normalizeUserId(userId);
  
  if (!userId) {
    console.warn(`${MOD_ID}: Could not determine user ID for message`, message);
    return;
  }
  
  console.log(`${MOD_ID}: [DEBUG] Processing message from normalized user ID: ${userId}`);
  
  const onFireUsers = game.settings.get(MOD_ID, SET_ONFIRE_USERS) ?? {};
  const isOnFire = onFireUsers[userId] ?? false;
  const useFireAnimation = game.settings.get(MOD_ID, SET_USE_FIRE_ANIMATION);
  const useFireIcons = game.settings.get(MOD_ID, SET_USE_FIRE_ICONS);
  const hideChatIcons = game.settings.get(MOD_ID, "hide-chat-icons");
  const counters = game.settings.get(MOD_ID, SET_FIRE_COUNTERS) ?? {};
  const fireCount = counters[userId] ?? 0;
  const messageElement = html[0] || html;
  
  console.log(`${MOD_ID}: [DEBUG] Settings check - useFireIcons: ${useFireIcons}, useFireAnimation: ${useFireAnimation}, isOnFire: ${isOnFire}, hideChatIcons: ${hideChatIcons}, fireCount: ${fireCount}`);
  console.log(`${MOD_ID}: [DEBUG] Fire counters object:`, counters);
  console.log(`${MOD_ID}: [DEBUG] OnFire users object:`, onFireUsers);
  
  if (!messageElement) return;
  
  const user = game.users.get(userId);
  if (!user) {
    console.warn(`${MOD_ID}: Could not find user with ID ${userId}`);
    return;
  }
  
  console.log(`${MOD_ID}: [DEBUG] User found: ${user.name}`);
  
  // Always apply or remove effects explicitly based on current state
  if (useFireIcons && !hideChatIcons) {
    console.log(`${MOD_ID}: [DEBUG] Fire icons enabled and chat icons not hidden`);
    if (useFireAnimation && isOnFire) {
      // User is on fire and animation is enabled - always apply elaborate effect
      console.log(`${MOD_ID}: Applying elaborate on-fire effect to message from ${user.name}`);
      addOnFireEffectsToMessage(messageElement, user.name || 'Unknown');
      
      // Remove basic fire emojis to avoid duplication
      const fireSpan = messageElement.querySelector('.gurps-fire-emojis');
      if (fireSpan) {
        console.log(`${MOD_ID}: [DEBUG] Removing basic fire emojis to avoid duplication with elaborate effects`);
        fireSpan.remove();
      }
    } else if (fireCount > 0) {
      console.log(`${MOD_ID}: [DEBUG] Animation disabled or user not on fire, using basic fire emojis`);
      // Always remove elaborate effects first
      removeOnFireEffectsFromMessage(messageElement);
      
      // Show basic fire emojis if user has fire counter > 0
      const fireEmojis = getFireEmojis(userId);
      console.log(`${MOD_ID}: [DEBUG] Fire emojis for user ${user.name}: "${fireEmojis}"`);
      const messageContent = messageElement.querySelector('.message-content');
      if (messageContent) {
        let fireSpan = messageContent.querySelector('.gurps-fire-emojis');
        
        if (fireEmojis) {
          console.log(`${MOD_ID}: [DEBUG] Adding basic fire emojis to message content`);
          if (!fireSpan) {
            fireSpan = document.createElement('span');
            fireSpan.className = 'gurps-fire-emojis';
            fireSpan.style.cssText = 'margin-left: 8px; font-size: 1.1em;';
            messageContent.appendChild(fireSpan);
          }
          fireSpan.textContent = ' ' + fireEmojis;
        } else if (fireSpan) {
          console.log(`${MOD_ID}: [DEBUG] No fire emojis to show, removing existing span`);
          fireSpan.remove();
        }
      } else {
        console.log(`${MOD_ID}: [DEBUG] WARNING: Message content not found for basic fire emojis`);
      }
    } else {
      console.log(`${MOD_ID}: [DEBUG] User has no fire count, removing all effects`);
      // No fire count - remove all effects
      removeOnFireEffectsFromMessage(messageElement);
      const fireSpan = messageElement.querySelector('.gurps-fire-emojis');
      if (fireSpan) {
        console.log(`${MOD_ID}: [DEBUG] Removing fire emoji span due to zero fire count`);
        fireSpan.remove();
      }
    }
  } else {
    console.log(`${MOD_ID}: [DEBUG] Fire icons disabled or chat icons hidden - removing all effects`);
    // Fire icons disabled - always remove all effects
    removeOnFireEffectsFromMessage(messageElement);
    const fireSpan = messageElement.querySelector('.gurps-fire-emojis');
    if (fireSpan) {
      console.log(`${MOD_ID}: [DEBUG] Removing fire emoji span due to disabled settings`);
      fireSpan.remove();
    }
  }
  
  console.log(`${MOD_ID}: [DEBUG] renderChatMessage processing completed for user: ${user.name}`);
});