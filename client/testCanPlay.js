import { canPlayCard } from './src/engine/rules/CardRules.js';
import { CARDS } from './src/data/gameData.js';
import { createGameState } from './src/engine/index.js';

let state = createGameState(2);
const horse = CARDS.find(c => c.name === 'Ngựa Chiến (-1)');
state.players[0].hand.push({...horse, id: 'test-horse-id'});

const validation = canPlayCard(state, 0, 'Ngựa Chiến (-1)', 'test-horse-id');
console.log("Horse play valid:", validation.valid);

