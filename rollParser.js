// rollParser.js - Message parsing logic for GURPS 3d6 roll detection and data extraction
import { stripHtml } from './utils.js';

/**
 * Determines if a chat message represents a 3d6 roll with margin information
 * @param {ChatMessage} msg - The chat message to analyze
 * @returns {boolean} True if this is a parseable 3d6 roll message
 */
export function isRollMessage(msg) {
  // Check standard Foundry roll flags
  if (msg.isRoll) return true;
  if (Array.isArray(msg.rolls) && msg.rolls.length) return true;
  if (msg.roll) return true;
  
  const text = stripHtml(msg.content ?? "");
  
  // Check for GGA (GURPS Game Aid) format: "Rolled (x,y,z) = total"
  if (/Rolled\s*\(\s*\d\s*,\s*\d\s*,\s*\d\s*\)\s*=\s*\d+/i.test(text)) return true;
  
  // Must contain 3d6 reference
  if (!/\b3d6\b/i.test(text)) return false;
  
  // Must also contain margin information (success/failure with degree)
  return checkForMarginInfo(text);
}

/**
 * Checks if the message text contains margin of success/failure information
 * @param {string} text - The message text to analyze
 * @returns {boolean} True if margin information is present
 */
function checkForMarginInfo(text) {
  // Check for "Made it by X" or "Missed it by X" patterns
  if (/Made it by\s+(-?\d+)/i.test(text)) return true;
  if (/Missed it by\s+(-?\d+)/i.test(text)) return true;
  
  // Check for MoS (Margin of Success) or MoF (Margin of Failure) abbreviations
  if (/\bMoS\b\s*[:=]?\s*(-?\d+)/i.test(text)) return true;
  if (/\bMoF\b\s*[:=]?\s*(-?\d+)/i.test(text)) return true;
  
  // Check for explicit Success!/Failure! indicators (usually accompanied by margin)
  if (/Success!/i.test(text) || /Failure!/i.test(text)) return true;
  
  return false;
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
 * Parses a roll message and extracts relevant data for statistics
 * @param {ChatMessage} msg - The chat message to parse
 * @returns {Object|null} Parsed roll data or null if parsing failed
 */
export function parseMessage(msg) {
  const timestamp = new Date((msg.timestamp ?? Date.now())).toISOString();
  const user = getUserName(msg);
  const actor = getActorName(msg.speaker ?? {});
  const flavor = msg.flavor ?? "";
  const text = stripHtml(msg.content ?? "");

  // Extract roll data from Foundry roll object or message text
  const rollObject = (msg.rolls?.[0]) || msg.roll || null;
  const formula = rollObject?.formula ?? "3d6";
  
  // Get total from roll object or parse from text
  const total = Number.isFinite(rollObject?.total) ? rollObject.total : (() => {
    const match = text.match(/=\s*(\d+)\s*\.?/);
    return match ? parseInt(match[1]) : null;
  })();

  // Extract individual dice values (for GGA format)
  let dice = null;
  const diceMatch = text.match(/Rolled\s*\(\s*(\d)\s*,\s*(\d)\s*,\s*(\d)\s*\)\s*=\s*\d+/i);
  if (diceMatch) {
    dice = [parseInt(diceMatch[1]), parseInt(diceMatch[2]), parseInt(diceMatch[3])];
  }

  // Determine success/failure state
  let success = null;
  if (/Success!/i.test(text)) success = true;
  if (/Failure!/i.test(text)) success = false;

  // Extract margin of success/failure
  let margin = null;
  const madeMatch = text.match(/Made it by\s+(-?\d+)/i);
  const missedMatch = text.match(/Missed it by\s+(-?\d+)/i);
  
  if (madeMatch) {
    margin = parseInt(madeMatch[1]);
  } else if (missedMatch) {
    margin = parseInt(missedMatch[1]);
  }

  // Try MoS/MoF patterns if margin not found
  if (margin == null) {
    const mosMatch = text.match(/\bMoS\b\s*[:=]?\s*(-?\d+)/i);
    const mofMatch = text.match(/\bMoF\b\s*[:=]?\s*(-?\d+)/i);
    
    if (mosMatch) {
      margin = parseInt(mosMatch[1]);
    } else if (mofMatch) {
      margin = -Math.abs(parseInt(mofMatch[1])); // Ensure MoF is negative
    }
  }

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
    text 
  };
}