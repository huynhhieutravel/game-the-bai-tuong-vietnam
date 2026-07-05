import { Dispatcher } from './src/engine/core/Dispatcher.js';
import { createGameState } from './src/engine/index.js';
import { CARDS } from './src/data/gameData.js';
import { Effects } from './src/engine/core/Effects.js';

let state = createGameState(2);
// Find a horse
const horse = CARDS.find(c => c.name.includes('Ngựa'));
state.players[0].hand.push({...horse, id: 'test-horse-id'});

const d = new Dispatcher(state);
d.dispatchAction({
    type: 'ACTION_PLAY_CARD',
    payload: {
        playerId: 0,
        cardId: 'test-horse-id',
        targets: []
    }
});

console.log("Hand size:", d.getState().players[0].hand.length);
console.log("Equipment:", d.getState().players[0].equipment.map(e => e.name));
