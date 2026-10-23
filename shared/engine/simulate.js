import { GameEngine } from './core/GameEngine.js';
import { getBotAction } from './ai/botLogic.js';

const TOTAL_GAMES = 100;
let successCount = 0;
let failCount = 0;

for (let i = 1; i <= TOTAL_GAMES; i++) {
    const playerConfigs = [
        { id: 0, isBot: true, name: 'Bot 1', mainHeroId: 'lac-long-quan', subHeroId: 'thanh-giong' },
        { id: 1, isBot: true, name: 'Bot 2', mainHeroId: 'tran-quang-khai', subHeroId: 'ly-thuong-kiet' },
        { id: 2, isBot: true, name: 'Bot 3', mainHeroId: 'ngo-quyen', subHeroId: 'nguyen-lu' },
        { id: 3, isBot: true, name: 'Bot 4', mainHeroId: 'to-hien-thanh', subHeroId: 'nguyen-chich' }
    ];
    
    let engine;
    try {
        engine = new GameEngine(playerConfigs, Date.now() + i);
        // Bỏ qua draft phase, pick random heroes
        const state = engine.getState();
        for (let j = 0; j < 4; j++) {
            const bot = state.players[j];
            if (bot.draftOptions && bot.draftOptions.length >= 2) {
                engine.dispatcher.dispatchAction({
                    type: 'ACTION_SELECT_HERO',
                    payload: { playerId: bot.id, heroId1: bot.draftOptions[0].id, heroId2: bot.draftOptions[1].id }
                });
            }
        }
    } catch(e) {
        console.error(`Game ${i} failed to init:`, e);
        failCount++;
        continue;
    }

    let isStuck = false;
    let turnCount = 0;
    const MAX_TURNS = 10000; // prevent infinite loops
    
    // Kick off the game loop
    engine.dispatcher.dispatchAction({ type: 'TURN_START', payload: { playerId: engine.getState().currentPlayerIndex } });

    while (!engine.getState().gameOver) {
        const state = engine.getState();
        turnCount++;
        if (turnCount > MAX_TURNS) {
            console.error(`Game ${i} exceeded max turns. Possible infinite loop.`);
            isStuck = true;
            break;
        }

        let activeActorId = state.currentPlayerIndex;
        if (state.waitingForResponse) {
            const req = state.waitingForResponse;
            activeActorId = req.responderId ?? (req.askQueue && req.askQueue.length > 0 ? req.askQueue[0] : null) ?? req.targetId ?? req.sourceId ?? state.currentPlayerIndex;
        }

        const activePlayer = state.players.find(p => p.id === activeActorId);
        if (!activePlayer || !activePlayer.isAlive) {
            // Should not happen unless wait target is dead but engine didn't clean up
            console.error(`Game ${i}: Waiting for dead/invalid player ${activeActorId}`);
            isStuck = true;
            break;
        }

        const action = getBotAction(state, activePlayer);
        
        if (turnCount > MAX_TURNS - 5) {
            console.log(`[DEBUG] Game ${i} Turn ${turnCount}: Bot ${activeActorId} chose action:`, JSON.stringify(action));
        }
        
        if (!action) {
            console.error(`Game ${i}: getBotAction returned null for player ${activeActorId}. State waiting:`, state.waitingForResponse?.type);
            isStuck = true;
            break;
        }

        try {
            engine.dispatcher.dispatchAction(action);
        } catch (e) {
            console.error(`Game ${i}: Engine crash during dispatch:`, e);
            isStuck = true;
            break;
        }
    }

    if (!isStuck && engine.getState().gameOver) {
        successCount++;
    } else {
        failCount++;
        console.log(`Failed at state:`, engine.getState().waitingForResponse);
        break; // Stop at first failure to debug
    }
}

console.log(`\nSimulation complete: ${successCount} successful, ${failCount} failed.`);
