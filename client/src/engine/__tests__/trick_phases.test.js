import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../core/GameEngine';

describe('Tricks: Binh Lương and Hỗn Loạn', () => {
  let engine;
  let dispatcher;

  beforeEach(() => {
    engine = new GameEngine([
        { id: 0, name: 'P1', mainHeroId: 'lac-long-quan', subHeroId: 'lac-long-quan' },
        { id: 1, name: 'P2', mainHeroId: 'thanh-giong', subHeroId: 'thanh-giong' }
    ]);
    dispatcher = engine.dispatcher;
  });

  it('Binh Lương Thốn Đoạn: Skips Draw Phase if Judge is not Club', () => {
    dispatcher.state.players[0].judgementArea = [{ id: 'binh-luong-1', name: 'Binh Lương Thốn Đoạn', virtualName: 'binh-luong' }];
    dispatcher.state.deck = [{ id: 'judge-card', name: 'Chém', suit: 'heart', rank: '5' }]; // Not club

    dispatcher.state.reactionStack.push({ type: 'EVENT_TURN_START', payload: { playerId: 0 } });
    dispatcher.tick();
    
    // It should push EVENT_PHASE_START, EVENT_PHASE_JUDGE, EVENT_PHASE_DRAW, EVENT_PHASE_PLAY
    // Loop runs. EVENT_PHASE_JUDGE pops Binh Lương, triggers EVENT_JUDGE.
    // EVENT_JUDGE flips Heart -> Failed! Sets drawPhase.isCancelled = true.
    // EVENT_PHASE_DRAW sees isCancelled = true, skips draw.
    // Moves to EVENT_PHASE_PLAY.
    
    expect(dispatcher.state.waitingForResponse).toBeDefined();
    expect(dispatcher.state.waitingForResponse.type).toBe('play_phase');
    expect(dispatcher.state.currentPhase).toBe('action');
  });

  it('Hỗn Loạn: Skips Play Phase if Judge is not Heart', () => {
    dispatcher.state.players[0].judgementArea = [{ id: 'hon-loan-1', name: 'Hỗn Loạn', virtualName: 'hon-loan' }];
    dispatcher.state.deck = [{ id: 'judge-card', name: 'Chém', suit: 'spade', rank: '5' }]; // Not heart

    dispatcher.state.reactionStack.push({ type: 'EVENT_TURN_START', payload: { playerId: 0 } });
    dispatcher.tick();
    
    // Judge happens. Flips Spade -> Failed! Sets playPhase.isCancelled = true.
    // Draw phase happens normally.
    expect(dispatcher.state.waitingForResponse).toBeDefined();
    expect(dispatcher.state.waitingForResponse.type).toBe('draw_phase');
    
    // Player draws
    dispatcher.dispatchAction({ type: 'ACTION_DRAW_CARDS', payload: { playerId: 0 } });
    
    // Play phase is cancelled! Should go directly to discard phase!
    expect(dispatcher.state.waitingForResponse).toBeDefined();
    expect(dispatcher.state.waitingForResponse.type).toBe('discard_phase');
    expect(dispatcher.state.currentPhase).toBe('discard');
  });
});
