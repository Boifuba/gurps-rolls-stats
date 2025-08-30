// rollParser.js - Message parsing logic for GURPS 3d6 roll detection using GURPS.lastTargetedRoll
import { MOD_ID } from './constants.js';
import { stripHtml } from './utils.js';

/**
 * Determines if a chat message represents a 3d6 roll by checking GURPS.lastTargetedRoll
 * @param {ChatMessage} msg - The chat message to analyze
 * @returns {boolean} True if this is a parseable 3d6 roll message
 */
export function isRollMessage(msg) {
  // Check if GURPS is available and if lastTargetedRoll has data
  if (typeof GURPS === 'undefined') {
    return false;
  }
  
  // Only return true if GURPS.lastTargetedRoll exists and has the data we need
  const hasLastTargetedRoll = GURPS.lastTargetedRoll && 
    typeof GURPS.lastTargetedRoll === 'object' &&
    Number.isFinite(GURPS.lastTargetedRoll.rtotal);
  
  return hasLastTargetedRoll;
}

/**
 * Extracts the user name from a chat message
 * @param {ChatMessage} msg - The chat message
 * @returns {string} The user's display name
 */
export function getUserName(msg) {
  const userId = msg.user ?? msg.userId;
  return game.users.get(userId)?.name ?? msg.author?.name ?? String(userId ?? "");
}

/**
 * Extracts the actor name from a message speaker
 * @param {Object} speaker - The message speaker object
 * @returns {string} The actor's name or alias
 */
export function getActorName(speaker) {
  const actor = speaker?.actor ? game.actors.get(speaker.actor) : null;
  return actor?.name ?? speaker?.alias ?? "";
}

/**
 * Parses a roll message using GURPS.lastTargetedRoll object exclusively
 * @param {ChatMessage} msg - The chat message to parse
 * @returns {Object|null} Parsed roll data or null if GURPS object not available
 */
export function parseMessage(msg) {
  // Use GURPS.lastTargetedRoll if available
  if (typeof GURPS !== 'undefined' && GURPS.lastTargetedRoll) {
    console.log(`${MOD_ID}: [DEBUG] Using GURPS.lastTargetedRoll data directly`);
    return parseFromGurpsObject(msg, GURPS.lastTargetedRoll);
  }
  
  console.log(`${MOD_ID}: [DEBUG] GURPS.lastTargetedRoll not available`);
  return null;
}

/**
 * Parses roll data from GURPS.lastTargetedRoll object
 * @param {ChatMessage} msg - The chat message
 * @param {Object} gurpsRoll - The GURPS.lastTargetedRoll object
 * @returns {Object} Parsed roll data
 */
function parseFromGurpsObject(msg, gurpsRoll) {
  const timestamp = new Date((msg.timestamp ?? Date.now())).toISOString();
  const user = getUserName(msg);
  const actor = getActorName(msg.speaker ?? {});
  const flavor = msg.flavor ?? "";
  const text = stripHtml(msg.content ?? "");

  // Extract data directly from GURPS object
  const total = gurpsRoll.rtotal;
  const formula = "3d6"; // GURPS always uses 3d6
  
  // Parse dice from rolls string (format: "4,5,4")
  let dice = null;
  if (gurpsRoll.rolls && typeof gurpsRoll.rolls === 'string') {
    const diceValues = gurpsRoll.rolls.split(',').map(d => parseInt(d.trim()));
    if (diceValues.length === 3 && diceValues.every(d => d >= 1 && d <= 6)) {
      dice = diceValues;
    }
  }

  // Extract success/failure directly from GURPS object
  // Based on Object.example: failure: true means it was a failure
  const success = gurpsRoll.failure === false ? true : (gurpsRoll.failure === true ? false : null);
  
  // Extract margin directly from GURPS object
  const margin = Number.isFinite(gurpsRoll.margin) ? gurpsRoll.margin : null;
  
  // Extract critical outcomes directly from GURPS object
  const isCritSuccess = gurpsRoll.isCritSuccess === true;
  const isCritFailure = gurpsRoll.isCritFailure === true;

  return { 
    timestamp, 
    user, 
    actor, 
    formula, 
    total, 
    dice, 
    success, 
    margin, 
    flavor, 
    text,
    isCritSuccess,
    isCritFailure
  };
}