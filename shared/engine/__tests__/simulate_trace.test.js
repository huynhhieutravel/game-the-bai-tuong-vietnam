import { describe, it } from "vitest";
import { GameEngine } from '../core/GameEngine.js';
import { getBotAction } from '../ai/botLogic.js';
import fs from 'fs';
import * as PhaseHandler from '../core/handlers/PhaseHandler.js';

describe('Trace Stuck Game', () => {
    it('should trace the game', () => {
        const engine = new GameEngine([
            { id: 0, name: 'Bạn', isBot: true, mainHeroId: 'nguyen-dia-lo', subHeroId: 'nguyen-dia-lo' },
            { id: 1, name: 'Người chơi 2', isBot: true, mainHeroId: 'lac-long-quan', subHeroId: 'lac-long-quan' },
            { id: 2, name: 'Người chơi 3', isBot: true, mainHeroId: 'thanh-giong', subHeroId: 'thanh-giong' },
            { id: 3, name: 'Người chơi 4', isBot: true, mainHeroId: 'son-tinh', subHeroId: 'son-tinh' }
        ], 123456);

        const traceLog = [];
        function pushLog(str) {
            traceLog.push(str);
            if (traceLog.length > 500) traceLog.shift();
        }

        const originalResolve = engine.dispatcher.resolveEvent.bind(engine.dispatcher);
        engine.dispatcher.resolveEvent = (event) => {
            pushLog(`[${engine.getState().currentPhase}] RESOLVE: ${event.type} | wait: ${engine.getState().waitingForResponse?.type} | rStack: ${engine.getState().reactionStack.length} | aQueue: ${engine.getState().actionQueue.length}`);
            return originalResolve(event);
        };

        const originalDispatch = engine.dispatcher.dispatchAction.bind(engine.dispatcher);
        engine.dispatcher.dispatchAction = (action) => {
            pushLog(`DISPATCH: ${action.type} by ${action.payload?.playerId ?? '?'}`);
            return originalDispatch(action);
        };
        
        const originalTick = engine.dispatcher.tick.bind(engine.dispatcher);
        engine.dispatcher.tick = () => {
            if (engine.getState().reactionStack.length > 0) {
                const peek = engine.getState().reactionStack[engine.getState().reactionStack.length - 1];
                pushLog(`[${engine.getState().currentPhase}] TICK POP rStack: ${peek.type}`);
            } else if (engine.getState().actionQueue.length > 0) {
                const peek = engine.getState().actionQueue[0];
                pushLog(`[${engine.getState().currentPhase}] TICK SHIFT aQueue: ${peek.type}`);
            } else {
                pushLog(`[${engine.getState().currentPhase}] TICK EMPTY! wait: ${engine.getState().waitingForResponse?.type}`);
            }
            return originalTick();
        };

        engine.dispatcher.state.reactionStack.push({ type: 'EVENT_TURN_START', payload: { playerId: 0 } });
        engine.dispatcher.tick();

        let turnCount = 0;
        const MAX_TURNS = 20000;

        try {
            while (!engine.getState().gameOver) {
                const state = engine.getState();
                if (!state.waitingForResponse) {
                    engine.dispatcher.tick();
                }
                
                turnCount++;
                if (turnCount > MAX_TURNS) {
                    fs.writeFileSync('simulation_logs/game_trace.json', JSON.stringify({ trace: traceLog, state, turnCount }, null, 2));
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
        } catch (e) {
            fs.writeFileSync('simulation_logs/game_trace_error.log', e.stack);
        }
    });
});
