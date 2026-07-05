import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Dispatcher } from '../core/Dispatcher';
import { createGameState } from '../gameSetup';
import { CardDatabase } from '../../data/gameData';

describe('Phase 4.1: Deep QA & Edge Cases', () => {
    let rawState;
    let dispatcher;
    let p0, p1, p2, p3;

    beforeEach(() => {
        rawState = createGameState(4);
        rawState.phase = undefined;
        rawState.currentPhase = 'PHASE_PLAY';
        rawState.currentPlayerIndex = 0;
        
        p0 = rawState.players[0];
        p1 = rawState.players[1];
        p2 = rawState.players[2];
        p3 = rawState.players[3];
        
        // Mock ID for test simplicity
        p0.id = 0; p1.id = 1; p2.id = 2; p3.id = 3;
        
        // Mock Roles for Lord/Rebel logic
        // p0 is Lord (isDaTam = false, but let's just use faction)
        p0.isDaTam = false;
        p0.faction = 'Lạc';
        p1.faction = 'Sơn'; // Rebel
        p2.faction = 'Lạc'; // Loyalist
        p3.faction = 'Việt';
        
        // Mock health
        p0.hp = p0.maxHp = 4;
        p1.hp = p1.maxHp = 4;
        p2.hp = p2.maxHp = 4;
        p3.hp = p3.maxHp = 4;
        
        p0.isAlive = p1.isAlive = p2.isAlive = p3.isAlive = true;
        p0.hand = []; p1.hand = []; p2.hand = []; p3.hand = [];
        p0.equipment = []; p1.equipment = []; p2.equipment = []; p3.equipment = [];
        
        rawState.actionQueue = [];
        rawState.reactionStack = [];
        rawState.waitingForResponse = null;
        rawState.history = [];
        
        dispatcher = new Dispatcher(rawState);
    });

    it('1. Chain of 4 Hóa Giải: Should toggle correctly and process trick', () => {
        const cuopBai = { id: 'cuop-bai-1', name: 'Cướp Bài', type: 'Cẩm nang' };
        
        const hg1 = { id: 'hg-1', name: 'Hóa Giải', type: 'Cẩm nang' };
        const hg2 = { id: 'hg-2', name: 'Hóa Giải', type: 'Cẩm nang' };
        const hg3 = { id: 'hg-3', name: 'Hóa Giải', type: 'Cẩm nang' };
        const hg4 = { id: 'hg-4', name: 'Hóa Giải', type: 'Cẩm nang' };
        
        p0.hand = [cuopBai];
        p1.hand = [hg1];
        p2.hand = [hg2];
        p3.hand = [hg3];
        p0.hand.push(hg4);
        
        // P0 (distance 1 to P1) uses Cướp Bài on P1
        dispatcher.dispatchAction({
            type: 'ACTION_PLAY_CARD',
            payload: { playerId: 0, cardId: cuopBai.id, targets: [1] }
        });
        
        // Queue is [1, 2, 3, 0] (starts at target P1)
        expect(dispatcher.state.waitingForResponse.type).toBe('ask_negate');
        expect(dispatcher.state.waitingForResponse.responderId).toBe(1);
        
        // 1st Negation: P1 plays Hóa Giải
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 1, data: { cardId: hg1.id } } });
        
        // Queue resets to [1, 2, 3, 0] starting from P1
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 1, data: null } }); // P1 passes
        
        // Next is P2
        // 2nd Negation: P2 plays Hóa Giải
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 2, data: { cardId: hg2.id } } });
        
        // Queue resets to [2, 3, 0, 1] starting from P2
        expect(dispatcher.state.waitingForResponse.responderId).toBe(2);
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 2, data: null } }); // P2 passes
        
        // Next is P3
        expect(dispatcher.state.waitingForResponse.responderId).toBe(3);
        // 3rd Negation: P3 plays Hóa Giải
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 3, data: { cardId: hg3.id } } });
        
        // Queue resets to [3, 0, 1, 2] starting from P3
        expect(dispatcher.state.waitingForResponse.responderId).toBe(3);
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 3, data: null } }); // P3 passes
        
        // Next is P0
        expect(dispatcher.state.waitingForResponse.responderId).toBe(0);
        // 4th Negation: P0 plays Hóa Giải
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 0, data: { cardId: hg4.id } } });
        
        // Queue resets to [0, 1, 2, 3] starting from P0
        expect(dispatcher.state.waitingForResponse.responderId).toBe(0);
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 0, data: null } }); // P0 passes
        expect(dispatcher.state.waitingForResponse.responderId).toBe(1);
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 1, data: null } }); // P1 passes
        expect(dispatcher.state.waitingForResponse.responderId).toBe(2);
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 2, data: null } }); // P2 passes
        expect(dispatcher.state.waitingForResponse.responderId).toBe(3);
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 3, data: null } }); // P3 passes
        
        expect(dispatcher.state.waitingForResponse.type).toBe('ask_snatch');
        expect(dispatcher.state.waitingForResponse.responderId).toBe(0); // P0 gets to choose
    });

    it('2. Quyết Đấu Tự Sát: Turn ends correctly', () => {
        p0.hp = 1;
        const quyetDau = { id: 'qd-1', name: 'Quyết Đấu', type: 'Cẩm nang' };
        const chemP1 = { id: 'chem-1', name: 'Chém', suit: '♠', type: 'Cơ bản' }; 
        
        p0.hand = [quyetDau];
        p1.hand = [chemP1];
        
        dispatcher.dispatchAction({
            type: 'ACTION_PLAY_CARD',
            payload: { playerId: 0, cardId: quyetDau.id, targets: [1] }
        });
        
        // Skip negate phase for P1
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 1, data: null } }); 
        // Skip negate phase for P2, P3, P0
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 2, data: null } }); 
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 3, data: null } }); 
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 0, data: null } }); 
        
        // P1 is asked for slash (since P0 is source)
        expect(dispatcher.state.waitingForResponse.type).toBe('ask_slash');
        expect(dispatcher.state.waitingForResponse.responderId).toBe(1);
        
        // P1 plays Slash
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 1, data: { cardId: chemP1.id } } });
        
        // P0 is asked for slash (since P1 fought back)
        expect(dispatcher.state.waitingForResponse.type).toBe('ask_slash');
        expect(dispatcher.state.waitingForResponse.responderId).toBe(0);
        
        // P0 passes (takes damage)
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 0, data: null } });
        
        // P0 takes damage -> dying -> ask_peach starts from P0
        expect(dispatcher.state.waitingForResponse.type).toBe('ask_peach');
        expect(dispatcher.state.waitingForResponse.responderId).toBe(0);
        
        // Everyone passes peach
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 0, data: null } });
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 1, data: null } });
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 2, data: null } });
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 3, data: null } });
        
        // P0 dies!
        expect(dispatcher.state.players[0].isAlive).toBe(false);
        expect(dispatcher.state.waitingForResponse).toBeNull();
    });
    
    it('3. Giết đồng minh bị lột bài', () => {
        // P0 (Lạc) kills P1 (Lạc)
        p0.mainHeroId = 'lac-long-quan';
        p1.mainHeroId = 'thanh-giong';
        p0.revealedHeroes = [true, false]; // P0 is Lạc
        p1.revealedHeroes = [true, false]; // P1 is Lạc
        
        p1.hp = 1;
        p1.hand = [{ id: 'card-1', name: 'Né', type: 'Cơ bản' }];
        p1.equipment = [{ id: 'eq-1', name: 'Vũ khí', type: 'Trang bị' }];
        
        const chem = { id: 'chem-2', name: 'Chém', suit: '♠', type: 'Cơ bản' };
        p0.hand = [chem];
        
        dispatcher.dispatchAction({
            type: 'ACTION_PLAY_CARD',
            payload: { playerId: 0, cardId: chem.id, targets: [1] }
        });
        
        // P1 passes dodge
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 1, data: null } });
        
        // P1 dying -> Peach queue
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 1, data: null } });
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 2, data: null } });
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 3, data: null } });
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 0, data: null } });
        
        expect(dispatcher.state.players[1].isAlive).toBe(false);
        
        // P0 killed ally -> hand and equipment must be emptied
        expect(dispatcher.state.players[0].hand.length).toBe(0);
        expect(dispatcher.state.players[0].equipment.length).toBe(0);
    });

    it('4. Giết địch được thưởng bài', () => {
        // P0 (Lạc) kills P1 (Đinh)
        p0.mainHeroId = 'lac-long-quan';
        p1.mainHeroId = 'dinh-bo-linh';
        p0.revealedHeroes = [true, false]; // Lạc
        p1.revealedHeroes = [true, false]; // Đinh (enemy)
        p0.heroes = [{ id: 'lac-long-quan', faction: 'Lạc' }];
        p1.heroes = [{ id: 'dinh-bo-linh', faction: 'Sơn' }];
        p0.faction = 'Lạc';
        p1.faction = 'Sơn';
        
        p1.hp = 1;
        const chem = { id: 'chem-3', name: 'Chém', suit: '♠', type: 'Cơ bản' };
        p0.hand = [chem];
        
        dispatcher.dispatchAction({
            type: 'ACTION_PLAY_CARD',
            payload: { playerId: 0, cardId: chem.id, targets: [1] }
        });
        
        // P1 passes dodge
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 1, data: null } });
        
        // P1 dying -> Peach queue
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 1, data: null } });
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 2, data: null } });
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 3, data: null } });
        dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 0, data: null } });
        
        expect(dispatcher.state.players[1].isAlive).toBe(false);
        
        // P0 killed enemy -> draw cards (1 for enemy + any revealed allies of dead)
        // Since no one else is revealed on P1's faction, reward is just 1. P0 started with 0 (after playing Chém) and draws 1.
        expect(dispatcher.state.players[0].hand.length).toBe(1); 
    });
});
