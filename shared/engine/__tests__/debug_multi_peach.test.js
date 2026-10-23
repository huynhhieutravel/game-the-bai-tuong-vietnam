import { describe, it, expect } from 'vitest';
import { GameEngine } from '../core/GameEngine.js';
import { Effects } from '../core/Effects.js';

describe('Multi-Peach Mechanics', () => {
    it('should ask for 2 peaches if a player takes 2 damage while at 1 HP', () => {
        const engine = new GameEngine([
            { id: 0, name: 'Attacker', isBot: true, mainHeroId: 'tran-quang-khai', subHeroId: 'tran-quang-khai' },
            { id: 1, name: 'Victim', isBot: true, mainHeroId: 'tran-quang-khai', subHeroId: 'tran-quang-khai' },
        ]);
        engine.getState().players[1].hp = 1; // set hp to 1
        engine.getState().players[0].hand = [{ id: 'dao1', name: 'Đào', type: 'basic', configName: 'dao' }, { id: 'dao2', name: 'Đào', type: 'basic', configName: 'dao' }];
        
        // Attacker deals 2 damage to Victim
        engine.dispatcher.state.actionQueue.push({
            type: 'EVENT_DAMAGE',
            payload: { sourceId: 0, targetId: 1, amount: 2, reason: 'slash' }
        });
        
        engine.dispatcher.tick();
        
        // Expect Victim HP to be -1, waiting for Peach
        expect(engine.getState().players[1].hp).toBe(-1);
        expect(engine.getState().waitingForResponse.type).toBe('ask_peach');
        expect(engine.getState().waitingForResponse.responderId).toBe(1); // Victim is asked first
        
        // Victim skips
        engine.dispatcher.dispatchAction({
            type: 'ACTION_REACT',
            payload: { playerId: 1, responseType: 'skip' }
        });
        
        // Expect Attacker is asked next
        expect(engine.getState().waitingForResponse.responderId).toBe(0);
        
        // Attacker gives 1st peach
        engine.dispatcher.dispatchAction({
            type: 'ACTION_REACT',
            payload: { playerId: 0, responseType: 'play', data: { cardId: 'dao1', zone: 'hand' } }
        });
        
        // Expect Victim HP to be 0, STILL waiting for Peach
        expect(engine.getState().players[1].hp).toBe(0);
        expect(engine.getState().waitingForResponse.type).toBe('ask_peach');
        expect(engine.getState().waitingForResponse.responderId).toBe(1); // Reset to Victim!
        
        // Victim skips AGAIN
        engine.dispatcher.dispatchAction({
            type: 'ACTION_REACT',
            payload: { playerId: 1, responseType: 'skip' }
        });
        
        // Attacker gives 2nd peach
        engine.dispatcher.dispatchAction({
            type: 'ACTION_REACT',
            payload: { playerId: 0, responseType: 'play', data: { cardId: 'dao2', zone: 'hand' } }
        });
        
        // Expect Victim HP to be 1, NO LONGER waiting
        expect(engine.getState().players[1].hp).toBe(1);
        expect(engine.getState().waitingForResponse).toBeNull();
    });
});
