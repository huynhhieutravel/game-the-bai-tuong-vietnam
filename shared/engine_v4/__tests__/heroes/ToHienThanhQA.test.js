import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { HA_HEROES } from '../../heroes/ha/index.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { PHASES } from '../../core/StateMachine.js';
import { GameInvariants } from '../../core/Invariants.js';

describe('QA Hero: Tô Hiến Thành (to_hien_thanh) — Nhiếp Chính', () => {
  beforeEach(() => {
    HA_HEROES.forEach(hero => globalHeroRegistry.registerHero(hero));
  });

  const setupGame = (slashCount = 0) => {
    const state = new GameState({
      players: [
        {
          id: 0,
          name: 'Tô Hiến Thành',
          heroId: 'to_hien_thanh',
          faction: 'ha',
          hp: 2,
          maxHp: 3,
          revealedHeroes: [true, true],
          skills: ['nhiep_chinh'],
          hand: [
            { id: 'c1', name: 'Né', type: 'dodge', suit: 'diamond', rank: 2 },
            { id: 'c2', name: 'Đào', type: 'peach', suit: 'heart', rank: 3 },
            { id: 'c3', name: 'Vô Trung', type: 'trick', suit: 'heart', rank: 7 },
            { id: 'c4', name: 'Hóa Giải', type: 'trick', suit: 'spade', rank: 11 },
            { id: 'c5', name: 'Chém', type: 'slash', suit: 'club', rank: 8 }
          ],
          turnStats: {
            slashCount
          }
        },
        {
          id: 1,
          name: 'Đối thủ',
          hp: 4,
          maxHp: 4,
          revealedHeroes: [true, true],
          hand: []
        }
      ],
      drawPile: [
        { id: 'deck_1', name: 'Lá 1', suit: 'heart', rank: 1 }
      ],
      currentTurnPlayerId: 0,
      currentPhase: PHASES.ACTION
    });
    const dispatcher = new DispatcherV4(state);
    return { state, dispatcher };
  };

  it('Nhiếp Chính: Khi không đánh Chém, kết thúc Pha Hành động bỏ qua Pha Bỏ bài và sang Pha Kết thúc / Chuyển lượt', () => {
    const { state, dispatcher } = setupGame(0); // 0 Chém
    const toHienThanh = state.getPlayer(0);

    // 5 lá bài > 2 HP
    expect(toHienThanh.hand.length).toBe(5);
    expect(toHienThanh.hp).toBe(2);

    dispatcher.dispatch({
      type: 'ACTION_END_PHASE',
      payload: {
        targetId: 0
      }
    });

    // Bỏ qua Pha DISCARD, không tạo frame ASK_DISCARD nào, hoàn tất lượt và chuyển sang Player 1
    expect(state.priorityStack.isEmpty()).toBe(true);
    expect(state.currentTurnPlayerId).toBe(1);
    expect(toHienThanh.hand.length).toBe(5); // Giữ nguyên 5 lá bài dù HP chỉ là 2
  });

  it('Nhiếp Chính: Khi đã đánh Chém trong lượt, kết thúc Pha Hành động phải vào Pha Bỏ bài', () => {
    const { state, dispatcher } = setupGame(1); // Đã đánh 1 Chém
    const toHienThanh = state.getPlayer(0);

    dispatcher.dispatch({
      type: 'ACTION_END_PHASE',
      payload: {
        targetId: 0
      }
    });

    // Vào Pha DISCARD và tạo frame ASK_DISCARD vì có 5 bài > 2 HP
    expect(state.currentPhase).toBe(PHASES.DISCARD);
    const frame = state.priorityStack.peek();
    expect(frame).toBeDefined();
    expect(frame.type).toBe('ASK_DISCARD');
  });

  it('Nhiếp Chính: GameInvariants không báo lỗi khi giữ nhiều bài hơn HP nếu chưa đánh Chém', () => {
    const { state } = setupGame(0);
    const toHienThanh = state.getPlayer(0);

    expect(() => {
      GameInvariants.assertDiscardLimit(toHienThanh, state);
    }).not.toThrow();
  });

  it('Nhiếp Chính: GameInvariants báo lỗi nếu giữ nhiều bài hơn HP sau khi đã đánh Chém', () => {
    const { state } = setupGame(1);
    const toHienThanh = state.getPlayer(0);

    expect(() => {
      GameInvariants.assertDiscardLimit(toHienThanh, state);
    }).toThrow(/INVARIANT_VIOLATION/);
  });
});
