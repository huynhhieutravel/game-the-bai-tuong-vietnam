const fs = require('fs');

let code = fs.readFileSync('client/src/engine/core/handlers/TrickHandler.js', 'utf8');

// Add import
if (!code.includes('import { HeroRegistry }')) {
    code = code.replace("import * as Effects from '../Effects';", "import * as Effects from '../Effects';\nimport { HeroRegistry } from '../../registries/HeroRegistry';");
}

code = code.replace(
`         const quanCoPlayers = orderedIds.filter(id => {
             const p = dispatcher.state.players.find(x => x.id === id);
             return p.heroes?.some((h, i) => p.revealedHeroes[i] && h.skills?.some(s => s.id === 'quan-co'));
         });`,
`         const quanCoPlayers = orderedIds.filter(id => {
             const p = dispatcher.state.players.find(x => x.id === id);
             const heroes = [HeroRegistry[p.mainHeroId], HeroRegistry[p.subHeroId]];
             return heroes.some((hero, i) => hero && hero.skillIds && hero.skillIds.includes('quan-co') && p.revealedHeroes[i]);
         });`
);
fs.writeFileSync('client/src/engine/core/handlers/TrickHandler.js', code);
console.log("Success");
