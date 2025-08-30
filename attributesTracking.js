// attributesTracking.js - Enhanced HP/FP tracking for GURPS Roll Stats
import { MOD_ID, SET_DAMAGE_LOG, SET_FATIGUE_LOG } from './constants.js';

// Module-level socket instance
let _socket = null;

// NEW: Temporary storage for actor data before update
const _actorPreUpdateData = new Map();

/**
 * Sets the socketlib instance for this module
 * @param {Object} socketInstance - The initialized socketlib instance
 */
export function setSocketLibInstance(socketInstance) {
  _socket = socketInstance;
}

/**
 * Gets the user who made the change (best effort)
 * @param {string} userId - The user ID from the hook
 * @returns {string} User name or ID
 */
function getChangedByUser(userId) {
  if (!userId) return "Unknown";
  const user = game.users.get(userId);
  return user?.name || userId;
}

/**
 * Processes HP changes and logs damage taken
 * @param {Actor} actor - The actor being updated
 * @param {Object} changes - The changes being made
 * @param {string} userId - ID of user making the change
 */
async function processHPChange(actor, changes, userId) {
  const hpChange = changes.system?.HP;
  if (!hpChange) return;

  // NEW: Get currentHP from pre-update data first, fallback to GURPS.LastActor, then actor.system
  let currentHP;
  const preUpdateActorData = _actorPreUpdateData.get(actor.id);
  if (preUpdateActorData?.HP?.value !== undefined) {
    currentHP = preUpdateActorData.HP.value;
  } else {
    currentHP = GURPS?.LastActor?.system?.HP?.value ?? actor.system?.HP?.value ?? 0;
  }
  
  const newHP = hpChange.value ?? currentHP;
  
  console.log(`${MOD_ID}: [DEBUG] --- Debug de Mudança de HP ---`);
  console.log(`${MOD_ID}: [DEBUG] ID do Ator: ${actor.id}`);
  console.log(`${MOD_ID}: [DEBUG] Nome do Ator: ${actor.name}`);
  console.log(`${MOD_ID}: [DEBUG] Pre-update HP from map: ${preUpdateActorData?.HP?.value}`);
  console.log(`${MOD_ID}: [DEBUG] HP de GURPS.LastActor: ${GURPS?.LastActor?.system?.HP?.value}`);
  console.log(`${MOD_ID}: [DEBUG] HP do objeto 'actor' (passado para o hook): ${actor.system?.HP?.value}`);
  console.log(`${MOD_ID}: [DEBUG] HP 'atual' calculado (usado para comparação): ${currentHP}`);
  console.log(`${MOD_ID}: [DEBUG] Novo HP (do objeto 'changes'): ${newHP}`);
  console.log(`${MOD_ID}: [DEBUG] Condição newHP < currentHP: ${newHP < currentHP}`);
  console.log(`${MOD_ID}: [DEBUG] --- Fim do Debug de Mudança de HP ---`);
  
  // Only log if HP decreased (damage taken)
  if (newHP < currentHP) {
    const damageTaken = currentHP - newHP;
    
    const damageEntry = {
      timestamp: new Date().toISOString(),
      actorId: actor.id,
      actorName: actor.name,
      damageTaken: damageTaken,
      hpBefore: currentHP,
      hpAfter: newHP,
      changedBy: getChangedByUser(userId),
      changedByUserId: userId
    };

    console.log(`${MOD_ID}: [DAMAGE] ${actor.name} took ${damageTaken} damage (${currentHP} -> ${newHP})`);

    // Store the damage entry
    if (game.user.isGM) {
      await updateDamageLogGM(damageEntry);
    } else {
      // Send to GM via socketlib if available
      if (_socket && _socket.executeAsGM) {
        _socket.executeAsGM('updateDamageLog', damageEntry);
      }
    }
  }
}

/**
 * Processes FP changes and logs fatigue spent
 * @param {Actor} actor - The actor being updated
 * @param {Object} changes - The changes being made
 * @param {string} userId - ID of user making the change
 */
async function processFPChange(actor, changes, userId) {
  const fpChange = changes.system?.FP;
  if (!fpChange) return;

  // NEW: Get currentFP from pre-update data first, fallback to GURPS.LastActor, then actor.system
  let currentFP;
  const preUpdateActorData = _actorPreUpdateData.get(actor.id);
  if (preUpdateActorData?.FP?.value !== undefined) {
    currentFP = preUpdateActorData.FP.value;
  } else {
    currentFP = GURPS?.LastActor?.system?.FP?.value ?? actor.system?.FP?.value ?? 0;
  }
  
  const newFP = fpChange.value ?? currentFP;
  
  console.log(`${MOD_ID}: [DEBUG] --- Debug de Mudança de FP ---`);
  console.log(`${MOD_ID}: [DEBUG] ID do Ator: ${actor.id}`);
  console.log(`${MOD_ID}: [DEBUG] Nome do Ator: ${actor.name}`);
  console.log(`${MOD_ID}: [DEBUG] Pre-update FP from map: ${preUpdateActorData?.FP?.value}`);
  console.log(`${MOD_ID}: [DEBUG] FP de GURPS.LastActor: ${GURPS?.LastActor?.system?.FP?.value}`);
  console.log(`${MOD_ID}: [DEBUG] FP do objeto 'actor' (passado para o hook): ${actor.system?.FP?.value}`);
  console.log(`${MOD_ID}: [DEBUG] FP 'atual' calculado (usado para comparação): ${currentFP}`);
  console.log(`${MOD_ID}: [DEBUG] Novo FP (do objeto 'changes'): ${newFP}`);
  console.log(`${MOD_ID}: [DEBUG] Condição newFP < currentFP: ${newFP < currentFP}`);
  console.log(`${MOD_ID}: [DEBUG] --- Fim do Debug de Mudança de FP ---`);
  
  // Only log if FP decreased (fatigue spent)
  if (newFP < currentFP) {
    const fatigueSpent = currentFP - newFP;
    
    const fatigueEntry = {
      timestamp: new Date().toISOString(),
      actorId: actor.id,
      actorName: actor.name,
      fatigueSpent: fatigueSpent,
      fpBefore: currentFP,
      fpAfter: newFP,
      changedBy: getChangedByUser(userId),
      changedByUserId: userId
    };

    console.log(`${MOD_ID}: [FATIGUE] ${actor.name} spent ${fatigueSpent} fatigue (${currentFP} -> ${newFP})`);

    // Store the fatigue entry
    if (game.user.isGM) {
      await updateFatigueLogGM(fatigueEntry);
    } else {
      // Send to GM via socketlib if available
      if (_socket && _socket.executeAsGM) {
        _socket.executeAsGM('updateFatigueLog', fatigueEntry);
      }
    }
  }
}

/**
 * Updates damage log with new damage entry (GM only)
 * @param {Object} damageEntry - The damage entry to add
 */
async function updateDamageLogGM(damageEntry) {
  const existingDamage = game.settings.get(MOD_ID, SET_DAMAGE_LOG) ?? [];
  existingDamage.push(damageEntry);
  await game.settings.set(MOD_ID, SET_DAMAGE_LOG, existingDamage);
}

/**
 * Updates fatigue log with new fatigue entry (GM only)
 * @param {Object} fatigueEntry - The fatigue entry to add
 */
async function updateFatigueLogGM(fatigueEntry) {
  const existingFatigue = game.settings.get(MOD_ID, SET_FATIGUE_LOG) ?? [];
  existingFatigue.push(fatigueEntry);
  await game.settings.set(MOD_ID, SET_FATIGUE_LOG, existingFatigue);
}

// NEW: Hook into preUpdateActor to store current HP/FP values before update
Hooks.on("preUpdateActor", (actor, changes, options, userId) => {
  try {
    console.log(`${MOD_ID}: [DEBUG] preUpdateActor hook disparado para ${actor.name}`);
    console.log(`${MOD_ID}: [DEBUG] Storing pre-update data - HP: ${actor.system?.HP?.value}, FP: ${actor.system?.FP?.value}`);
    
    // Store the current HP and FP values before the update is applied
    _actorPreUpdateData.set(actor.id, {
      HP: { value: actor.system?.HP?.value },
      FP: { value: actor.system?.FP?.value }
    });
  } catch (error) {
    console.error(`${MOD_ID}: Error in preUpdateActor hook:`, error);
  }
});

// Hook into actor updates to track HP and FP changes
Hooks.on("updateActor", async (actor, changes, options, userId) => {
  try {
    // DEBUG: Verificar se o hook está sendo disparado
    console.log(`${MOD_ID}: [DEBUG] updateActor hook disparado para ${actor.name}`, {
      actorId: actor.id,
      changes: changes,
      userId: userId
    });
    
    // Process HP changes (damage taken)
    if (changes.system?.HP) {
      console.log(`${MOD_ID}: [DEBUG] Detectada mudança de HP para ${actor.name}`);
      await processHPChange(actor, changes, userId);
    }
    
    // Process FP changes (fatigue spent)
    if (changes.system?.FP) {
      console.log(`${MOD_ID}: [DEBUG] Detectada mudança de FP para ${actor.name}`);
      await processFPChange(actor, changes, userId);
    }

    // NEW: Clean up pre-update data after processing
    _actorPreUpdateData.delete(actor.id);
    console.log(`${MOD_ID}: [DEBUG] Cleaned up pre-update data for ${actor.name}`);

  } catch (error) {
    console.error(`${MOD_ID}: Error processing actor attribute changes:`, error);
  }
});

// Export functions for use in main.js
export { updateDamageLogGM, updateFatigueLogGM };