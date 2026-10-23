import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../core/GameState.js';
import { globalHeroRegistry } from '../../heroes/HeroRegistry.js';
import { HA_HEROES } from '../../heroes/ha/index.js';
import { DispatcherV4 } from '../../application/DispatcherV4.js';
import { CombatRules } from '../../rules/CombatRules.js';
import { GameInvariants } from '../../core/Invariants.js';
import { PHASES } from '../../core/StateMachine.js';

describe('QA Hero: Nguyễn Địa Lô (nguyen_dia_lo) — Hộ Chủ & Can Gián', () => {
  beforeEach(() => {
    HA_HEROES.forEach(hero => globalHeroRegistry.registerHero(hero));
  });

  const setupGame = () => {
    const state = new GameState({
      players: [
        {
          id: 0,
          name: 'Nguyễn Địa Lô',
          heroId: 'nguyen_dia_lo',
          faction: 'ha',
          gender: 'male',
          hp: 1,
          maxHp: 4,
          revealedHeroes: [true, true],
          skills: ['ho_chu', 'can_gian'],
          hand: [
            { id: 'h1', name: 'Lá 1' },
            { id: 'h2', name: 'Lá 2' },
            { id: 'h3', name: 'Lá 3' }
          ],
          trungCards: []
        },
        {
          id: 1,
          name: 'Đồng Minh',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          revealedHeroes: [true, true],
          hand: []
        },
        {
          id: 2,
          name: 'Kẻ Tấn Công',
          gender: 'male',
          hp: 4,
          maxHp: 4,
          revealedHeroes: [true, true],
          hand: []
        }
      ],
      drawPile: [],
      discardPile: [],
      currentTurnPlayerId: 2,
      currentPhase: PHASES.ACTION
    });
    const dispatcher = new DispatcherV4(state);
    return { state, dispatcher };
  };

  describe('1. Hộ Chủ (Lật bài Trung cứu mạng và nới rộng Max Hand)', () => {
    it('Lật bài Trung khác điểm số: Tự động thoát chết hồi phục lên 1 HP và tích lũy bài Trung', () => {
      const { state } = setupGame();
      const ndl = state.getPlayer(0);

      // Xếp lá bài trên đỉnh deck có rank 'Q'
      state.drawPile = [{ id: 'card_q', name: 'Q Cơ', suit: 'heart', rank: 'Q' }];

      // Kẻ địch gây 1 sát thương khiến Nguyễn Địa Lô rơi vào hấp hối (1 -> 0 HP)
      CombatRules.applyDamage(state, 2, 0, 1, 'slash');

      // Tự động kích hoạt Hộ Chủ, thoát chết thành công mà không cần hỏi Đào
      expect(state.priorityStack.isEmpty()).toBe(true);
      expect(ndl.hp).toBe(1);
      expect(ndl.trungCards.length).toBe(1);
      expect(ndl.trungCards[0].rank).toBe('Q');
    });

    it('Lật bài Trung trùng điểm số: Thất bại, đưa bài vào discardPile và mở vòng hỏi Đào ASK_PEACH', () => {
      const { state } = setupGame();
      const ndl = state.getPlayer(0);

      // Đã có sẵn 1 lá bài Trung là rank 7
      ndl.trungCards = [{ id: 'old_trung', name: '7 Bích', suit: 'spade', rank: 7 }];
      // Deck rút ra lá cũng rank 7
      state.drawPile = [{ id: 'new_trung_duplicate', name: '7 Cơ', suit: 'heart', rank: 7 }];

      CombatRules.applyDamage(state, 2, 0, 1, 'slash');

      // Lá bài trùng bị bỏ vào discard
      expect(state.discardPile.some(c => c.id === 'new_trung_duplicate')).toBe(true);
      expect(ndl.trungCards.length).toBe(1);
      // Vẫn đang ở 0 HP và rơi vào vòng hỏi Đào ASK_PEACH
      expect(ndl.hp).toBe(0);
      expect(state.priorityStack.peek().type).toBe('ASK_PEACH');
    });

    it('Max Hand được mở rộng bằng số lượng lá bài Trung', () => {
      const { state } = setupGame();
      const ndl = state.getPlayer(0);

      // Nguyễn Địa Lô 1 HP nhưng có 3 lá bài Trung
      ndl.hp = 1;
      ndl.trungCards = [
        { id: 't1', rank: 2 },
        { id: 't2', rank: 5 },
        { id: 't3', rank: 9 }
      ];

      // Đang có 3 lá bài trên tay
      expect(ndl.hand.length).toBe(3);

      // Không vi phạm Invariant Discard Limit
      expect(() => {
        GameInvariants.assertDiscardLimit(ndl, state);
      }).not.toThrow();
    });
  });

  describe('2. Can Gián (Mất 1 HP cho đồng minh rút 2 bài)', () => {
    it('Nguyễn Địa Lô mất 1 HP cho đồng minh rút 2 lá bài', () => {
      const { state, dispatcher } = setupGame();
      const ndl = state.getPlayer(0);
      const ally = state.getPlayer(1);

      ndl.hp = 3; // Đủ máu để Can Gián
      state.drawPile = [
        { id: 'd1', name: 'Lá 1' },
        { id: 'd2', name: 'Lá 2' }
      ];

      dispatcher.dispatchAction({
        type: 'ACTION_SKILL',
        skillId: 'can_gian',
        playerId: 0,
        targets: [1]
      });

      expect(ndl.hp).toBe(2); // 3 -> 2 HP
      expect(ally.hand.length).toBe(2);
    });

    it('Nguyễn Địa Lô 1 HP không thể dùng Can Gián', () => {
      const { state, dispatcher } = setupGame();
      const ndl = state.getPlayer(0);

      ndl.hp = 1; // Chỉ còn 1 HP

      expect(() => {
        dispatcher.dispatchAction({
          type: 'ACTION_SKILL',
          skillId: 'can_gian',
          playerId: 0,
          targets: [1],
          throwOnError: true
        });
      }).toThrow(/Sinh lực phải lớn hơn 1/);
    });
  });
});
