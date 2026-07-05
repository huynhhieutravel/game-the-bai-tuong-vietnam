import { Dispatcher } from './client/src/engine/core/Dispatcher.js';
import { CARDS, CARD_TYPES } from './client/src/data/gameData.js';
import { getInitialState } from './client/src/engine/core/State.js';

let state = getInitialState([
  { id: 0, isBot: false, isAlive: true, name: 'Human' },
  { id: 1, isBot: true, isAlive: true, name: 'Bot' }
]);

state.currentPhase = 'action';
state.currentPlayerIndex = 0;

const quyetDau = CARDS.find(c => c.name === 'Quyết Đấu');
state.players[0].hand.push(quyetDau);

const dispatcher = new Dispatcher(state);

console.log("PLAYING QUYET DAU");
dispatcher.dispatchAction({
  type: 'ACTION_PLAY_CARD',
  payload: { playerId: 0, cardId: quyetDau.id, targets: [1] }
});

console.log("Wait state after PLAY:", dispatcher.state.waitingForResponse);

if (dispatcher.state.waitingForResponse && dispatcher.state.waitingForResponse.type === 'ask_negate') {
    // Bot is asked first
    console.log("Bot skipping...");
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 1, responseType: 'cancel', data: null }
    });
    console.log("Wait state after Bot skips:", dispatcher.state.waitingForResponse);
    
    // Human is asked next
    console.log("Human skipping...");
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 0, responseType: 'cancel', data: null }
    });
    console.log("Wait state after Human skips:", dispatcher.state.waitingForResponse);
}

