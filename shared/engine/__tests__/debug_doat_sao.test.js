import { describe, it } from 'vitest';
import { GameEngine } from '../core/GameEngine.js';
import { getBotAction } from '../ai/botLogic.js';

describe('Debug doat-sao', () => {
    it('should process ask_doat_sao_discard correctly', () => {
        const engine = new GameEngine([
            { id: 0, name: 'Player 0', isBot: true, mainHeroId: 'nguyen-dia-lo', subHeroId: 'nguyen-dia-lo' },
            { id: 1, name: 'Player 1', isBot: true, mainHeroId: 'nguyen-dia-lo', subHeroId: 'nguyen-dia-lo' },
        ]);
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
    });
});
