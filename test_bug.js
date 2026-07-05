import { Dispatcher } from './client/src/engine/core/Dispatcher.js';
import { getInitialState } from './client/src/engine/core/State.js';

let state = getInitialState([{ id: 0, isAlive: true }, { id: 1, isAlive: true }]);

const dispatcher = new Dispatcher(state);

dispatcher.state.waitingForResponse = {
    type: 'ask_negate',
    sourceId: 0,
    targetId: 1, // Victim is 1
    trickType: 'quyet-dau',
    sourceCardId: '123',
    isNegated: false,
    askQueue: [0, 1] // Human is asked to negate
};

console.log("Dispatching ACTION_REACT for playerId 0...");
dispatcher.dispatchAction({
    type: 'ACTION_REACT',
    payload: { playerId: 0, responseType: 'cancel', data: null }
});

console.log("waitingForResponse after react:", dispatcher.state.waitingForResponse);
