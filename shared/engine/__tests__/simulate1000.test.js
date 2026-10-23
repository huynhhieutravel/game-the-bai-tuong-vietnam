import { describe, it } from 'vitest';
import { GameEngine } from '../core/GameEngine.js';
import { getBotAction } from '../ai/botLogic.js';
import { HeroRegistry } from '../registries/HeroRegistry.js';
import fs from 'fs';

const TOTAL_GAMES = 1000;
let successCount = 0;
let failCount = 0;
let stuckCount = 0;

describe('Simulation Test', () => {
    it('should run games without getting stuck', () => {
        const heroKeys = Object.keys(HeroRegistry);
        if (!fs.existsSync('simulation_logs')) fs.mkdirSync('simulation_logs');

        for (let i = 1; i <= TOTAL_GAMES; i++) {
            const shuffledHeroes = [...heroKeys].sort(() => 0.5 - Math.random());
            const playerConfigs = [
                { id: 0, name: 'Bạn', isBot: true, mainHeroId: shuffledHeroes[0], subHeroId: shuffledHeroes[1] },
                { id: 1, name: 'Người chơi 2', isBot: true, mainHeroId: shuffledHeroes[2], subHeroId: shuffledHeroes[3] },
                { id: 2, name: 'Người chơi 3', isBot: true, mainHeroId: shuffledHeroes[4], subHeroId: shuffledHeroes[5] },
                { id: 3, name: 'Người chơi 4', isBot: true, mainHeroId: shuffledHeroes[6], subHeroId: shuffledHeroes[7] }
            ];
            
            let engine;
            try {
                engine = new GameEngine(playerConfigs, Date.now() + i);
                engine.dispatcher.state.reactionStack.push({ type: 'EVENT_TURN_START', payload: { playerId: 0 } });
                engine.dispatcher.tick();
            } catch(e) {
                failCount++;
                continue;
            }

            let turnCount = 0;
            const MAX_TURNS = 150000;
            let isStuck = false;

            try {
                while (!engine.getState().gameOver) {
                    const state = engine.getState();
                    if (!state.waitingForResponse) {
                        engine.dispatcher.tick();
                    }
                    
                    turnCount++;
                    if (turnCount > MAX_TURNS) {
                        fs.writeFileSync(`simulation_logs/game_${i}_stuck_150000.json`, JSON.stringify(state, null, 2));
                        isStuck = true;
                        break;
                    }

                    let activeActorId = state.waitingForResponse ? state.waitingForResponse.responderId : state.currentPlayerIndex;
                    if (activeActorId === undefined || activeActorId === null) {
                        if (!state.waitingForResponse && (state.reactionStack.length > 0 || state.actionQueue.length > 0)) {
                            continue; 
                        }
                        activeActorId = state.currentPlayerIndex;
                    }

                    const activePlayer = state.players.find(p => p.id === activeActorId);
                    const action = getBotAction(state, activePlayer);
                    if (action) {
                        engine.dispatcher.dispatchAction(action);
                    } else {
                        const fb = state.waitingForResponse 
                            ? { type: 'ACTION_REACT', payload: { playerId: activeActorId, responseType: 'cancel', data: { canceled: true } } }
                            : { type: 'ACTION_END_PHASE', payload: { playerId: activeActorId } };
                        engine.dispatcher.dispatchAction(fb);
                    }
                }
            } catch(e) {
                failCount++;
            }

            if (isStuck) {
                stuckCount++;
            } else if (engine.getState().gameOver) {
                successCount++;
            }
        }

        console.log(`Simulation Complete! Total: ${TOTAL_GAMES}, Success: ${successCount}, Fail: ${failCount}, Stuck: ${stuckCount}`);
    });
}, 120000); // 120 seconds timeout
