/**
 * Việt Sát Engine v4 - Application Layer Entry Point
 * Cung cấp đầy đủ interface tương thích với React Context & UI Components.
 */

export { DispatcherV4, DispatcherV4 as Dispatcher } from './DispatcherV4.js';
export { GameAPIV4, GameAPIV4 as GameAPI } from './GameAPIV4.js';
export { BotRunnerV4, BotRunnerV4 as BotRunner } from './BotRunnerV4.js';
export { toViewModel } from './GameViewMapperV4.js';
export { createGameState, selectDraftHeroes } from './gameSetupV4.js';
export { hasSkill, hasSkillEvenIfHidden, getPlayerGender, getEffectiveSuit, getEffectiveColor, getEffectiveCard, globalHeroRegistry } from '../heroes/HeroRegistry.js';
export {
  getTargetingDefinition,
  getAvailableTargets,
  validateTargetPayload,
  canPlayCard,
  canUseSkill,
  getValidCardTargets,
  canAttack,
  mapVietnameseToSlug
} from '../rules/TargetResolverV4.js';

export function getPlayerFaction(player) {
  if (!player) return 'none';
  if (player.revealedHeroes && Array.isArray(player.revealedHeroes) && !player.revealedHeroes.some(Boolean)) {
    return 'none';
  }
  if (player.isRevealed === false) {
    return 'none';
  }
  return player.faction || 'none';
}

export { SkillDescriptions, SkillIdToName } from '../../data/SkillDescriptions.js';

