import { Dispatcher } from './client/src/engine/core/Dispatcher.js';
import { canPlayCard } from './client/src/engine/rules/CardRules.js';

const initialState = {
  players: [
    { id: 0, hp: 4, maxHp: 4, hand: [{id: 'chem1', name: 'Chém'}, {id: 'chem2', name: 'Chém'}], equipment: [], isAlive: true, heroes: [] },
    { id: 1, hp: 4, maxHp: 4, hand: [{id: 'ne1', name: 'Né'}], equipment: [], isAlive: true, heroes: [] }
  ],
  actionQueue: [],
  reactionStack: [],
  history: [],
  deck: [],
  discardPile: [],
  turnData: { currentPlayerId: 0 }
};

const d = new Dispatcher(initialState);
d.dispatchAction({ type: 'ACTION_PLAY_CARD', payload: { playerId: 0, cardId: 'chem1', targets: [1] } });
console.log("After 1st chem, attackCount:", d.state.players[0].attackCountThisTurn);
console.log("Can play 2nd chem?", canPlayCard(d.state, 0, 'Chém', 'chem2'));

// Simulate target dodges
d.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 1, responseType: 'play', data: { doReact: true, cardId: 'ne1' } } });

console.log("After dodge, attackCount:", d.state.players[0].attackCountThisTurn);
console.log("Can play 2nd chem?", canPlayCard(d.state, 0, 'Chém', 'chem2'));
