import { Dispatcher } from './src/engine/core/Dispatcher.js';
import { createGameState } from './src/engine/gameSetup.js';

let rawState = createGameState(4);
rawState.actionQueue = [];
rawState.reactionStack = [];
rawState.waitingForResponse = null;
rawState.history = [];

let p0 = rawState.players[0]; p0.id = 0; p0.isAlive = true;
let p1 = rawState.players[1]; p1.id = 1; p1.isAlive = true;
let p2 = rawState.players[2]; p2.id = 2; p2.isAlive = true;
let p3 = rawState.players[3]; p3.id = 3; p3.isAlive = true;

let dispatcher = new Dispatcher(rawState);

const cuopBai = { id: 'cuop-bai-1', name: 'Cướp Bài', type: 'Cẩm nang' };
const hg1 = { id: 'hg-1', name: 'Hóa Giải', type: 'Cẩm nang' };
p0.hand = [cuopBai];
p1.hand = [hg1];

dispatcher.dispatchAction({
    type: 'ACTION_PLAY_CARD',
    payload: { playerId: 0, cardId: cuopBai.id, targets: [1] }
});

console.log('Ask Queue before P1 reacts:', dispatcher.state.waitingForResponse.askQueue);

dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 1, cardId: hg1.id } });

console.log('Ask Queue after P1 reacts:', dispatcher.state.waitingForResponse.askQueue);
