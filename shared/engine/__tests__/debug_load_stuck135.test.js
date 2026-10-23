import { describe, it } from 'vitest';
import { GameEngine } from '../core/GameEngine.js';
import { getBotAction } from '../ai/botLogic.js';
import fs from 'fs';

describe('Debug load stuck json 135', () => {
    it('should process the stuck state correctly', () => {
        const stateJson = fs.readFileSync('simulation_logs/game_135_stuck.json', 'utf8');
        const state = JSON.parse(stateJson);

        const engine = new GameEngine([]);
        engine.state = state;
        engine.dispatcher.state = state;

        console.log("Current waiting:", state.waitingForResponse);
        let activeActorId = state.waitingForResponse ? state.waitingForResponse.responderId : state.currentPlayerIndex;
        const activePlayer = state.players.find(p => p.id === activeActorId);

        const action = getBotAction(state, activePlayer);
        console.log("Bot Action:", action);

        try {
            engine.dispatcher.dispatchAction(action);
        } catch (e) {
            console.error("Error during dispatch:", e);
        }

        console.log("After dispatch waiting:", engine.getState().waitingForResponse);
    });
});
