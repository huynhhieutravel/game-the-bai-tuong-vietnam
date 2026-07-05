const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

const regex = /'khai-quoc': \{[\s\S]*?aiConfig: \{ priority: 5, condition: \(\) => false \}\n  \},/;

const newCode = `'khai-quoc': {
    id: 'khai-quoc',
    name: 'Khai Quốc',
    type: SKILL_TYPES.PASSIVE,
    hooks: {
      ON_CALCULATE_HAND_LIMIT: (state, playerId, currentLimit) => {
         let sonCount = 0;
         state.players.forEach(p => {
             if (!p.isAlive) return;
             const h1 = HeroRegistry[p.mainHeroId];
             const h2 = HeroRegistry[p.subHeroId];
             if (p.revealedHeroes && p.revealedHeroes[0] && h1 && h1.faction === 'Sơn') sonCount++;
             if (p.revealedHeroes && p.revealedHeroes[1] && h2 && h2.faction === 'Sơn') sonCount++;
         });
         return currentLimit + (sonCount * 2);
      }
    }
  },`;

if(regex.test(code)) {
    code = code.replace(regex, newCode);
    fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
    console.log("Success");
} else {
    console.log("Regex not found");
}
