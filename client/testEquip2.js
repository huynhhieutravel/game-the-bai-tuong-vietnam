const { Dispatcher } = await import('./src/engine/core/Dispatcher.js');
const { createGameState } = await import('./src/engine/index.js');
const { CARDS } = await import('./src/data/gameData.js');

let state = createGameState(2);
const horse = CARDS.find(c => c.name === 'Ngựa Chiến (-1)');
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
console.log("Equipment size:", d.getState().players[0].equipment.length);
console.log("Equipment:", d.getState().players[0].equipment.map(e => e.name));
