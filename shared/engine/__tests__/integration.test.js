import { describe, it, expect } from 'vitest';
import { createGameState, selectDraftHeroes } from '../gameSetup';
import { Dispatcher } from '../core/Dispatcher';
import { GameAPI } from '../application/GameAPI';
import { BotRunner } from '../application/BotRunner';
import { HeroRegistry } from '../registries/HeroRegistry';
import { getBotAction } from '../ai/botLogic';

describe('Phase 4: Game Integration & Stress Test', () => {
    it('runs 100 full simulated games with 4 bots and random heroes without crashing', () => {
        const MATCHES_TO_SIMULATE = 100;
        let successCount = 0;

        for (let matchIndex = 1; matchIndex <= MATCHES_TO_SIMULATE; matchIndex++) {
            // 1. Khởi tạo Draft phase
            let rawState = createGameState(4);
            expect(rawState.phase).toBe('draft');

            const availableHeroes = Object.keys(HeroRegistry);
            
            // Randomize heroes for all 4 players
            for (let p = 0; p < 4; p++) {
                const shuffled = [...availableHeroes].sort(() => Math.random() - 0.5);
                rawState = selectDraftHeroes(rawState, p, shuffled[0], shuffled[1]);
            }

            expect(rawState.turn).toBe(1);

            // 2. Gắn vào Dispatcher và GameAPI
            const dispatcher = new Dispatcher(rawState);
            const api = new GameAPI(dispatcher);
            
            // Cấu hình BotRunner điều khiển cả 4 người chơi
            dispatcher.state.players[0].isBot = true;

            const maxTurns = 50;
            let turnCount = 0;
            let lastPlayerTurn = -1;

            let iterationSafeGuard = 0;
            const MAX_ITERATIONS = 5000; 

            // Mô phỏng vòng lặp game
            let currentState = dispatcher.getState();
            
            while (iterationSafeGuard < MAX_ITERATIONS) {
                iterationSafeGuard++;
                
                dispatcher.tick();
                currentState = dispatcher.getState();

                if (currentState.currentPlayerIndex !== lastPlayerTurn) {
                    lastPlayerTurn = currentState.currentPlayerIndex;
                }
                iterationSafeGuard++;
                if (iterationSafeGuard >= MAX_ITERATIONS) {
                    console.error(`CRITICAL ERROR: Infinite Loop detected in Engine Tick! (Player ${currentState.currentPlayerIndex}) waiting for:`, dispatcher.state.waitingForResponse);
                    console.error("--- LAST 50 LOGS ---");
                    dispatcher.state.history.slice(-50).forEach(log => console.error(log.text));
                    console.error("--- REACTION STACK ---");
                    console.error(JSON.stringify(dispatcher.state.reactionStack, null, 2));
                    break;
                }

                if (currentState.turn > maxTurns) {
                    console.log(`[TEST DEBUG] Game turn limit exceeded. gameOver: ${dispatcher.state.gameOver}`);
                    break;
                }

                const alivePlayers = currentState.players.filter(p => p.isAlive);
                if (alivePlayers.length <= 1 || currentState.gameOver) {
                    break;
                }

                const state = dispatcher.getState();
                let activeActorId = state.currentPlayerIndex;
                if (state.waitingForResponse) {
                  const req = state.waitingForResponse;
                  activeActorId = (req.askQueue && req.askQueue.length > 0 ? req.askQueue[0] : req.responderId) ?? req.targetId ?? state.currentPlayerIndex;
                }
                
                const activePlayer = state.players.find(p => p.id === activeActorId);
                
                if (activePlayer) {
                   if (activePlayer.isAlive) {
                       const action = getBotAction(state, activePlayer);
                       if (action) {
                           dispatcher.dispatchAction(action);
                       }
                   } else if (state.currentPlayerIndex === activeActorId) {
                       // Nếu người chơi đã chết nhưng vẫn đang là lượt của họ, kết thúc lượt ngay lập tức
                       dispatcher.dispatchAction({ type: 'ACTION_END_PHASE', payload: { playerId: activeActorId } });
                   }
                }
            }

            expect(iterationSafeGuard).toBeLessThan(MAX_ITERATIONS);
            const alivePlayers = dispatcher.getState().players.filter(p => p.isAlive);
            expect(alivePlayers.length).toBeGreaterThanOrEqual(1);

            console.log(`[Match ${matchIndex}] Stress test completed after ${turnCount} turns, ${iterationSafeGuard} iterations. Survivors: ${alivePlayers.length}`);
            successCount++;
        }
        
        expect(successCount).toBe(MATCHES_TO_SIMULATE);
    }, 30000);
});
