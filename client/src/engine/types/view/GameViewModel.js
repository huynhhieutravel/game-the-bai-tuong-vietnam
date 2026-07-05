/**
 * @typedef {import('./PlayerViewModel').PlayerViewModel} PlayerViewModel
 * @typedef {import('./CardViewModel').CardViewModel} CardViewModel
 * 
 * @typedef {Object} GameViewModel
 * @property {number} turn
 * @property {string} phase
 * @property {Array<PlayerViewModel>} players
 * @property {number} [currentPlayerIndex]
 * @property {Array<string>} [deck]
 * @property {Array<string>} [discardPile]
 * @property {Array<CardViewModel>} [playedCards]
 * @property {Array<any>} [logs]
 * @property {Array<any>} [reactions]
 * @property {boolean} gameOver
 * @property {any} winner
 * @property {any} waitingForResponse
 * @property {Array<any>} chainedDamageQueue
 * @property {number} [turn]
 */

export {};
