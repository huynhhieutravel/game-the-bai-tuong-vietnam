import { createGameState } from './src/engine/index.js';
import { canPlayCard } from './src/engine/rules/CardRules.js';
import { CARDS } from './src/data/gameData.js';

const state = createGameState(1);
state.players[0].isAlive = true;
state.players[0].hand = [CARDS.find(c => c.name === 'Bát Quái')];
state.players[0].equipment = []; // No equipment

const result = canPlayCard(state, 0, 'Bát Quái', state.players[0].hand[0].id);
console.log('Result for Bát Quái:', result);
