import { describe, it, expect, vi } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine, PHASES } from '../../core/StateMachine.js';
import { Dispatcher } from '../../application/DispatcherV4.js';
import { GameAPI } from '../../application/GameAPIV4.js';
import { BotRunner } from '../../application/BotRunnerV4.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { TrickRules } from '../../rules/TrickRules.js';
import { RangeSystem } from '../../rules/RangeSystem.js';
import { createGameState, selectDraftHeroes } from '../../application/gameSetupV4.js';

describe('QA: PriorityFrame Wait, Dying Target Protection, Khai Quốc & Turn 1 Draw Phase', () => {
  it('1. Issue 1: BotRunner không được thực hiện Turn Action khi PriorityFrame đang chờ người chơi Người (Human P0) phản hồi', () => {
    const state = new GameState({
      players: [
        { id: 0, name: 'Bạn (Human)', isBot: false, isAlive: true, hp: 3, maxHp: 3, hand: [{ id: 'p1', name: 'Đào', type: 'peach' }] },
        { id: 1, name: 'Bot 1', isBot: true, isAlive: true, hp: 3, maxHp: 3, hand: [{ id: 's1', name: 'Chém', type: 'slash' }] },
        { id: 2, name: 'Bot 2', isBot: true, isAlive: true, hp: -1, maxHp: 3, hand: [] }
      ],
      currentTurnPlayerId: 1,
      currentPhase: PHASES.ACTION
    });

    // Giả lập Bot 1 vừa dùng Loạn Tiễn, Bot 2 bị -1 HP và PriorityStack đang chờ Bạn (Human P0) cứu Đào
    state.priorityStack.push({
      type: 'ASK_PEACH',
      targetId: 2,
      currentActorId: 0, // Đang chờ Human P0
      priorityQueue: [0],
      context: { dyingPlayerId: 2 }
    });

    const dispatcher = new Dispatcher(state);
    const api = new GameAPI(dispatcher);
    const runner = new BotRunner(api);

    const playCardSpy = vi.spyOn(api, 'playCard');

    // Chạy BotRunner khi state update
    runner.onStateUpdate(state);

    // Dù đang là lượt của Bot 1 và phase là ACTION, BotRunner KHÔNG ĐƯỢC rơi xuống Section 3 để đánh tiếp lá bài
    expect(playCardSpy).not.toHaveBeenCalled();
    runner._clearTimer();
  });

  it('2. Issue 1: CombatRules và TrickRules không cho phép đánh Chém hoặc Cẩm nang đơn mục tiêu lên người chơi đang Hấp Hối (hp <= 0)', () => {
    const state = new GameState({
      players: [
        { id: 0, name: 'Player 0', isAlive: true, hp: 3, maxHp: 3, hand: [] },
        { id: 1, name: 'Player 1', isAlive: true, hp: -1, maxHp: 3, hand: [] }
      ]
    });

    const slashCard = { id: 'slash_1', name: 'Chém', type: 'slash' };
    expect(() => {
      CombatRules.playSlash(state, 0, 1, slashCard);
    }).toThrow(/Hấp Hối/);

    const duelCard = { id: 'duel_1', name: 'Quyết Đấu', type: 'trick' };
    expect(() => {
      TrickRules.playTrick(state, 0, [1], duelCard);
    }).toThrow(/Hấp Hối/);

    const validTargets = RangeSystem.getValidSlashTargets(state.players[0], state.players, slashCard);
    expect(validTargets.some(t => t.id === 1)).toBe(false);
  });

  it('3. Issue 3: Lượt 1 của trận đấu sau khi Draft phải vận hành đúng Pha Rút Bài (người chơi 0 nhận 4 lá ban đầu + 2 lá rút bài lượt 1 = 6 lá)', () => {
    let state = createGameState(4);
    state = selectDraftHeroes(state, 0, 'lac_long_quan', 'thanh_giong');
    state = selectDraftHeroes(state, 1, 'trieu_quang_phuc', 'phung_hung');
    state = selectDraftHeroes(state, 2, 'ngo_quyen', 'yet_kieu');
    state = selectDraftHeroes(state, 3, 'dinh_bo_linh', 'nguyen_bac');

    // Người chơi 0 bắt đầu trận đấu tại ACTION phase của Lượt 1
    expect(state.currentTurnPlayerId).toBe(0);
    expect(state.currentPhase).toBe('ACTION');

    // Người chơi 0 phải có 6 lá (4 khởi đầu + 2 rút trong Pha Rút bài của Lượt 1)
    expect(state.players[0].hand.length).toBe(6);

    // Các người chơi khác chưa tới lượt vẫn giữ nguyên 4 lá ban đầu
    expect(state.players[1].hand.length).toBe(4);
    expect(state.players[2].hand.length).toBe(4);
    expect(state.players[3].hand.length).toBe(4);

    // Nhật ký trận đấu phải ghi nhận rõ việc rút 2 lá bài
    const drawLog = (state.logs || []).find(l => (l.message || '').includes('rút 2 lá bài'));
    expect(drawLog).toBeDefined();
  });

  it('4. Issue 2: Bot không được gọi endPhase để lách qua Discard Phase khi số bài trên tay vượt quá Max Hand', () => {
    const state = new GameState({
      players: [
        { id: 0, name: 'Human', isBot: false, isAlive: true, hp: 3, maxHp: 3, hand: [] },
        { id: 1, name: 'Bot 1', isBot: true, isAlive: true, hp: 2, maxHp: 3, hand: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c4' }] } // 4 bài > 2 HP
      ],
      currentTurnPlayerId: 1,
      currentPhase: PHASES.DISCARD
    });

    const dispatcher = new Dispatcher(state);
    const api = new GameAPI(dispatcher);
    const runner = new BotRunner(api);

    const endPhaseSpy = vi.spyOn(api, 'endPhase');

    // BotRunner trong DISCARD phase khi chưa có ASK_DISCARD hoặc còn bài thừa không được tự tiện gọi endPhase
    runner.onStateUpdate(state);

    expect(endPhaseSpy).not.toHaveBeenCalled();
    runner._clearTimer();
  });
});
