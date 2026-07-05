import fs from 'fs';
import { Dispatcher } from './client/src/engine/core/Dispatcher.js';
import { CARDS, CARD_TYPES } from './client/src/data/gameData.js';
import { getInitialState } from './client/src/engine/core/State.js';

// Setup state
let state = getInitialState([
  { id: 0, isBot: false, isAlive: true },
  { id: 1, isBot: true, isAlive: true }
]);

state.currentPhase = 'action';
state.currentPlayerIndex = 0;

// Find Hỗn Loạn
const honLoan = CARDS.find(c => c.name === 'Hỗn Loạn');
state.players[0].hand.push(honLoan);

const dispatcher = new Dispatcher(state);
dispatcher.dispatchAction({
  type: 'ACTION_PLAY_CARD',
  payload: {
    playerId: 0,
    cardId: honLoan.id,
    targets: [1]
  }
});

console.log("Player 0 Hand:", dispatcher.state.players[0].hand.length);
console.log("Player 1 Judgement:", dispatcher.state.players[1].judgementArea ? dispatcher.state.players[1].judgementArea.length : 0);
console.log("Action Queue:", dispatcher.state.actionQueue.length);
console.log("Reaction Stack:", dispatcher.state.reactionStack.length);
console.log("Waiting For Response:", dispatcher.state.waitingForResponse);

