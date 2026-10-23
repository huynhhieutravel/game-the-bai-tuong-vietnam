import fs from 'fs';
import { Dispatcher } from '../core/Dispatcher.js';
import { getBotAction } from '../ai/botLogic.js';

import { HeroRegistry } from '../registries/HeroRegistry.js';
import { initialDeck } from '../../data/gameData.js';
import { test, expect } from 'vitest';
import path from 'path';

const TOTAL_GAMES = 100;
const MAX_TURNS = 500;
let successCount = 0;
let failCount = 0;
let timeoutCount = 0;

const logFile = path.resolve(__dirname, '../../../../simulation_logs.txt');
fs.writeFileSync(logFile, 'BẮT ĐẦU MÔ PHỎNG 100 TRẬN\n\n');

function log(msg) {
    fs.appendFileSync(logFile, msg + '\n');
}

async function simulateGame(gameIndex) {
    log(`--- Đang chạy Game #${gameIndex + 1} ---`);
    
    // 1. Tạo state ảo
    const playerConfigs = [];
    const numPlayers = Math.floor(Math.random() * 5) + 4; // 4 to 8 players
    const allHeroes = Object.keys(HeroRegistry);
    
    // Shuffle heroes
    for (let i = allHeroes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allHeroes[i], allHeroes[j]] = [allHeroes[j], allHeroes[i]];
    }

    const availableFactions = ['Việt', 'Hà', 'Lạc', 'Sơn'];
    for (let i = 0; i < numPlayers; i++) {
        playerConfigs.push({
            id: i,
            name: `Bot_${i}`,
            mainHeroId: allHeroes.pop(),
            subHeroId: allHeroes.pop(),
            faction: availableFactions[i % availableFactions.length],
            isBot: true
        });
    }

    const { createInitialState } = await import('../core/State.js');
    const initialState = createInitialState(playerConfigs);

    const dispatcher = new Dispatcher(initialState);
    
    // Rút 4 lá đầu game cho tất cả người chơi
    for (const player of dispatcher.state.players) {
        player.hand = [];
        for (let j = 0; j < 4; j++) {
            if (dispatcher.state.deck.length > 0) {
                player.hand.push(dispatcher.state.deck.pop());
            }
        }
    }
    
    // Bắt đầu vòng lặp game
    dispatcher.state.actionQueue.push({ type: 'EVENT_TURN_START', payload: { playerId: 0 } });
    dispatcher.tick();

    let turnCount = 0;
    let hungTurns = 0;
    
    try {
        while (!dispatcher.state.isGameOver && turnCount < MAX_TURNS) {
            turnCount++;
            let actionTaken = false;
            
            if (dispatcher.state.waitingForResponse) {
                const req = dispatcher.state.waitingForResponse;
                const responder = dispatcher.state.players.find(p => p.id === req.responderId);
                
                if (responder && responder.isBot && req.type !== 'ask_null') {
                    const action = getBotAction(dispatcher.state, responder);
                    if (action) {
                        dispatcher.dispatchAction(action);
                        actionTaken = true;
                        hungTurns = 0;
                    } else {
                        // Bot doesn't know how to handle this modal. Provide a fallback.
                        // Cancel the action to prevent hang.
                        dispatcher.dispatchAction({ type: 'ACTION_SKILL_RESPONSE', payload: { doReact: false, doUse: false, canceled: true, doProvide: false } });
                        actionTaken = true;
                        hungTurns = 0;
                    }
                }
            } else {
                const activePlayer = dispatcher.state.players[dispatcher.state.currentPlayerIndex];
                if (activePlayer && activePlayer.isBot) {
                    const action = getBotAction(dispatcher.state, activePlayer);
                    if (action) {
                        dispatcher.dispatchAction(action);
                        actionTaken = true;
                        hungTurns = 0;
                    } else {
                        // No action -> end phase/turn fallback
                        dispatcher.dispatchAction({ type: 'ACTION_END_PHASE', payload: { playerId: activePlayer.id } });
                        actionTaken = true;
                        hungTurns = 0;
                    }
                }
            }
            
            if (!actionTaken) {
                hungTurns++;
                if (hungTurns > 10) {
                    throw new Error(`Game bị treo tại req: ${JSON.stringify(dispatcher.state.waitingForResponse)} - currentPhase: ${dispatcher.state.currentPhase}`);
                }
            }
        }
        
        if (dispatcher.state.isGameOver) {
            successCount++;
            log(`✅ Game #${gameIndex + 1} kết thúc thành công sau ${turnCount} vòng. Người thắng: ${dispatcher.state.winner ? dispatcher.state.winner.name : 'Hòa'}`);
        } else {
            timeoutCount++;
            log(`⚠️ Game #${gameIndex + 1} hết ${MAX_TURNS} vòng mà chưa kết thúc. (Quá thời gian)`);
        }
    } catch (e) {
        failCount++;
        log(`❌ Game #${gameIndex + 1} BỊ LỖI CRASH/HANG:`);
        log(e.stack || e.message);
        log(`State hiện tại: waitingForResponse = ${JSON.stringify(dispatcher.state.waitingForResponse)}`);
    }
}

test('Run 100 simulated games', async () => {
    for (let i = 0; i < TOTAL_GAMES; i++) {
        await simulateGame(i);
    }
    log(`\n============================`);
    console.log(`TỔNG KẾT: THÀNH CÔNG ${successCount}/${TOTAL_GAMES}, THẤT BẠI (CRASH) ${failCount}/${TOTAL_GAMES}, QUÁ THỜI GIAN (HÒA) ${timeoutCount}/${TOTAL_GAMES}`);

    expect(failCount).toBe(0); // Fail test only if there are crashes
}, 600000);
