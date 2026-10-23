import { describe, it, expect } from 'vitest';
import { GameEngine } from '../core/GameEngine.js';
import { Effects } from '../core/Effects.js';

describe('Nguyễn Địa Lô - Can Gián', () => {
    it('should trigger ask_can_gian when ANY player is targeted by Dismantle and hand card is chosen', () => {
        const engine = new GameEngine([
            { id: 0, name: 'Attacker', isBot: true, mainHeroId: 'ngoc-han-cong-chua', subHeroId: 'ngoc-han-cong-chua' },
            { id: 1, name: 'Victim', isBot: true, mainHeroId: 'ngoc-han-cong-chua', subHeroId: 'ngoc-han-cong-chua' },
            { id: 2, name: 'Nguyễn Địa Lô', isBot: true, mainHeroId: 'nguyen-dia-lo', subHeroId: 'nguyen-dia-lo' },
        ]);
        engine.getState().players[2].revealedHeroes = [true, true];
        engine.getState().players[2].skills = [{ id: 'can-gian' }];
        engine.getState().players[1].revealedHeroes = [true, true];
        engine.getState().players[1].hand = [{ id: 'card1', name: 'Card 1', type: 'basic' }];
        
        // Fix the hero initialization manually to avoid State maxHp error for non-existent le-loi
        engine.getState().players[0].maxHp = 4;
        engine.getState().players[1].maxHp = 4;
        engine.getState().players[0].hp = 4;
        engine.getState().players[1].hp = 4;
        
        // Push EVENT_DISMANTLE targeting Victim
        engine.dispatcher.state.actionQueue.push({
            type: 'EVENT_DISMANTLE',
            payload: { sourceId: 0, targetId: 1, sourceCardId: 'fake-dismantle' }
        });
        engine.dispatcher.tick();
        
        // Attacker chooses card to dismantle from HAND
        engine.dispatcher.dispatchAction({
            type: 'ACTION_REACT',
            payload: { playerId: 0, responseType: 'play', data: { cardId: 'card1', zone: 'hand' } }
        });
        
        // Waiting for response should be ask_can_gian for Nguyen Dia Lo (id: 2)
        expect(engine.getState().waitingForResponse?.type).toBe('ask_can_gian');
        expect(engine.getState().waitingForResponse?.sourceId).toBe(2);

        const initialHp = engine.getState().players[2].hp;
        
        // Nguyen Dia Lo uses can-gian
        engine.dispatcher.dispatchAction({
            type: 'ACTION_REACT',
            payload: { playerId: 2, responseType: 'play', data: { doUse: true } }
        });
        
        // Expect Nguyen Dia Lo hp to decrease by 1
        expect(engine.getState().players[2].hp).toBe(initialHp - 1);
        
        // Victim draws 2 cards
        expect(engine.getState().players[1].hand.length).toBe(2);
    });
});
