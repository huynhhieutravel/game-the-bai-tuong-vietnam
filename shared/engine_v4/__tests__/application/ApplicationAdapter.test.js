import { describe, it, expect, vi } from 'vitest';
import {
  Dispatcher,
  GameAPI,
  BotRunner,
  createGameState,
  selectDraftHeroes,
  toViewModel
} from '../../application/index.js';
import { PHASES } from '../../../constants/phases.js';

describe('Engine v4 Application Layer Adapter', () => {
  it('creates initial draft state with 4 players and 5 draft heroes each', () => {
    const draftState = createGameState(4);
    expect(draftState.phase).toBe('draft');
    expect(draftState.players.length).toBe(4);
    expect(draftState.players[0].draftHeroes.length).toBe(5);

    const vm = toViewModel(draftState);
    expect(vm.phase).toBe(PHASES.DRAFT);
    expect(vm.players.length).toBe(4);
  });

  it('completes draft phase and initializes v4 game state', () => {
    let state = createGameState(4);

    // Draft for players 0, 1, 2, 3
    state = selectDraftHeroes(state, 0, 'lac_long_quan', 'son_tinh');
    state = selectDraftHeroes(state, 1, 'trieu_quang_phuc', 'phung_hung');
    state = selectDraftHeroes(state, 2, 'ngo_quyen', 'yet_kieu');
    state = selectDraftHeroes(state, 3, 'dinh_bo_linh', 'nguyen_bac');

    // After all drafted, state is v4 GameState
    expect(state.currentPhase).toBe('ACTION');
    expect(state.players.length).toBe(4);
    // Player 0 khởi đầu với 4 lá ban đầu + 2 lá rút trong Pha Rút bài của Lượt 1
    expect(state.players[0].hand.length).toBe(6);
    expect(state.players[1].hand.length).toBe(4);

    const vm = toViewModel(state);
    expect(vm.phase).toBe(PHASES.ACTION);
    expect(vm.players[0].hand.length).toBe(6);
    expect(vm.players[0].heroes.length).toBe(2);
    expect(vm.players[0].heroes[0].name).toBe('Lạc Long Quân');
  });

  it('DispatcherV4 handles playCard and reacts through priorityStack', () => {
    let state = createGameState(4);
    state = selectDraftHeroes(state, 0, 'lac_long_quan', 'son_tinh');
    state = selectDraftHeroes(state, 1, 'trieu_quang_phuc', 'phung_hung');
    state = selectDraftHeroes(state, 2, 'ngo_quyen', 'yet_kieu');
    state = selectDraftHeroes(state, 3, 'dinh_bo_linh', 'nguyen_bac');

    const dispatcher = new Dispatcher(state);
    const api = new GameAPI(dispatcher);

    // Give player 0 a slash card
    state.players[0].hand.push({
      id: 'slash_test_1',
      name: 'Chém',
      type: 'slash',
      suit: 'spade',
      color: 'black'
    });

    api.playCard(0, 'slash_test_1', [1]);

    // Priority stack should have ASK_DODGE for player 1
    expect(state.priorityStack.isEmpty()).toBe(false);
    expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    expect(state.priorityStack.peek().currentActorId).toBe(1);

    const vm = toViewModel(state);
    expect(vm.waitingForResponse).not.toBeNull();
    expect(vm.waitingForResponse.type).toBe('ask_dodge');
    expect(vm.waitingForResponse.responderId).toBe(1);

    // Player 1 reacts by skipping/failing to dodge
    api.respond({ playerId: 1, doReact: false });

    // Player 1 takes damage, stack clears
    expect(state.priorityStack.isEmpty()).toBe(true);
    expect(state.players[1].hp).toBe(3);
  });

  it('BotRunnerV4 cleanly reacts and avoids infinite loops', () => {
    let state = createGameState(4);
    state = selectDraftHeroes(state, 0, 'lac_long_quan', 'son_tinh');
    state = selectDraftHeroes(state, 1, 'trieu_quang_phuc', 'phung_hung');
    state = selectDraftHeroes(state, 2, 'ngo_quyen', 'yet_kieu');
    state = selectDraftHeroes(state, 3, 'dinh_bo_linh', 'nguyen_bac');

    const dispatcher = new Dispatcher(state);
    const api = new GameAPI(dispatcher);
    const runner = new BotRunner(api);

    expect(() => {
      runner.onStateUpdate(state);
      runner.cleanup();
    }).not.toThrow();
  });

  it('BotRunnerV4 handles multi-actor ASK_NEGATE without getting stuck on reentrancy', async () => {
    vi.useFakeTimers();
    let state = createGameState(4);
    state = selectDraftHeroes(state, 0, 'chu_dong_tu', 'cao_lo');
    state = selectDraftHeroes(state, 1, 'trieu_quang_phuc', 'phung_hung');
    state = selectDraftHeroes(state, 2, 'ngo_quyen', 'yet_kieu');
    state = selectDraftHeroes(state, 3, 'dinh_bo_linh', 'nguyen_bac');

    state.players[0].revealedHeroes = [true, true];
    state.players[1].revealedHeroes = [true, true];

    state.players.forEach(p => { p.hand = []; });
    const duelCard = { id: 'duel_test_1', name: 'Quyết Đấu', type: 'duel', suit: 'spade', rank: 'A' };
    state.players[0].hand.push(duelCard);

    const dispatcher = new Dispatcher(state);
    const api = new GameAPI(dispatcher);
    const runner = new BotRunner(api);

    dispatcher.subscribe((st) => {
      runner.onStateUpdate(st);
    });

    api.playCard(0, 'duel_test_1', [1]);

    // Top frame is ASK_NEGATE for player 0
    expect(state.priorityStack.peek().type).toBe('ASK_NEGATE');
    expect(state.priorityStack.peek().currentActorId).toBe(0);

    // Player 0 passes Hóa Giải
    api.respond({ playerId: 0, doNegate: false });

    // Bot 1 is next actor
    expect(state.priorityStack.peek().currentActorId).toBe(1);

    // Advance timers for Bot 1 (100ms passReaction delay for auto-cancel)
    await vi.advanceTimersByTimeAsync(100);

    // Bot 2 is next actor
    expect(state.priorityStack.peek().currentActorId).toBe(2);

    // Advance timers for Bot 2 (100ms passReaction delay)
    await vi.advanceTimersByTimeAsync(100);

    // Bot 3 is next actor
    expect(state.priorityStack.peek().currentActorId).toBe(3);

    // Advance timers for Bot 3 (100ms passReaction delay)
    await vi.advanceTimersByTimeAsync(100);

    // Negate chain finishes! Now ASK_SLASH_DUEL for Player 1 (Bot 1)
    expect(state.priorityStack.peek().type).toBe('ASK_SLASH_DUEL');
    expect(state.priorityStack.peek().currentActorId).toBe(1);

    // Advance timers for Bot 1 duel slash (no slash -> 100ms cancel)
    await vi.advanceTimersByTimeAsync(100);

    // Duel either continues or Bot 1 takes damage / loses
    runner.cleanup();
    vi.useRealTimers();
  });
});
