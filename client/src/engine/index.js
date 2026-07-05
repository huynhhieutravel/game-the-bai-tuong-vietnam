// ==========================================
// GAME ENGINE PUBLIC API
// ==========================================

export { Dispatcher } from './core/Dispatcher';
export { createInitialState } from './core/State';
export { GameAPI } from './application/GameAPI';

// Setup & Initialization
export { createGameState, selectDraftHeroes } from './gameSetup';

// Core Utils needed by UI
export { getDistance, getAttackRange } from './rangeSystem';
export { getAlivePlayers, getPlayerFaction, isPlayerRevealed, rankToNumber } from './gameState';
