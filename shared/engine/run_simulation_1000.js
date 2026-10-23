import { GameEngine } from './core/GameEngine.js';
import { getBotAction } from './ai/botLogic.js';
import { HeroRegistry } from './registries/HeroRegistry.js';
import fs from 'fs';

const TOTAL_GAMES = 1000;
let successCount = 0;
let failCount = 0;
let stuckCount = 0;

const heroKeys = Object.keys(HeroRegistry);

if (!fs.existsSync('simulation_logs')) {
    fs.mkdirSync('simulation_logs');
}

console.log(`Starting ${TOTAL_GAMES} simulated games...`);

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
        fs.writeFileSync(`simulation_logs/game_${i}_init_error.log`, e.stack);
        failCount++;
        continue;
    }

    let isStuck = false;
    let turnCount = 0;
    const MAX_TURNS = 20000;

    try {
        while (!engine.getState().gameOver) {
            const state = engine.getState();
            // Chỉ tick nếu không bị nghẽn (không đợi response)
            if (!state.waitingForResponse) {
                engine.dispatcher.tick();
            }
            
            turnCount++;
            if (turnCount > MAX_TURNS) {
                fs.writeFileSync(`simulation_logs/game_${i}_stuck.json`, JSON.stringify(state, null, 2));
                isStuck = true;
                stuckCount++;
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
                throw new Error(`Waiting for dead/invalid player ${activeActorId}. Waiting for: ${JSON.stringify(state.waitingForResponse)}`);
            }

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
        }
    } catch (e) {
        const errorLog = `Game ${i} Failed at turn ${turnCount}\nError: ${e.message}\nStack: ${e.stack}\n\nState dump:\n${JSON.stringify(engine.getState(), null, 2)}`;
        fs.writeFileSync(`simulation_logs/game_${i}_error.log`, errorLog);
        failCount++;
        continue;
    }

    if (!isStuck) {
        successCount++;
    }
    
    if (i % 10 === 0) {
        process.stdout.write(`\rProgress: ${i}/${TOTAL_GAMES} (Success: ${successCount}, Fail: ${failCount}, Stuck: ${stuckCount})`);
    }
}

console.log(`\n\nSimulation Complete!`);
console.log(`Total: ${TOTAL_GAMES}`);
console.log(`Success: ${successCount}`);
console.log(`Fail: ${failCount}`);
console.log(`Stuck: ${stuckCount}`);

if (failCount > 0 || stuckCount > 0) {
    console.log(`Check simulation_logs/ folder for error details.`);
    process.exit(1);
} else {
    console.log(`All 1000 games completed successfully without any crashes or freezes!`);
    process.exit(0);
}
