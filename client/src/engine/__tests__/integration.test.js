import { describe, it, expect } from 'vitest';
import { createGameState, selectDraftHeroes } from '../gameSetup';
import { Dispatcher } from '../core/Dispatcher';
import { GameAPI } from '../application/GameAPI';
import { BotRunner } from '../application/BotRunner';
import { HeroRegistry } from '../registries/HeroRegistry';
import { getBotAction } from '../ai/botLogic';

describe('Phase 4: Game Integration & Stress Test', () => {
    it('runs a full simulated game with 4 bots without crashing or infinite loops', () => {
        // 1. Khởi tạo Draft phase
        let rawState = createGameState(4);
        expect(rawState.phase).toBe('draft');

        // Lấy 2 tướng hợp lệ
        const availableHeroes = Object.keys(HeroRegistry);
        const h1 = availableHeroes[0];
        const h2 = availableHeroes[1];

        // Tất cả 4 người chọn tướng
        rawState = selectDraftHeroes(rawState, 0, h1, h2);
        rawState = selectDraftHeroes(rawState, 1, h1, h2);
        rawState = selectDraftHeroes(rawState, 2, h1, h2);
        rawState = selectDraftHeroes(rawState, 3, h1, h2);

        // state trả về sau khi người cuối cùng chọn xong sẽ là GameState đã khởi tạo
        expect(rawState.turn).toBe(1);


        // 2. Gắn vào Dispatcher và GameAPI
        const dispatcher = new Dispatcher(rawState);
        const api = new GameAPI(dispatcher);
        
        // Cấu hình BotRunner điều khiển cả 4 người chơi (bao gồm cả player 0 để stress test)
        // Chúng ta override isBot = true cho player 0 tạm thời
        dispatcher.state.players[0].isBot = true;

        const botRunner = new BotRunner(api);
        
        // Override hàm setTimeout của botRunner để chạy đồng bộ (synchronous)
        // Lưu ý: BotRunner dùng global.setTimeout. Trong môi trường test, ta có thể thay thế
        const maxTurns = 50; // Giới hạn 50 lượt để tránh infinite loop trong test
        let turnCount = 0;
        let lastPlayerTurn = -1;

        // Mô phỏng vòng lặp game
        let iterationSafeGuard = 0;
        const MAX_ITERATIONS = 5000; 

        // BotRunner phản hồi mỗi khi có thay đổi state
        let currentState = dispatcher.getState();
        

        // Loop cho đến khi Game Over hoặc hết Max Turns
        while (iterationSafeGuard < MAX_ITERATIONS) {
            iterationSafeGuard++;
            
            // Xử lý game logic nếu có event trên queue
            dispatcher.tick();
            currentState = dispatcher.getState();

            // Đếm số lượt
            if (currentState.currentPlayerIndex !== lastPlayerTurn) {
                lastPlayerTurn = currentState.currentPlayerIndex;
                if (lastPlayerTurn === 0) turnCount++;
            }

            if (turnCount > maxTurns) {
                break;
            }

            // Kiểm tra kết thúc game
            const alivePlayers = currentState.players.filter(p => p.isAlive);
            if (alivePlayers.length <= 1) {
                break;
            }

            // Gọi AI đồng bộ (bỏ qua setTimeout của BotRunner)
            const state = dispatcher.getState();
            
            let activeActorId = state.currentPlayerIndex;
            if (state.waitingForResponse) {
              const req = state.waitingForResponse;
              activeActorId = (req.askQueue && req.askQueue.length > 0 ? req.askQueue[0] : req.responderId) ?? req.targetId ?? state.currentPlayerIndex;
            }
            
            const activePlayer = state.players.find(p => p.id === activeActorId);
            
            if (activePlayer && activePlayer.isAlive) {
               const action = getBotAction(state, activePlayer);
               if (action) {
                   dispatcher.dispatchAction(action);
               }
            }
        }

        expect(iterationSafeGuard).toBeLessThan(MAX_ITERATIONS); // Đảm bảo không dính infinite loop
        console.log(`Stress test hoàn thành sau ${turnCount} lượt, ${iterationSafeGuard} iterations.`);
        
        const alivePlayers = dispatcher.getState().players.filter(p => p.isAlive);
        expect(alivePlayers.length).toBeGreaterThanOrEqual(1); // Ít nhất 1 người sống hoặc hòa
    });
});
