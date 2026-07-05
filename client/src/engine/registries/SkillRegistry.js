// @ts-check
/**
 * @typedef {import('../types/GameState').GameState} GameState
 * @typedef {import('../types/PlayerState').PlayerState} PlayerState
 * @typedef {import('../types/Action').ClientAction} ClientAction
 * @typedef {import('../types/Event').EngineEvent} EngineEvent
 * @typedef {import('../types/Card').CardDefinition} CardDefinition
 * @typedef {import('../types/Hero').Hero} Hero
 */
// ==========================================
// Skill Registry - Định nghĩa toàn bộ Kỹ năng
// ==========================================
import { getAlivePlayers, addLog, isPlayerRevealed, getPlayerFaction } from '../gameState';
import * as Effects from '../core/Effects';
import { HeroRegistry } from './HeroRegistry';
import { canUseSkill } from '../rules/SkillRules';
import * as Actions from '../core/Actions';
import { getAttackRange, getDistance } from '../rangeSystem';

const rankToNumber = (rank) => {
    if (rank === 'A') return 1;
    if (rank === 'J') return 11;
    if (rank === 'Q') return 12;
    if (rank === 'K') return 13;
    return parseInt(rank) || 0;
};




import { SKILL_TYPES } from './skills/constants.js';
export { SKILL_TYPES };
import { systemSkills } from './skills/system.js';
import { passiveSkills } from './skills/passive.js';
import { reactionSkills } from './skills/reaction.js';
import { combatSkills } from './skills/combat.js';
import { equipmentSkills } from './skills/equipment.js';

export const SkillRegistry = {
  ...systemSkills,
  ...passiveSkills,
  ...reactionSkills,
  ...combatSkills,
  ...equipmentSkills
};
