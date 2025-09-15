// foundryUtils.js - Shared utility functions for GURPS Roll Stats module
import { escapeHtml } from './utils.js';

/**
 * Gets all GM user IDs
 * @returns {string[]} Array of GM user IDs
 */
export function getGMUserIds() {
  return game.users.filter(user => user.isGM).map(user => user.id);
}

/**
 * Gets all GM user names
 * @returns {string[]} Array of GM user names
 */
export function getGMUserNames() {
  return game.users.filter(user => user.isGM).map(user => user.name);
}

/**
 * Gets actor image HTML for display
 * @param {string} actorName - The actor's name
 * @param {string} className - CSS class for the image (optional)
 * @returns {string} HTML string for actor image or empty string
 */
export function getActorImage(actorName, className = 'grs-actor-image-large') {
  if (!actorName) return '';
  const actor = game.actors.find(a => a.name === actorName);
  if (actor?.img) {
    return `<img src="${actor.img}" class="${className}" alt="${escapeHtml(actorName)}">`;
  }
  return '';
}

/**
 * Gets all actor IDs owned by a specific user
 * @param {string} userId - The user ID
 * @returns {string[]} Array of actor IDs owned by the user
 */
export function getActorIdsForUser(userId) {
  if (!userId) return [];
  
  const user = game.users.get(userId);
  if (!user) return [];
  
  // Get all actors owned by this user
  const ownedActors = game.actors.filter(actor => {
    return actor.ownership && actor.ownership[userId] === 3; // OWNER permission level
  });
  
  return ownedActors.map(actor => actor.id);
}