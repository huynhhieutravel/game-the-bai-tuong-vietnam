import { getPlayerGender } from './client/src/engine/gameState.js';
const player = { heroes: [{}, {}], revealedHeroes: [true, false], mainHeroId: 'le-loi', subHeroId: 'le-lai' };
console.log(getPlayerGender(player));
