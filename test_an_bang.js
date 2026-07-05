import { Dispatcher } from './client/src/engine/core/Dispatcher.js';

const initialState = {
  players: [
    { id: 0, hp: 4, maxHp: 4, hand: [], equipment: [], isAlive: true, anBangUsed: false, heroes: [{ id: 'huyen-tran', name: 'Huyền Trân Công Chúa', faction: 'Trần' }] }
  ],
  actionQueue: [],
  reactionStack: [],
  history: [],
  deck: [{ id: 'card1', name: 'Chém', color: 'black' }],
  discardPile: [],
  turnData: {
     currentPlayerId: 0
  }
};

const d = new Dispatcher(initialState);
d.dispatchAction({ type: 'ACTION_END_PHASE', payload: { playerId: 0 } });
d.tick(); // Will process END_PHASE, which triggers ask_an_bang

console.log("Waiting for response after END_PHASE:", d.state.waitingForResponse);

// Simulate clicking "Rút bài"
d.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 0, responseType: 'play', data: { doUse: true } } });
d.tick();

console.log("Waiting for response after Rút bài:", d.state.waitingForResponse);
console.log("Player hand:", d.state.players[0].hand);
