import { describe, it, expect } from "vitest";
import { GameEngine } from '../core/GameEngine.js';
import { getBotAction } from '../ai/botLogic.js';
import { HeroRegistry } from '../registries/HeroRegistry.js';

describe('Game Simulation 100 Games', () => {
    it('should successfully run 100 random bot vs bot games without freezing', () => {
        console.log("Hero lac-long-quan:", HeroRegistry['lac-long-quan']);
        const TOTAL_GAMES = 100;
        let successCount = 0;
        let failCount = 0;
        
        const heroKeys = Object.keys(HeroRegistry);

        for (let i = 1; i <= TOTAL_GAMES; i++) {
            // Pick random heroes
            const getRandomHero = () => heroKeys[Math.floor(Math.random() * heroKeys.length)];

            const playerConfigs = [
                { id: 0, isBot: true, name: 'Bot 1', mainHeroId: getRandomHero(), subHeroId: getRandomHero() },
                { id: 1, isBot: true, name: 'Bot 2', mainHeroId: getRandomHero(), subHeroId: getRandomHero() },
                { id: 2, isBot: true, name: 'Bot 3', mainHeroId: getRandomHero(), subHeroId: getRandomHero() },
                { id: 3, isBot: true, name: 'Bot 4', mainHeroId: getRandomHero(), subHeroId: getRandomHero() }
            ];
            
            let engine;
            try {
                engine = new GameEngine(playerConfigs, Date.now() + i);
                engine.dispatcher.state.reactionStack.push({ type: 'EVENT_TURN_START', payload: { playerId: 0 } });
                engine.dispatcher.tick();
            } catch(e) {
                console.error(`Game ${i} failed to init:`, e);
                failCount++;
                continue;
            }

            let isStuck = false;
            let turnCount = 0;
            const MAX_TURNS = 50000;

            while (!engine.getState().gameOver) {
                const state = engine.getState();
                // Chỉ tick nếu không bị nghẽn (không đợi response)
                if (!state.waitingForResponse) {
                    engine.dispatcher.tick();
                }
                
                turnCount++;
                if (turnCount > MAX_TURNS) {
                    console.log(`Game ${i} exceeded max turns.`);
                    isStuck = true;
                    break;
                }

                let activeActorId = state.waitingForResponse ? state.waitingForResponse.responderId : state.currentPlayerIndex;
                if (activeActorId === undefined || activeActorId === null) {
                    // Nếu Engine còn event (hoặc đang xử lý) và chưa cần input thì tiếp tục chờ
                    if (!state.waitingForResponse && (state.reactionStack.length > 0 || state.actionQueue.length > 0)) {
                        continue; 
                    }
                    activeActorId = state.currentPlayerIndex;
                }

                const activePlayer = state.players.find(p => p.id === activeActorId);
                if (!activePlayer || !activePlayer.isAlive) {
                    throw new Error(`Game ${i}: Waiting for dead/invalid player ${activeActorId}. Waiting for: ${JSON.stringify(state.waitingForResponse)}`);
                }

                try {
                    const action = getBotAction(state, activePlayer);
                    if (action) {
                        engine.dispatcher.dispatchAction(action);
                    } else {
                        // Fallback để không bị kẹt
                        if (state.waitingForResponse) {
                            engine.dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: activeActorId, responseType: 'cancel', data: { canceled: true } } });
                        } else {
                            engine.dispatcher.dispatchAction({ type: 'ACTION_END_PHASE', payload: { playerId: activeActorId } });
                        }
                    }
                } catch (err) {
                    throw new Error(`Game ${i}: Engine crash: ${err.message}`);
                }
            }

            if (isStuck) {
                failCount++;
            } else if (turnCount > MAX_TURNS) {
                throw new Error(`Game ${i} exceeded max turns.`);
            } else {
                successCount++;
            }
        }
        
        console.log(`Simulation complete: ${successCount} successful, ${failCount} failed.`);
        expect(failCount).toBe(0);
        expect(successCount).toBe(TOTAL_GAMES);
    }, 60000);
});
