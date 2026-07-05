import { createGameState, drawCards, advancePhase } from './engine/index.js';
import { Dispatcher } from './engine/core/Dispatcher.js';
import { getBotAction } from './engine/ai/botLogic.js';

let state = createGameState(4);

// Simulate draft phase
state.players.forEach(p => {
    p.hero = p.draftHeroes[0];
    p.hasDrafted = true;
});

// Setup phase
state.players.forEach(p => {
    drawCards(state, p.id, 4);
});

state.phase = 'play_phase';
state.currentPlayerIndex = 0;

let ticks = 0;
const dispatcher = new Dispatcher(state);

try {
    while (ticks < 1000 && state.isGameOver !== true) {
        // Find if someone needs to react
        let activeActorId = null;
        const req = state.waitingForResponse;
        
        if (req) {
            if (req.type === 'dodge' || req.type === 'ask_dodge') activeActorId = req.targetId;
            else if (req.type === 'duel_slash' || req.type === 'ask_slash') activeActorId = req.duelTurnId ?? req.targetId;
            else if (req.type === 'ask_negate') activeActorId = req.askQueue[0];
            else if (req.type === 'aoe_trick') activeActorId = req.targets[0];
            else if (req.type === 'borrow_sword') activeActorId = req.targetAId;
            else if (req.type === 'ask_wuhun') activeActorId = req.targetId;
            else if (req.type === 'ask_qicai') activeActorId = req.targetId;
            else if (req.type === 'ask_snatch' || req.type === 'ask_dismantle' || req.type === 'ask_hoacong_reveal' || req.type === 'ask_hoacong_discard') activeActorId = req.sourceId;
            else if (req.type === 'ask_boc_tram_trung_slash') activeActorId = req.sourceId;
            else if (req.type === 'ask_tre_nga_discard') activeActorId = req.targetId;
        } else {
            activeActorId = state.currentPlayerIndex;
        }
        
        if (activeActorId === null) {
            console.log("No active actor found. Halting.");
            break;
        }
        
        const botPlayer = state.players.find(p => p.id === activeActorId);
        const action = getBotAction(state, botPlayer);
        if (action) {
            dispatcher.dispatchAction(action);
        } else {
            if (req) {
                // Ignore reaction
                dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: null });
            } else {
                // End phase
                dispatcher.dispatchAction({ type: 'ACTION_END_PHASE' });
            }
        }
        ticks++;
    }
    console.log(`Simulation finished successfully after ${ticks} ticks.`);
} catch (e) {
    console.error("CRASH AT TICK", ticks);
    console.error(e);
}
