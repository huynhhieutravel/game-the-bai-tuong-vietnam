import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine, PHASES } from '../../core/StateMachine.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { toViewModel } from '../../application/GameViewMapperV4.js';

describe('ActionPhaseAndParitySkills Test Suite (Nhiếp Chính, Vân Đồn, Xả Thân, Duyên Thơ)', () => {
  let state;
  let dispatcher;

  beforeEach(() => {
    state = new GameState({
      players: [
        { id: 0, name: 'Player 0', hp: 2, maxHp: 3, gender: 'male', hand: [], skills: [], revealedHeroes: [true, true], equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null }, judgementArea: [], temporaryFlags: {}, turnStats: { slashCount: 0 } },
        { id: 1, name: 'Player 1', hp: 3, maxHp: 3, gender: 'male', hand: [], skills: [], revealedHeroes: [true, true], equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null }, judgementArea: [], temporaryFlags: {}, turnStats: { slashCount: 0 } },
        { id: 2, name: 'Player 2', hp: 3, maxHp: 3, gender: 'female', hand: [], skills: [], revealedHeroes: [true, true], equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null }, judgementArea: [], temporaryFlags: {}, turnStats: { slashCount: 0 } },
        { id: 3, name: 'Player 3', hp: 3, maxHp: 3, gender: 'male', hand: [], skills: [], revealedHeroes: [true, true], equipment: { weapon: null, armor: null, horse_attack: null, horse_defense: null }, judgementArea: [], temporaryFlags: {}, turnStats: { slashCount: 0 } }
      ],
      drawPile: [
        { id: 'deck_1', name: 'Chém', suit: 'spade', rank: 7, color: 'black' },
        { id: 'deck_2', name: 'Né', suit: 'heart', rank: 2, color: 'red' }
      ],
      currentTurnPlayerId: 0
    });
    state.currentPhase = PHASES.ACTION;
    dispatcher = new DispatcherV4(state);
  });

  it('1. Tô Hiến Thành - Nhiếp Chính: Bỏ qua Pha Bỏ Bài khi slashCount === 0', () => {
    const p0 = state.getPlayer(0);
    p0.skills = ['nhiep_chinh'];
    // 5 lá trên tay trong khi chỉ có 2 HP (quá giới hạn 3 lá)
    p0.hand = [
      { id: 'c1', name: 'Bài 1' },
      { id: 'c2', name: 'Bài 2' },
      { id: 'c3', name: 'Bài 3' },
      { id: 'c4', name: 'Bài 4' },
      { id: 'c5', name: 'Bài 5' }
    ];
    p0.turnStats.slashCount = 0;
    state.currentPhase = PHASES.ACTION;

    const sm = new StateMachine(state);
    sm.endActionPhase();

    // Do có Nhiếp Chính và không Chém -> Pha Bỏ Bài bị bỏ qua, không có ASK_DISCARD
    expect(state.priorityStack.isEmpty()).toBe(true);
    expect(p0.hand.length).toBe(5);
  });

  it('2. Tô Hiến Thành - Nhiếp Chính: Nếu đã Chém (slashCount > 0), vẫn phải bỏ bài khi quá HP', () => {
    const p0 = state.getPlayer(0);
    p0.skills = ['nhiep_chinh'];
    p0.hand = [
      { id: 'c1', name: 'Bài 1' },
      { id: 'c2', name: 'Bài 2' },
      { id: 'c3', name: 'Bài 3' },
      { id: 'c4', name: 'Bài 4' }
    ]; // 4 lá > 2 HP
    p0.turnStats.slashCount = 1; // Đã chém 1 lần
    state.currentPhase = PHASES.ACTION;

    const sm = new StateMachine(state);
    sm.endActionPhase();

    // Phải đẩy ASK_DISCARD vào stack vì đã chém
    expect(state.priorityStack.peek()).toBeTruthy();
    expect(state.priorityStack.peek().type).toBe('ASK_DISCARD');
    expect(state.priorityStack.peek().context.cardsToDiscard).toBe(2);
  });

  it('3. Trần Khánh Dư - Vân Đồn: Đấu điểm thắng -> Được đánh thêm 1 Chém vô hạn cự ly và 2 mục tiêu', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);
    const p2 = state.getPlayer(2);
    const p3 = state.getPlayer(3);

    p0.skills = ['van_don'];
    p0.hand = [
      { id: 'k_card', name: 'Ngựa K', rank: 'K', suit: 'spade' },
      { id: 'slash_card', name: 'Chém', type: 'slash', rank: '8', suit: 'diamond' }
    ];
    p1.hand = [
      { id: 'q_card', name: 'Thẻ Q', rank: 'Q', suit: 'heart' }
    ];

    // Phát động Vân Đồn qua Dispatcher
    dispatcher.dispatchAction({
      type: 'ACTION_USE_SKILL',
      payload: { playerId: 0, skillId: 'van_don', targets: [1] }
    });

    expect(state.priorityStack.peek().type).toBe('ASK_VAN_DON');

    // Phản hồi đấu điểm: K (13) vs Q (12) -> p0 thắng
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 0, responseType: 'confirm', data: { cardId: 'k_card', targetCardId: 'q_card' } }
    });

    expect(p0.temporaryFlags?.vanDonWin).toBe(true);

    // Kiểm tra ViewModel: Chém isPlayable = true
    const vm = toViewModel(state, 0);
    const slashInVM = vm.players[0].hand.find(c => c.name === 'Chém');
    expect(slashInVM.isPlayable).toBe(true);

    // Thực hiện Chém 2 mục tiêu p2 và p3 cùng 1 lá
    dispatcher.dispatchAction({
      type: 'ACTION_PLAY_CARD',
      payload: { sourceId: 0, cardId: 'slash_card', targetIds: [2, 3] }
    });

    // Cả p2 và p3 đều nhận yêu cầu Né (LIFO stack)
    expect(state.priorityStack.peek()).toBeTruthy();
    expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    expect(state.priorityStack.peek().targetId).toBe(3);

    // p3 bỏ qua Né -> nhận damage
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 3, responseType: 'skip', data: {} }
    });
    expect(p3.hp).toBe(2);

    // Tiếp theo là p2 Né
    expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    expect(state.priorityStack.peek().targetId).toBe(2);

    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 2, responseType: 'skip', data: {} }
    });
    expect(p2.hp).toBe(2);
  });

  it('4. Trần Khánh Dư - Vân Đồn: Đấu điểm thua -> Bị cấm Chém trong lượt', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1);

    p0.skills = ['van_don'];
    p0.hand = [
      { id: 'card_5', name: 'Bài 5', rank: '5', suit: 'spade' },
      { id: 'slash_card', name: 'Chém', type: 'slash', rank: '8', suit: 'diamond' }
    ];
    p1.hand = [
      { id: 'card_10', name: 'Bài 10', rank: '10', suit: 'heart' }
    ];

    dispatcher.dispatchAction({
      type: 'ACTION_USE_SKILL',
      payload: { playerId: 0, skillId: 'van_don', targets: [1] }
    });

    // 5 vs 10 -> p0 thua
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 0, responseType: 'confirm', data: { cardId: 'card_5', targetCardId: 'card_10' } }
    });

    expect(p0.temporaryFlags?.vanDonLose).toBe(true);

    // Không thể Chém
    expect(() => {
      CombatRules.playSlash(state, 0, 1, p0.hand[0]);
    }).toThrow(/thất bại trong đấu điểm/);
  });

  it('5. Công Chúa An Tư - Xả Thân: Khi bị Chém, có thể bỏ 1 bài chuyển hướng sang mục tiêu khác', () => {
    const p0 = state.getPlayer(0);
    const p1 = state.getPlayer(1); // An Tư (distance 1 from p0)
    const p2 = state.getPlayer(2); // Mục tiêu bị chuyển hướng sang (distance 1 from p1)

    p1.skills = ['xa_than'];
    p1.name = 'Công Chúa An Tư';
    p1.hand = [{ id: 'card_discard', name: 'Bài nháp' }];

    p0.hand = [{ id: 'slash_1', name: 'Chém', type: 'slash' }];

    // p0 Chém An Tư (p1)
    dispatcher.dispatchAction({
      type: 'ACTION_PLAY_CARD',
      payload: { sourceId: 0, cardId: 'slash_1', targetIds: [1] }
    });

    // An Tư nhận yêu cầu ASK_XA_THAN
    expect(state.priorityStack.peek()).toBeTruthy();
    expect(state.priorityStack.peek().type).toBe('ASK_XA_THAN');
    expect(state.priorityStack.peek().targetId).toBe(1);

    // An Tư đồng ý bỏ 1 bài, chuyển hướng sang p2
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: {
        playerId: 1,
        responseType: 'confirm',
        data: { cardId: 'card_discard', targetId: 2 }
      }
    });

    // Cú Chém được chuyển sang p2! An Tư không mất HP, p2 bị đòi Né
    expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    expect(state.priorityStack.peek().targetId).toBe(2);
    expect(p1.hand.length).toBe(0); // Đã bỏ bài

    // p2 không né -> p2 mất 1 HP
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 2, responseType: 'skip', data: {} }
    });

    expect(p2.hp).toBe(2);
    expect(p1.hp).toBe(3); // An Tư an toàn
  });

  it('6. Hồ Xuân Hương - Duyên Thơ: Bỏ 2 lá bài, hồi 1 HP cho mình và 1 tướng nam', () => {
    const p2 = state.getPlayer(2); // Nữ (Hồ Xuân Hương)
    const p0 = state.getPlayer(0); // Nam, HP 2/3 (bị thương)

    p2.skills = ['duyen_tho'];
    p2.hp = 2; // HP 2/3 (bị thương)
    p2.hand = [
      { id: 'c1', name: 'Thơ 1' },
      { id: 'c2', name: 'Thơ 2' }
    ];

    dispatcher.dispatchAction({
      type: 'ACTION_USE_SKILL',
      payload: { playerId: 2, skillId: 'duyen_tho', cardIds: ['c1', 'c2'], targets: [0] }
    });

    // Cả 2 cùng được hồi 1 HP
    expect(p2.hp).toBe(3);
    expect(p0.hp).toBe(3);
    expect(p2.hand.length).toBe(0);
  });
});
