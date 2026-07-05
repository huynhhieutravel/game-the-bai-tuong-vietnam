/**
 * Định nghĩa Trạng thái Game
 * 
 * @typedef {import('./PlayerState').PlayerState} PlayerState
 * 
 * @typedef {Object} GameState
 * @property {string} phase
 * @property {PlayerState[]} players
 * @property {any[]} playedCards
 * @property {any[]} [history]
 * @property {any[]} [reactions]
 * @property {boolean} [gameOver]
 * @property {boolean} [isGameOver]
 * @property {any} [winner]
 * @property {any} [waitingForResponse]
 * @property {any[]} [chainedDamageQueue]
 * @property {string} [currentPhase]
 * @property {string[]} [logs]
 * @property {any[]} [reactionStack]
 * @property {string[]} [deck]
 * @property {string[]} [discardPile]
 * @property {number} [currentPlayerIndex]
 * @property {number} [turn]
 * @property {string} [activeSkill]
 * @property {number[]} [skillTargets]
 * @property {string[]} [skillCards]
 */

export {};
