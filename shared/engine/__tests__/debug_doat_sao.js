import { GameEngine } from '../core/GameEngine.js';
import { getBotAction } from '../ai/botLogic.js';

const engine = new GameEngine();
engine.initializeGame({
    players: [
        { id: 0, name: 'Player 0', isBot: true },
        { id: 1, name: 'Player 1', isBot: true },
    ]
});
engine.getState().players[0].mainHeroId = 'nguyen-dia-lo';
engine.getState().players[0].subHeroId = 'nguyen-dia-lo'; // Đoạt Sáo
engine.getState().players[0].revealedHeroes = [true, true];
engine.getState().players[0].hand = [ { id: 'c1', name: 'Slash', type: 'basic' } ];

engine.dispatcher.state.waitingForResponse = {
    type: 'ask_doat_sao_discard',
    sourceId: 0,
    skillId: 'doat-sao',
    responderId: 0
};

console.log("Before dispatch:", engine.getState().waitingForResponse);
const action = getBotAction(engine.getState(), engine.getState().players[0]);
console.log("Bot Action:", action);
engine.dispatcher.dispatchAction(action);
console.log("After dispatch:", engine.getState().waitingForResponse);
