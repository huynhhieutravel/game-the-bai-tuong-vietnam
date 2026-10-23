import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { StateMachine, PHASES } from '../../core/StateMachine.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { GameInvariants } from '../../core/Invariants.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { SON_HEROES } from '../../heroes/son/index.js';

describe('QA Toàn Diện Tướng Hệ Sơn: Nguyễn Bặc (Nguyen Bac QA Suite v4)', () => {
  let state;
  let dispatcher;

  beforeEach(() => {
    // Đăng ký tướng hệ Sơn vào globalHeroRegistry
    for (const hero of SON_HEROES) {
      if (!globalHeroRegistry.getHero(hero.id)) {
        globalHeroRegistry.registerHero(hero);
      }
    }

    state = new GameState({
      players: [
        {
          id: 0,
          name: 'Nguyễn Bặc (P0)',
          heroId: 'nguyen_bac',
          mainHeroId: 'nguyen_bac',
          subHeroId: null,
          faction: 'son',
          rawFaction: 'son',
          hp: 4,
          maxHp: 4,
          skills: ['binh_loan', 'khai_quoc'],
          hand: [],
          revealedHeroes: [true, false]
        },
        {
          id: 1,
          name: 'Tướng Sơn 1 (P1)',
          faction: 'son',
          rawFaction: 'son',
          hp: 4,
          maxHp: 4,
          hand: [{ id: 'dodge_1', type: 'dodge', name: 'Né' }]
        },
        {
          id: 2,
          name: 'Tướng Khác (P2)',
          faction: 'viet',
          rawFaction: 'viet',
          hp: 4,
          maxHp: 4,
          hand: [{ id: 'dodge_2', type: 'dodge', name: 'Né' }]
        }
      ],
      drawPile: Array.from({ length: 30 }, (_, i) => ({ id: `card_${i}`, name: `Thẻ ${i}` })),
      currentTurnPlayerId: 0,
      phase: PHASES.ACTION
    });

    dispatcher = new DispatcherV4(state);
  });

  it('1. Đăng ký đầy đủ thuộc tính Nguyễn Bặc trong HeroRegistry', () => {
    const hero = globalHeroRegistry.getHero('nguyen_bac');
    expect(hero).toBeDefined();
    expect(hero.name).toBe('Nguyễn Bặc');
    expect(['son', 'Sơn'].includes(hero.faction) || hero.rawFaction === 'son').toBe(true);
    expect(hero.gender).toBe('male');
    expect(hero.hp).toBe(4);
    expect(hero.maxHp).toBe(4);
    expect(hero.skills.some(s => s.id === 'binh_loan')).toBe(true);
    expect(hero.skills.some(s => s.id === 'khai_quoc')).toBe(true);
  });

  describe('2. Bình Loạn (2 bài cùng chất dùng như Loạn Tiễn)', () => {
    it('2.1. Trực tiếp: Bỏ 2 lá bài cùng chất Cơ phát động Loạn Tiễn thành công', () => {
      const p0 = state.getPlayer(0);
      const cardA = { id: 'card_heart_1', suit: 'hearts', name: 'Thẻ Cơ 1' };
      const cardB = { id: 'card_heart_2', suit: 'hearts', name: 'Thẻ Cơ 2' };
      p0.hand = [cardA, cardB];

      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 0,
        skillId: 'binh_loan',
        cardIds: ['card_heart_1', 'card_heart_2']
      });

      // 2 lá bài đã bị bỏ khỏi bài tay
      expect(p0.hand.length).toBe(0);
      expect(state.discardPile.some(c => c.id === 'card_heart_1')).toBe(true);
      expect(state.discardPile.some(c => c.id === 'card_heart_2')).toBe(true);

      // Loạn Tiễn đẩy frame hỏi Né (ASK_DODGE) cho các mục tiêu
      const topFrame = state.priorityStack.peek();
      expect(topFrame).toBeDefined();
      expect(topFrame.type).toBe('ASK_DODGE');
    });

    it('2.2. Trực tiếp: Chặn phát động nếu 2 lá bài khác chất', () => {
      const p0 = state.getPlayer(0);
      const cardHeart = { id: 'card_heart', suit: 'hearts', name: 'Thẻ Cơ' };
      const cardSpade = { id: 'card_spade', suit: 'spades', name: 'Thẻ Bích' };
      p0.hand = [cardHeart, cardSpade];

      expect(() => {
        dispatcher.dispatchAction({
          type: 'ACTION_USE_SKILL',
          playerId: 0,
          skillId: 'binh_loan',
          cardIds: ['card_heart', 'card_spade'],
          throwOnError: true
        });
      }).toThrow(/cùng chất/);

      expect(p0.hand.length).toBe(2); // Bài vẫn còn nguyên
    });

    it('2.3. Modal ASK_BINH_LOAN: Chọn 2 lá cùng chất Bích phát động Loạn Tiễn', () => {
      const p0 = state.getPlayer(0);
      const cardSpade1 = { id: 'spade_1', suit: 'spades', name: 'Bích 1' };
      const cardSpade2 = { id: 'spade_2', suit: 'spades', name: 'Bích 2' };
      p0.hand = [cardSpade1, cardSpade2];

      // Mở modal
      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 0,
        skillId: 'binh_loan'
      });

      expect(state.priorityStack.peek().type).toBe('ASK_BINH_LOAN');

      // Phản hồi modal với 2 cardIds
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        data: {
          cardIds: ['spade_1', 'spade_2']
        }
      });

      expect(p0.hand.length).toBe(0);
      expect(state.priorityStack.peek().type).toBe('ASK_DODGE');
    });

    it('2.4. Modal ASK_BINH_LOAN: Chọn Hủy (skip) không phát động Loạn Tiễn', () => {
      const p0 = state.getPlayer(0);
      p0.hand = [
        { id: 'spade_1', suit: 'spades', name: 'Bích 1' },
        { id: 'spade_2', suit: 'spades', name: 'Bích 2' }
      ];

      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        playerId: 0,
        skillId: 'binh_loan'
      });

      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        playerId: 0,
        data: {
          isCancelOrSkip: true
        }
      });

      expect(p0.hand.length).toBe(2);
      expect(state.priorityStack.isEmpty()).toBe(true);
    });
  });

  describe('3. Khai Quốc (Chúa Công Kỹ: Giới hạn bài tay +2 × số tướng hệ Sơn)', () => {
    it('3.1. Tăng giới hạn bài tay ở Pha Bỏ bài thêm +2 cho mỗi đồng minh hệ Sơn', () => {
      // P0 (Nguyễn Bặc, HP 4), P1 là tướng Sơn -> có 1 đồng minh Sơn -> bonus = +2 -> MaxHand = 4 + 2 = 6
      const p0 = state.getPlayer(0);
      p0.hand = Array.from({ length: 6 }, (_, i) => ({ id: `card_hold_${i}`, name: `Bài ${i}` }));

      const sm = new StateMachine(state);
      sm._runPhaseDiscard();

      // Giữ 6 lá bài bằng đúng effectiveMaxHand (6), không phải bỏ bài (không sinh ASK_DISCARD)
      expect(state.priorityStack.isEmpty()).toBe(true);
    });

    it('3.2. Với 2 đồng minh hệ Sơn, giới hạn bài tay tăng thêm +4 (MaxHand = 8)', () => {
      const p0 = state.getPlayer(0);
      const p2 = state.getPlayer(2);
      p2.faction = 'son'; // Đổi P2 thành hệ Sơn -> Tổng cộng 2 đồng minh Sơn

      p0.hand = Array.from({ length: 8 }, (_, i) => ({ id: `card_hold_${i}`, name: `Bài ${i}` }));

      const sm = new StateMachine(state);
      sm._runPhaseDiscard();

      // 8 lá không vượt quá 8 maxHand -> không sinh ASK_DISCARD
      expect(state.priorityStack.isEmpty()).toBe(true);

      // Kiểm định bất biến GameInvariants không bị ném lỗi
      expect(() => {
        GameInvariants.assertDiscardLimit(p0, state);
      }).not.toThrow();
    });
  });
});
