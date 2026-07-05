import { HeroRegistry } from '../registries/HeroRegistry';
import { SkillRegistry } from '../registries/SkillRegistry';

export function getHandLimit(state, playerId) {
  const player = state.players.find(p => p.id === playerId);
  if (!player || !player.isAlive) return 0;
  
  let limit = player.hp;
  
  const heroes = [HeroRegistry[player.mainHeroId], HeroRegistry[player.subHeroId]];
  heroes.forEach((hero, index) => {
      if (hero && hero.skillIds) {
          hero.skillIds.forEach(skillId => {
              const skillConfig = SkillRegistry[skillId];
              if (skillConfig && skillConfig.hooks && skillConfig.hooks.ON_CALCULATE_HAND_LIMIT) {
                  if (player.revealedHeroes && (player.revealedHeroes[index] || skillConfig.canTriggerUnrevealed)) {
                      limit = skillConfig.hooks.ON_CALCULATE_HAND_LIMIT(state, playerId, limit);
                  }
              }
          });
      }
  });
  
  return limit >= 0 ? limit : 0;
}

export function mustDiscardCards(state, playerId) {
  const player = state.players.find(p => p.id === playerId);
  if (!player || !player.isAlive) return 0;
  
  const limit = getHandLimit(state, playerId);
  const excess = player.hand.length - limit;
  
  return excess > 0 ? excess : 0;
}
