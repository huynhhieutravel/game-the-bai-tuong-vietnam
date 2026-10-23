import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { HA_HEROES } from '../../heroes/ha/index.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { PHASES } from '../../core/StateMachine.js';

describe('QA Hero: Dã Tượng (da_tuong) — Kỳ Tập', () => {
  beforeEach(() => {
    HA_HEROES.forEach(hero => globalHeroRegistry.registerHero(hero));
  });

  const setupGame = () => {
    const state = new GameState({
      players: [
        {
          id: 0,
          name: 'Dã Tượng',
          heroId: 'da_tuong',
          faction: 'ha',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          revealedHeroes: [true, true],
          skills: ['ky_tap'],
          hand: [
            { id: 'b_slash', name: 'Chém Đen', type: 'slash', suit: 'spade', color: 'black', rank: 5 },
            { id: 'b_dodge', name: 'Né Đen', type: 'dodge', suit: 'club', color: 'black', rank: 6 },
            { id: 'r_peach', name: 'Đào Đỏ', type: 'peach', suit: 'heart', color: 'red', rank: 7 }
          ]
        },
        {
          id: 1,
          name: 'Mục Tiêu',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          revealedHeroes: [true, true],
          hand: [
            { id: 'target_card', name: 'Bài Quý', suit: 'diamond', rank: 10 }
          ]
        }
      ],
      drawPile: [],
      discardPile: [],
      currentTurnPlayerId: 0,
      currentPhase: PHASES.ACTION
    });
    const dispatcher = new DispatcherV4(state);
    return { state, dispatcher };
  };

  const resolveNegateChain = (dispatcher, state) => {
    while (!state.priorityStack.isEmpty() && state.priorityStack.peek().type === 'ASK_NEGATE') {
      const actorId = state.priorityStack.peek().currentActorId;
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: actorId,
        doNegate: false
      });
    }
  };

  it('Dùng lá bài Đen trên tay làm [Tước Bài] thông qua ACTION_SKILL thành công', () => {
    const { state, dispatcher } = setupGame();
    const daTuong = state.getPlayer(0);
    const target = state.getPlayer(1);

    expect(target.hand.length).toBe(1);

    // Kích hoạt Kỳ Tập dùng b_slash lên mục tiêu 1
    dispatcher.dispatchAction({
      type: 'ACTION_SKILL',
      skillId: 'ky_tap',
      playerId: 0,
      cardIds: ['b_slash'],
      targets: [1]
    });

    // Mở vòng hỏi Hóa Giải (ASK_NEGATE)
    expect(state.priorityStack.peek().type).toBe('ASK_NEGATE');
    resolveNegateChain(dispatcher, state);

    // Sau khi giải quyết Tước Bài: b_slash vào discard, target bị tước bài (target_card vào discard)
    expect(daTuong.hand.some(c => c.id === 'b_slash')).toBe(false);
    expect(state.discardPile.some(c => c.id === 'b_slash')).toBe(true);
    expect(target.hand.length).toBe(0);
    expect(state.discardPile.some(c => c.id === 'target_card')).toBe(true);
  });

  it('Dùng lá bài Đen thứ 2 liên tiếp trong cùng một lượt (Kỳ Tập không bị giới hạn số lần)', () => {
    const { state, dispatcher } = setupGame();
    const daTuong = state.getPlayer(0);
    const target = state.getPlayer(1);

    // Thêm bài cho target để tước lần 2
    target.hand.push({ id: 'target_card_2', name: 'Bài Quý 2' });

    // Dùng lần 1
    dispatcher.dispatchAction({
      type: 'ACTION_SKILL',
      skillId: 'ky_tap',
      playerId: 0,
      cardIds: ['b_slash'],
      targets: [1]
    });
    resolveNegateChain(dispatcher, state);

    // Dùng lần 2 với b_dodge
    dispatcher.dispatchAction({
      type: 'ACTION_SKILL',
      skillId: 'ky_tap',
      playerId: 0,
      cardIds: ['b_dodge'],
      targets: [1]
    });
    resolveNegateChain(dispatcher, state);

    expect(daTuong.hand.some(c => c.id === 'b_dodge')).toBe(false);
    expect(target.hand.length).toBe(0);
  });

  it('Không thể dùng lá bài màu Đỏ để phát động Kỳ Tập', () => {
    const { state, dispatcher } = setupGame();

    expect(() => {
      dispatcher.dispatchAction({
        type: 'ACTION_SKILL',
        skillId: 'ky_tap',
        playerId: 0,
        cardIds: ['r_peach'],
        targets: [1],
        throwOnError: true
      });
    }).toThrow(/Chỉ có thể dùng lá bài màu Đen/);
  });
});
