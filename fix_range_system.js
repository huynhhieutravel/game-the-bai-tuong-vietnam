const fs = require('fs');
let code = fs.readFileSync('client/src/engine/rangeSystem.js', 'utf8');

const importStatement = `import HeroRegistry from './registries/HeroRegistry.js';\n`;
if (!code.includes('import HeroRegistry')) {
   code = importStatement + code;
}

code = code.replace(
`  const hasDamBac = targetPlayer.heroes?.some((h, i) => targetPlayer.revealedHeroes[i] && h.skills?.some(s => s.id === 'dam-bac'));`,
`  const checkDamBac = (heroId) => {
      if (!heroId) return false;
      const hero = HeroRegistry[heroId];
      return hero && hero.skillIds && hero.skillIds.includes('dam-bac');
  };
  const hasDamBac = (targetPlayer.revealedHeroes && targetPlayer.revealedHeroes[0] && checkDamBac(targetPlayer.mainHeroId)) || 
                    (targetPlayer.revealedHeroes && targetPlayer.revealedHeroes[1] && checkDamBac(targetPlayer.subHeroId));`
);

fs.writeFileSync('client/src/engine/rangeSystem.js', code);
console.log("Success");
