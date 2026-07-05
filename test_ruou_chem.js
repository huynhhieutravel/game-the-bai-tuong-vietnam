import { Dispatcher } from './client/src/engine/core/Dispatcher.js';
import { CardRegistry } from './client/src/engine/registries/CardRegistry.js';

const initialState = {
  players: [
    { id: 0, hp: 4, maxHp: 4, hand: [{ id: 'ruou1', name: 'Rượu' }, { id: 'chem1', name: 'Chém' }], equipment: [], isAlive: true, drankWine: false, attackCountThisTurn: 0 },
    { id: 1, hp: 4, maxHp: 4, hand: [], equipment: [], isAlive: true }
  ],
  actionQueue: [],
  reactionStack: [],
  history: [],
  discardPile: [],
  turnData: {
     currentPlayerId: 0
  }
};

const d = new Dispatcher(initialState);
d.dispatchAction({ type: 'ACTION_PLAY_CARD', payload: { playerId: 0, cardId: 'ruou1', targets: [0], virtualCardName: 'Rượu' } });

console.log("After Ruou:", d.state.players[0].drankWine);

d.dispatchAction({ type: 'ACTION_PLAY_CARD', payload: { playerId: 0, cardId: 'chem1', targets: [1], virtualCardName: 'Chém' } });

// Simulate the target taking damage (no dodge)
console.log("Target HP after Slash (before tick if reaction):", d.state.players[1].hp);

// Loop tick to resolve
d.tick();
console.log("Target HP after tick:", d.state.players[1].hp);
