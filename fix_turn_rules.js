const fs = require('fs');
let code = fs.readFileSync('client/src/engine/rules/TurnRules.js', 'utf8');

code = code.replace(
`import { HeroRegistry } from '../registries/HeroRegistry';`,
`import { HeroRegistry } from '../registries/HeroRegistry';
import { SkillRegistry } from '../registries/SkillRegistry';`
);

code = code.replace(
`  // TODO: Tương lai sẽ có các hook onCalculateHandLimit từ SkillRegistry
  // Ví dụ Khai Quốc (Nguyễn Bặc), Hộ Chủ (Nguyễn Địa Lô)`,
`  const heroes = [HeroRegistry[player.mainHeroId], HeroRegistry[player.subHeroId]];
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
  });`
);

fs.writeFileSync('client/src/engine/rules/TurnRules.js', code);
console.log("Success");
