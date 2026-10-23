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
    expect(state.players[0].hand.length).toBe(4);
    expect(state.players[1].hand.length).toBe(4);

    const vm = toViewModel(state);
    expect(vm.phase).toBe(PHASES.ACTION);
    expect(vm.players[0].hand.length).toBe(4);
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
});
