/**
 * Việt Sát Engine v4 - Unified Entry Point
 * Nhân game chuẩn Tam Quốc Sát: Headless State Machine, Priority Stack & Modular Hero Registry.
 */

export * from './core/GameState.js';
export * from './core/StateMachine.js';
export * from './core/PriorityStack.js';
export * from './core/Invariants.js';

export * from './rules/RangeSystem.js';
export * from './rules/CombatRules.js';
export * from './rules/TrickRules.js';

export * from './heroes/base/SkillContract.js';
export * from './heroes/HeroRegistry.js';
export * from './heroes/lac/index.js';
export * from './heroes/viet/index.js';
export * from './heroes/ha/index.js';
export * from './heroes/son/index.js';

export * from './ai/BotBrain.js';
export * from './simulation/HeadlessRunner.js';
export * from './application/index.js';

// Convenient UI / Engine Helpers
export function hasSkill(player, skillId, requireRevealed = false) {
  if (!player) return false;
  return globalHeroRegistry.hasSkill(player, skillId, requireRevealed);
}

export function isPlayerRevealed(player) {
  if (!player) return false;
  return Boolean(player.revealedHeroes && player.revealedHeroes.some(Boolean));
}

export function getPlayerFaction(player) {
  if (!player) return 'none';
  return player.faction || 'none';
}

export function getPlayerGender(player) {
  if (!player) return 'male';
  return player.gender || 'male';
}

export function getDistance(state, sourceId, targetId) {
  if (!state) return 1;
  const p1 = state.getPlayer ? state.getPlayer(sourceId) : (state.players || []).find(p => p.id === sourceId);
  const p2 = state.getPlayer ? state.getPlayer(targetId) : (state.players || []).find(p => p.id === targetId);
  const alive = state.getAlivePlayers ? state.getAlivePlayers() : (state.players || []).filter(p => p.isAlive);
  if (!p1 || !p2) return 1;
  return RangeSystem.calculateDistance(p1, p2, alive);
}

export function getAttackRange(state, playerId) {
  if (!state) return 1;
  const p = state.getPlayer ? state.getPlayer(playerId) : (state.players || []).find(p => p.id === playerId);
  if (!p) return 1;
  return RangeSystem.getAttackRange(p);
}
